// after redirect from Spotify authorization endpoint, trade received code for tokens, store them, generate simple text password 
// for the user, store everything in supabase, and generate a link for usage, redirect back to / with the blend link stored. 
import { NextRequest, NextResponse } from "next/server";

import { exchangeCodeForToken, getCurrentUserId } from "@/app/lib/spotify";
import { consumeAuthState } from "@/app/lib/spotify-auth-store";
import { SESSION_COOKIE_NAME, storeBlendLink } from "@/app/lib/spotify-token-store";
import { generatePassword, hashPassword } from "@/app/lib/password";
import { getAdminClient } from "@/app/utils/supabase/admin";

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
        const response = NextResponse.redirect(new URL("/main?error=" + encodeURIComponent(error), url.origin));
        return response;
    }

    if (!code || !state) {
        const response = NextResponse.redirect(new URL("/main?error=missing_code", url.origin));
        return response;
    }

    const authRecord = consumeAuthState(state);

    if (!authRecord) {
        const response = NextResponse.redirect(new URL("/main?error=invalid_state", url.origin));
        response.cookies.delete("spotify_tokens");
        return response;
    }

    // Always use the session ID from the auth record since that's what was set in /auth
    const sessionId = authRecord.sessionId;

    console.log("[spotify-callback] session resolution", {
        sessionCookieFromRequest: sessionCookie ? sessionCookie.substring(0, 8) + "..." : "none",
        authRecordSessionId: authRecord.sessionId.substring(0, 8) + "...",
        finalSessionId: sessionId.substring(0, 8) + "...",
        willUpdateCookie: true,
    });

    if (!sessionId) {
        const response = NextResponse.redirect(new URL("/main?error=missing_session", url.origin));
        return response;
    }

    try {
        let origin = request.headers.get('x-forwarded-proto') && request.headers.get('x-forwarded-host')
            ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('x-forwarded-host')}`
            : new URL(request.url).origin;
        try {
            const u = new URL(origin);
            if (u.hostname === "localhost") {
                u.hostname = "127.0.0.1";
                origin = u.origin;
            }
        } catch { }
        const redirectUri = origin !== 'null' ? `${origin}/login` : CALLBACK_FALLBACK;

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

        const spotifyUserId = await getCurrentUserId(tokenInfo.access_token);

        const supabase = getAdminClient();
        const password = generatePassword();
        const passwordHash = hashPassword(password);

        const { data: userRow, error: userError } = await supabase
            .from("users")
            .upsert(
                { spotify_user_id: spotifyUserId, password_hash: passwordHash },
                { onConflict: "spotify_user_id" }
            )
            .select("id")
            .maybeSingle();

        if (userError || !userRow?.id) {
            throw new Error(userError?.message ?? "Failed to upsert user record");
        }

        const { data: existingTokenRow, error: existingTokenError } = await supabase
            .from("tokens")
            .select("refresh_token")
            .eq("user_id", userRow.id)
            .maybeSingle();

        if (existingTokenError) {
            throw new Error(existingTokenError.message);
        }

        const refreshTokenToStore =
            tokenInfo.refresh_token ?? existingTokenRow?.refresh_token ?? null;

        const { error: tokenUpsertError } = await supabase
            .from("tokens")
            .upsert(
                {
                    user_id: userRow.id,
                    access_token: tokenInfo.access_token,
                    refresh_token: refreshTokenToStore,
                },
                { onConflict: "user_id" }
            );

        if (tokenUpsertError) {
            throw new Error(tokenUpsertError.message);
        }

        console.log("[spotify-callback] received token response", {
            state,
            expiresIn: tokenInfo.expires_in,
            hasRefreshToken: Boolean(tokenInfo.refresh_token),
            scope: tokenInfo.scope,
        });

        const baseUrl = origin !== 'null' ? origin.replace(/\/+$/, "") : "http://127.0.0.1:3000";
        const blendUrl = `${baseUrl}/blend?id=${encodeURIComponent(spotifyUserId)}&token=${encodeURIComponent(password)}`;

        const response = NextResponse.redirect(new URL("/main", url.origin));
        const secure = process.env.NODE_ENV === "production";
        storeBlendLink(sessionId, blendUrl);

        console.log("[spotify-callback] stored blend link for session", {
            sessionId,
            blendUrl,
        });

        response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
            httpOnly: true,
            secure,
            path: "/",
            maxAge: 60 * 60 * 24, // 24 hours for blend link access
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
            new URL("/main?error=" + encodeURIComponent(message.slice(0, 200)), url.origin)
        );
        return response;
    }
}
