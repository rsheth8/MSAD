"use client";

import { useSession } from "@/lib/auth/useSession";

/** Sign in / out control. Renders nothing in a guest-only build (no auth env). */
export function AccountButton() {
  const { user, authEnabled, loading, refresh } = useSession();

  if (loading || !authEnabled) return null;

  if (!user) {
    return (
      <a href="/api/auth/google" className="btn-ghost interactive inline-flex items-center gap-2">
        <GoogleMark />
        Sign in
      </a>
    );
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    await refresh();
  }

  return (
    <div className="surface flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 text-xs">
      {user.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.picture} alt="" className="h-6 w-6 rounded-full" />
      ) : (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/20 text-accent">
          {user.name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="hidden max-w-[10rem] truncate font-medium text-foreground sm:inline">
        {user.name}
      </span>
      <button
        type="button"
        onClick={signOut}
        className="rounded-full px-1.5 text-muted-2 hover:text-down"
        title="Sign out"
      >
        Sign out
      </button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16z" />
      <path fill="#FBBC05" d="M10.4 28.3c-.5-1.4-.8-2.9-.8-4.3s.3-2.9.8-4.3l-7.8-6.1C.9 16.9 0 20.3 0 24s.9 7.1 2.6 10.4l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.1-5.5c-2 1.3-4.6 2.1-8.1 2.1-6.4 0-11.8-3.8-13.6-9.3l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
