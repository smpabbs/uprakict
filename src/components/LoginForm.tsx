"use client"

import { useState } from "react"
import { loginAction } from "@/lib/auth-actions"

interface Sekolah {
  id: string
  nama: string
}

export default function LoginForm({ sekolah }: { sekolah: Sekolah[] }) {
  const [role, setRole] = useState<"siswa" | "guru">("siswa")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    setError(null)
    const result = await loginAction({}, formData)
    setLoading(false)
    if (result?.error) setError(result.error)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Pengumpulan Ujian Praktik ICT</h1>
          <p className="text-muted-foreground text-sm">Masuk dengan akun LMS sekolah</p>
        </div>

        <form action={handleSubmit} className="space-y-4 bg-background p-6 rounded-xl border shadow-sm">
          <input type="hidden" name="role" value={role} />

          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            {(["siswa", "guru"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setError(null) }}
                className={
                  "py-2 rounded-md text-sm font-medium transition " +
                  (role === r ? "bg-background shadow-sm text-primary" : "text-muted-foreground")
                }
              >
                {r === "siswa" ? "Siswa" : "Guru"}
              </button>
            ))}
          </div>

          {role === "siswa" && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Sekolah</label>
              <select
                name="sekolah"
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
              {role === "siswa" ? "NIS" : "Username Guru"}
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

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-50"
          >
            {loading ? "Memeriksa…" : "Masuk"}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Gunakan NIS (siswa) atau username (guru) beserta kata sandi akun LMS.
          </p>
        </form>
      </div>
    </div>
  )
}
