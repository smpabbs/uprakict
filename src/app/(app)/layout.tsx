import Link from "next/link"
import Umumkan from "@/components/Umumkan"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun } from "@/lib/lms"
import { infoUjian } from "@/lib/ujian"

export const runtime = "edge"
export const dynamic = "force-dynamic"

const tabCls = (aktif: boolean) =>
  "rounded-lg px-3 py-1.5 text-[13px] font-semibold transition " +
  (aktif
    ? "bg-[#115e59] text-white shadow-sm"
    : "text-[#334155] hover:bg-[#dde5ee] hover:text-[#0f172a]")

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { headers } = await import("next/headers")
  const path = (await headers()).get("x-pathname") ?? ""

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
      <header className="sticky top-0 z-30 border-b border-[#cbd5e1] bg-[#f5f8fb]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#115e59] text-sm font-bold text-white shadow-sm">
              ICT
            </span>
            <span className="hidden sm:block leading-tight">
              <span className="block text-[13px] font-semibold text-[#0f172a]">Ujian Praktik ICT</span>
              <span className="block text-[11px] text-[#495663]">{ujianNama || "SMP ABBS Surakarta"}</span>
            </span>
          </Link>

          <nav className="ml-2 flex items-center gap-1">
            <Link href="/" className={tabCls(path === "/")}>
              Beranda
            </Link>
            {guru && (
              <Link href="/nilai" className={tabCls(path.startsWith("/nilai"))}>
                Rekap &amp; Nilai
              </Link>
            )}
            {!guru && akun?.role === "siswa" && (
              <Link href="/unggah" className={tabCls(path.startsWith("/unggah"))}>
                Kumpulkan
              </Link>
            )}
            {(akun?.role === "admin" || guru) && (
              <Link href="/soal" className={tabCls(path.startsWith("/soal"))}>
                Soal
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl border border-[#cbd5e1] bg-[#f5f8fb] px-2.5 py-1.5 sm:flex">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#b8ece0] text-[10px] font-bold text-[#0f6b63]">
                {inisial}
              </span>
              <span className="max-w-[160px] truncate text-[12px] font-medium text-[#334155]">
                {akun?.nama ?? user.email}
              </span>
            </div>
            <form method="POST" action="/api/keluar">
              <button className="rounded-lg border border-[#b6c2d0] px-3 py-1.5 text-[12px] font-semibold text-[#334155] transition hover:border-[#f2b8b8] hover:bg-[#fdeaea] hover:text-[#b91c1c]">
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Umumkan />
        {children}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-[11px] text-[#4d5968] sm:px-6">
        SMP ABBS Surakarta · Program ICT — berkas ujian tersimpan aman di server sekolah.
      </footer>
    </div>
  )
}
