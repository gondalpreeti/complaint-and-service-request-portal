from datetime import date, timedelta
from supabase_client import get_connection


# ------------------------------------------------
# StaffDueDateAlert Class
# ------------------------------------------------

class StaffDueDateAlert:

    def __init__(
        self,
        request_id,
        staff_id,
        staff_name,
        priority,
        status,
        due_date
    ):
        self.request_id = request_id
        self.staff_id = staff_id
        self.staff_name = staff_name
        self.priority = priority
        self.status = status
        self.due_date = due_date

    def is_resolved(self):

        return str(self.status).lower() == "resolved"

    # ------------------------------------------------
    # Check Due Date Alert
    # ------------------------------------------------

    def get_alert(self):

        if self.due_date is None:
            return "NO DUE DATE"

        today = date.today()

        # Convert string date if required
        if isinstance(self.due_date, str):
            due = date.fromisoformat(self.due_date[:10])
        else:
            due = self.due_date

        # Resolved complaint
        if self.is_resolved():
            return "NO ALERT"

        # Due date already passed
        if today > due:
            return "OVERDUE ALERT"

        # Due date is today
        if today == due:
            return "DUE TODAY ALERT"

        # Due date is within next 3 days
        if today + timedelta(days=3) >= due:
            return "DUE SOON ALERT"

        # Due date is still far away
        return "NO ALERT"

    # ------------------------------------------------
    # Create Message For Staff
    # ------------------------------------------------

    def get_message(self):

        alert = self.get_alert()

        if alert == "OVERDUE ALERT":

            return (
                f" Due Date Alert: "
                f"Complaint #{self.request_id} assigned to you "
                f"is overdue. "
                f"Due date was {self.due_date}. "
                f"Please take immediate action."
            )

        elif alert == "DUE TODAY ALERT":

            return (
                f" Due Date Alert: "
                f"Complaint #{self.request_id} assigned to you "
                f"is due today. "
                f"Please complete it today."
            )

        elif alert == "DUE SOON ALERT":

            return (
                f" Due Date Alert: "
                f"Complaint #{self.request_id} assigned to you "
                f"is due soon on {self.due_date}. "
                f"Please take necessary action."
            )

        elif alert == "NO DUE DATE":

            return (
                f"Complaint #{self.request_id} "
                f"does not have a due date."
            )

        # No alert
        return None

    # ------------------------------------------------
    # Display Alert
    # ------------------------------------------------

    def display_alert(self):

        alert = self.get_alert()
        message = self.get_message()

        print(
            f"Request ID: {self.request_id} | "
            f"Staff ID: {self.staff_id} | "
            f"Staff: {self.staff_name} | "
            f"Priority: {self.priority} | "
            f"Due Date: {self.due_date} | "
            f"Alert: {alert}"
        )

        # Display message only when alert exists
        if message:

            print(
                f"Message: {message}"
            )


# ------------------------------------------------
# StaffAlertManager Class
# ------------------------------------------------

class StaffAlertManager:

    def __init__(self):

        self.alerts = []

    def get_assignments_from_database(self):

        conn = get_connection()
        cursor = conn.cursor()

        # -----------------------------------------
        # Get assignment information
        # -----------------------------------------

        cursor.execute("""
            SELECT
                a.request_id,
                a.staff_id,
                a.due_date
            FROM assignment a
            WHERE a.staff_id IS NOT NULL
        """)

        assignments = cursor.fetchall()

        # -----------------------------------------
        # Get service request information
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
        # Get staff information
        # -----------------------------------------

        cursor.execute("""
            SELECT
                staff_id,
                full_name
            FROM staff
        """)

        staff_members = cursor.fetchall()

        cursor.close()
        conn.close()

        # -----------------------------------------
        # Create maps
        # -----------------------------------------

        request_map = {
            request_id: (priority, status)
            for request_id, priority, status
            in service_requests
        }

        staff_map = {
            staff_id: full_name
            for staff_id, full_name
            in staff_members
        }

        # -----------------------------------------
        # Create StaffDueDateAlert objects
        # -----------------------------------------

        for request_id, staff_id, due_date in assignments:

            request_data = request_map.get(request_id)

            if request_data is None:
                continue

            priority, status = request_data

            staff_name = staff_map.get(
                staff_id,
                "Unknown Staff"
            )

            alert = StaffDueDateAlert(
                request_id,
                staff_id,
                staff_name,
                priority,
                status,
                due_date
            )

            self.alerts.append(alert)

    # ------------------------------------------------
    # Display Only Active Alerts
    # ------------------------------------------------

    def display_alerts(self):

        active_alerts = [
            alert
            for alert in self.alerts
            if alert.get_alert() != "NO ALERT"
        ]

        if not active_alerts:

            print("No due date alerts.")

            return

        print("\n===== STAFF DUE DATE ALERTS =====")
        print("------------------------------------------")

        for alert in active_alerts:

            alert.display_alert()


# ------------------------------------------------
# Main Program
# ------------------------------------------------

if __name__ == "__main__":

    print("\n===== STAFF ALERT FOR DUE DATE =====")

    try:

        # Create manager object
        manager = StaffAlertManager()

        # Get assignments from database
        manager.get_assignments_from_database()

        # Display active alerts
        manager.display_alerts()

    except Exception as error:

        print("\nDatabase Error:")
        print(error)
