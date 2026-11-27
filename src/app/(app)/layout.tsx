import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun } from "@/lib/lms"
import { infoUjian } from "@/lib/ujian"

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
  let ujianNama = ""
  try {
    ujianNama = (await infoUjian()).nama
  } catch {
    ujianNama = ""
  }

  const inisial = (akun?.nama ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("")

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[#e2e8f0] bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0f766e] text-sm font-bold text-white shadow-sm">
              ICT
            </span>
            <span className="hidden sm:block leading-tight">
              <span className="block text-[13px] font-semibold text-[#0f172a]">Ujian Praktik ICT</span>
              <span className="block text-[11px] text-[#64748b]">{ujianNama || "SMP ABBS Surakarta"}</span>
            </span>
          </Link>

          <nav className="ml-2 flex items-center gap-1 text-[13px]">
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 font-medium text-[#475569] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
            >
              Beranda
            </Link>
            {guru && (
              <Link
                href="/nilai"
                className="rounded-lg px-3 py-1.5 font-medium text-[#475569] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
              >
                Rekap &amp; Nilai
              </Link>
            )}
            {!guru && akun?.role === "siswa" && (
              <Link
                href="/unggah"
                className="rounded-lg px-3 py-1.5 font-medium text-[#475569] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
              >
                Kumpulkan
              </Link>
            )}
            {(akun?.role === "admin" || guru) && (
              <Link
                href="/soal"
                className="rounded-lg px-3 py-1.5 font-medium text-[#475569] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
              >
                Soal
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-2.5 py-1.5 sm:flex">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#ccfbf1] text-[10px] font-bold text-[#0f766e]">
                {inisial}
              </span>
              <span className="max-w-[160px] truncate text-[12px] font-medium text-[#334155]">
                {akun?.nama ?? user.email}
              </span>
            </div>
            <form method="POST" action="/api/keluar">
              <button className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-[12px] font-medium text-[#64748b] transition hover:border-[#fecaca] hover:bg-[#fef2f2] hover:text-[#b91c1c]">
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-[11px] text-[#94a3b8] sm:px-6">
        SMP ABBS Surakarta · Program ICT — berkas ujian tersimpan aman di server sekolah.
      </footer>
    </div>
  )
}
