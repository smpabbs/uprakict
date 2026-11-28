import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun, penugasanGuru } from "@/lib/lms"
import { bacaSoal, semuaSlot, tingkatKelas } from "@/lib/soal"
import { MAKS_MB } from "@/lib/env"
import SoalForm from "@/components/SoalForm"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export default async function SoalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const akun = await ambilAkun(user.id)
  if (!akun) redirect("/")
  if (!["admin", "guru"].includes(akun.role)) redirect("/")

  const peta = await bacaSoal()
  const penugasan = akun.role === "guru" ? await penugasanGuru(akun.id) : []
  const slot = (akun.role === "admin" ? semuaSlot() : semuaSlot().filter((s) =>
    penugasan.some((p) => tingkatKelas(p.kelas) === s.tingkat && p.target === s.target)
  )).map((s) => ({ kunci: s.kunci, tingkat: s.tingkat, target: s.target, label: s.label }))

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#b7c2cf] bg-[#eef2f7] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0f5f58]">Pengaturan ujian</p>
        <h1 className="mt-1 text-xl font-semibold text-[#0f172a]">Berkas soal per kelas &amp; progul</h1>
        <p className="mt-1 text-sm text-[#37424f]">
          Pilih kelas dan progul dari penugasan mengajar Anda di LMS. Satu unggahan berlaku untuk
          semua siswa pada kelas dan progul itu, dan siswa hanya menerima satu soal sesuai data LMS.
        </p>
      </section>

      {slot.length === 0 ? (
        <div className="rounded-2xl border border-[#e9c474] bg-[#f5e8c6] p-5 text-[13px] text-[#7c2d12]">
          Anda belum ditugaskan mengajar ICT di LMS, jadi belum ada kelas/progul yang bisa diisi soal.
          Hubungi kurikulum bila seharusnya ada.
        </div>
      ) : (
        <>
          <SoalForm slots={slot} peta={peta} maksMb={MAKS_MB} />

          <section>
            <h2 className="mb-3 text-sm font-semibold text-[#0f172a]">Status soal yang bisa Anda kelola</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {slot.map((s) => {
                const isi = peta[s.kunci]
                const terisi = Boolean(isi?.fileId || isi?.judul || isi?.isi)
                return (
                  <div key={s.kunci} className="rounded-xl border border-[#b7c2cf] bg-[#eef2f7] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[#0f172a]">
                        Kelas {s.tingkat} · {s.target === "ICT" ? "ICT" : "Non-ICT"}
                      </p>
                      <span
                        className={
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                          (terisi ? "bg-[#c4ebd2] text-[#14532d]" : "bg-[#f0d59f] text-[#7c2d12]")
                        }
                      >
                        {terisi ? "TERISI" : "KOSONG"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[12px] text-[#334155]">
                      {isi?.fileName || isi?.judul || (terisi ? "Instruksi teks" : "Belum diisi")}
                    </p>
                    <p className="mt-1 text-[11px] text-[#3f4a58]">
                      {isi?.updated_at
                        ? `Diubah ${new Date(isi.updated_at).toLocaleString("id-ID")}`
                        : "Belum ada soal"}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
