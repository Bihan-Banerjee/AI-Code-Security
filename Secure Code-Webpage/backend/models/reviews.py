from pymongo import MongoClient
from datetime import datetime
import os

# Use your existing MongoDB connection
client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db = client["securecode"]  # Replace with your DB name
reviews_collection = db["reviews"]
