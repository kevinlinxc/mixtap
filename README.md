# mixtap
NFC tag that your friends can tap to create a Spotify blend with you

## How it works

- NFC tags can bring you to a link. So, we tap our phone and it opens a link. 
- There's an Spotify endpoint that you hit whenever you hit the "Invite to blend" button, that gives you the link you share with your friends. 
This is ultimately the link we want the NFC tag to take you to. 
    - However, this link is generated new every time and expires eventually, so our NFC tag can't just be hardcoded to one. 
- Instead, we run an API that hits the Spotify endpoint and redirects to the link we get from it.
- Since the endpoint requires authentication, we need to fetch an API token from the Spotify API when we start up our API.
- Since I don't want to pay money to host this API (you could!), I'm going to use Ngrok to make the API runnable from my home computer and exposed at a Public URL
- Since NFC tags can't really hit the API with a "header" for authentication (all it does is open a URL on your phone's browser), I'm going to add authentication via query param, which
feels atypical, but is a bit better than just having an API that is running exposed to the public

Chain of events:
- Friend taps phone on NFC tag
- Opens API route on their phone, with a query param
- API route verifies query param, if it's correct, uses the Spotify API token it knows to request a blend URL from Spotify's endpoint
- API returns a redirect request to the user's phone, user is redirected to the Blend URL, which should prompt Spotify app to open

Overall this is pretty complicated and requires a server to host the API, so I hope Spotify makes this into a public API endpoint sometime! 
My forum post about it: [link](https://community.spotify.com/t5/Spotify-for-Developers/Programatically-get-blend-URL/m-p/7151095#M18847)

## Setup

### Install dependencies

```
pip install uv
uv venv --seed -python 3.12

# Windows
.venv\Scripts\activate
# Linux/Mac
source .venv/bin/activate

uv sync
```

### Simple test

Sign into Spotify on your browser first, then, with your venv activated, run

```
python test.py
```

This should open up your browser to a Spotify integration page.

Click "Continue to the app", and then you should see a blend URL in the terminal. 

This means everything is working.

### Generate an API token

Run `python generate_token.py` to create a token and a token hash. 

Create a `.env` file in the repository root directory, and put this in it:

```
SPOTIFY_CLIENT_ID=<Spotify Desktop Client ID from [here](https://github.com/librespot-org/librespot/blob/61f517bfff27c8cdb209cd36ffefc682285b540d/oauth/examples/oauth_sync.rs#L5)>
API_TOKEN_HASH=<the hash you just generated>
```

Hold onto the API token you generated (not the hash), you could put it in your .env for convenience although not technically needed

### Run the API

The API will be the URL that your NFC tag points to, that will get a Blend URL to redirect to on your friend's phone.

```
litestar --app src.app:app run --port 8700
```

Test that it works locally by opening this link in your browser:

http://127.0.0.1:8700/blend?token=<your-api-token>

### Expose your API using Ngrok
Ngrok exposes a local port from your computer onto a public URL that anyone can visit.

They provide a URL that changes normally, but if you make a free account they will give you a fixed URL for free.

Docs: https://ngrok.com/docs/getting-started


Once you have a public URL e.g. https://rafter-warping-robin.ngrok-free.app, replace the part of your URL before `/blend` to test it out,
e.g. https://rafter-warping-robin.ngrok-free.app/blend?token=<your-api-token>

Once confirming that it works, put that on your NFC tag and you should be good to go!

Sadly, Ngrok just redirects traffic to your computer, so your computer will still need to be running the API. If you want to get 
rid of that requirement, you'll need to pay for a cheap VPS/Linux box to host the API.
