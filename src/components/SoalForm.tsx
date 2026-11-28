"use client"

import { useMemo, useState } from "react"

interface SlotInfo {
  kunci: string
  tingkat: string
  target: "ICT" | "NONICT"
  label: string
}

interface IsiSlot {
  judul?: string
  fileId?: string
  fileName?: string
  lampiran?: { id: string; name: string } | null
  updated_at?: string
  oleh?: string
}

const namaTarget = (t: "ICT" | "NONICT") => (t === "ICT" ? "ICT" : "Non-ICT (TCP/VCP)")

/**
 * Form unggah soal dengan pilihan kelas & progul yang benar-benar tersedia
 * untuk guru ini (diambil dari penugasan mengajar di LMS).
 */
export default function SoalForm({
  slots,
  peta,
  maksMb,
}: {
  slots: SlotInfo[]
  peta: Record<string, IsiSlot>
  maksMb: number
}) {
  const tingkatList = useMemo(
    () => [...new Set(slots.map((s) => s.tingkat))].sort((a, b) => Number(a) - Number(b)),
    [slots]
  )
  const [tingkat, setTingkat] = useState(tingkatList[0] ?? "")
  const targetList = useMemo(
    () => [...new Set(slots.filter((s) => s.tingkat === tingkat).map((s) => s.target))],
    [slots, tingkat]
  )
  const [target, setTarget] = useState<"ICT" | "NONICT">(targetList[0] ?? "ICT")

  const gantiTingkat = (nilai: string) => {
    setTingkat(nilai)
    const tersedia = [...new Set(slots.filter((s) => s.tingkat === nilai).map((s) => s.target))]
    if (!tersedia.includes(target)) setTarget(tersedia[0])
  }

  const kunci = `${tingkat}-${target}`
  const isi = peta[kunci]
  const labelSelect = "w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-[13px] font-medium text-[#0f172a] focus:border-[#115e59] focus:outline-none focus:ring-2 focus:ring-[#99f6e4]"

  return (
    <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5">
      <h2 className="text-base font-semibold text-[#0f172a]">Unggah soal</h2>
      <p className="mt-1 text-[12px] text-[#556172]">
        Pilihan kelas dan progul diambil dari penugasan mengajar Anda di LMS. Soal yang diunggah
        hanya berlaku untuk siswa kelas {tingkat || "—"} progul {namaTarget(target)}.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#5f6b7a]">
            Kelas / tingkat
          </label>
          <select value={tingkat} onChange={(e) => gantiTingkat(e.target.value)} className={labelSelect}>
            {tingkatList.map((t) => (
              <option key={t} value={t}>Kelas {t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#5f6b7a]">
            Progul
          </label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as "ICT" | "NONICT")}
            className={labelSelect}
          >
            {targetList.map((t) => (
              <option key={t} value={t}>{namaTarget(t)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-[12px] text-[#334155]">
        <span className="font-semibold text-[#0f172a]">Slot tujuan: </span>
        Kelas {tingkat} · Progul {namaTarget(target)}
        <span className="ml-1 text-[#5f6b7a]">({kunci})</span>
        {isi && (
          <>
            <span className="mx-2 text-[#cbd5e1]">|</span>
            {isi.updated_at
              ? `Terakhir diubah ${new Date(isi.updated_at).toLocaleString("id-ID")}${isi.oleh ? ` oleh ${isi.oleh}` : ""}`
              : "Belum diisi"}
          </>
        )}
      </div>

      {isi?.fileId && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e2e8f0] bg-[#fbfdff] p-3">
          <p className="min-w-0 truncate text-[13px] font-medium text-[#0f172a]">
            Soal saat ini: {isi.fileName || isi.judul}
          </p>
          <div className="flex gap-2">
            <a
              href={`/api/berkas/${isi.fileId}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[#cbd5e1] px-2.5 py-1 text-[11px] font-semibold text-[#334155] hover:bg-white"
            >
              Lihat
            </a>
            <a
              href={`/api/berkas/${isi.fileId}?mode=unduh`}
              className="rounded-lg border border-[#cbd5e1] px-2.5 py-1 text-[11px] font-semibold text-[#334155] hover:bg-white"
            >
              Unduh
            </a>
          </div>
        </div>
      )}

      <form
        key={kunci}
        method="POST"
        action="/api/soal"
        encType="multipart/form-data"
        className="mt-4 space-y-3"
      >
        <input type="hidden" name="kunci" value={kunci} />
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#5f6b7a]">
            Judul (opsional)
          </label>
          <input
            name="judul"
            defaultValue={isi?.judul ?? ""}
            placeholder={`Ujian Praktik ICT Kelas ${tingkat}`}
            className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] focus:border-[#115e59] focus:outline-none focus:ring-2 focus:ring-[#99f6e4]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#5f6b7a]">
            Berkas soal (PDF)
          </label>
          <input
            type="file"
            name="berkas"
            accept="application/pdf,.pdf"
            className="block w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[12px] file:mr-3 file:rounded-md file:border-0 file:bg-[#334155] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white"
          />
          <p className="mt-1 text-[11px] text-[#5f6b7a]">
            Wajib PDF — tampil langsung di halaman siswa. Maks {maksMb} MB. Unggahan baru
            menggantikan soal lama di slot ini.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#5f6b7a]">
            Lampiran (opsional)
          </label>
          <input
            type="file"
            name="lampiran"
            accept=".doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.txt,.pdf"
            className="block w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[12px] file:mr-3 file:rounded-md file:border-0 file:bg-[#334155] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white"
          />
          {isi?.lampiran && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f8fafc] px-3 py-2 text-[12px]">
              <span className="min-w-0 truncate text-[#334155]">Lampiran: {isi.lampiran.name}</span>
              <div className="flex items-center gap-3">
                <a
                  href={`/api/berkas/${isi.lampiran.id}?mode=unduh`}
                  className="font-semibold text-[#0f766e] hover:underline"
                >
                  Unduh
                </a>
                <label className="flex items-center gap-1.5 text-[11px] text-[#334155]">
                  <input type="checkbox" name="hapus_lampiran" value="1" />
                  Hapus
                </label>
              </div>
            </div>
          )}
        </div>
        <button className="rounded-lg bg-[#115e59] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0c4a44]">
          Simpan soal
        </button>
      </form>
    </section>
  )
}
