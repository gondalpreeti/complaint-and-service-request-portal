from connections import get_connection

def get_all_requests():
    # 1. Connect to the database
    connection = get_connection()
    if connection is None:
        print("Database connection failed.")
        return []

    try:
        # 2. Create a cursor to run queries
        cursor = connection.cursor()

        # 3. Run the SQL query to get staff records
        cursor.execute("SELECT * FROM staff where staff_id='4';")

        # 4. Fetch all rows from the query result
        staff_list = cursor.fetchone()

        # 5. Print the results
        print("\n--- Staff List ---")
        for staff in staff_list:
            print(staff)

        return staff_list

    except Exception as error:
        print(f"Error fetching data: {error}")
        return []

    finally:
        # 6. Always close cursor and connection when done
        cursor.close()
        connection.close()
        print("\nConnection closed.")

if __name__ == "__main__":
    get_all_requests()

