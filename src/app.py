from litestar import Litestar, get
from litestar.status_codes import HTTP_302_FOUND
from litestar.response import Redirect
from .spotify_token import SpotifyTokenGenerator

print("Starting Mixtap...")

token_generator = SpotifyTokenGenerator()

@get("/blend", status_code=HTTP_302_FOUND)
async def blend() -> Redirect:
    blend_url = token_generator.get_blend_url()
    return Redirect(path=blend_url)


app = Litestar([blend])
