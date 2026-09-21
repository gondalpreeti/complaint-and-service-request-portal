import os
import time
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def get_connection(max_retries: int = 3, retry_delay: float = 1.0):
    """
    Connect to PostgreSQL (Supabase) with retry logic for network resilience.
    """
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL environment variable is not set.")
        return None

    for attempt in range(1, max_retries + 1):
        try:
            conn = psycopg2.connect(database_url)
            return conn
        except Exception as e:
            if attempt < max_retries:
                time.sleep(retry_delay)
            else:
                print(f"Failed to connect to the database after {max_retries} attempts.\nError: {e}")
                return None

def check_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL environment variable is not set.")
        return False

    try:
        print("Attempting to connect to the database...")
        connection = get_connection()
        if not connection:
            return False
        
        cursor = connection.cursor()
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()
        print(f"Successfully connected!")
        print(f"Database Version: {db_version[0]}")
        cursor.close()
        connection.close()
        print("Database connection closed securely.")
        return True

    except Exception as e:
        print(f"Failed to connect to the database.\nError: {e}")
        return False

if __name__ == "__main__":
    check_db_connection()
