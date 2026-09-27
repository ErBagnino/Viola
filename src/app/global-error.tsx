"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="it">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#fdf6ec", color: "#3b1822", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 24 }}>
        <div>
          <p style={{ fontSize: 56, margin: 0 }}>♡</p>
          <h1 style={{ fontSize: 26 }}>Ops, qualcosa si è inceppato. Riproviamo. ♡</h1>
          <button onClick={reset} style={{ marginTop: 16, padding: "12px 22px", borderRadius: 16, border: 0, background: "#6b1831", color: "#fff", fontWeight: 700, fontSize: 16 }}>
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
