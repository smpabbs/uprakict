"use client"

import { useState } from 'react'
import { loginAction } from '@/lib/auth-actions'
import { redirect } from 'next/navigation'

export default function LoginPage() {
  const [role, setRole] = useState<'siswa' | 'guru'>('siswa')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    const result = await loginAction({} as any, formData)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Pengumpulan Ujian Praktik ICT</h1>
          <p className="text-muted-foreground text-sm">Masuk dengan akun LMS sekolah</p>
        </div>

        <form action={handleSubmit} className="space-y-4 bg-background p-6 rounded-xl border shadow-sm">
          <input
            type="hidden"
            name="role"
            defaultValue={role}
          />
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {role === 'siswa' ? 'NIS' : 'Username Guru'}
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
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Kata Sandi
            </label>
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
            {loading ? 'Memeriksa…' : 'Masuk'}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Akun dibuat oleh admin LMS. Tidak dapat mendaftar sendiri.
          </p>
        </form>

        <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
          <button
            onClick={() => setRole('siswa')}
            className={`underline underline-offset-4 ${role === 'siswa' ? 'font-medium text-foreground' : ''}`}
          >
            Login sebagai Siswa
          </button>
          <span>/</span>
          <button
            onClick={() => setRole('guru')}
            className={`underline underline-offset-4 ${role === 'guru' ? 'font-medium text-foreground' : ''}`}
          >
            Login sebagai Guru
          </button>
        </div>
      </div>
    </div>
  )
}
