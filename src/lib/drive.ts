// Klien Google Drive + Sheets berbasis fetch — jalan di Node maupun Cloudflare Workers.
// Kredensial: OAuth refresh token (server only). Tidak memakai googleapis.
import {
  G_CLIENT_ID,
  G_CLIENT_SECRET,
  G_REFRESH_TOKEN,
  DRIVE_ROOT,
} from "./env"

const DRIVE = "https://www.googleapis.com/drive/v3"
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files"
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets"
const FOLDER_MIME = "application/vnd.google-apps.folder"
const SHEET_MIME = "application/vnd.google-apps.spreadsheet"

let cache: { token: string; exp: number } | null = null

async function token(): Promise<string> {
  if (cache && Date.now() < cache.exp) return cache.token
  if (!G_CLIENT_ID || !G_CLIENT_SECRET || !G_REFRESH_TOKEN) {
    throw new Error("Kredensial Google Drive belum diisi di .env")
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: G_CLIENT_ID,
      client_secret: G_CLIENT_SECRET,
      refresh_token: G_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  })
  const j = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!res.ok || !j.access_token) throw new Error("Gagal memperbarui token Google")
  cache = { token: j.access_token, exp: Date.now() + Math.max(60, (j.expires_in ?? 3600) - 120) * 1000 }
  return cache.token
}

async function api(path: string, init?: RequestInit & { json?: unknown }) {
  const headers: Record<string, string> = { Authorization: "Bearer " + (await token()) }
  let body = init?.body
  if (init?.json !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify(init.json)
  }
  const res = await fetch(DRIVE + path, { ...init, headers, body })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    throw new Error(
      "Drive API " + res.status + ": " + (data?.error?.message ?? text.slice(0, 200))
    )
  }
  return data
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")

export async function pastikanFolder(parent: string, nama: string): Promise<string> {
  const q = encodeURIComponent(
    `name='${esc(nama)}' and mimeType='${FOLDER_MIME}' and trashed=false and '${parent}' in parents`
  )
  const found = await api(`/files?q=${q}&fields=files(id,name)&pageSize=5`)
  if (found.files?.length) return found.files[0].id as string
  const dibuat = await api("/files?fields=id", {
    method: "POST",
    json: { name: nama, mimeType: FOLDER_MIME, parents: [parent] },
  })
  return dibuat.id as string
}

export interface BerkasDrive {
  id: string
  name: string
  size?: string
  mimeType: string
  createdTime: string
  webViewLink?: string
}

export async function daftarBerkas(folderId: string, nama?: string): Promise<BerkasDrive[]> {
  const hasil: BerkasDrive[] = []
  let pageToken = ""
  const filterNama = nama ? ` and name='${esc(nama)}'` : ""
  do {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false${filterNama}`)
    const r = await api(
      `/files?q=${q}&fields=nextPageToken,files(id,name,size,mimeType,createdTime,webViewLink)` +
        `&pageSize=1000&orderBy=createdTime desc${pageToken ? `&pageToken=${pageToken}` : ""}`
    )
    hasil.push(...((r.files ?? []) as BerkasDrive[]))
    pageToken = r.nextPageToken ?? ""
  } while (pageToken)
  return hasil
}

export async function unggahBerkas(
  folderId: string,
  nama: string,
  bytes: ArrayBuffer,
  mime: string
): Promise<BerkasDrive> {
  const boundary = "----uprak" + Math.random().toString(16).slice(2)
  const meta = JSON.stringify({ name: nama, parents: [folderId] })
  const enc = new TextEncoder()
  const head = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
      `--${boundary}\r\nContent-Type: ${mime || "application/octet-stream"}\r\n\r\n`
  )
  const tail = enc.encode(`\r\n--${boundary}--`)
  const body = new Uint8Array(head.length + bytes.byteLength + tail.length)
  body.set(head, 0)
  body.set(new Uint8Array(bytes), head.length)
  body.set(tail, head.length + bytes.byteLength)

  const res = await fetch(
    `${UPLOAD}?uploadType=multipart&fields=id,name,size,mimeType,createdTime,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + (await token()),
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )
  const text = await res.text()
  const data = JSON.parse(text || "{}")
  if (!res.ok) {
    throw new Error("Unggah Drive " + res.status + ": " + (data?.error?.message ?? text.slice(0, 200)))
  }
  return data as BerkasDrive
}

export async function hapusBerkas(id: string): Promise<void> {
  const res = await fetch(`${DRIVE}/files/${id}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + (await token()) },
  })
  if (!res.ok && res.status !== 404) throw new Error("Gagal menghapus berkas Drive")
}

export async function tokenInternal(): Promise<string> {
  return token()
}

/** Metadata satu berkas (nama, mime, ukuran, link). */
export async function infoBerkas(id: string): Promise<BerkasDrive | null> {
  try {
    return (await api(
      `/files/${id}?fields=id,name,size,mimeType,createdTime,webViewLink`
    )) as BerkasDrive
  } catch {
    return null
  }
}

/** Ambil isi berkas dari Drive (dipakai server untuk menyajikan ke pengguna). */
export async function unduhBerkas(id: string): Promise<Response> {
  const res = await fetch(`${DRIVE}/files/${id}?alt=media`, {
    headers: { Authorization: "Bearer " + (await token()) },
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Gagal mengambil berkas dari penyimpanan")
  return res
}

/* ---------------- Google Sheets (rekap nilai) ---------------- */

async function sheets(path: string, init?: RequestInit & { json?: unknown }) {
  const headers: Record<string, string> = { Authorization: "Bearer " + (await token()) }
  let body = init?.body
  if (init?.json !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify(init.json)
  }
  const res = await fetch(SHEETS + path, { ...init, headers, body })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    throw new Error("Sheets API " + res.status + ": " + (data?.error?.message ?? text.slice(0, 200)))
  }
  return data
}

const JUDUL_KOLOM = ["SEKOLAH", "NIS", "NAMA", "KELAS", "NILAI", "FEEDBACK", "DINILAI OLEH", "DINILAI PADA"]

/** Cari / buat spreadsheet rekap nilai di dalam folder ujian. */
export async function pastikanRekap(folderId: string): Promise<string> {
  const q = encodeURIComponent(
    `name='_NILAI' and mimeType='${SHEET_MIME}' and trashed=false and '${folderId}' in parents`
  )
  const found = await api(`/files?q=${q}&fields=files(id)&pageSize=1`)
  if (found.files?.length) return found.files[0].id as string

  const dibuat = await api("/files?fields=id", {
    method: "POST",
    json: { name: "_NILAI", mimeType: SHEET_MIME, parents: [folderId] },
  })
  const id = dibuat.id as string
  await sheets(`/${id}/values/A1:H1?valueInputOption=RAW`, {
    method: "PUT",
    json: { values: [JUDUL_KOLOM] },
  })
  return id
}

export interface BarisNilai {
  sekolah: string
  nis: string
  nama: string
  kelas: string
  nilai: string
  feedback: string
  oleh: string
  pada: string
}

export async function bacaNilai(sheetId: string): Promise<Map<string, BarisNilai>> {
  const data = await sheets(`/${sheetId}/values/A2:H?majorDimension=ROWS`)
  const map = new Map<string, BarisNilai>()
  for (const row of (data.values ?? []) as string[][]) {
    const b: BarisNilai = {
      sekolah: row[0] ?? "",
      nis: row[1] ?? "",
      nama: row[2] ?? "",
      kelas: row[3] ?? "",
      nilai: row[4] ?? "",
      feedback: row[5] ?? "",
      oleh: row[6] ?? "",
      pada: row[7] ?? "",
    }
    if (b.nis) map.set(b.sekolah + "|" + b.nis, b)
  }
  return map
}

/** Simpan nilai: perbarui baris yang ada, atau tambah baris baru. */
export async function simpanNilai(sheetId: string, b: BarisNilai): Promise<void> {
  const data = await sheets(`/${sheetId}/values/A2:B?majorDimension=ROWS`)
  const rows = (data.values ?? []) as string[][]
  const idx = rows.findIndex((r) => (r[0] ?? "") === b.sekolah && (r[1] ?? "") === b.nis)
  const values = [[b.sekolah, b.nis, b.nama, b.kelas, b.nilai, b.feedback, b.oleh, b.pada]]
  if (idx >= 0) {
    const baris = idx + 2
    await sheets(`/${sheetId}/values/A${baris}:H${baris}?valueInputOption=RAW`, {
      method: "PUT",
      json: { values },
    })
  } else {
    await sheets(`/${sheetId}/values/A1:H1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: "POST",
      json: { values },
    })
  }
}

/* ---------------- util ---------------- */

export function folderUjianRoot(): string {
  if (!DRIVE_ROOT) throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID belum diisi")
  return DRIVE_ROOT
}

export function namaFolderUjian(tahun: string, semester: number): string {
  return `${tahun.replace("/", "-")} - Semester ${semester}`
}

export function tautanFolder(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`
}
