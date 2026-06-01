<?php
require __DIR__ . '/vendor/autoload.php';

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;

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
    $outputsize = $rangeMap[$range] ?? 30;
    
    // 1. Verificar caché
    $stmt = $pdo->prepare("SELECT datos_json, fecha_consulta FROM cache_precio 
                           WHERE simbolo = :symbol AND rango = :range 
                           AND julianday('now') - julianday(fecha_consulta) < 1");
    $stmt->execute([':symbol' => $symbol, ':range' => $range]);
    $cached = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($cached) {
        // Datos del caché
        $precios = json_decode($cached['datos_json'], true);
        $response->getBody()->write(json_encode([
            'status' => 'ok',
            'source' => 'cache',
            'symbol' => $symbol,
            'range' => $range,
            'data' => $precios
        ]));
        return $response->withHeader('Content-Type', 'application/json');
    }
    
    // 2. Consultar a TD
    $apiKey = 'a52c3d02be2740e4881d9aaa290844d1';
    $url = "https://api.twelvedata.com/time_series?symbol=$symbol&interval=1day&outputsize=$outputsize&apikey=$apiKey";
    
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
    
    // 3. Guardar en caché
    $stmt = $pdo->prepare("INSERT INTO cache_precio (simbolo, rango, datos_json, fecha_consulta) 
                           VALUES (:symbol, :range, :json, datetime('now'))");
    $stmt->execute([
        ':symbol' => $symbol,
        ':range' => $range,
        ':json' => json_encode($datos['values'])
    ]);
    
    $response->getBody()->write(json_encode([
        'status' => 'ok',
        'source' => 'api',
        'symbol' => $symbol,
        'range' => $range,
        'data' => $datos['values']
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
        '1m' => (clone $ahora)->modify('-1 month')->format('Y-m-d'),
        '3m' => (clone $ahora)->modify('-3 months')->format('Y-m-d'),
        '6m' => (clone $ahora)->modify('-6 months')->format('Y-m-d'),
        '1y' => (clone $ahora)->modify('-1 year')->format('Y-m-d'),
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
    $token = '959e70f0e3c12594de35e4412b8ab174d823efb01b0fff2a4ecbbbf02d51d599';
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

$app->run();