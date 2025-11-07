export const SESSION_COOKIE_NAME = "spotify_session_id";

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
    console.log("[blend-link-store] stored blend link", {
        sessionId: sessionId.substring(0, 8) + "...",
        linkPreview: link.substring(0, 50) + "...",
        storeSize: blendLinkStore.size,
    });
};

export const getBlendLink = (sessionId: string): string | null => {
    const record = blendLinkStore.get(sessionId);
    console.log("[blend-link-store] getBlendLink called", {
        sessionId: sessionId.substring(0, 8) + "...",
        foundRecord: Boolean(record),
        storeSize: blendLinkStore.size,
        allKeysPreview: Array.from(blendLinkStore.keys()).map((k) => k.substring(0, 8) + "..."),
    });
    return record?.link ?? null;
};

export const clearBlendLink = (sessionId: string) => {
    blendLinkStore.delete(sessionId);
};
