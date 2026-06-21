"""Central MongoDB client, collections, and index setup.

Single source of truth so every module talks to the same database (previously
some modules used "securecode" and others "codewhisperer").
"""
import os
from pymongo import MongoClient, ASCENDING, DESCENDING
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "codewhisperer")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db["users"]
reset_tokens = db["reset_tokens"]
enhance_history = db["enhance_history"]
scan_history = db["scan_history"]
reviews_collection = db["reviews"]

_indexes_ready = False


def ensure_indexes():
    """Create indexes once. Safe to call repeatedly; tolerant of existing data."""
    global _indexes_ready
    if _indexes_ready:
        return
    try:
        users.create_index([("username", ASCENDING)], unique=True)
        users.create_index([("email", ASCENDING)], unique=True)
        reset_tokens.create_index([("token", ASCENDING)])
        # TTL index: expired reset tokens are purged automatically.
        reset_tokens.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
        enhance_history.create_index([("username", ASCENDING), ("timestamp", DESCENDING)])
        scan_history.create_index([("username", ASCENDING), ("timestamp", DESCENDING)])
        reviews_collection.create_index([("date", DESCENDING)])
        _indexes_ready = True
    except Exception as e:  # e.g. duplicate-key on a pre-existing collection
        print(f"[db] index creation warning: {e}")
