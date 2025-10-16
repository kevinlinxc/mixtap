# mixtap
NFC tag that your friends tap to create a Spotify blend with you

## How it works

- NFC tags can bring you to a link. So, we tap our phone and it opens a link. 
- There's an Spotify endpoint that you hit whenever you hit the "Invite to blend" button, that gives you the link you share with your friends. 
This is ultimately the link we want the NFC tag to take you to. 
    - However, this link is generated new every time and expires eventually, so our NFC tag can't just be hardcoded to one. 
- Instead, we run an API that hits the Spotify endpoint and redirects to the link we get from it.
- Since the endpoint requires authentication, we'll need the API to know our Spotify credentials
- Since I don't want to pay money to host this API (you could!), I'm going to use cloudflare tunnels to make the API runnable from my home computer
- Since NFC tags can't really hit the API with a "header" for authentication (all it does is open a URL on your phone's browser), I'm going to add authentication via query param, which
feels wrong, but is probably much better than just having an exposed API that is running on your computer

Chain of events:
- Friend taps phone on NFC tag
- Opens API route on their phone, with a query param
- API route verifies query param, if it's correct, uses the Spotify credentials it knows to request a blend URL from Spotify's endpoint
- API returns a redirect request to the user's phone, user is redirected to the Blend URL


## Setup

```
pip install uv
uv venv --seed -python 3.12
uv sync
litestar --app src.app:app run
```
