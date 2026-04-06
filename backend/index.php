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

$app->run();