# SIPETA ZNT Klungkung — revisi tampilan dan hasil identifikasi

## Cara menjalankan
1. Ekstrak ZIP.
2. Jalankan `index.html` menggunakan VS Code Live Server, atau unggah seluruh isi folder ke repository GitHub.
3. Aktifkan GitHub Pages pada Settings → Pages → Deploy from a branch → `main` → `/root`.
4. Aplikasi mencoba membaca WMS GetCapabilities dari endpoint ATR/BPN Klungkung.

## Perbaikan pada revisi ini
- Tata letak lebih rapi dan responsif.
- Panel layer, peta, kontrol navigasi, dan status koneksi dipisahkan dengan jelas.
- Daftar layer dibaca dinamis dari XML, termasuk XML dengan namespace.
- Hasil GetFeatureInfo tidak lagi memasukkan HTML server mentah ke halaman. Isi diubah menjadi teks/tabel aman agar format tampilan tidak merusak aplikasi.
- Pesan kesalahan koneksi dibuat lebih jelas.

## Catatan integrasi
Aplikasi menggunakan operasi WMS standar GetCapabilities, GetMap, dan GetFeatureInfo. Keberhasilan tetap bergantung pada ketersediaan endpoint, hak akses, dukungan WMS, dan kebijakan CORS. Jika browser memblokir CORS atau layanan membutuhkan token, gunakan backend/proxy yang disetujui pengelola layanan. Jangan menyimpan token rahasia pada JavaScript publik.


## Perbaikan respons GetFeatureInfo (versi terbaru)
Respons JSON API yang memiliki properti `data` berisi HTML GeoServer kini diurai bertingkat. HTML pada `data` dirender sebagai tabel atribut (bukan ditampilkan sebagai teks HTML), sedangkan status dan pesan API ditampilkan terpisah. Nilai sel ditampilkan sebagai teks aman.
