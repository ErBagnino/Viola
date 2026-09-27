"use client";

// Last-resort screen (the root layout itself failed): plain HTML + inline CSS.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="it">
      <head>
        <style>{`
          body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px; text-align: center;
                 font-family: system-ui, sans-serif; background: #fbf7f5; color: #22151a; }
          button { margin-top: 16px; padding: 12px 22px; border-radius: 16px; border: 0; background: #621226; color: #fff; font-weight: 700; font-size: 16px; }
          a { display: block; margin-top: 18px; color: #8a1f3c; font-weight: 700; }
          @media (prefers-color-scheme: dark) { body { background: #0f0b0c; color: #f5edee; } a { color: #f28b9b; } }
        `}</style>
      </head>
      <body>
        <div>
          <p style={{ fontSize: 56, margin: 0, color: "#da0e14" }}>♡</p>
          <h1 style={{ fontSize: 26 }}>Ops, qualcosa si è inceppato. Riproviamo. ♡</h1>
          <button onClick={reset}>Riprova</button>
          <a href="/offline">Intanto respira con me</a>
        </div>
      </body>
    </html>
  );
}
