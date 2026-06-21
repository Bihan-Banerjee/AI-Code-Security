# Re-export from the central db module so all code shares one database.
from db import enhance_history, scan_history

__all__ = ["enhance_history", "scan_history"]
