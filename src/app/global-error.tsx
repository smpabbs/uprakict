"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <h1 style={{ color: "#b91c1c", fontSize: 18 }}>Aplikasi gagal dimuat</h1>
        <p style={{ fontSize: 14 }}>Kirimkan teks berikut ke admin:</p>
        <pre
          style={{
            fontSize: 12,
            background: "#e6ecf3",
            padding: 12,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {error?.name}: {error?.message}
          {error?.digest ? `\nDigest: ${error.digest}` : ""}
        </pre>
        <button
          onClick={reset}
          style={{ marginTop: 8, padding: "8px 16px", borderRadius: 6, border: "1px solid #d4d4d8" }}
        >
          Coba lagi
        </button>
      </body>
    </html>
  )
}
