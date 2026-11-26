'use client'

import { AuthProvider } from '@/lib/auth'
import { logoutAction } from '@/lib/auth-actions'

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <nav className="border-b bg-background sticky top-0 z-20">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary">📊 Ujian Praktik ICT</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="/" className="text-sm font-medium hover:text-primary transition">
                Beranda
              </a>
              <form action={logoutAction} className="inline">
                <button className="text-sm text-muted-foreground hover:text-destructive transition underline">
                  Keluar
                </button>
              </form>
            </div>
          </div>
        </nav>
        <main className="px-6 py-8 max-w-6xl mx-auto">{children}</main>
      </div>
    </AuthProvider>
  )
}
