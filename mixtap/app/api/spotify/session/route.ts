import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, getSessionTokens } from "@/app/lib/spotify-token-store";

export async function GET(_request: NextRequest) {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;

    if (!sessionId) {
        console.log("[spotify-session] no session cookie present");
        return NextResponse.json(
            { tokens: null, message: "No session found" },
            {
                status: 200,
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    }

    let tokens = getSessionTokens(sessionId);

    if (!tokens) {
        const rawTokenCookie = cookieStore.get("spotify_tokens")?.value ?? null;
        if (rawTokenCookie) {
            try {
                tokens = JSON.parse(Buffer.from(rawTokenCookie, "base64url").toString("utf-8"));
                console.log("[spotify-session] migrated tokens from legacy cookie", {
                    expiresIn: tokens?.expires_in,
                });
            } catch (err) {
                console.error("[spotify-session] failed to decode legacy cookie", err);
            }
        }
    }

    if (!tokens) {
        console.log("[spotify-session] no tokens in memory for session", sessionId);
        return NextResponse.json(
            { tokens: null, message: "No tokens stored" },
            {
                status: 200,
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    }

    console.log("[spotify-session] returning tokens", {
        expiresIn: tokens?.expires_in,
        hasRefreshToken: Boolean(tokens?.refresh_token),
    });

    return NextResponse.json(
        { tokens },
        {
            status: 200,
            headers: {
                "Cache-Control": "no-store",
            },
        }
    );
}
