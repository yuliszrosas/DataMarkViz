<?php
$databasePath = 'C:/xampp/htdocs/datamarkviz/backend/database/datamarkviz.db';
$pdo = new PDO("sqlite:$databasePath");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$pdo->exec("DELETE FROM cache_cambio");
$pdo->exec("DELETE FROM cache_precio");

echo "Caché limpiado exitosamente.\n";

$stmt = $pdo->query("SELECT COUNT(*) FROM cache_cambio");
echo "Filas en cache_cambio: " . $stmt->fetchColumn() . "\n";

$stmt = $pdo->query("SELECT COUNT(*) FROM cache_precio");
echo "Filas en cache_precio: " . $stmt->fetchColumn() . "\n";
?>