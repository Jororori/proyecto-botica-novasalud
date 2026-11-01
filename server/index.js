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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend de Nova Salud corriendo en el puerto ${PORT}`);
});
