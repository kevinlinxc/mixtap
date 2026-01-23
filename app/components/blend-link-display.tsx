"use client";

import { useEffect, useState } from "react";

type BlendLinkState = {
    status: "loading" | "idle" | "error";
    link: string | null;
    message?: string;
};

const INITIAL_STATE: BlendLinkState = {
    status: "loading",
    link: null,
};

export function BlendLinkDisplay() {
    const [state, setState] = useState<BlendLinkState>(INITIAL_STATE);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!state.link) return;

        try {
            await navigator.clipboard.writeText(state.link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("[blend-link-display] failed to copy", err);
        }
    };

    useEffect(() => {
        const fetchLink = async () => {
            console.log("[blend-link-display] starting fetch");
            try {
                const response = await fetch("/api/blend-link", {
                    credentials: "include",
                    cache: "no-store",
                });

                console.log("[blend-link-display] received response", {
                    status: response.status,
                    ok: response.ok
                });

                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }

                const payload = (await response.json()) as { link: string | null; message?: string };

                console.log("[blend-link-display] fetched link", {
                    hasLink: Boolean(payload.link),
                    linkPreview: payload.link ? payload.link.substring(0, 50) + "..." : null,
                    message: payload.message
                });

                setState({
                    status: "idle",
                    link: payload.link,
                    message: payload.message,
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                console.error("[blend-link-display] failed to fetch link", message);
                setState({
                    status: "error",
                    link: null,
                    message,
                });
            }
        };

        void fetchLink();
    }, []);

    if (state.status === "loading") {
        return null;
    }

    if (!state.link) {
        return null;
    }

    return (
        <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <p className="font-medium">Your personal Blend link is ready:</p>
            <code className="block break-words rounded bg-white/70 p-2 text-xs font-mono dark:bg-emerald-900/40">
                {state.link}
            </code>
            <div className="flex gap-2">
                <button
                    onClick={handleCopy}
                    className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
                >
                    {copied ? "Copied!" : "Copy Blend URL"}
                </button>
                <a
                    href={state.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-md bg-zinc-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-zinc-600"
                >
                    Open Blend URL
                </a>
            </div>
        </div>
    );
}
