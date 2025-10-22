"""Small FastAPI helper to wait for an OAuth authorization code.

Provides wait_for_code(host, port, timeout) that starts a FastAPI app
in a background thread and blocks until a code is received (or timeout).
"""

from __future__ import annotations

import threading
from queue import Queue, Empty
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
import uvicorn


def create_simple_api(code_queue: Queue[str]) -> FastAPI:
    app = FastAPI()

    @app.get("/login", response_class=HTMLResponse)
    async def root(request: Request):
        qs = request.query_params
        if "code" in qs:
            code_queue.put(qs["code"])  # type: ignore[arg-type]
            return HTMLResponse("<html><body><h1>Authorization received. You can close this window.</h1></body></html>")
        return HTMLResponse("<html><body><h1>Missing code parameter.</h1></body></html>", status_code=400)

    return app


def wait_for_code(host: str = "127.0.0.1", port: int = 8898, timeout: Optional[float] = None) -> Optional[str]:
    """Start a FastAPI server (in a background thread) and block until the
    `code` query parameter is received on GET /.
    Returns None on timeout (seconds).

    Returns the code as a string.
    """
    code_queue = Queue()
    app = create_simple_api(code_queue)

    config = uvicorn.Config(app, host=host, port=port, log_level="warning")
    server = uvicorn.Server(config)

    # Run server in a background thread. uvicorn.Server.run() is blocking,
    # but Server.serve() can be used; however, to keep compatibility we run
    # serve in a dedicated thread.
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    try:
        code = code_queue.get(timeout=timeout)
        return code
    except Empty:
        raise RuntimeError(f"Timed out waiting for Spotify authorization code after {timeout} seconds")
    finally:
        # Ask uvicorn to shutdown. Server exposes should_exit flag.
        try:
            server.should_exit = True
        except Exception:
            pass
