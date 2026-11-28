# Pengumpulan Ujian Praktik ICT — SMP ABBS

Aplikasi pengumpulan & penilaian Ujian Praktik ICT. Login memakai akun LMS (read-only),
seluruh berkas dan nilai disimpan di Google Drive sekolah, dan aplikasi berjalan di
Cloudflare Pages: **https://uprakict.pages.dev**

## Arsitektur (keputusan pemilik — jangan diubah tanpa izin)

| Hal | Keputusan |
|---|---|
| Login | Akun LMS: siswa = NIS + pilih sekolah, staf = username (guru/admin/auditor). Tidak ada tabel/user baru. |
| Database | **Tidak ada.** Supabase LMS hanya dibaca (`profiles`, `sekolah`, `guru_mengajar`, `mata_pelajaran`). |
| Berkas ujian | Google Drive: `Ujian Praktik ICT/<tahun>-<semester>/<nama sekolah>/<nis> <nama>.<ext>` |
| Nilai | Google Sheets `_NILAI` di folder ujian (server-only) |
| Soal/instruksi | `_soal.json`, 6 slot: kelas 7/8/9 × progul ICT & non-ICT |
| Akses berkas | Lewat aplikasi `/api/berkas/<id>`; Google Drive tidak pernah ditautkan ke pengguna |
| Hosting | Cloudflare Pages (runtime edge, adapter `@cloudflare/next-on-pages`) |

## Hak akses kelas (guru)

Sumber: tabel LMS `guru_mengajar` (guru_id, mapel_id, kelas) difilter mapel berisi "ICT".

- `ICT Progul` → siswa dengan `profiles.progul = 'ICT'`
- `ICT Non Progul` → siswa dengan progul selain ICT (TCP/VCP)
- Nama kelas dinormalisasi (`7 c`, `8A IBN FIRNAS` → `7C`, `8A`)

Contoh nyata: `muamar.fariq` mengajar **7C ICT = 16 siswa**, bukan 30 siswa 7C
(7C berisi ICT 16 + TCP 12 + VCP 2).

Penilaian dan unduhan berkas dibatasi pada penugasan tersebut, diperiksa di server.

## Halaman

- `/login` — masuk (tab Siswa / Guru-Admin)
- `/` — siswa: status kumpul + soal sesuai jenjang & progul; guru: kartu per kelas-progul
- `/unggah` — unggah berkas (maks `UJIAN_MAKS_MB`, default 50 MB), mengganti berkas lama
- `/nilai` — rekap per kelas-progul, input nilai & catatan, lihat/unduh berkas
- `/soal` — admin/guru mengisi 6 slot soal
- `/api/whoami` — diagnosa sesi (`{"login":true|false}`)

## Variabel lingkungan

```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY  (LMS, read-only)
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN                        (akun Drive sekolah)
GOOGLE_DRIVE_ROOT_FOLDER_ID
NEXT_PUBLIC_SEKOLAH_ID / NEXT_PUBLIC_SEKOLAH_NAMA
UJIAN_TAHUN_AJARAN / UJIAN_SEMESTER / UJIAN_NAMA / UJIAN_DESKRIPSI / UJIAN_TUTUP / UJIAN_MAKS_MB
```

## Build & deploy (Windows, teruji)

Drive `X:` menolak symlink dan `~/.npmrc` memuat `allow-scripts` (ditolak npm 11),
jadi build dijalankan dari salinan di `%LOCALAPPDATA%\Temp\uprak-build`:

```bash
SRC="/x/pengumpulan ujian praktik ICT"; DST="$LOCALAPPDATA/Temp/uprak-build"
rm -rf "$DST/src"; cp -r "$SRC/src" "$DST/src"
cd "$DST" && rm -rf .vercel/output
NODE_OPTIONS="--require $DST/symlink-fallback.cjs" \
npm_config_userconfig="$LOCALAPPDATA/Temp/npmrc-clean" \
  npx @cloudflare/next-on-pages
npx wrangler pages deploy .vercel/output/static --project-name=uprakict --branch=main
```

CI: `.github/workflows/deploy.yml` hanya `workflow_dispatch` dan memakai jalur yang sama
(next-on-pages). Butuh repo secrets + secrets runtime di project Pages.

Prasyarat di folder temp (mudah hilang kalau folder dibuat ulang):

1. `symlink-fallback.cjs` — preload yang mengubah `fs.symlink` menjadi copy
   (target relatif harus diresolve terhadap `dirname` link).
2. `npmrc-clean` — berisi `legacy-peer-deps=true`.
3. Patch `node_modules/@cloudflare/next-on-pages/dist/index.js` pada
   `getVercelBuildChildProcess`: tambahkan `{ shell: true }` untuk win32
   (tanpa ini: `spawn npx ENOENT`).

Secret Pages: `printf '%s' "$v" | npx wrangler pages secret put NAMA --project-name uprakict`,
lalu deploy ulang.

## Catatan teknis penting

- Form **jangan** memakai server action (gagal di Pages dengan pesan
  "An unexpected response was received from the server"). Pakai route handler + POST biasa.
- Middleware hanya menyegarkan cookie sesi; jangan redirect permintaan RSC/prefetch/aset.
- Semua route/page: `export const runtime = "edge"`.
- Berkas build (`.vercel/`) tidak masuk git.
