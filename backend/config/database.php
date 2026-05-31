<?php
$databasePath = __DIR__ . '/../database/datamarkviz.db';
try{
$pdo = new PDO("sqlite:$databasePath");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec("PRAGMA foreign_keys = ON");
} catch(PDOException $e){
die("Error de conexión a SQLite: " . $e->getMessge());
}
return $pdo;
