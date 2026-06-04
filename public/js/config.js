// config.js — Konfigurasi URL API terpusat
// Otomatis deteksi environment: production (Railway) atau local
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? ''  // Local: pakai relative URL (server.js jalan di localhost)
  : 'https://rab-sid.up.railway.app';  // Production: arahkan ke Railway

// Ekspor supaya bisa dipakai di semua file JS
window.API_BASE = API_BASE;
