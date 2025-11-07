import Link from "next/link";
import { Suspense } from "react";

import TokenViewer from "./token-viewer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; link?: string }> | { error?: string; link?: string };
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const error = resolvedSearchParams?.error ?? null;
  const blendLink = resolvedSearchParams?.link ?? null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col gap-8 rounded-lg bg-white p-12 shadow-xl dark:bg-zinc-900">
        <header className="flex flex-col gap-2 text-center sm:text-left">
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Mixtap
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Generating dynamic Spotify Blend URLs for you at a fixed link!
          </p>
        </header>
        
        <div className="flex flex-col gap-4">
          {!blendLink && (
            <Link
              href="/auth"
              className="inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-600"
            >
              Authorize with Spotify
            </Link>
          )}

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              Something went wrong: {decodeURIComponent(error)}
            </p>
          )}
          {blendLink && (
            <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              <p className="font-medium">Your personal Blend link is ready:</p>
              <code className="block break-words rounded bg-white/70 p-2 text-xs font-mono dark:bg-emerald-900/40">
                {blendLink}
              </code>
              <a
                href={blendLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                Open Blend URL
              </a>
            </div>
          )}
          <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading token info…</p>}>
            <TokenViewer />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
