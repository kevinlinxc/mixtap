from litestar import Litestar, get
from litestar.status_codes import HTTP_302_FOUND
from litestar.response import Redirect


@get("/", status_code=HTTP_302_FOUND)
async def index() -> Redirect:
    return Redirect(path="https://google.com")


app = Litestar([index])