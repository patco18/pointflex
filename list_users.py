import sqlite3

# Connect to the SQLite database
conn = sqlite3.connect("backend/instance/pointflex.db")
cursor = conn.cursor()

# Query to select all users
cursor.execute("SELECT id, email FROM users")
users = cursor.fetchall()

print("Users in the database:")
for user in users:
    print(f"ID: {user[0]}, Email: {user[1]}")

# Close the connection
conn.close()
