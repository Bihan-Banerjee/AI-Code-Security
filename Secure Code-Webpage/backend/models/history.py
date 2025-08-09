from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["codewhisperer"]

enhance_history = db["enhance_history"]
scan_history = db["scan_history"]