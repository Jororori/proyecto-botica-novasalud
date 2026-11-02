const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());

// Configuraci+¦n del pool de conexi+¦n a MySQL
const db = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'botica_novasalud',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Prueba de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor Nova Salud activo' });
});

// ==========================================
// 1. M+ôDULO DE INVENTARIO / PRODUCTOS
// ==========================================

// Listar todos los medicamentos
app.get('/api/productos', (req, res) => {
  const query = `
    SELECT p.*, c.nombre AS categoria_nombre 
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    ORDER BY p.id DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Listar categor+¡as disponibles
app.get('/api/categorias', (req, res) => {
  db.query('SELECT * FROM categorias ORDER BY nombre ASC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Registrar nuevo producto
app.post('/api/productos', (req, res) => {
  const { codigo_barras, nombre, descripcion, categoria_id, precio, stock_actual, stock_minimo, fecha_vencimiento } = req.body;
  const query = `
    INSERT INTO productos (codigo_barras, nombre, descripcion, categoria_id, precio, stock_actual, stock_minimo, fecha_vencimiento) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(query, [codigo_barras, nombre, descripcion, categoria_id || 1, precio, stock_actual, stock_minimo, fecha_vencimiento], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Producto registrado con +®xito', id: result.insertId });
  });
});

// Actualizar producto
app.put('/api/productos/:id', (req, res) => {
  const { id } = req.params;
  const { codigo_barras, nombre, descripcion, categoria_id, precio, stock_actual, stock_minimo, fecha_vencimiento } = req.body;
  const query = `
    UPDATE productos 
    SET codigo_barras = ?, nombre = ?, descripcion = ?, categoria_id = ?, precio = ?, stock_actual = ?, stock_minimo = ?, fecha_vencimiento = ?
    WHERE id = ?
  `;
  db.query(query, [codigo_barras, nombre, descripcion, categoria_id || 1, precio, stock_actual, stock_minimo, fecha_vencimiento, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Producto actualizado con +®xito' });
  });
});

// Eliminar producto
app.delete('/api/productos/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM productos WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Producto eliminado con +®xito' });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend de Nova Salud corriendo en el puerto ${PORT}`);
});
