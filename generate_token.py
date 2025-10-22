import uuid
import hashlib

# generate a long token and its hash

token = str(uuid.uuid4()).replace("-", "")
token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

print(f"Generated Token: {token}")
print(f"Token Hash: {token_hash}")
print(
    "Set the API_TOKEN_HASH in your .env file to the above hash value, and pass the token as a token query parameter when hitting your API."
)
