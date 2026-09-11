"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("AutoNoder global application error", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, sans-serif", background: "#0b0d10", color: "#f4f7fa" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ width: "100%", maxWidth: 520, border: "1px solid #29313a", background: "#11151a", borderRadius: 16, padding: 28 }}>
            <div style={{ color: "#9a83ff", fontWeight: 800, fontSize: 20 }}>AutoNoder</div>
            <h1 style={{ margin: "18px 0 8px", fontSize: 28 }}>Something went wrong</h1>
            <p style={{ color: "#8f9baa", lineHeight: 1.6 }}>The application hit an unexpected error. Your saved workflows and credentials were not removed.</p>
            <button onClick={() => reset()} style={{ border: 0, background: "#7c5cff", color: "white", borderRadius: 9, padding: "10px 14px", cursor: "pointer" }}>Try again</button>
          </section>
        </main>
      </body>
    </html>
  );
}
