# Test srcipt that gets a blend URL for your account


from src.spotify_token import SpotifyTokenGenerator


if __name__ == "__main__":
    token_generator = SpotifyTokenGenerator()
    blend_url = token_generator.get_blend_url()
    print(f"Blend URL: {blend_url}")
