# Re-export from the central db module so all code shares one database.
from db import reviews_collection

__all__ = ["reviews_collection"]
