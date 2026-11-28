import type { Metadata, Viewport } from "next"
import "./globals.css"
import { SEKOLAH_NAMA } from "@/lib/env"

export const metadata: Metadata = {
  title: "Ujian Praktik ICT · " + SEKOLAH_NAMA,
  description: "Pengumpulan dan penilaian Ujian Praktik ICT — SMP ABBS",
}

export const viewport: Viewport = {
  themeColor: "#0f5f58",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  )
}
