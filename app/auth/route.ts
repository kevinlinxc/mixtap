// quick redirect to the Spotify authorization endpoint
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import {
    buildAuthorizeUrl,
    generateCodeChallenge,
    generateCodeVerifier,
} from "@/app/lib/spotify";
import { rememberAuthState } from "@/app/lib/spotify-auth-store";
import { SESSION_COOKIE_NAME } from "@/app/lib/spotify-token-store";

const CALLBACK_FALLBACK = "http://127.0.0.1:3000/login";
const STATE_TTL_SECONDS = 60 * 5;
const SESSION_COOKIE_AGE_SECONDS = 60 * 60 * 6; // keep session around for token reuse

export async function GET() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;

    if (!clientId) {
        return NextResponse.json(
            { error: "Missing SPOTIFY_CLIENT_ID environment variable." },
            { status: 500 }
        );
    }

    const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? CALLBACK_FALLBACK;
    const sessionId = randomUUID();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = randomUUID();
    const scope = process.env.SPOTIFY_SCOPE ?? undefined;

    const authorizeUrl = buildAuthorizeUrl({
        clientId,
        redirectUri,
        scope,
        state,
        codeChallenge,
    });

    console.log("[spotify-login] storing auth state", {
        state,
        redirectUri,
        sessionId,
    });
    rememberAuthState(state, codeVerifier, STATE_TTL_SECONDS, sessionId);

    const response = NextResponse.redirect(authorizeUrl, { status: 302 });

    const secure = process.env.NODE_ENV === "production";
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_COOKIE_AGE_SECONDS,
    });

    console.log("[spotify-login] redirecting user", {
        authorizeUrl,
        sessionId,
    });
    return response;
}
