import os
import hashlib
import hmac

from litestar import Litestar, get
from litestar.status_codes import HTTP_302_FOUND
from litestar.response import Redirect
from dotenv import load_dotenv

from .spotify_token import SpotifyTokenGenerator
from litestar.status_codes import HTTP_403_FORBIDDEN
from litestar.response import Response

load_dotenv()
token_hash = os.environ["API_TOKEN_HASH"]

print("Starting Mixtap...")

token_generator = SpotifyTokenGenerator()


@get("/blend", status_code=HTTP_302_FOUND)
async def blend(token: str) -> Redirect | Response:
    """
    Blend endpoint to redirect to the user's Spotify Blend URL.
    Since NFC can only open a link in a browser, this has to be a GET endpoint.
    Since we can't add any headers when opening a link from NFC, we use a query parameter for authentication.
    This authentication is better than nothing, since this API is technically open to the internet.
    """
    # check the hash of provided token, compared to token_hash, give 403 if not match
    provided_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    if not hmac.compare_digest(provided_hash, token_hash):
        # compare digest instead of equality check to prevent timing attacks
        return Response(status_code=HTTP_403_FORBIDDEN, content="Forbidden: Invalid token")

    blend_url = token_generator.get_blend_url()
    return Redirect(path=blend_url)


app = Litestar([blend])
print("Mixtap is running. Bind your NFC tag to http://<api host>:<port>/blend?token=<your_generated_token>")
