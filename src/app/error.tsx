"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
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
    <main className="grid min-h-screen place-items-center bg-[var(--background)] p-sp-6 text-[var(--foreground)]">
      <div className="max-w-md border border-[var(--line)] bg-[var(--surface)] p-sp-6">
        <h1 className="text-title-h6 font-bold">Something went wrong</h1>
        <p className="mt-sp-5 text-label-sm leading-6 text-[var(--muted)]">
          An unexpected error interrupted this page. Your local drafts are unaffected.
        </p>
        <div className="mt-sp-7 flex gap-sp-4">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex min-h-sp-10 items-center rounded-sm bg-[var(--accent)] px-sp-6 text-label-sm font-semibold text-[var(--active-ink)]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-sp-10 items-center rounded-sm border border-[var(--line-strong)] px-sp-6 text-label-sm font-semibold text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
