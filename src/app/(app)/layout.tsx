import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun } from "@/lib/lms"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const akun = await ambilAkun(user.id)
  const guru = akun?.role === "guru"

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-6xl mx-auto">
          <Link href="/" className="font-bold text-primary">📊 Ujian Praktik ICT</Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium hover:text-primary">Beranda</Link>
            {guru ? (
              <Link href="/nilai" className="text-sm font-medium hover:text-primary">Rekap &amp; Nilai</Link>
            ) : (
              <Link href="/unggah" className="text-sm font-medium hover:text-primary">Kumpulkan</Link>
            )}
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {akun?.nama ?? user.email}
            </span>
            <form method="POST" action="/api/keluar">
              <button className="text-sm text-muted-foreground hover:text-destructive underline">Keluar</button>
            </form>
          </div>
        </div>
      </nav>
      <main className="px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto">{children}</main>
    </div>
  )
}
