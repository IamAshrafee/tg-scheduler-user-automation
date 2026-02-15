"""
API Rate Limiting using slowapi.

Rate limits:
  - Login:      5 / 15 minutes per IP
  - Register:   3 / hour per IP
  - Send-code:  3 / 10 minutes per IP
  - Upload:    10 / hour per user
  - General:   60 / minute per IP

Behind Nginx the real client IP comes from X-Forwarded-For.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def _get_real_ip(request: Request) -> str:
    """Extract the real client IP, respecting X-Forwarded-For from Nginx."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # First IP in the chain is the client
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_get_real_ip, default_limits=["60/minute"])
