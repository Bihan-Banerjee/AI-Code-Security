# user_model.py
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client["codewhisperer"]
users = db["users"]

# Make sure this gets used in auth.py
