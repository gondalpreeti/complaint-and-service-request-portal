from datetime import date
from supabase_client import get_connection


# ------------------------------------------------
# TimeBoundIncrement Class
# ------------------------------------------------

class TimeBoundIncrement:

    def __init__(self, request_id, priority, status, due_date):
        self.request_id = request_id
        self.priority = priority
        self.status = status
        self.due_date = due_date

    def is_resolved(self):

        return str(self.status).lower() == "resolved"

    def is_due_date_passed(self):

        today = date.today()

        if isinstance(self.due_date, str):
            due = date.fromisoformat(self.due_date)
        else:
            due = self.due_date

        return today > due

    def increment_priority(self):

        # Only LOW priority complaint
        if str(self.priority).lower() != "low":
            return False

        # Resolved complaint should not be incremented
        if self.is_resolved():
            return False

        # Check due date
        if self.is_due_date_passed():

            self.priority = "medium"

            return True

        return False


# ------------------------------------------------
# PriorityIncrementQueue Class
# ------------------------------------------------

class PriorityIncrementQueue:

    def __init__(self):

        self.requests = []

    def get_requests_from_database(self):

        conn = get_connection()
        cursor = conn.cursor()

        # -----------------------------------------
        # Get service requests
        # -----------------------------------------

        cursor.execute("""
            SELECT
                request_id,
                priority_status,
                status
            FROM service_request
        """)

        service_requests = cursor.fetchall()

        # -----------------------------------------
        # Get assignment due dates
        # -----------------------------------------

        cursor.execute("""
            SELECT
                request_id,
                due_date
            FROM assignment
        """)

        assignments = cursor.fetchall()

        cursor.close()
        conn.close()

        # -----------------------------------------
        # request_id -> due_date
        # -----------------------------------------

        assignment_map = {
            request_id: due_date
            for request_id, due_date in assignments
        }

        # -----------------------------------------
        # Create TimeBoundIncrement objects
        # -----------------------------------------

        for request_id, priority, status in service_requests:

            # We are interested only in LOW priority
            if str(priority).lower() != "low":
                continue

            # Find due date
            due_date = assignment_map.get(request_id)

            # Skip if complaint is not assigned
            if due_date is None:
                continue

            request = TimeBoundIncrement(
                request_id,
                priority,
                status,
                due_date
            )

            self.requests.append(request)

    def update_priority_in_database(
        self,
        request_id,
        new_priority
    ):

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE service_request
            SET priority_status = %s
            WHERE request_id = %s
        """, (
            new_priority,
            request_id
        ))

        conn.commit()

        cursor.close()
        conn.close()

    def process_increment(self):

        if not self.requests:

            print(
                "No Low priority assigned complaints found."
            )

            return

        print("\nLow Priority Complaint Processing")
        print("------------------------------------------")

        for index, request in enumerate(
            self.requests,
            start=1
        ):

            old_priority = request.priority

            # Try to increment priority
            incremented = request.increment_priority()

            if incremented:

                # Update database
                self.update_priority_in_database(
                    request.request_id,
                    request.priority
                )

                print(
                    f"{index}. "
                    f"Request ID: {request.request_id} | "
                    f"Priority: LOW → MEDIUM | "
                    f"Due Date: {request.due_date} | "
                    f"Status: {request.status}"
                )

            else:

                if request.is_resolved():

                    print(
                        f"{index}. "
                        f"Request ID: {request.request_id} | "
                        f"Priority: LOW | "
                        f"Status: RESOLVED | "
                        f"No Increment"
                    )

                else:

                    print(
                        f"{index}. "
                        f"Request ID: {request.request_id} | "
                        f"Priority: LOW | "
                        f"Due Date: {request.due_date} | "
                        f"No Increment"
                    )


# ------------------------------------------------
# Main Program
# ------------------------------------------------

if __name__ == "__main__":

    print(
        "\n===== TIME-BOUND INCREMENT TO LOW PRIORITY ====="
    )

    try:

        # Create PriorityIncrementQueue object
        queue = PriorityIncrementQueue()

        # Get complaints from database
        queue.get_requests_from_database()

        # Process time-bound increment
        queue.process_increment()

        print(
            "\nTime-bound priority increment completed."
        )

    except Exception as error:

        print("\nDatabase Error:")
        print(error)