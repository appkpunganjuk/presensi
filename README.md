# Blueprint Aplikasi Presensi Pegawai

## Ikhtisar

Aplikasi ini adalah sistem presensi pegawai sederhana yang memungkinkan pegawai untuk mencatat kehadiran mereka dan melihat rekapitulasi harian. Aplikasi ini memiliki fitur-fitur berikut:

- **Halaman Formulir Presensi (`index.html`):**
  - Latar belakang halaman dengan efek blur yang tetap saat digulir.
  - Logo KPU di bagian atas formulir.
  - Peta interaktif yang menunjukkan lokasi pengguna saat ini, dengan tombol muat ulang.
  - Alamat yang terdeteksi secara otomatis.
  - Kolom pencarian nama pegawai yang interaktif.
  - Pilihan status kehadiran (DATANG, PULANG, DINAS LUAR, WFH/WFA).
  - Footer dinamis yang menampilkan tahun berjalan.

- **Halaman Rekapitulasi Presensi (`rekap.html`):**
  - **Desain Fokus Data:** Kontainer utama diatur ke 90% lebar dan tinggi layar untuk memaksimalkan ruang pandang tabel.
  - **Judul Dinamis & Serasi:** Judul halaman diperkecil dan berubah secara otomatis sesuai hari dan tanggal saat ini.
  - Menampilkan tabel data presensi harian yang diambil dari Google Spreadsheet dengan scroll internal.
  - **Data diurutkan secara kronologis (dari jam paling awal hingga akhir).**
  - Indikator *loading* saat data sedang diambil.
  - **Kalkulasi Jam Pulang:** Secara otomatis menghitung estimasi jam pulang untuk status "DATANG" berdasarkan jam masuk dan hari kerja.
  - **Tampilan LKH:** Status "Sudah" pada kolom LKH ditampilkan sebagai *badge* berwarna hijau untuk visibilitas yang lebih baik.
  - **Footer Konsisten:** Memiliki footer dinamis yang sama dengan halaman utama.

- **Pemrosesan & Alur Data (Google Apps Script & Frontend):**
  - **Pengiriman (`doPost`):** Data dari formulir dikirim ke Google Spreadsheet.
    - **Jika berhasil:** Pengguna secara otomatis diarahkan ke halaman rekapitulasi (`rekap.html`).
    - **Jika gagal:** Pengguna tetap di halaman formulir, dan semua data yang telah diisi tidak hilang.
  - **Pengambilan (`doGet`):** Halaman rekapitulasi meminta data dari Google Spreadsheet, di mana data tersebut diproses terlebih dahulu di sisi server:
    - **Penyaringan:** Baris data yang tidak memiliki *timestamp* (waktu) akan otomatis dibuang.
    - **Pemformatan Waktu:** Kolom `WAKTU` diubah formatnya menjadi `DD-MM-YYYY HH:mm:ss`.
    - **Pemotongan Lokasi:** Teks pada kolom `LOKASI` akan dipotong dan ditambahkan `...` jika melebihi 51 karakter.
