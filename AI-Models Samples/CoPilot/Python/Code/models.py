from flask_sqlite3 import SQLite3

db = SQLite3()

def init_db():
    db.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            bio TEXT,
            phone TEXT,
            profile_pic TEXT
        )
    ''')
