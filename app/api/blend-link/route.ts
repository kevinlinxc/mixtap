import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, getBlendLink, clearBlendLink } from "@/app/lib/spotify-token-store";

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
