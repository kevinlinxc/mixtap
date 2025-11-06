"use client";

import { useCallback, useEffect, useState } from "react";

import type { SpotifyTokenResponse } from "@/app/lib/spotify";

type TokenState = {
  status: "loading" | "idle" | "error";
  tokens: SpotifyTokenResponse | null;
  message?: string;
};

const INITIAL_STATE: TokenState = {
  status: "idle",
  tokens: null,
};

const fetchTokens = async (): Promise<TokenState> => {
  try {
    const response = await fetch("/api/spotify/session", {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { tokens: SpotifyTokenResponse | null; message?: string };
    return {
      status: "idle",
      tokens: payload.tokens,
      message: payload.message,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[token-viewer] failed to fetch tokens", message);
    return {
      status: "error",
      tokens: null,
      message,
    };
  }
};

const TokenViewer = () => {
  const [state, setState] = useState<TokenState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchTokens();
    setState(result);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { tokens, status, message } = state;

  if (isLoading && status === "idle") {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading token info…</p>;
  }

  return (
    <section className="space-y-4 rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-700">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Token Details</h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={isLoading}
          className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {status === "error" && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Failed to load token info: {message}
        </p>
      )}

      {!tokens && message && (
        <p className="rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-200">
          {message}
        </p>
      )}

      {tokens ? (
        <dl className="space-y-3">
          <div className="space-y-1 break-words">
            <dt className="font-medium text-zinc-700 dark:text-zinc-300">Access Token</dt>
            <dd className="rounded bg-zinc-100 p-3 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              {tokens.access_token}
            </dd>
          </div>
          <div className="space-y-1 break-words">
            <dt className="font-medium text-zinc-700 dark:text-zinc-300">Refresh Token</dt>
            <dd className="rounded bg-zinc-100 p-3 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              {tokens.refresh_token ?? "Not provided"}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="font-medium text-zinc-700 dark:text-zinc-300">Expires In</dt>
            <dd className="rounded bg-zinc-100 p-3 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              {tokens.expires_in} seconds
            </dd>
          </div>
          <div className="space-y-1 break-words">
            <dt className="font-medium text-zinc-700 dark:text-zinc-300">Scope</dt>
            <dd className="rounded bg-zinc-100 p-3 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              {tokens.scope ?? "None"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Authorize above to fetch the latest tokens. Hit refresh after completing the flow if needed.
        </p>
      )}
    </section>
  );
};

export default TokenViewer;
