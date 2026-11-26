"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/40">
      <div className="w-full max-w-lg rounded-xl border bg-background p-6 space-y-3">
        <h1 className="text-lg font-bold text-destructive">Terjadi kesalahan di halaman ini</h1>
        <p className="text-sm text-muted-foreground">
          Salin tulisan di kotak bawah ini dan kirimkan ke admin agar bisa diperbaiki.
        </p>
        <pre className="text-xs bg-muted p-3 rounded overflow-auto whitespace-pre-wrap break-words">
          {error?.name}: {error?.message}
          {error?.digest ? `\nDigest: ${error.digest}` : ""}
        </pre>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
          >
            Coba lagi
          </button>
          <a
            href="/login"
            className="px-4 py-2 rounded-md border text-sm font-medium"
          >
            Ke halaman masuk
          </a>
        </div>
      </div>
    </div>
  )
}
