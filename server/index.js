const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());


const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
const dbName = process.env.DB_NAME || 'botica_novasalud';
const dbPort = Number(process.env.DB_PORT) || 3307;

const db = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: dbPort,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


db.getConnection((err, connection) => {
  if (err) {
    console.error(`[MySQL Error] No se pudo conectar a la base de datos en ${dbHost}:${dbPort} (${err.code}):`, err.message);
  } else {
    console.log(`[MySQL] Conexión establecida exitosamente con la base de datos "${dbName}" en ${dbHost}:${dbPort}`);
    connection.release();
  }
});


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor Nova Salud activo' });
});


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


app.get('/api/categorias', (req, res) => {
  db.query('SELECT * FROM categorias ORDER BY nombre ASC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


app.post('/api/productos', (req, res) => {
  const { codigo_barras, nombre, descripcion, categoria_id, precio, stock_actual, stock_minimo, fecha_vencimiento } = req.body;
  const query = `
    INSERT INTO productos (codigo_barras, nombre, descripcion, categoria_id, precio, stock_actual, stock_minimo, fecha_vencimiento) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(query, [codigo_barras, nombre, descripcion, categoria_id || 1, precio, stock_actual, stock_minimo, fecha_vencimiento], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Producto registrado con éxito', id: result.insertId });
  });
});


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
    res.json({ message: 'Producto actualizado con éxito' });
  });
});


app.delete('/api/productos/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM productos WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Producto eliminado con éxito' });
  });
});


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
                  res.status(201).json({ message: 'Venta registrada con éxito', ventaId });
                });
              }
            });
          });
        }
      });
    });
  });
});


// Listar historial de ventas con resumen de medicamentos vendidos
app.get('/api/ventas', (req, res) => {
  const query = `
    SELECT 
      v.*, 
      COUNT(d.id) AS total_articulos,
      IFNULL(GROUP_CONCAT(CONCAT(d.cantidad, 'x ', IFNULL(p.nombre, 'Medicamento')) SEPARATOR ', '), 'Sin artículos') AS productos_resumen
    FROM ventas v
    LEFT JOIN detalle_ventas d ON v.id = d.venta_id
    LEFT JOIN productos p ON d.producto_id = p.id
    GROUP BY v.id
    ORDER BY v.fecha DESC
    LIMIT 100
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Obtener el detalle específico de productos de una venta
app.get('/api/ventas/:id/detalle', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      d.id,
      d.venta_id,
      d.producto_id,
      d.cantidad,
      d.precio_unitario,
      d.subtotal,
      IFNULL(p.nombre, 'Medicamento') AS producto_nombre,
      p.codigo_barras,
      c.nombre AS categoria_nombre
    FROM detalle_ventas d
    LEFT JOIN productos p ON d.producto_id = p.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE d.venta_id = ?
    ORDER BY d.id ASC
  `;
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


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
