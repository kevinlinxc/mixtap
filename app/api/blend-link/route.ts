import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { SESSION_COOKIE_NAME, getBlendLink, clearBlendLink } from "@/app/lib/spotify-token-store";
import { exchangeCodeForToken } from "@/app/lib/spotify";
import { generatePassword, hashPassword } from "@/app/lib/password";
import { getAdminClient } from "@/app/utils/supabase/admin";

// The redirect URI used by the local Python script
const LOCAL_REDIRECT_URI = "http://127.0.0.1:3000/login";

export async function GET() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    console.log("[blend-link-api] request received", {
        hasSessionId: Boolean(sessionId),
        sessionId: sessionId?.substring(0, 8) + "...",
        allCookies: Array.from(cookieStore.getAll()).map(c => c.name)
    });

    if (!sessionId) {
        console.log("[blend-link-api] no session cookie found");
        return NextResponse.json(
            { link: null, message: "No session found. Please authorize first." },
            { status: 200, headers: { "Cache-Control": "no-store" } }
        );
    }

    const link = getBlendLink(sessionId);

    console.log("[blend-link-api] retrieved link from store", {
        sessionId: sessionId.substring(0, 8) + "...",
        hasLink: Boolean(link),
        linkPreview: link ? link.substring(0, 50) + "..." : null
    });

    if (!link) {
        console.log("[blend-link-api] no link found in store for session", sessionId.substring(0, 8) + "...");
        return NextResponse.json(
            { link: null, message: "No blend link found for this session." },
            { status: 200, headers: { "Cache-Control": "no-store" } }
        );
    }

    // Delete the link after first retrieval so refreshing returns to home
    clearBlendLink(sessionId);

    console.log("[blend-link-api] returning link and clearing from store", {
        sessionId: sessionId.substring(0, 8) + "...",
        hasLink: Boolean(link)
    });

    return NextResponse.json(
        { link },
        { status: 200, headers: { "Cache-Control": "no-store" } }
    );
}

// POST handler for manual OAuth code exchange (from local Python script)
export async function POST(request: NextRequest) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;

    if (!clientId) {
        return NextResponse.json(
            { error: "Missing SPOTIFY_CLIENT_ID environment variable." },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { code, codeVerifier } = body;

        if (!code || !codeVerifier) {
            return NextResponse.json(
                { error: "Missing code or codeVerifier" },
                { status: 400 }
            );
        }

        console.log("[blend-link] exchanging authorization code", {
            codePreview: code.slice(0, 8) + "...",
        });

        // Exchange the code for tokens using the local redirect URI
        const tokenInfo = await exchangeCodeForToken({
            clientId,
            code,
            redirectUri: LOCAL_REDIRECT_URI,
            codeVerifier,
        });

        // Generate a unique user ID (lowercase UUID without dashes)
        const spotifyUserId = randomUUID().replace(/-/g, "").toLowerCase();

        // Store in Supabase
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

        // Check for existing refresh token
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

        // Store tokens
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

        console.log("[blend-link] token exchange successful", {
            spotifyUserId,
            expiresIn: tokenInfo.expires_in,
            hasRefreshToken: Boolean(tokenInfo.refresh_token),
        });

        // Construct the blend URL
        const origin = request.headers.get('x-forwarded-proto') && request.headers.get('x-forwarded-host')
            ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('x-forwarded-host')}`
            : new URL(request.url).origin;

        const baseUrl = origin !== 'null' ? origin.replace(/\/+$/, "") : "https://mixtap.cc";
        const blendLink = `${baseUrl}/blend?id=${encodeURIComponent(spotifyUserId)}&token=${encodeURIComponent(password)}`;

        return NextResponse.json({ blendLink });
    } catch (err) {
        const message = err instanceof Error ? err.message : "token_exchange_failed";
        console.error("[blend-link] error", { error: message });
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
