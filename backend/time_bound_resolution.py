from datetime import date
from supabase_client import get_connection


# Priority order
PRIORITY_ORDER = {
    "high": 1,
    "medium": 2,
    "low": 3
}


# ------------------------------------------------
# ServiceRequest Class
# ------------------------------------------------

class ServiceRequest:

    def __init__(self, request_id, priority, status, due_date):
        self.request_id = request_id
        self.priority = priority
        self.status = status
        self.due_date = due_date

    def check_resolution(self):

        today = date.today()

        # Convert string date if required
        if isinstance(self.due_date, str):
            due = date.fromisoformat(self.due_date)
        else:
            due = self.due_date

        # Already resolved
        if str(self.status).lower() == "resolved":
            return "COMPLETED"

        # Due date has not passed
        if today <= due:
            return "WITHIN_TIME"

        # Due date has passed
        return "OVERDUE"

    def display(self, index):

        resolution_status = self.check_resolution()

        print(
            f"{index}. "
            f"Request ID: {self.request_id} | "
            f"Priority: {self.priority} | "
            f"Due Date: {self.due_date} | "
            f"Database Status: {self.status} | "
            f"Resolution: {resolution_status}"
        )


# ------------------------------------------------
# PriorityQueue Class
# ------------------------------------------------

class PriorityQueue:

    def __init__(self):
        self.requests = []

    def get_requests_from_database(self):

        conn = get_connection()
        cursor = conn.cursor()

        # Get service requests
        cursor.execute("""
            SELECT
                request_id,
                priority_status,
                status
            FROM service_request
        """)

        service_requests = cursor.fetchall()

        # Get assignments and due dates
        cursor.execute("""
            SELECT
                request_id,
                due_date
            FROM assignment
        """)

        assignments = cursor.fetchall()

        cursor.close()
        conn.close()

        # request_id -> due_date
        assignment_map = {
            request_id: due_date
            for request_id, due_date in assignments
        }

        for request_id, priority, status in service_requests:

            # Skip resolved complaints
            if str(status).lower() == "resolved":
                continue

            # Find due date
            due_date = assignment_map.get(request_id)

            # Skip if complaint is not assigned
            if due_date is None:
                continue

            # Create ServiceRequest object
            request = ServiceRequest(
                request_id,
                priority,
                status,
                due_date
            )

            self.requests.append(request)

    def sort_requests(self):

        self.requests.sort(
            key=lambda request: (
                PRIORITY_ORDER.get(
                    str(request.priority).lower(),
                    99
                ),
                request.due_date,
                request.request_id
            )
        )

    def display_queue(self):

        if not self.requests:

            print("No assigned service requests found.")

        else:

            print("\nComplaint Processing Order")
            print("--------------------------------")

            for index, request in enumerate(
                self.requests,
                start=1
            ):
                request.display(index)


# ------------------------------------------------
# Main Program
# ------------------------------------------------

if __name__ == "__main__":

    print("\n===== TIME-BOUND RESOLUTION =====")

    try:

        # Create PriorityQueue object
        queue = PriorityQueue()

        # Get data from database
        queue.get_requests_from_database()

        # Sort requests
        queue.sort_requests()

        # Display requests
        queue.display_queue()

    except Exception as error:

        print("\nDatabase Error:")
        print(error)