"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e7ecf2] p-6">
      <div className="w-full max-w-lg space-y-3 rounded-2xl border border-[#cbd5e1] bg-[#f5f8fb] p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-[#b91c1c]">Terjadi kesalahan di halaman ini</h1>
        <p className="text-[13px] text-[#334155]">
          Salin tulisan di kotak bawah ini dan kirimkan ke admin agar bisa diperbaiki.
        </p>
        <pre className="whitespace-pre-wrap break-words rounded-lg bg-[#dde5ee] p-3 text-[12px] text-[#334155]">
          {error?.name}: {error?.message}
          {error?.digest ? `\nDigest: ${error.digest}` : ""}
        </pre>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="rounded-lg bg-[#115e59] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0c4a44]"
          >
            Coba lagi
          </button>
          <a
            href="/login"
            className="rounded-lg border border-[#b6c2d0] px-4 py-2 text-[13px] font-semibold text-[#334155] transition hover:bg-[#dde5ee]"
          >
            Ke halaman masuk
          </a>
        </div>
      </div>
    </div>
  )
}
