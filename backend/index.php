<?php
require __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();
$_ENV += getenv();

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$app = AppFactory::create();

// Habilitar CORS para que React pueda llamar al backend
$app->options('/{routes:.+}', function ($request, $response, $args) {
    return $response;
});

$app->add(function ($request, $handler) {
    $response = $handler->handle($request);
    return $response
        ->withHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
});

// Ruta de prueba para verificar que el backend funciona
$app->get('/api/health', function (Request $request, Response $response, $args) {
    $data = [
        'status' => 'ok',
        'message' => 'Backend funcionando correctamente',
        'timestamp' => date('Y-m-d H:i:s')
    ];
    $response->getBody()->write(json_encode($data));
    return $response->withHeader('Content-Type', 'application/json');
});

// Ruta principal (para probar que SlimPHP responde)
$app->get('/', function (Request $request, Response $response, $args) {
    $response->getBody()->write('Hello World!');
    return $response;
});

// Ruta de prueba para verificar conexión a SQLite
$app->get('/api/test-db', function (Request $request, Response $response, $args) {
    $pdo = require __DIR__ . '/config/database.php';
    
    $stmt = $pdo->query("SELECT name FROM sqlite_master WHERE type='table'");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $response->getBody()->write(json_encode([
        'status' => 'ok',
        'tables' => $tables
    ]));
    return $response->withHeader('Content-Type', 'application/json');
});


//Endpoint para obtener precios historicos con cache
$app->get('/api/precios', function (Request $request, Response $response, $args) {
    $pdo = require __DIR__ . '/config/database.php';
    
    // Obtener parámetros de la URL
    $params = $request->getQueryParams();
    $symbol = $params['symbol'] ?? 'AAPL';
    $range = $params['range'] ?? '1m';
    
    // Mapear rango a días para TD
    $rangeMap = [
        '1m' => 30,
        '3m' => 90,
        '6m' => 180,
        '1y' => 365
    ];
    $diasNecesarios = $rangeMap[$range] ?? 30;
    
    // 1. Verificar caché
    $stmt = $pdo->prepare("SELECT datos_json, fecha_consulta FROM cache_precio 
                           WHERE simbolo = :symbol  
                           AND julianday('now') - julianday(fecha_consulta) < 1");
    $stmt->execute([':symbol' => $symbol]);
    $cached = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($cached) {
        $precios = json_decode($cached['datos_json'], true);
    } else {
        // 2. Consultar a TD
        $apiKey = $_ENV['TWELVE_DATA_API_KEY'];
        $url = "https://api.twelvedata.com/time_series?symbol=$symbol&interval=1day&outputsize=365&apikey=$apiKey";
    
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $jsonRespuesta = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    
        if ($httpCode !== 200) {
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al consultar Twelve Data. Código: ' . $httpCode
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    
        $datos = json_decode($jsonRespuesta, true);
    
        if (isset($datos['status']) && $datos['status'] === 'error') {
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => $datos['message'] ?? 'Símbolo inválido o error de API'
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }
        
        $precios = $datos['values'];

        // 3. Guardar en caché
        $stmt = $pdo->prepare("INSERT INTO cache_precio (simbolo, rango, datos_json, fecha_consulta) 
                            VALUES (:symbol, '1y', :json, datetime('now'))");
        $stmt->execute([
            ':symbol' => $symbol,
            ':json' => json_encode($precios)]);
    }
    
    $preciosRecortados = array_slice($precios, 0, $diasNecesarios);
    
    $response->getBody()->write(json_encode([
        'status' => 'ok',
        'source' => $cached ? 'cache' : 'api',
        'symbol' => $symbol,
        'range' => $range,
        'data' => $preciosRecortados
    ]));
    return $response->withHeader('Content-Type', 'application/json');
    
});

// Endpoint para obtener tipo de cambio USD/MXN (con caché y forward fill)
$app->get('/api/tipo-cambio', function (Request $request, Response $response, $args) {
    $pdo = require __DIR__ . '/config/database.php';
    
    $params = $request->getQueryParams();
    $range = $params['range'] ?? '1m';

    // FIX 1: Usar timezone de México para que "hoy" sea correcto
    $tz = new DateTimeZone('America/Mexico_City');
    $ahora = new DateTime('now', $tz);
    $hoy = $ahora->format('Y-m-d');
    $fechaFin = $hoy;
    
    $rangeMap = [
        '1m' => (clone $ahora)->modify('-45 days')->format('Y-m-d'),
        '3m' => (clone $ahora)->modify('-120 days')->format('Y-m-d'),
        '6m' => (clone $ahora)->modify('-210 days')->format('Y-m-d'),
        '1y' => (clone $ahora)->modify('-400 days')->format('Y-m-d'),
    ];
    $fechaInicio = $rangeMap[$range] ?? $rangeMap['1m'];
    
    // Verificar caché
    $stmt = $pdo->prepare("SELECT datos_json FROM cache_cambio 
                           WHERE rango = :range 
                           AND julianday('now') - julianday(fecha_consulta) < 0.25");
    $stmt->execute([':range' => $range]);
    $cached = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($cached) {
        $response->getBody()->write(json_encode([
            'status' => 'ok', 'source' => 'cache', 'range' => $range,
            'data' => json_decode($cached['datos_json'], true)
        ]));
        return $response->withHeader('Content-Type', 'application/json');
    }
    
    // Consultar Banxico
    $token = $_ENV['BANXICO_TOKEN'];
    $url = "https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/$fechaInicio/$fechaFin?mediaType=json&token=$token";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $jsonRespuesta = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error Banxico']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
    
    $datos = json_decode($jsonRespuesta, true);
    $datosRaw = $datos['bmx']['series'][0]['datos'] ?? [];
    
    // Mapa fecha -> valor (solo fechas <= hoy)
    $valoresPorFecha = [];
    foreach ($datosRaw as $item) {
        $partes = explode('/', $item['fecha']);
        $fechaIso = $partes[2] . '-' . $partes[1] . '-' . $partes[0];
        
        // FIX 2: Ignorar fechas futuras que Banxico pueda devolver
        if ($fechaIso > $hoy) {
            continue;
        }
        
        $valor = floatval($item['dato']);
        // FIX 3: Ignorar valores no numéricos (Banxico a veces manda "N/E")
        if ($valor > 0) {
            $valoresPorFecha[$fechaIso] = $valor;
        }
    }
    
    // Obtener el último valor válido de los datos filtrados
    $ultimoValor = null;
    if (!empty($valoresPorFecha)) {
        ksort($valoresPorFecha); // ordenar por fecha
        $ultimoValor = end($valoresPorFecha);
    }
    
    // Generar todas las fechas del rango 
    $fechasProcesadas = [];
    $fechaActual = new DateTime($fechaInicio, $tz);
    $fechaFinObj = new DateTime($fechaFin, $tz);
    
    while ($fechaActual <= $fechaFinObj) {
        $fechaIso = $fechaActual->format('Y-m-d');
        
        // Forward fill: si hay dato para este día, actualizar último valor
        if (isset($valoresPorFecha[$fechaIso])) {
            $ultimoValor = $valoresPorFecha[$fechaIso];
        }
        
        // Solo agregar si ya tenemos al menos un valor (evita nulls al inicio del rango)
        if ($ultimoValor !== null) {
            $fechasProcesadas[] = [
                'fecha' => $fechaIso,
                'tipo_cambio' => $ultimoValor
            ];
        }
        
        $fechaActual->modify('+1 day');
    }
    
    // Guardar en caché
    $stmt = $pdo->prepare("INSERT INTO cache_cambio (rango, datos_json, fecha_consulta) 
                           VALUES (:range, :json, datetime('now'))");
    $stmt->execute([':range' => $range, ':json' => json_encode($fechasProcesadas)]);
    
    $response->getBody()->write(json_encode([
        'status' => 'ok', 'source' => 'api', 'range' => $range, 'data' => $fechasProcesadas
    ]));
    return $response->withHeader('Content-Type', 'application/json');
});

// Endpoint para calcular rendimientos (reutiliza caché de precios y tipo de cambio)
$app->get('/api/rendimientos', function (Request $request, Response $response, $args) {
    $pdo = require __DIR__ . '/config/database.php';

    $params = $request->getQueryParams();
    $symbol = $params['symbol'] ?? 'AAPL';
    $range = $params['range'] ?? '1m';
    
     // 1. Obtener precios de la caché o de Twelve Data
    $rangeMap = ['1m' => 30, '3m' => 90, '6m' => 180, '1y' => 365];
    $diasNecesarios = $rangeMap[$range] ?? 30;

    $stmt = $pdo->prepare("SELECT datos_json FROM cache_precio 
                           WHERE simbolo = :symbol 
                           AND julianday('now') - julianday(fecha_consulta) < 1");
    $stmt->execute([':symbol' => $symbol]);
    $cachedPrecios = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$cachedPrecios) {
        $apiKey = $_ENV['TWELVE_DATA_API_KEY'];
        $url = "https://api.twelvedata.com/time_series?symbol=$symbol&interval=1day&outputsize=365&apikey=$apiKey";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $jsonRespuesta = curl_exec($ch);
        curl_close($ch);
        
        $datosPrecios = json_decode($jsonRespuesta, true);
        if (isset($datosPrecios['status']) && $datosPrecios['status'] === 'error') {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => $datosPrecios['message'] ?? 'Error en Twelve Data']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }
        $precios = $datosPrecios['values'];

        $stmt = $pdo->prepare("INSERT INTO cache_precio (simbolo, rango, datos_json, fecha_consulta) 
                               VALUES (:symbol, '1y', :json, datetime('now'))");
        $stmt->execute([':symbol' => $symbol, ':json' => json_encode($precios)]);
        
    } else {
        $precios = json_decode($cachedPrecios['datos_json'], true);
    }

    $precios = array_slice($precios, 0, $diasNecesarios);
    $fechaMasAntigua = $precios[count($precios) - 1]['datetime'];
    
    // 2. Obtener tipo de cambio de la caché
    $stmt = $pdo->prepare("SELECT datos_json FROM cache_cambio 
                           WHERE rango = :range 
                           AND julianday('now') - julianday(fecha_consulta) < 0.25");
    $stmt->execute([':range' => $range]);
    $cachedCambio = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$cachedCambio) {
        $tz = new DateTimeZone('America/Mexico_City');
        $ahora = new DateTime('now', $tz);
        $hoy = $ahora->format('Y-m-d');
        $rangeMap = [
            '1m' => (clone $ahora)->modify('-45 days')->format('Y-m-d'), 
            '3m' => (clone $ahora)->modify('-120 days')->format('Y-m-d'), 
            '6m' => (clone $ahora)->modify('-210 days')->format('Y-m-d'),
            '1y' => (clone $ahora)->modify('-400 days')->format('Y-m-d')
        ];
        
        //$fechaInicio = $rangeMap[$range] ?? $rangeMap['1m'];            
        $fechaInicio = $fechaMasAntigua;
        $fechaFin = $hoy;

        $token = $_ENV['BANXICO_TOKEN'];
        $url = "https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/$fechaInicio/$fechaFin?mediaType=json&token=$token";

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $jsonRespuesta = curl_exec($ch);
        curl_close($ch);

        $datos = json_decode($jsonRespuesta, true);
        $datosRaw = $datos['bmx']['series'][0]['datos'] ?? [];

        $valoresPorFecha = [];
        foreach ($datosRaw as $item) {
            $partes = explode('/', $item['fecha']);
                $fechaIso = $partes[2] . '-' . $partes[1] . '-' . $partes[0];
                if ($fechaIso > $hoy) continue;
                $valor = floatval($item['dato']);
                if ($valor > 0) $valoresPorFecha[$fechaIso] = $valor;
        }

        ksort($valoresPorFecha);
        $ultimoValor = !empty($valoresPorFecha) ? end($valoresPorFecha) : null;

        $fechasProcesadas = [];
        $fechaActual = new DateTime($fechaInicio, $tz);
        $fechaFinObj = new DateTime($fechaFin, $tz);
        while ($fechaActual <= $fechaFinObj) {                
            $fechaIso = $fechaActual->format('Y-m-d');
            if (isset($valoresPorFecha[$fechaIso])) $ultimoValor = $valoresPorFecha[$fechaIso];
            if ($ultimoValor !== null) {
                $fechasProcesadas[] = ['fecha' => $fechaIso, 'tipo_cambio' => $ultimoValor];
            }
            $fechaActual->modify('+1 day');
        }

        $stmt = $pdo->prepare("INSERT INTO cache_cambio (rango, datos_json, fecha_consulta) 
                                VALUES (:range, :json, datetime('now'))");
        $stmt->execute([':range' => $range, ':json' => json_encode($fechasProcesadas)]);

        $tiposCambio = $fechasProcesadas;
    } 
    else { $tiposCambio = json_decode($cachedCambio['datos_json'], true); }

    
    // Crear mapa fecha -> tipo_cambio
    $tipoCambioMap = [];
    foreach ($tiposCambio as $item) {
        $tipoCambioMap[$item['fecha']] = $item['tipo_cambio'];
    }
    
    // 3. Procesar datos: calcular precios en MXN
    $resultados = [];
    $preciosUSD = [];
    $preciosMXN = [];
    $fechas = [];
    
    foreach ($precios as $precio) {
        $fecha = $precio['datetime'];
        $closeUSD = floatval($precio['close']);
        $tipoCambio = $tipoCambioMap[$fecha] ?? end($tiposCambio)['tipo_cambio'];
        $closeMXN = $closeUSD * $tipoCambio;
        
        $preciosUSD[] = $closeUSD;
        $preciosMXN[] = $closeMXN;
        $fechas[] = $fecha;
    }
    
    // 4. Calcular rendimientos diarios
    $rendimientoDiarioUSD = [0];
    $rendimientoDiarioMXN = [0];
    for ($i = 1; $i < count($preciosUSD); $i++) {
        $rendimientoDiarioUSD[] = (($preciosUSD[$i] - $preciosUSD[$i-1]) / $preciosUSD[$i-1]) * 100;
        $rendimientoDiarioMXN[] = (($preciosMXN[$i] - $preciosMXN[$i-1]) / $preciosMXN[$i-1]) * 100;
    }
    
    // 5. Calcular rendimientos acumulados
    $precioInicialUSD = $preciosUSD[count($preciosUSD) - 1];
    $precioInicialMXN = $preciosMXN[count($preciosMXN) - 1];
    $rendimientoAcumuladoUSD = [];
    $rendimientoAcumuladoMXN = [];
    foreach ($preciosUSD as $i => $precio) {
        $rendimientoAcumuladoUSD[] = (($precio - $precioInicialUSD) / $precioInicialUSD) * 100;
        $rendimientoAcumuladoMXN[] = (($preciosMXN[$i] - $precioInicialMXN) / $precioInicialMXN) * 100;
    }
    
    // 6. Calcular impacto cambiario (diferencia MXN - USD)
    $impactoCambiario = [];
    for ($i = 0; $i < count($rendimientoAcumuladoUSD); $i++) {
        $impactoCambiario[] = $rendimientoAcumuladoMXN[$i] - $rendimientoAcumuladoUSD[$i];
    }
    
    // 7. Construir respuesta
    $respuestaData = [];
    for ($i = 0; $i < count($fechas); $i++) {
        $respuestaData[] = [
            'fecha' => $fechas[$i],
            'precio_usd' => round($preciosUSD[$i], 2),
            'precio_mxn' => round($preciosMXN[$i], 2),
            'rendimiento_diario_usd' => round($rendimientoDiarioUSD[$i], 2),
            'rendimiento_diario_mxn' => round($rendimientoDiarioMXN[$i], 2),
            'rendimiento_acumulado_usd' => round($rendimientoAcumuladoUSD[$i], 2),
            'rendimiento_acumulado_mxn' => round($rendimientoAcumuladoMXN[$i], 2),
            'impacto_cambiario' => round($impactoCambiario[$i], 2)
        ];
    }
    
    $response->getBody()->write(json_encode([
        'status' => 'ok',
        'symbol' => $symbol,
        'range' => $range,
        'data' => $respuestaData
    ]));
    return $response->withHeader('Content-Type', 'application/json');
});

// Usuarios
$JWT_SECRET = $_ENV['JWT_SECRET'];

//Endpoint para el registro de usuarios 
$app->post('/api/auth/register', function (Request $request, Response $response) use ($JWT_SECRET) {
    $pdo = require __DIR__ . '/config/database.php';
    $body = json_decode($request->getBody()->getContents(), true);

    $nombre = trim($body['nombre'] ?? '');
    $correo = trim($body['correo'] ?? '');
    $password = $body['contrasena'] ?? '';

    //Validaciones
    if(!$nombre || !$correo || !$password){
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Todos los campos son requeridos']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
    if(!filter_var($correo, FILTER_VALIDATE_EMAIL)){
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Correo inválido']));
        return $response->withHeader('Content-type', 'application/json')->withStatus(400);
    }
    if(strlen($password) < 8){
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'La contraseña debe tener al menos 8 caracteres']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(409);
    }

    $stmt = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE correo = :correo");
    $stmt->execute([':correo' => $correo]);

    if($stmt->fetch()){
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'El correo ya está regstrado']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(409);
    }
    //Guardar usuario
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, correo, contrasena) VALUES (:nombre, :correo, :hash)");
    $stmt->execute([':nombre' => $nombre, ':correo' => $correo, ':hash' => $hash]);
    $id = $pdo->lastInsertId();

    //Generar JWT
    $payload = ['sub' => $id, 'nombre' => $nombre, 'correo' => $correo, 'iat' => time(), 'exp' => time() + 85400];
    $token = JWT::encode($payload, $JWT_SECRET, 'HS256');

    $response->getBody()->write(json_encode(['status' => 'ok', 'token' => $token, 'nombre' => $nombre]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
});

//Endpoint para el logeo de usuarios
$app->post('/api/auth/login', function (Request $request, Response $response) use ($JWT_SECRET) {
    $pdo = require __DIR__ . '/config/database.php';
    $body = json_decode($request->getBody()->getContents(), true);

    $correo = trim($body['correo'] ?? '');
    $password = $body['contrasena'] ?? '';

    if(!$correo || !$password){
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Correo y contraseña requeridos']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE correo = :correo");
    $stmt->execute([':correo' => $correo]);
    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

    if(!$usuario || !password_verify($password, $usuario['contrasena'])) {
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Credenciales incorrectas']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    $payload = ['sub' => $usuario['id_usuario'], 'nombre' => $usuario['nombre'], 'correo' => $correo, 'iat' => time(), 'exp' => time() + 86400];
    $token = JWT::encode($payload, $JWT_SECRET, 'HS256');

    $response->getBody()->write(json_encode(['status' => 'ok', 'token' => $token, 'nombre' => $usuario['nombre']]));
    return $response->withHeader('Content-Type', 'application/json');
});

//Favoritos
//Verificación de JWT
function verificarToken (Request $request, $pdo) {
    $authHeader = $request->getHeaderLine('Authorization');
    if(!$authHeader || !str_starts_with($authHeader, 'Bearer ')){
        throw new Exception('Token no proporcionado');
    }
    $token = substr($authHeader, 7);
    try{
        $decode = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($_ENV['JWT_SECRET'], 'HS256'));
        return $decode->sub;
    }catch(Exception $e){
        throw new Exception('Token inválido');
    }
}

//Obtener favoritos de usuario
$app->get('/api/favoritos', function (Request $request, Response $response) {
    $pdo = require __DIR__ . '/config/database.php';
    try{
        $id_usuario = verificarToken($request, $pdo);
        $stmt = $pdo->prepare("SELECT simbolo FROM favoritos WHERE id_usuario = :id_usuario");
        $stmt->execute([':id_usuario' => $id_usuario]);
        $favoritos = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $response->getBody()->write(json_encode(['status' => 'ok', 'data' => $favoritos]));
        return $response->withHeader('Content-Type', 'application/json');
    }catch(Exception $e){
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
});

//Agregar favorito
$app->post('/api/favoritos', function (Request $request, Response $response) {
    $pdo = require __DIR__ . '/config/database.php';
    try{
        $id_usuario = verificarToken($request, $pdo);
        $body = json_decode($request->getBody()->getContents(), true);
        $simbolo = $body['simbolo'] ?? null;

        if(!$simbolo){
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Símbolo requeridp']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        //Verificar si ya existe
        $stmt = $pdo->prepare("SELECT id_favorito FROM favoritos WHERE id_usuario = :id_usuario AND simbolo = :simbolo");
        $stmt->execute([':id_usuario' => $id_usuario, ':simbolo' => $simbolo]);

        if($stmt->fetch()){
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Ya está en favoritos']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(409);
        }

        $stmt = $pdo->prepare("INSERT INTO favoritos (simbolo, id_usuario) VALUES (:simbolo, :id_usuario)");
        $stmt->execute([':simbolo' => $simbolo, ':id_usuario' => $id_usuario]);

        $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Favorito agregado']));
        return $response->withHeader('Content-Type', 'application/json');
    }catch(Exception $e){
        $response->getBody()->write(json_encode(['staus' => 'error', 'message' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
});

//Eliminar favorito
$app->delete('/api/favoritos/{simbolo}', function (Request $request, Response $response, $args) {
    $pdo = require __DIR__ . '/config/database.php';
    
    try{
        $id_usuario = verificarToken($request, $pdo);
        $simbolo = $args['simbolo'];

        $stmt = $pdo->prepare("DELETE FROM favoritos WHERE id_usuario = :id_usuario AND simbolo = :simbolo");
        $stmt->execute([':id_usuario' => $id_usuario, ':simbolo' => $simbolo]);

        $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Favorito eliminado']));
        return $response->withHeader('Content-Type', 'application/json');
    }catch(Exception $e){
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => $e->getMessage()]));
        return $response->withHeader('Content-Type','application/json')->withStatus(401);
    }
});

$app->run();