"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#dde4ec] p-6">
      <div className="w-full max-w-lg space-y-3 rounded-2xl border border-[#b7c2cf] bg-[#eef2f7] p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-[#991b1b]">Terjadi kesalahan di halaman ini</h1>
        <p className="text-[13px] text-[#334155]">
          Salin tulisan di kotak bawah ini dan kirimkan ke admin agar bisa diperbaiki.
        </p>
        <pre className="whitespace-pre-wrap break-words rounded-lg bg-[#d2dbe6] p-3 text-[12px] text-[#334155]">
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
            className="rounded-lg border border-[#a7b5c4] px-4 py-2 text-[13px] font-semibold text-[#334155] transition hover:bg-[#d2dbe6]"
          >
            Ke halaman masuk
          </a>
        </div>
      </div>
    </div>
  )
}
