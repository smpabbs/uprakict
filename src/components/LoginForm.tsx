"use client"

import { useState } from "react"

interface Sekolah {
  id: string
  nama: string
}

/**
 * Form login tanpa ketergantungan JS untuk mengirim: memakai POST biasa ke
 * /api/masuk. State hanya dipakai untuk tampilan (tab & pesan).
 */
export default function LoginForm({ sekolah, pesan }: { sekolah: Sekolah[]; pesan?: string }) {
  const [role, setRole] = useState<"siswa" | "guru">("siswa")

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#0f172a]">Pengumpulan Ujian Praktik ICT</h1>
          <p className="mt-1 text-[13px] text-[#3f4a58]">Masuk dengan akun LMS sekolah</p>
        </div>

        <form
          method="POST"
          action="/api/masuk"
          className="space-y-4 rounded-2xl border border-[#b7c2cf] bg-[#eef2f7] p-6 shadow-sm"
        >
          <input type="hidden" name="role" value={role} />

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#d2dbe6] p-1">
            {(["siswa", "guru"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={
                  "rounded-lg py-2 text-[13px] font-semibold transition " +
                  (role === r
                    ? "bg-[#115e59] text-white shadow-sm"
                    : "text-[#334155] hover:bg-[#eef2f7] hover:text-[#0f172a]")
                }
              >
                {r === "siswa" ? "Siswa" : "Guru / Admin"}
              </button>
            ))}
          </div>

          {role === "siswa" && (
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">Sekolah</label>
              <select
                name="sekolah"
                defaultValue={sekolah[0]?.id}
                className="w-full rounded-lg border border-[#a7b5c4] bg-[#eef2f7] px-3 py-2 text-[14px] text-[#0f172a] focus:border-[#115e59] focus:outline-none focus:ring-2 focus:ring-[#6ccbb7]"
              >
                {sekolah.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
              {role === "siswa" ? "NIS" : "Username (guru/admin)"}
            </label>
            <input
              name="identifier"
              type="text"
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              autoFocus
              className="w-full rounded-lg border border-[#a7b5c4] bg-[#eef2f7] px-3 py-2 text-[14px] text-[#0f172a] placeholder:text-[#3f4a58] focus:border-[#115e59] focus:outline-none focus:ring-2 focus:ring-[#6ccbb7]"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#334155]">Kata Sandi</label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-[#a7b5c4] bg-[#eef2f7] px-3 py-2 text-[14px] text-[#0f172a] focus:border-[#115e59] focus:outline-none focus:ring-2 focus:ring-[#6ccbb7]"
              required
            />
          </div>

          {pesan && (
            <div className="rounded-lg border border-[#e9adad] bg-[#f9dede] p-3 text-[13px] text-[#991b1b]">
              {pesan}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-[#115e59] py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#0c4a44] focus:outline-none focus:ring-2 focus:ring-[#6ccbb7] focus:ring-offset-2"
          >
            Masuk
          </button>
          <p className="text-center text-[11px] text-[#3f4a58]">
            Gunakan NIS (siswa) atau username (guru/admin) beserta kata sandi akun LMS.
          </p>
        </form>
      </div>
    </div>
  )
}
