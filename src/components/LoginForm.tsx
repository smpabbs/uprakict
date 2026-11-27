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
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Pengumpulan Ujian Praktik ICT</h1>
          <p className="text-muted-foreground text-sm">Masuk dengan akun LMS sekolah</p>
        </div>

        <form method="POST" action="/api/masuk" className="space-y-4 bg-background p-6 rounded-xl border shadow-sm">
          <input type="hidden" name="role" value={role} />

          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            {(["siswa", "guru"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={
                  "py-2 rounded-md text-sm font-medium transition " +
                  (role === r ? "bg-background shadow-sm text-primary" : "text-muted-foreground")
                }
              >
                {r === "siswa" ? "Siswa" : "Guru / Admin"}
              </button>
            ))}
          </div>

          {role === "siswa" && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Sekolah</label>
              <select
                name="sekolah"
                defaultValue={sekolah[0]?.id}
                className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {sekolah.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {role === "siswa" ? "NIS" : "Username (guru/admin)"}
            </label>
            <input
              name="identifier"
              type="text"
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              autoFocus
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Kata Sandi</label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {pesan && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{pesan}</div>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium"
          >
            Masuk
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Gunakan NIS (siswa) atau username (guru/admin) beserta kata sandi akun LMS.
          </p>
        </form>
      </div>
    </div>
  )
}
