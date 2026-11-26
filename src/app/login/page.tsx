import LoginForm from "@/components/LoginForm"
import { daftarSekolah } from "@/lib/lms"
import { SEKOLAH_DEFAULT, SEKOLAH_NAMA } from "@/lib/env"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>
}) {
  const { e } = await searchParams
  let sekolah: { id: string; nama: string }[] = []
  try {
    sekolah = await daftarSekolah()
  } catch {
    sekolah = [{ id: SEKOLAH_DEFAULT, nama: SEKOLAH_NAMA }]
  }
  sekolah.sort((a, b) => (a.id === SEKOLAH_DEFAULT ? -1 : b.id === SEKOLAH_DEFAULT ? 1 : 0))
  return <LoginForm sekolah={sekolah} pesan={e} />
}
