import LoginForm from "@/components/LoginForm"
import { daftarSekolah } from "@/lib/lms"
import { SEKOLAH_DEFAULT, SEKOLAH_NAMA } from "@/lib/env"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export default async function LoginPage() {
  let sekolah: { id: string; nama: string }[] = []
  try {
    sekolah = await daftarSekolah()
  } catch {
    // kalau daftar sekolah gagal dibaca, tetap bisa login dengan sekolah default
    sekolah = [{ id: SEKOLAH_DEFAULT, nama: SEKOLAH_NAMA }]
  }
  // sekolah default ditaruh paling atas
  sekolah.sort((a, b) => (a.id === SEKOLAH_DEFAULT ? -1 : b.id === SEKOLAH_DEFAULT ? 1 : 0))
  return <LoginForm sekolah={sekolah} />
}
