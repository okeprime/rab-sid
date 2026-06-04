// src/database/init.js
// Koneksi MySQL menggunakan mysql2/promise pool
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rabsid_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00',
});

async function initDatabase() {
  const connection = await pool.getConnection();

  try {
    console.log('Menginisialisasi database...');

    // Pastikan database ada
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'rabsid_db'}\``);
    await connection.query(`USE \`${process.env.DB_NAME || 'rabsid_db'}\``);

    // Tabel users
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        hint VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabel materials
    await connection.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        price DOUBLE DEFAULT 0,
        category VARCHAR(100),
        lokasi VARCHAR(255),
        sumber_data VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id INT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabel ahs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ahs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kelompok VARCHAR(255) NOT NULL,
        kode_ahs VARCHAR(100) NOT NULL,
        ahs VARCHAR(255) NOT NULL,
        satuan VARCHAR(50) NOT NULL,
        user_id INT NOT NULL,
        lokasi VARCHAR(255),
        sumber_data VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabel pricing
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pricing (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ahs_id INT NOT NULL,
        material_id INT NOT NULL,
        quantity DOUBLE DEFAULT 0,
        koefisien DOUBLE DEFAULT 0,
        ppn_percentage DOUBLE DEFAULT 0,
        profit_percentage DOUBLE DEFAULT 0,
        total_after_tax_profit DOUBLE DEFAULT 0,
        user_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ahs_id) REFERENCES ahs(id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabel projects
    await connection.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        funding VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabel subprojects
    await connection.query(`
      CREATE TABLE IF NOT EXISTS subprojects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabel bq
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bq (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        ahs_id INT NOT NULL,
        subproject_id INT,
        shape VARCHAR(100),
        dimensions TEXT,
        volume DOUBLE DEFAULT 0,
        satuan VARCHAR(20) DEFAULT 'm3',
        total_price DOUBLE DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (ahs_id) REFERENCES ahs(id) ON DELETE CASCADE,
        FOREIGN KEY (subproject_id) REFERENCES subprojects(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Insert admin default jika belum ada
    await connection.query(
      `INSERT IGNORE INTO users (username, password, hint) VALUES (?, ?, ?)`,
      ['admin', 'admin', 'Default admin account']
    );

    console.log('Database berhasil diinisialisasi!');
  } finally {
    connection.release();
  }

  return pool;
}

module.exports = { initDatabase, pool };
