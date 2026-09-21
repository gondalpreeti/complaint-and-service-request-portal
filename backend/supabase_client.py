import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing in .env")


def get_connection():
    return psycopg.connect(DATABASE_URL)


if __name__ == "__main__":

    try:
        connection = get_connection()

        print("PostgreSQL database connected successfully!")

        connection.close()

    except Exception as e:
        print("Database connection failed:")
        print(e)