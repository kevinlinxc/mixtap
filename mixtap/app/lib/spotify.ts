import { createHash, randomBytes } from "crypto";

export type SpotifyTokenResponse = {
    access_token: string;
    token_type: string;
    scope?: string;
    expires_in: number;
    refresh_token?: string;
};

const DEFAULT_SCOPE = "streaming";
const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

const base64UrlEncode = (buffer: Buffer) =>
    buffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

export const generateCodeVerifier = (length = 96) => {
    if (length < 43 || length > 128) {
        throw new Error("Code verifier length must be between 43 and 128 characters.");
    }
    return base64UrlEncode(randomBytes(length));
};

export const generateCodeChallenge = (codeVerifier: string) => {
    const hashed = createHash("sha256").update(codeVerifier).digest();
    return base64UrlEncode(hashed);
};

export const buildAuthorizeUrl = ({
    clientId,
    redirectUri,
    scope = DEFAULT_SCOPE,
    state,
    codeChallenge,
}: {
    clientId: string;
    redirectUri: string;
    scope?: string;
    state: string;
    codeChallenge: string;
}) => {
    const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        scope,
        redirect_uri: redirectUri,
        state,
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
    });

    return `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
};

export const exchangeCodeForToken = async ({
    clientId,
    code,
    redirectUri,
    codeVerifier,
}: {
    clientId: string;
    code: string;
    redirectUri: string;
    codeVerifier: string;
}): Promise<SpotifyTokenResponse> => {
    console.log("[spotify-lib] requesting access token", {
        redirectUri,
        clientId,
        codePreview: code.slice(0, 8) + "...",
    });
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
    });

    const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(`Spotify token exchange failed: ${JSON.stringify(errorPayload)}`);
    }

    const payload = (await response.json()) as SpotifyTokenResponse;
    console.log("[spotify-lib] received access token", {
        hasRefreshToken: Boolean(payload.refresh_token),
        expiresIn: payload.expires_in,
        scope: payload.scope,
    });
    return payload;
};

export const refreshAccessToken = async ({
    clientId,
    refreshToken,
}: {
    clientId: string;
    refreshToken: string;
}): Promise<SpotifyTokenResponse> => {
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
    });

    const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(`Spotify token refresh failed: ${JSON.stringify(errorPayload)}`);
    }

    return (await response.json()) as SpotifyTokenResponse;
};

export const testToken = async (accessToken: string) => {
    const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.ok;
};

export const getBlendUrl = async (accessToken: string) => {
    const response = await fetch(
        "https://spclient.wg.spotify.com/blend-invitation/v1/generate?market=from_token",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(`Failed to get blend URL: ${JSON.stringify(errorPayload)}`);
    }

    const payload = await response.json();
    const invite = payload?.invite;

    if (!invite) {
        throw new Error(`No invite link in response: ${JSON.stringify(payload)}`);
    }

    return invite as string;
};
