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

// ==========================================
// 2. M+ôDULO DE ALERTAS (BAJO STOCK)
// ==========================================
app.get('/api/alertas/bajo-stock', (req, res) => {
  const query = `
    SELECT p.*, c.nombre AS categoria_nombre 
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.stock_actual <= p.stock_minimo 
    ORDER BY p.stock_actual ASC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ==========================================
// 3. M+ôDULO DE VENTAS (PUNTO DE VENTA)
// ==========================================

// Registrar una venta con transacci+¦n y descuento autom+ítico de stock
app.post('/api/ventas', (req, res) => {
  const { cliente_nombre, cliente_dni, total, metodo_pago, items } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'El carrito no contiene productos' });
  }

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: err.message });

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: err.message });
      }

      // 1. Insertar Cabecera de Venta
      const queryVenta = `
        INSERT INTO ventas (cliente_nombre, cliente_dni, total, metodo_pago) 
        VALUES (?, ?, ?, ?)
      `;
      connection.query(queryVenta, [cliente_nombre || 'Cliente General', cliente_dni || '', total, metodo_pago || 'Efectivo'], (err, resultVenta) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            res.status(500).json({ error: err.message });
          });
        }

        const ventaId = resultVenta.insertId;

        // 2. Insertar Detalle y Descontar Stock para cada producto
        let itemsProcesados = 0;
        for (let item of items) {
          const queryDetalle = `
            INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
            VALUES (?, ?, ?, ?, ?)
          `;
          const subtotal = item.precio * item.cantidad;

          connection.query(queryDetalle, [ventaId, item.id, item.cantidad, item.precio, subtotal], (err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ error: err.message });
              });
            }

            // Descontar inventario
            const queryStock = 'UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?';
            connection.query(queryStock, [item.cantidad, item.id], (err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({ error: err.message });
                });
              }

              itemsProcesados++;
              if (itemsProcesados === items.length) {
                connection.commit((err) => {
                  if (err) {
                    return connection.rollback(() => {
                      connection.release();
                      res.status(500).json({ error: err.message });
                    });
                  }
                  connection.release();
                  res.status(201).json({ message: 'Venta registrada con +®xito', ventaId });
                });
              }
            });
          });
        }
      });
    });
  });
});

// Listar historial de ventas
app.get('/api/ventas', (req, res) => {
  const query = `
    SELECT v.*, COUNT(d.id) AS total_articulos
    FROM ventas v
    LEFT JOIN detalle_ventas d ON v.id = d.venta_id
    GROUP BY v.id
    ORDER BY v.fecha DESC
    LIMIT 50
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Estad+¡sticas para el resumen
app.get('/api/dashboard', (req, res) => {
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM productos) AS total_productos,
      (SELECT COUNT(*) FROM productos WHERE stock_actual <= stock_minimo) AS total_alertas,
      (SELECT COUNT(*) FROM ventas WHERE DATE(fecha) = CURDATE()) AS ventas_hoy,
      (SELECT IFNULL(SUM(total), 0) FROM ventas WHERE DATE(fecha) = CURDATE()) AS ingresos_hoy
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend de Nova Salud corriendo en el puerto ${PORT}`);
});
