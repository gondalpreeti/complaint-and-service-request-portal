from datetime import date, timedelta
from supabase_client import get_connection


# ------------------------------------------------
# StaffDueDateAlert Class
# ------------------------------------------------

class StaffDueDateAlert:

    def __init__(
        self,
        complaint_id,
        staff_id,
        user_id,
        staff_name,
        priority,
        status,
        due_date
    ):
        self.complaint_id = complaint_id
        self.staff_id = staff_id
        self.user_id = user_id  # UUID from users table
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

        if isinstance(self.due_date, str):
            due = date.fromisoformat(self.due_date[:10])
        else:
            due = self.due_date

        if self.is_resolved():
            return "NO ALERT"

        if today > due:
            return "OVERDUE ALERT"

        if today == due:
            return "DUE TODAY ALERT"

        if today + timedelta(days=3) >= due:
            return "DUE SOON ALERT"

        return "NO ALERT"

    # ------------------------------------------------
    # Create Title and Message For Staff
    # ------------------------------------------------

    def get_title(self):
        alert = self.get_alert()
        if alert == "OVERDUE ALERT":
            return "Complaint Overdue"
        elif alert == "DUE TODAY ALERT":
            return "Complaint Due Today"
        elif alert == "DUE SOON ALERT":
            return "Complaint Due Soon"
        elif alert == "NO DUE DATE":
            return "Complaint Without Due Date"
        return None

    def get_message(self):

        alert = self.get_alert()

        if alert == "OVERDUE ALERT":
            return f"Due Date Alert: Complaint #{self.complaint_id} assigned to you is overdue. Due date was {self.due_date}. Please take immediate action."
        elif alert == "DUE TODAY ALERT":
            return f"Due Date Alert: Complaint #{self.complaint_id} assigned to you is due today. Please complete it today."
        elif alert == "DUE SOON ALERT":
            return f"Due Date Alert: Complaint #{self.complaint_id} assigned to you is due soon on {self.due_date}. Please take necessary action."
        elif alert == "NO DUE DATE":
            return f"Complaint #{self.complaint_id} does not have a due date."

        return None

    def to_dict(self):
        return {
            "complaint_id": self.complaint_id,
            "staff_id": self.staff_id,
            "user_id": str(self.user_id) if self.user_id else None,
            "staff_name": self.staff_name,
            "priority": self.priority,
            "status": self.status,
            "due_date": str(self.due_date) if self.due_date else None,
            "alert_type": self.get_alert(),
            "title": self.get_title(),
            "message": self.get_message()
        }


# ------------------------------------------------
# StaffAlertManager Class
# ------------------------------------------------

class StaffAlertManager:

    def __init__(self):
        self.alerts = []

    def get_assignments_from_database(self):

        conn = get_connection()
        cursor = conn.cursor()

        # 1. Get assignment information
        cursor.execute("""
            SELECT
                a.complaint_id,
                a.staff_id,
                a.due_date
            FROM assignment a
            WHERE a.staff_id IS NOT NULL
        """)
        assignments = cursor.fetchall()

        # 2. Get complaint information
        cursor.execute("""
            SELECT
                complaint_id,
                priority_status,
                status
            FROM complaints
        """)
        complaints = cursor.fetchall()

        # 3. Get staff information INCLUDING user_id (UUID)
        cursor.execute("""
            SELECT
                staff_id,
                full_name,
                user_id
            FROM staff
        """)
        staff_members = cursor.fetchall()

        cursor.close()
        conn.close()

        # Create lookup maps
        complaint_map = {
            complaint_id: (priority, status)
            for complaint_id, priority, status in complaints
        }

        staff_map = {
            staff_id: (full_name, user_id)
            for staff_id, full_name, user_id in staff_members
        }

        # Create StaffDueDateAlert objects
        for complaint_id, staff_id, due_date in assignments:

            complaint_data = complaint_map.get(complaint_id)
            if complaint_data is None:
                continue

            priority, status = complaint_data

            staff_data = staff_map.get(staff_id)
            if staff_data is None:
                continue

            staff_name, user_id = staff_data

            alert = StaffDueDateAlert(
                complaint_id=complaint_id,
                staff_id=staff_id,
                user_id=user_id,
                staff_name=staff_name,
                priority=priority,
                status=status,
                due_date=due_date
            )
            self.alerts.append(alert)

    # ------------------------------------------------
    # SAVE ALERTS TO NOTIFICATIONS TABLE
    # ------------------------------------------------

    def save_alerts_to_notifications(self):
        """
        Inserts a row into the notifications table for every active alert.
        Because is_read defaults to FALSE, the notification will keep
        appearing on the staff dashboard until they mark it as read.
        """
        conn = get_connection()
        cursor = conn.cursor()

        active_alerts = [
            alert for alert in self.alerts
            if alert.get_alert() != "NO ALERT"
        ]

        inserted = 0

        for alert in active_alerts:
            # Skip alerts if staff has no linked user account
            if alert.user_id is None:
                continue

            # Check if an UNREAD notification already exists for this specific alert
            cursor.execute("""
                SELECT notification_id
                FROM notifications
                WHERE user_id = %s
                  AND complaint_id = %s
                  AND notification_type = %s
                  AND is_read = FALSE
            """, (alert.user_id, alert.complaint_id, alert.get_alert()))

            existing = cursor.fetchone()

            # Insert only if it doesn't exist (prevents duplicate notifications)
            if existing is None:
                cursor.execute("""
                    INSERT INTO notifications
                        (user_id, complaint_id, title, message, notification_type, is_read)
                    VALUES (%s, %s, %s, %s, %s, FALSE)
                """, (
                    alert.user_id,
                    alert.complaint_id,
                    alert.get_title(),
                    alert.get_message(),
                    alert.get_alert()
                ))
                inserted += 1

        conn.commit()
        cursor.close()
        conn.close()

        return inserted

    # ------------------------------------------------
    # GET UNREAD NOTIFICATIONS FOR A USER
    # ------------------------------------------------

    def get_unread_notifications_for_user(self, user_id):
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                notification_id,
                user_id,
                complaint_id,
                title,
                message,
                notification_type,
                is_read,
                created_at
            FROM notifications
            WHERE user_id = %s
              AND is_read = FALSE
            ORDER BY created_at DESC
        """, (str(user_id),))

        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        notifications = []
        for row in rows:
            notifications.append({
                "notification_id": row[0],
                "user_id": str(row[1]),
                "complaint_id": row[2],
                "title": row[3],
                "message": row[4],
                "notification_type": row[5],
                "is_read": row[6],
                "created_at": str(row[7]) if row[7] else None
            })

        return notifications

    # ------------------------------------------------
    # MARK A NOTIFICATION AS READ
    # ------------------------------------------------

    def mark_notification_as_read(self, notification_id, user_id):
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE notifications
            SET is_read = TRUE
            WHERE notification_id = %s
              AND user_id = %s
              AND is_read = FALSE
        """, (notification_id, str(user_id)))

        updated = cursor.rowcount

        conn.commit()
        cursor.close()
        conn.close()

        return updated > 0


# ------------------------------------------------
# Main Program (Testing)
# ------------------------------------------------

if __name__ == "__main__":
    print("\n===== STAFF ALERT FOR DUE DATE =====")
    try:
        manager = StaffAlertManager()
        
        # 1. Fetch from database
        manager.get_assignments_from_database()
        
        # 2. Save to notifications table (This creates unread notifications)
        inserted = manager.save_alerts_to_notifications()
        print(f"\nNew unread notifications inserted: {inserted}")

    except Exception as error:
        print("\nDatabase Error:")
        print(error)
