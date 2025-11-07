type AuthRecord = {
  codeVerifier: string;
  sessionId: string;
  expiresAt: number;
};

const CLEANUP_INTERVAL_MS = 60_000;

const globalStore = globalThis as typeof globalThis & {
  spotifyAuthStateStore?: Map<string, AuthRecord>;
  spotifyAuthLastCleanup?: number;
};

const store = (globalStore.spotifyAuthStateStore ??= new Map<string, AuthRecord>());

globalStore.spotifyAuthLastCleanup ??= Date.now();

const cleanupIfNeeded = () => {
  const now = Date.now();
  if (now - (globalStore.spotifyAuthLastCleanup ?? 0) < CLEANUP_INTERVAL_MS) {
    return;
  }

  for (const [state, record] of store.entries()) {
    if (record.expiresAt <= now) {
      store.delete(state);
    }
  }

  globalStore.spotifyAuthLastCleanup = now;
};

export const rememberAuthState = (
  state: string,
  codeVerifier: string,
  maxAgeSeconds: number,
  sessionId: string
) => {
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  store.set(state, { codeVerifier, sessionId, expiresAt });
  console.log(
    "[spotify-auth-store] stored state",
    state,
    "sessionId",
    sessionId,
    "expiresAt",
    new Date(expiresAt).toISOString()
  );
  cleanupIfNeeded();
};

export const consumeAuthState = (state: string): AuthRecord | null => {
  cleanupIfNeeded();
  const record = store.get(state);
  if (!record) {
    console.warn("[spotify-auth-store] missing state", state);
    return null;
  }

  store.delete(state);

  if (record.expiresAt <= Date.now()) {
    console.warn("[spotify-auth-store] expired state", state);
    return null;
  }

  console.log("[spotify-auth-store] consumed state", state, "sessionId", record.sessionId);
  return record;
};
