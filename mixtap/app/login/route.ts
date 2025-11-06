import { NextRequest, NextResponse } from "next/server";

import { exchangeCodeForToken } from "@/app/lib/spotify";
import { consumeAuthState } from "@/app/lib/spotify-auth-store";
import { SESSION_COOKIE_NAME, storeSessionTokens } from "@/app/lib/spotify-token-store";

const CALLBACK_FALLBACK = "http://127.0.0.1:3000/login";

export async function GET(request: NextRequest) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;

    if (!clientId) {
        return NextResponse.json(
            { error: "Missing SPOTIFY_CLIENT_ID environment variable." },
            { status: 500 }
        );
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (error) {
        const response = NextResponse.redirect(new URL("/?error=" + encodeURIComponent(error), url.origin));
        return response;
    }

    if (!code || !state) {
        const response = NextResponse.redirect(new URL("/?error=missing_code", url.origin));
        return response;
    }

    const authRecord = consumeAuthState(state);

    if (!authRecord) {
        const response = NextResponse.redirect(new URL("/?error=invalid_state", url.origin));
        response.cookies.delete("spotify_tokens");
        return response;
    }

    const sessionId = sessionCookie ?? authRecord.sessionId;

    if (!sessionId) {
        const response = NextResponse.redirect(new URL("/?error=missing_session", url.origin));
        return response;
    }

    try {
        const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? CALLBACK_FALLBACK;

        console.log("[spotify-callback] exchanging authorization code", {
            state,
            redirectUri,
            codePreview: code.slice(0, 8) + "...",
        });

        const tokenInfo = await exchangeCodeForToken({
            clientId,
            code,
            redirectUri,
            codeVerifier: authRecord.codeVerifier,
        });

        console.log("[spotify-callback] received token response", {
            state,
            expiresIn: tokenInfo.expires_in,
            hasRefreshToken: Boolean(tokenInfo.refresh_token),
            scope: tokenInfo.scope,
        });

        const response = NextResponse.redirect(new URL("/", url.origin));
        const secure = process.env.NODE_ENV === "production";
        storeSessionTokens(sessionId, tokenInfo);

        console.log("[spotify-callback] stored tokens for session", {
            sessionId,
        });

        response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
            httpOnly: true,
            secure,
            path: "/",
            maxAge: tokenInfo.expires_in ?? 3600,
            sameSite: "lax",
        });

        return response;
    } catch (err) {
        const message = err instanceof Error ? err.message : "token_exchange_failed";
        console.error("[spotify-callback] token exchange failed", {
            state,
            error: message,
        });
        const response = NextResponse.redirect(
            new URL("/?error=" + encodeURIComponent(message.slice(0, 200)), url.origin)
        );
        return response;
    }
}
