"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0a0a", color: "#fafafa" }}>
        <main
          style={{
            display: "grid",
            minHeight: "100vh",
            placeItems: "center",
            padding: "24px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ maxWidth: 420, border: "1px solid #2a2a2a", padding: 24 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Something went wrong</h1>
            <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "#a3a3a3" }}>
              The app failed to load. Reloading usually fixes this.
            </p>
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                marginTop: 20,
                minHeight: 40,
                padding: "0 20px",
                borderRadius: 4,
                border: "none",
                background: "#335CFF",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
