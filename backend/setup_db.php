
<?php
//1. Crear la carpeta database sino existe
$dbDir = __DIR__ . '/database';
if(!is_dir($dbDir)){
mkdir($dbDir, 0777, true);
echo "Carpera database creada \n";
}

//2. Conectar a SQLite (crea el archivo datamakviz.db si no existe)
$dbPath = $dbDir . '/datamarkviz.db';
$pdo = new PDO("sqlite:$dbPath");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec("PRAGMA foreing_keys = ON");

//3.Crear las tablas segú tu modelo relacional
$sql="
-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios(
id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
nombre TEXT NOT NULL,
correo TEXTO UNIQUE NOT NULL,
contrasena TEXT NOT NULL
);
-- Tabla de favoritos
CREATE TABLE IF NOT EXISTS favoritos(
id_favorito INTEGER PRIMARY KEY AUTOINCREMENT,
simbolo TEXT NOT NULL,
id_usuario INTEGER NOT NULL,
FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE);
-- Tabla de caché para percios (Twelve Data)
CREATE TABLE IF NOT EXISTS cache_precio(
id_cache_precio INTEGER PRIMARY KEY AUTOINCREMENT,
simbolo TEXT NOT NULL,
rango TEXT NOT NULL,
datos_json TEXT NOT NULL,
fecha_consulta DATETIME NOT NULL);
-- Tabla de caché para tipo de cambio (Banxico)
CREATE TABLE IF NOT EXISTS cache_cambio (
id_cache_cambio INTEGER PRIMARY KEY AUTOINCREMENT,
rango TEXT NOT NULL,
datos_json TEXT NOT NULL,
fecha_consulta DATETIME NOT NULL);
";

//Ejecutar las consultas SQL
$pdo->exec($sql);
echo "Tablas creadas exitosamente\n";

//4. Verificar que las tablas se crearon
$tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
echo "Tablas en la base de datos: " . implode(",", $tables) . "\n";
echo "Base de datos creada en: $dbPath\n";
