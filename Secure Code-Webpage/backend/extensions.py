import os
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv

load_dotenv()


def _storage_uri():
    # Use Redis when configured so limits hold across workers/instances;
    # falls back to in-memory for local single-process dev.
    if os.getenv("USE_REDIS", "false").lower() == "true":
        return os.getenv("REDIS_URL", "redis://localhost:6379/0")
    return "memory://"


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60 per minute"],
    storage_uri=_storage_uri(),
)
