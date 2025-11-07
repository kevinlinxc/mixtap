import type { SpotifyTokenResponse } from "@/app/lib/spotify";

export const SESSION_COOKIE_NAME = "spotify_session_id";

type TokenRecord = {
    tokens: SpotifyTokenResponse;
    storedAt: number;
    expiresAt: number;
};

const CLEANUP_INTERVAL_MS = 60_000;

const globalStore = globalThis as typeof globalThis & {
    spotifyTokenStore?: Map<string, TokenRecord>;
    spotifyTokenLastCleanup?: number;
};

const tokenStore = (globalStore.spotifyTokenStore ??= new Map<string, TokenRecord>());
globalStore.spotifyTokenLastCleanup ??= Date.now();

const cleanupIfNeeded = () => {
    const now = Date.now();
    if (now - (globalStore.spotifyTokenLastCleanup ?? 0) < CLEANUP_INTERVAL_MS) {
        return;
    }

    for (const [sessionId, record] of tokenStore.entries()) {
        if (record.expiresAt <= now) {
            tokenStore.delete(sessionId);
        }
    }

    globalStore.spotifyTokenLastCleanup = now;
};

export const storeSessionTokens = (sessionId: string, tokens: SpotifyTokenResponse) => {
    const now = Date.now();
    const expiresInSeconds = typeof tokens.expires_in === "number" && tokens.expires_in > 0 ? tokens.expires_in : 3600;
    const expiresAt = now + expiresInSeconds * 1000;
    tokenStore.set(sessionId, {
        tokens,
        storedAt: now,
        expiresAt,
    });
    console.log("[spotify-token-store] stored tokens", {
        sessionId,
        expiresInSeconds,
        expiresAt: new Date(expiresAt).toISOString(),
    });
    cleanupIfNeeded();
};

export const getSessionTokens = (sessionId: string): SpotifyTokenResponse | null => {
    cleanupIfNeeded();
    const record = tokenStore.get(sessionId);
    if (!record) {
        console.warn("[spotify-token-store] no tokens for session", sessionId);
        return null;
    }

    if (record.expiresAt <= Date.now()) {
        console.warn("[spotify-token-store] tokens expired", sessionId);
        tokenStore.delete(sessionId);
        return null;
    }

    return record.tokens;
};

export const clearSessionTokens = (sessionId: string) => {
    tokenStore.delete(sessionId);
};

type BlendLinkRecord = {
    link: string;
    storedAt: number;
};

const globalBlendStore = globalThis as typeof globalThis & {
    spotifyBlendLinkStore?: Map<string, BlendLinkRecord>;
};

const blendLinkStore = (globalBlendStore.spotifyBlendLinkStore ??= new Map<string, BlendLinkRecord>());

export const storeBlendLink = (sessionId: string, link: string) => {
    blendLinkStore.set(sessionId, {
        link,
        storedAt: Date.now(),
    });
    console.log("[spotify-token-store] stored blend link", {
        sessionId: sessionId.substring(0, 8) + "...",
        linkPreview: link.substring(0, 50) + "...",
        storeSize: blendLinkStore.size
    });
};

export const getBlendLink = (sessionId: string): string | null => {
    const record = blendLinkStore.get(sessionId);
    console.log("[spotify-token-store] getBlendLink called", {
        sessionId: sessionId.substring(0, 8) + "...",
        foundRecord: Boolean(record),
        storeSize: blendLinkStore.size,
        allKeysPreview: Array.from(blendLinkStore.keys()).map(k => k.substring(0, 8) + "...")
    });
    return record?.link ?? null;
};

export const clearBlendLink = (sessionId: string) => {
    blendLinkStore.delete(sessionId);
};
