# mixtap
NFC tag that your friends can tap to create a Spotify blend with you


Deployed at [mixtap.app](https://www.mixtap.app)

## How it works

- Users authorize the app with Spotify to get access to create Blend invites on their behalf
- Upon authorization, the app generates a unique Blend URL and stores the user's Spotify credentials securely in Supabase
- The user writes this unique URL to an NFC tag using an NFC writing app
- When someone taps the NFC tag, they're taken to the Blend URL endpoint
- The endpoint:
  - Verifies the authentication token in the URL
  - Uses the stored Spotify credentials to request a fresh Blend invite link from Spotify
  - Redirects the tapper to the new Blend URL, opening Spotify to create a Blend playlist

The frontend provides:
- A landing page with an interactive 3D phone animation showing how to "tap" 
- User authentication flow with Spotify OAuth
- Instructions for setting up your own NFC tag
- Display of your unique Blend URL after authorization

## Why is this complicated?

Spotify doesn't provide a public API endpoint for Blend invites. The only way to get a Blend URL is throough their Private API that gets called when you hit "Invite to Blend" in the Spotify app. 
Spotfiy probably won't be too happy about this.

My forum post about it: [link](https://community.spotify.com/t5/Spotify-for-Developers/Programatically-get-blend-URL/m-p/7151095#M18847)

## Local Setup

### Env file

Make a .env file with these variables:
SPOTIFY_CLIENT_ID=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=


### Install dependencies and run

```
npm install
npm run dev
```
