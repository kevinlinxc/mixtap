"""
Helper to get a spotify access token for a user once at startup and refresh it periodically.

Does the Authorization Code with PKCE flow as described by
https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow

Using my own Spotify Developer app client id and secret with the authorization flow/
authorization pkce flow didn't work, it seems the app doesn't have enough privilege even with
all scopes selected.

Using the PKCE flow with the public Spotify For Desktop client id worked,
 inspired by librespot-oauth: https://github.com/librespot-org/librespot/wiki/Options#access-token
I think the PKCE flow is used because it means you don't need the client secret, which we don't have.

I decided to implement the flow myself to have low-level control, but I maybe could have used librespot-oauth.

"""

import os
import hashlib
import webbrowser
import uuid
import secrets
from urllib.parse import urlencode
from typing import Optional
import base64

from .spotify_auth_server import wait_for_code

from requests import Session
from dotenv import load_dotenv

load_dotenv()


class SpotifyTokenGenerator:
    """
    Helper class to do the OAuth authorization code flow with Spotify to get an access token.
    Decided to implement it manually rather than depend on a Spotify API wrapper which doesn't allow low-level changes.
    """

    def __init__(self, client_id: str | None = None, port=8898) -> None:
        self.client_id = client_id or os.environ["SPOTIFY_CLIENT_ID"]
        self.auth_timeout = 120  # seconds
        self.session = Session()
        self.code_verifier: Optional[str] = None
        # Block here until user authorizes in the browser and the local server
        # receives the authorization code.
        self.code = self.get_authorization_code(port=port)
        self.access_token: str | None = None
        self.refresh_token_val: str | None = None
        self.expires_in: int = 0
        self.request_access_token(self.code, port=port)
        assert self.access_token is not None
        print(f"SpotifyTokenGenerator initialized with access token: {self.access_token[:10]}...")
        self.test_token()

    def get_authorization_code(self, port: int) -> str:
        """Open the browser to Spotify's authorize URL and block until the
        local redirect receives a `code` query parameter. Returns the code
        as a string.

        Notes:
        - The server listens on 127.0.0.1:{port}. Ensure this matches your
          registered Spotify redirect URI.
        - This function blocks (waits) until the user completes auth in the
          browser and Spotify redirects back with the code.
        """
        # PKCE: Generate code verifier and challenge
        # The verifier must be between 43 and 128 characters.
        code_verifier = secrets.token_urlsafe(96)
        self.code_verifier = code_verifier
        code_challenge = (
            base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode("utf-8")).digest())
            .rstrip(b"=")
            .decode("utf-8")
        )

        # individual extras from `extra_scopes` to find which one enables the API.
        scope = "streaming"
        redirect_uri = f"http://127.0.0.1:{port}/login"
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "scope": scope,
            "redirect_uri": redirect_uri,
            "state": str(uuid.uuid4()),
            "code_challenge_method": "S256",
            "code_challenge": code_challenge,
        }
        auth_url = "https://accounts.spotify.com/authorize?" + urlencode(params)

        # Open the user's default browser to the authorization URL and
        # delegate waiting for the redirect to the FastAPI helper.
        print(
            f'Requesting Spotify Authorization, click the "Continue to the app" button in your browser ({self.auth_timeout}s timeout)...'
        )
        webbrowser.open(auth_url)

        # Wait for up to 300 seconds by default. Returns None on timeout.
        code: Optional[str] = wait_for_code(host="127.0.0.1", port=port, timeout=self.auth_timeout)
        if code is None:
            raise TimeoutError("Timed out waiting for Spotify authorization code")
        print(f"Received Spotify authorization code: {code[:10]}...")
        return code

    def request_access_token(self, code: str, port: int) -> None:
        """Exchange the authorization code for an access token."""
        if not self.code_verifier:
            raise ValueError("Code verifier not set.")

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": f"http://127.0.0.1:{port}/login",
            "client_id": self.client_id,
            "code_verifier": self.code_verifier,
        }
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
        }
        response = self.session.post("https://accounts.spotify.com/api/token", data=data, headers=headers)
        response.raise_for_status()
        token_info = response.json()
        if "access_token" not in token_info:
            raise ValueError(f"No access token in Spotify response: {response.json()}")

        self.access_token = token_info["access_token"]
        self.refresh_token_val = token_info.get("refresh_token")
        self.expires_in = token_info.get("expires_in", 0)
        granted_scopes = token_info.get("scope")
        assert self.access_token is not None

        print(f"Received token {self.access_token[:10]}... which expires in {self.expires_in} seconds")
        print(f"Granted scopes: {granted_scopes}")

    def refresh_access_token(self) -> None:
        """Refresh the access token using the refresh token."""
        if not self.refresh_token_val:
            raise ValueError("No refresh token available to refresh the access token.")

        data = {
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token_val,
            "client_id": self.client_id,
        }
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
        }
        response = self.session.post("https://accounts.spotify.com/api/token", data=data, headers=headers)
        response.raise_for_status()
        token_info = response.json()

        if "access_token" not in token_info:
            raise ValueError(f"Failed to refresh access token: {response.json()}")

        self.access_token = token_info["access_token"]
        self.expires_in = token_info.get("expires_in", 0)
        # Spotify may or may not return a new refresh token. If it does, update it.
        if "refresh_token" in token_info:
            self.refresh_token_val = token_info["refresh_token"]

        print(f"Refreshed token. New token: {self.access_token}, expires in {self.expires_in} seconds")

    def test_token(self):
        """
        Test current token by makign a simple api request to the user's profile (which requires user-read-private scope)
        """
        if self.access_token is None:
            raise ValueError("No access token available to test.")
        headers = {
            "Authorization": "Bearer " + self.access_token,
        }
        response = self.session.get("https://api.spotify.com/v1/me", headers=headers)
        if response.status_code == 200:
            return True
        return False

    def get_blend_url(self):
        """
        Get the blend URL using the non-public Spotify API (use are your own risk here)
        """

        if self.access_token is None:
            raise ValueError("No access token available to get blend URL.")
        refresh_attempts = 0
        while refresh_attempts < 2:
            if self.test_token():
                # if token ever works, break, skipping else
                break
            # try refreshing a few times
            self.refresh_access_token()
            refresh_attempts += 1
        else:
            raise ValueError("Failed to get valid token after refresh attempts.")

        headers = {
            "authorization": "Bearer " + self.access_token,
        }

        response = self.session.post(
            "https://spclient.wg.spotify.com/blend-invitation/v1/generate?market=from_token", headers=headers
        )

        response.raise_for_status()

        invite_link = response.json().get("invite")

        if invite_link is None:
            raise ValueError(f"Failed to get blend URL: {response.json()}")

        return invite_link
