# FinTrack Pro — Aplikasi Pencatatan & Rekap Laporan Keuangan

Aplikasi web pencatatan laporan keuangan modern, interaktif, dan siap di-deploy ke **Vercel (`vercel.app`)** secara gratis.

## ✨ Fitur Utama
1. **Input Transaksi Lengkap & Cepat**:
   - **Siapa yang menginput**: Dilengkapi tombol pilihan cepat nama penginput yang sudah pernah menginput serta avatar inisial otomatis.
   - **Tanggal Input Otomatis**: Waktu dan tanggal terisi otomatis secara *real-time* saat penginputan (tersedia juga opsi ubah manual).
   - **Pemasukan & Pengeluaran**: Pilihan jenis transaksi dengan format nominal Rupiah otomatis (`Rp 1.500.000`) dan tombol nominal cepat (`+25rb`, `+50rb`, `+100rb`, `+1 Jt`).
   - **Kategori & Metode Kas**: Kategori menyesuaikan otomatis antara Pemasukan dan Pengeluaran.
2. **Tabel Pemasukan & Tabel Pengeluaran**:
   - Tampilan **2 Tabel Terpisah** (Tabel Pemasukan sendiri & Tabel Pengeluaran sendiri lengkap dengan subtotal masing-masing) maupun **1 Tabel Jurnal Gabungan**.
   - Dilengkapi fitur pencarian, filter per Nama Penginput, filter Periode Tanggal/Bulan, pengurutan, serta Edit & Hapus.
3. **Rekap Keseluruhan**:
   - **Kartu Ringkasan Eksekutif**: Total Pemasukan, Total Pengeluaran, Saldo Bersih (Surplus/Defisit), dan Aktivitas Penginput.
   - **Tabel Rekap per Penginput**: Menampilkan berapa kali tiap orang menginput, total pemasukan yang dicatat, total pengeluaran yang dicatat, dan selisih bersihnya.
   - **Rekap per Kategori, Bulanan, & Metode Pembayaran**.
4. **Visualisasi Grafis Interaktif (Chart.js)**:
   - Grafik Tren Arus Kas (Pemasukan vs Pengeluaran per tanggal).
   - Grafik Doughnut Proporsi Kategori Pengeluaran & Pemasukan.
   - Grafik Bar Perbandingan Kontribusi per Penginput.
   - Bar Rasio Arus Kas Pemasukan vs Pengeluaran.
5. **Ekspor Excel (CSV), Backup JSON, Cetak PDF, & Cloud Sync**:
   - **Download Excel (CSV)** siap dibuka di Microsoft Excel / Google Sheets.
   - **Cetak Laporan / Save PDF** dengan tampilan laporan resmi yang bersih.
   - **Penyimpanan Lokal Otomatis (LocalStorage)** + dukungan opsional **Cloud Database (Supabase Gratis)** jika ingin digunakan bersama lintas perangkat secara *real-time*.

---

## 🚀 Cara Menjalankan & Deploy Gratis ke Vercel.app

### 1. Menjalankan Langsung di Komputer
Cukup klik 2x file [`index.html`](./index.html) untuk membukanya langsung di browser (Chrome / Edge / Firefox).

### 2. Cara Online-kan ke `vercel.app` (Gratis)
**Cara A — Lewat GitHub (Paling Direkomendasikan):**
1. Buat repository baru di [GitHub](https://github.com/new) dan upload semua file di folder `d:\APP` (`index.html`, `styles.css`, `app.js`, `vercel.json`, `README.md`).
2. Buka [vercel.com](https://vercel.com) lalu login dengan akun GitHub Anda.
3. Klik **Add New...** -> **Project** -> Pilih repository yang baru Anda buat -> Klik **Deploy**.
4. Dalam ~10 detik aplikasi Anda langsung online dengan alamat `https://nama-project-anda.vercel.app`!

**Cara B — Tanpa GitHub (Upload Langsung):**
1. Buka aplikasi ini di komputer, atau gunakan layanan drag-and-drop / Vercel CLI jika Anda menginstal Node.js (`npx vercel --prod`).
