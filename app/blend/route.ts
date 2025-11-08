import { NextRequest, NextResponse } from "next/server";

import { hashPassword } from "@/app/lib/password";
import { getBlendUrl, refreshAccessToken } from "@/app/lib/spotify";
import { getAdminClient } from "@/app/utils/supabase/admin";

const buildErrorRedirect = (base: string, reason: string) => {
  const normalizedBase = base.replace(/\/+$/, "");
  const errorUrl = new URL("/main", normalizedBase || "http://localhost:3000");
  errorUrl.searchParams.set("error", reason);
  return NextResponse.redirect(errorUrl);
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const spotifyUserId = url.searchParams.get("id");
  const token = url.searchParams.get("token");

  const baseUrl = process.env.BASE_URL ?? url.origin;

  if (!spotifyUserId || !token) {
    return buildErrorRedirect(baseUrl, "missing_credentials");
  }

  const supabase = getAdminClient();

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id, password_hash, spotify_user_id")
    .eq("spotify_user_id", spotifyUserId)
    .maybeSingle();

  if (userError || !userRow?.password_hash || !userRow?.id) {
    console.error("[blend-route] user lookup failed", userError?.message);
    return buildErrorRedirect(baseUrl, "user_not_found");
  }

  const computedHash = hashPassword(token);

  if (userRow.password_hash !== computedHash) {
    console.warn("[blend-route] password hash mismatch", { spotifyUserId });
    return buildErrorRedirect(baseUrl, "invalid_token");
  }

  const supabaseUserId = userRow.id;

  const { data: tokenRow, error: tokenError } = await supabase
    .from("tokens")
    .select("access_token, refresh_token")
    .eq("user_id", supabaseUserId)
    .maybeSingle();

  if (tokenError || !tokenRow?.access_token) {
    console.error("[blend-route] token lookup failed", tokenError?.message);
    return buildErrorRedirect(baseUrl, "no_tokens_available");
  }

  try {
    const blendUrl = await getBlendUrl(tokenRow.access_token);
    return NextResponse.redirect(blendUrl);
  } catch (blendError) {
    console.error("[blend-route] initial blend fetch failed", blendError);

    if (!tokenRow.refresh_token) {
      return buildErrorRedirect(baseUrl, "blend_failed");
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;

    if (!clientId) {
      console.error("[blend-route] SPOTIFY_CLIENT_ID is not configured");
      return buildErrorRedirect(baseUrl, "server_error");
    }

    try {
      const refreshed = await refreshAccessToken({
        clientId,
        refreshToken: tokenRow.refresh_token,
      });

      const newRefreshToken = refreshed.refresh_token ?? tokenRow.refresh_token;

      const { error: updateError } = await supabase
        .from("tokens")
        .upsert(
          {
            user_id: supabaseUserId,
            access_token: refreshed.access_token,
            refresh_token: newRefreshToken,
          },
          { onConflict: "user_id" }
        );

      if (updateError) {
        throw new Error(updateError.message);
      }

      const blendUrl = await getBlendUrl(refreshed.access_token);
      return NextResponse.redirect(blendUrl);
    } catch (refreshError) {
      console.error("[blend-route] refresh + blend retry failed", refreshError);
      return buildErrorRedirect(baseUrl, "blend_retry_failed");
    }
  }
}
