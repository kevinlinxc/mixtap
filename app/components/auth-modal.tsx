"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

// Public Spotify Client ID for mixtap
const SPOTIFY_CLIENT_ID = "65b708073fc0480ea92a077233ca87bd";

const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
Mixtap Spotify OAuth Helper
Run this script locally to authenticate with Spotify and get your authorization code.
"""

import hashlib
import base64
import secrets
import webbrowser
import http.server
import socketserver
import urllib.parse
from threading import Thread

# Configuration
CLIENT_ID = "${SPOTIFY_CLIENT_ID}"
REDIRECT_URI = "http://127.0.0.1:8888/callback"
SCOPE = "streaming"

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')

def generate_code_verifier(length: int = 96) -> str:
    return base64url_encode(secrets.token_bytes(length))

def generate_code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode('ascii')).digest()
    return base64url_encode(digest)

class CallbackHandler(http.server.SimpleHTTPRequestHandler):
    code = None
    state = None
    
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/callback':
            params = urllib.parse.parse_qs(parsed.query)
            CallbackHandler.code = params.get('code', [None])[0]
            CallbackHandler.state = params.get('state', [None])[0]
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            if CallbackHandler.code:
                html = """
                <html><body style="font-family: system-ui; background: #18181b; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center; padding: 2rem;">
                    <h1 style="color: #22c55e;">✓ Success!</h1>
                    <p>You can close this window and return to your terminal.</p>
                </div>
                </body></html>
                """
            else:
                error = params.get('error', ['Unknown error'])[0]
                html = f"""
                <html><body style="font-family: system-ui; background: #18181b; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center; padding: 2rem;">
                    <h1 style="color: #ef4444;">✗ Error</h1>
                    <p>{error}</p>
                </div>
                </body></html>
                """
            
            self.wfile.write(html.encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass  # Suppress logging

def main():
    print("=" * 60)
    print("  Mixtap Spotify OAuth Helper")
    print("=" * 60)
    print()
    
    # Generate PKCE values
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)
    state = secrets.token_urlsafe(16)
    
    # Build authorization URL
    auth_params = urllib.parse.urlencode({
        'client_id': CLIENT_ID,
        'response_type': 'code',
        'redirect_uri': REDIRECT_URI,
        'scope': SCOPE,
        'state': state,
        'code_challenge_method': 'S256',
        'code_challenge': code_challenge,
    })
    auth_url = f"https://accounts.spotify.com/authorize?{auth_params}"
    
    print("Starting local server on http://127.0.0.1:8888 ...")
    print()
    
    # Start server
    with socketserver.TCPServer(("127.0.0.1", 8888), CallbackHandler) as httpd:
        httpd.timeout = 120  # 2 minute timeout
        
        print("Opening Spotify authorization in your browser...")
        print()
        webbrowser.open(auth_url)
        
        print("Waiting for authorization (timeout: 2 minutes)...")
        print()
        
        # Handle one request (the callback)
        httpd.handle_request()
    
    if CallbackHandler.code and CallbackHandler.state == state:
        print("=" * 60)
        print("  Authorization successful!")
        print("=" * 60)
        print()
        print("Copy the following values and paste them into mixtap:")
        print()
        print("-" * 60)
        print(f"CODE: {CallbackHandler.code}")
        print()
        print(f"CODE_VERIFIER: {code_verifier}")
        print("-" * 60)
        print()
    elif CallbackHandler.state != state:
        print("Error: State mismatch - possible CSRF attack")
    else:
        print("Error: Authorization failed or timed out")

if __name__ == "__main__":
    main()
`;

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [copied, setCopied] = useState(false);
    const [copiedBlendLink, setCopiedBlendLink] = useState(false);
    const [code, setCode] = useState("");
    const [codeVerifier, setCodeVerifier] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [blendLink, setBlendLink] = useState<string | null>(null);

    const copyScript = async () => {
        await navigator.clipboard.writeText(PYTHON_SCRIPT);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async () => {
        if (!code.trim() || !codeVerifier.trim()) {
            setError("Please enter both the code and code verifier");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch("/api/blend-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: code.trim(),
                    codeVerifier: codeVerifier.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to exchange code");
            }

            setBlendLink(data.blendLink);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyBlendLink = async () => {
        if (blendLink) {
            await navigator.clipboard.writeText(blendLink);
            setCopiedBlendLink(true);
            setTimeout(() => setCopiedBlendLink(false), 2000);
        }
    };

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-2xl my-8 max-h-[85vh] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-700 bg-zinc-900 px-6 py-4">
                    <h2 className="text-xl font-bold text-zinc-100">
                        {blendLink ? "Your Blend Link" : "Authorize with Spotify"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {blendLink ? (
                        /* Success state */
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-400">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-semibold">Success! Here&apos;s your Blend link:</span>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={blendLink}
                                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 font-mono"
                                />
                                <button
                                    onClick={copyBlendLink}
                                    className={`rounded-lg px-4 py-2 font-semibold text-white transition ${copiedBlendLink ? 'bg-emerald-600' : 'bg-green-500 hover:bg-green-600'}`}
                                >
                                    {copiedBlendLink ? "Copied!" : "Copy"}
                                </button>
                            </div>
                            <p className="text-sm text-zinc-400">
                                Write this URL to your NFC tag using an NFC writing app!
                            </p>
                        </div>
                    ) : (
                        /* Auth flow */
                        <>
                            {/* Explanation */}
                            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
                                <h3 className="font-semibold text-zinc-100 mb-2">Why a local script?</h3>
                                <p className="text-sm text-zinc-400">
                                    Spotify&apos;s public Web API doesn&apos;t have an endpoint to generate Blend URLs—you can only get them
                                    through internal APIs used by the desktop app (similar to how{" "}
                                    <a
                                        href="https://github.com/librespot-org/librespot"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-400 hover:text-green-300 underline"
                                    >
                                        librespot
                                    </a>{" "}
                                    works). This script authenticates you locally so mixtap can access that internal endpoint.
                                    I&apos;ve{" "}
                                    <a
                                        href="https://community.spotify.com/t5/Spotify-for-Developers/API-scope-endpoint-to-get-a-blend-url/td-p/7214905"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-400 hover:text-green-300 underline"
                                    >
                                        requested this feature
                                    </a>{" "}
                                    from Spotify.
                                </p>
                            </div>

                            {/* Step 1: Run Script */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-sm font-bold text-green-500">
                                        1
                                    </div>
                                    <h3 className="font-semibold text-zinc-100">Run this Python script locally</h3>
                                </div>

                                <p className="text-sm text-zinc-400 ml-8">
                                    Save the script below as <code className="text-green-400">mixtap_auth.py</code> and run it:
                                </p>

                                <div className="ml-8 space-y-2">
                                    <div className="flex gap-2 text-sm">
                                        <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">Windows:</span>
                                        <code className="rounded bg-zinc-800 px-2 py-1 text-green-400">python mixtap_auth.py</code>
                                    </div>
                                    <div className="flex gap-2 text-sm">
                                        <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">Mac/Linux:</span>
                                        <code className="rounded bg-zinc-800 px-2 py-1 text-green-400">python3 mixtap_auth.py</code>
                                    </div>
                                </div>

                                <div className="ml-8 relative">
                                    <pre className="max-h-64 overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-4 text-xs text-zinc-300 font-mono">
                                        {PYTHON_SCRIPT}
                                    </pre>
                                    <button
                                        onClick={copyScript}
                                        className="absolute right-2 top-2 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
                                    >
                                        {copied ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                            </div>

                            {/* Step 2: Paste Values */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-sm font-bold text-green-500">
                                        2
                                    </div>
                                    <h3 className="font-semibold text-zinc-100">Paste the values from the script</h3>
                                </div>

                                <div className="ml-8 space-y-3">
                                    <div>
                                        <label className="block text-sm text-zinc-400 mb-1">Authorization Code</label>
                                        <input
                                            type="text"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            placeholder="Paste the CODE here..."
                                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-zinc-400 mb-1">Code Verifier</label>
                                        <input
                                            type="text"
                                            value={codeVerifier}
                                            onChange={(e) => setCodeVerifier(e.target.value)}
                                            placeholder="Paste the CODE_VERIFIER here..."
                                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !code || !codeVerifier}
                                className="w-full rounded-lg bg-green-500 py-3 font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSubmitting ? "Getting your link..." : "Get My Blend Link"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
