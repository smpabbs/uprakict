import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun } from "@/lib/lms"
import { bacaSoal, semuaSlot } from "@/lib/soal"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export default async function SoalPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; e?: string; k?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const akun = await ambilAkun(user.id)
  if (!akun) redirect("/")
  if (!["admin", "guru"].includes(akun.role)) redirect("/")

  const peta = await bacaSoal()
  const slot = semuaSlot()

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0f766e]">Pengaturan ujian</p>
        <h1 className="mt-1 text-xl font-semibold text-[#0f172a]">Soal &amp; instruksi per jenjang</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Enam slot: kelas 7, 8, 9 untuk progul ICT dan non-ICT (TCP/VCP). Isi ini otomatis tampil ke siswa
          sesuai tingkat dan progulnya, dan ke guru saat menilai.
        </p>
        {sp.ok && (
          <p className="mt-4 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[13px] text-[#15803d]">
            Soal tersimpan{sp.k ? ` (${sp.k})` : ""}.
          </p>
        )}
        {sp.e && (
          <p className="mt-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] text-[#b91c1c]">
            {sp.e}
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {slot.map((s) => {
          const isi = peta[s.kunci]
          return (
            <section key={s.kunci} className="rounded-2xl border border-[#e2e8f0] bg-white">
              <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-3">
                <div>
                  <h2 className="text-[13px] font-semibold text-[#0f172a]">{s.label}</h2>
                  <p className="text-[11px] text-[#94a3b8]">
                    {isi?.updated_at
                      ? `Terakhir diubah ${new Date(isi.updated_at).toLocaleString("id-ID")}${isi.oleh ? ` oleh ${isi.oleh}` : ""}`
                      : "Belum diisi"}
                  </p>
                </div>
                <span
                  className={
                    "rounded-full px-2 py-1 text-[10px] font-semibold " +
                    (isi?.isi ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fef3c7] text-[#b45309]")
                  }
                >
                  {isi?.isi ? "TERISI" : "KOSONG"}
                </span>
              </div>
              <form method="POST" action="/api/soal" className="space-y-3 p-5">
                <input type="hidden" name="kunci" value={s.kunci} />
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Judul
                  </label>
                  <input
                    name="judul"
                    defaultValue={isi?.judul ?? ""}
                    placeholder={`Ujian Praktik ICT Kelas ${s.tingkat}`}
                    className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#99f6e4]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Instruksi / soal
                  </label>
                  <textarea
                    name="isi"
                    defaultValue={isi?.isi ?? ""}
                    rows={10}
                    placeholder={"1. Buat dokumen ...\n2. Simpan sebagai PDF ...\n3. Unggah di menu Kumpulkan\n\nKriteria penilaian: ..."}
                    className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 font-mono text-[12.5px] leading-relaxed focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#99f6e4]"
                  />
                  <p className="mt-1 text-[11px] text-[#94a3b8]">
                    Baris baru dipertahankan. Bisa dipakai untuk daftar langkah dan kriteria penilaian.
                  </p>
                </div>
                <button className="rounded-lg bg-[#0f766e] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#115e59]">
                  Simpan slot ini
                </button>
              </form>
            </section>
          )
        })}
      </div>
    </div>
  )
}
