"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import Glyph from "@/components/workshop/Glyph";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-sp-6 w-sp-6" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M19.6 10.23c0-.68-.06-1.36-.18-2.02H10v3.83h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.75 2.99-4.32 2.99-7.33Z"
      />
      <path
        fill="#34A853"
        d="M10 20c2.7 0 4.96-.89 6.62-2.42l-3.23-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.76-5.6-4.12H1.06v2.59A10 10 0 0 0 10 20Z"
      />
      <path
        fill="#FBBC05"
        d="M4.4 11.9a6 6 0 0 1 0-3.8V5.51H1.06a10 10 0 0 0 0 8.98l3.34-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M10 3.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 10 0 10 10 0 0 0 1.06 5.51L4.4 8.1C5.2 5.74 7.4 3.98 10 3.98Z"
      />
    </svg>
  );
}

export default function SignInModal({
  onClose,
  title = "Sign in to Blick",
  description = "Sign in or create an account to save your work to the cloud.",
}: {
  onClose: () => void;
  title?: string;
  description?: string;
}) {
  const [email, setEmail] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isSendingGoogle, setIsSendingGoogle] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = getSupabaseBrowserClient();

  const redirectNext = () =>
    encodeURIComponent(
      typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/workshop",
    );

  const signInWithGoogle = async () => {
    if (!supabase) {
      setMessage("Add Supabase env vars to enable sign in.");
      return;
    }
    setIsSendingGoogle(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${redirectNext()}`,
      },
    });
    if (error) {
      setIsSendingGoogle(false);
      setMessage(error.message);
    }
  };

  const sendSignInLink = async () => {
    if (!supabase) {
      setMessage("Add Supabase env vars to enable sign in.");
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessage("Enter an email address.");
      return;
    }
    setIsSendingLink(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirectNext()}`,
      },
    });
    setIsSendingLink(false);
    setMessage(error ? error.message : "Check your email for the sign-in link.");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 p-sp-6 backdrop-blur-md"
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.97, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm border border-[var(--line-strong)] bg-[var(--surface)] p-sp-7 text-[var(--foreground)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-sp-5 top-sp-5 grid h-sp-9 w-sp-9 place-items-center rounded-sm border border-[var(--line)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          aria-label="Close"
        >
          <Glyph name="close" className="h-sp-5 w-sp-5" />
        </button>

        <h2 className="pr-sp-10 text-label-lg font-semibold">{title}</h2>
        <p className="mt-sp-3 text-label-xs leading-5 text-[var(--muted)]">{description}</p>

        <div className="mt-sp-7 space-y-sp-5">
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={isSendingGoogle}
            className="flex min-h-sp-10 w-full items-center justify-center gap-sp-4 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleGlyph />
            {isSendingGoogle ? "Redirecting..." : "Continue with Google"}
          </button>

          <div className="flex items-center gap-sp-5 text-label-xs text-[var(--subtle)]">
            <span className="h-px flex-1 bg-[var(--line)]" />
            or
            <span className="h-px flex-1 bg-[var(--line)]" />
          </div>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="min-h-sp-10 w-full rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <button
            type="button"
            onClick={sendSignInLink}
            disabled={isSendingLink}
            className="min-h-sp-10 w-full rounded-sm bg-[var(--accent)] px-sp-5 text-label-sm font-semibold text-[var(--active-ink)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSendingLink ? "Sending sign-in link..." : "Continue with email"}
          </button>

          {message && <p className="text-label-xs text-[var(--muted)]">{message}</p>}
        </div>
      </motion.section>
    </motion.div>
  );
}
