-- Base de datos para Botica Nova Salud
CREATE DATABASE IF NOT EXISTS botica_novasalud;
USE botica_novasalud;

-- Tabla de Categor+¡as de Medicamentos
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255)
);

-- Tabla de Productos / Medicamentos
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_barras VARCHAR(50) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255),
    categoria_id INT,
    precio DECIMAL(10, 2) NOT NULL,
    stock_actual INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5,
    fecha_vencimiento DATE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

-- Tabla de Ventas
CREATE TABLE IF NOT EXISTS ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    cliente_nombre VARCHAR(150) DEFAULT 'Cliente General',
    cliente_dni VARCHAR(20),
    total DECIMAL(10, 2) NOT NULL,
    metodo_pago VARCHAR(50) DEFAULT 'Efectivo'
);

-- Detalle de Venta
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Inserci+¦n de datos iniciales / semilla para pruebas
INSERT INTO categorias (nombre, descripcion) VALUES
('Analg+®sicos y Antiinflamatorios', 'Medicamentos para aliviar dolor e inflamaci+¦n'),
('Antibi+¦ticos', 'Medicamentos para combatir infecciones bacterianas'),
('Antihistam+¡nicos', 'Tratamiento de alergias y rinitis'),
('Cuidado Personal', 'Higiene y primeros auxilios');

INSERT INTO productos (codigo_barras, nombre, descripcion, categoria_id, precio, stock_actual, stock_minimo, fecha_vencimiento) VALUES
('7750001001', 'Paracetamol 500mg', 'Caja x 100 tabletas - Alivio del dolor y la fiebre', 1, 15.50, 4, 10, '2026-12-31'),
('7750001002', 'Ibuprofeno 400mg', 'Bl+¡ster x 10 c+ípsulas - Antiinflamatorio no esteroideo', 1, 8.00, 25, 10, '2026-10-15'),
('7750001003', 'Amoxicilina 500mg', 'Caja x 30 c+ípsulas - Antibi+¦tico de amplio espectro', 2, 22.00, 3, 8, '2026-08-20'),
('7750001004', 'Cetirizina 10mg', 'Caja x 20 tabletas - Antial+®rgico de segunda generaci+¦n', 3, 12.50, 18, 5, '2027-01-10'),
('7750001005', 'Alcohol Medicinal 70%', 'Frasco 1 Litro - Antis+®ptico y desinfectante', 4, 9.00, 2, 6, '2027-05-30');

