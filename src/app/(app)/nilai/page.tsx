import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun, siswaSekolah } from "@/lib/lms"
import { infoUjian, namaSekolah, rekapSekolah } from "@/lib/ujian"
import { simpanNilaiAction } from "./actions"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export default async function NilaiPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const akun = await ambilAkun(user.id)
  if (!akun) redirect("/")
  if (akun.role !== "guru") redirect("/")

  const [ujian, sekolah, daftar] = await Promise.all([
    infoUjian(),
    namaSekolah(akun.sekolah_id),
    siswaSekolah(akun.sekolah_id ?? ""),
  ])
  const { baris, folderUrl, rekapUrl } = await rekapSekolah(daftar, sekolah)

  const terkumpul = baris.filter((b) => b.berkas).length
  const dinilai = baris.filter((b) => b.nilai !== "").length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rekap &amp; Nilai</h1>
          <p className="text-muted-foreground text-sm">
            {ujian.nama} · {sekolah} · {ujian.tahunAjaran} Semester {ujian.semester}
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <a className="text-primary underline" href={folderUrl} target="_blank" rel="noreferrer">Folder berkas</a>
          <a className="text-primary underline" href={rekapUrl} target="_blank" rel="noreferrer">Sheet nilai</a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Siswa" nilai={baris.length} />
        <Stat label="Terkumpul" nilai={terkumpul} />
        <Stat label="Belum" nilai={baris.length - terkumpul} />
        <Stat label="Dinilai" nilai={dinilai} />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-3">NIS</th>
              <th className="p-3">Nama</th>
              <th className="p-3">Kelas</th>
              <th className="p-3">Berkas</th>
              <th className="p-3 min-w-[260px]">Nilai &amp; catatan</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <tr key={b.nis + b.nama} className="border-t align-top">
                <td className="p-3 font-mono text-xs">{b.nis}</td>
                <td className="p-3">{b.nama}</td>
                <td className="p-3">{b.kelas}</td>
                <td className="p-3">
                  {b.berkas ? (
                    <a
                      className="text-primary underline text-xs"
                      href={b.berkas.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {b.berkas.name.length > 32 ? b.berkas.name.slice(0, 30) + "…" : b.berkas.name}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">belum</span>
                  )}
                </td>
                <td className="p-3">
                  <form action={simpanNilaiAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="nis" value={b.nis} />
                    <input type="hidden" name="nama" value={b.nama} />
                    <input type="hidden" name="kelas" value={b.kelas} />
                    <input
                      name="nilai"
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={b.nilai}
                      placeholder="0-100"
                      className="w-20 px-2 py-1 border rounded-md"
                    />
                    <input
                      name="feedback"
                      defaultValue={b.feedback}
                      placeholder="catatan"
                      className="flex-1 min-w-[120px] px-2 py-1 border rounded-md"
                    />
                    <button className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                      Simpan
                    </button>
                    {b.oleh && (
                      <span className="text-[10px] text-muted-foreground w-full">
                        {b.oleh} · {b.pada ? new Date(b.pada).toLocaleString("id-ID") : ""}
                      </span>
                    )}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{nilai}</p>
    </div>
  )
}
