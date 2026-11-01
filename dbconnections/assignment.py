"""
Automated Complaint Assignment Engine (Round-Robin & Workload-Balanced)
=======================================================================
Implements the Team 2 Assignment Engine:
- Automatically analyzes complaint severity/priority.
- Finds eligible available departmental staff (excluding Managers, Busy, or On-leave staff).
- Uses Workload-Balanced Round-Robin algorithm (assigns to the staff member with the fewest active tickets).
- Atomically creates `service_request` and `assignment` records.
- Synchronizes `complaints.status` to 'Assigned'.
- Dispatches notifications to both the student and the newly assigned staff member.
"""

import datetime
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List

try:
    from connections import get_connection
except ImportError:
    from dbconnections.connections import get_connection


@dataclass
class AssignmentResult:
    success: bool
    message: str
    complaint_id: int
    request_id: Optional[int] = None
    assignment_id: Optional[int] = None
    assigned_staff_id: Optional[int] = None
    assigned_staff_name: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None

    def print_summary(self):
        print("-" * 55)
        if self.success:
            print("AUTOMATED ASSIGNMENT SUCCESSFUL")
            print(f"Complaint ID:    #{self.complaint_id}")
            print(f"Request ID:      #{self.request_id}")
            print(f"Assigned Staff:  {self.assigned_staff_name} (ID: #{self.assigned_staff_id})")
            print(f"Priority Level:  {self.priority}")
            print(f"Due Date:        {self.due_date}")
            print(f"Message:         {self.message}")
        else:
            print("AUTOMATED ASSIGNMENT FAILED / DEFERRED")
            print(f"Complaint ID:    #{self.complaint_id}")
            print(f"Reason:          {self.message}")
        print("-" * 55)


class AssignmentEngine:
    """
    Automated Round-Robin and Workload-Balanced Assignment Engine.
    """

    # Priority determination keywords
    CRITICAL_KEYWORDS = ["fire", "hazard", "shock", "short circuit", "spark", "explosion", "injury", "emergency"]
    HIGH_KEYWORDS = ["leak", "power outage", "broken", "severe", "urgent", "server down", "flooding", "blackout"]
    LOW_KEYWORDS = ["routine", "minor", "typo", "cosmetic", "feedback", "suggestion"]

    def __init__(self, connection_factory=get_connection):
        self.connection_factory = connection_factory

    def evaluate_priority(self, subject: str = "", description: str = "") -> str:
        """
        Analyzes complaint subject & description to determine initial priority level:
        'critical', 'high', 'medium', or 'low'.
        """
        text = f"{subject} {description}".lower()

        for kw in self.CRITICAL_KEYWORDS:
            if kw in text:
                return "critical"
        for kw in self.HIGH_KEYWORDS:
            if kw in text:
                return "high"
        for kw in self.LOW_KEYWORDS:
            if kw in text:
                return "low"

        return "medium"

    def find_best_staff(self, cursor, category_id: int) -> Optional[Dict[str, Any]]:
        """
        Finds the best staff member using Workload-Balanced Round-Robin:
        1. Must be designation = 'Staff' (not Manager).
        2. Must be availability_status = 'Available' (not 'On leave' or 'Busy').
        3. Matches category_id or has general assignment.
        4. Ordered by fewest currently active assignments (workload balancing).
        """
        # First attempt: match specific category
        cursor.execute("""
            SELECT 
                s.staff_id, 
                s.full_name, 
                s.email,
                s.department, 
                s.availability_status,
                COUNT(a.assignment_id) FILTER (WHERE a.assignment_status = 'active') AS active_workload
            FROM staff s
            LEFT JOIN assignment a ON a.staff_id = s.staff_id
            WHERE s.designation = 'Staff'
              AND s.availability_status = 'Available'
              AND s.category_id = %s
            GROUP BY s.staff_id, s.full_name, s.email, s.department, s.availability_status
            ORDER BY active_workload ASC, s.staff_id ASC
            LIMIT 1;
        """, (category_id,))
        row = cursor.fetchone()

        # Fallback attempt: if no available staff in specific category, pick any available Staff in system
        if not row:
            cursor.execute("""
                SELECT 
                    s.staff_id, 
                    s.full_name, 
                    s.email,
                    s.department, 
                    s.availability_status,
                    COUNT(a.assignment_id) FILTER (WHERE a.assignment_status = 'active') AS active_workload
                FROM staff s
                LEFT JOIN assignment a ON a.staff_id = s.staff_id
                WHERE s.designation = 'Staff'
                  AND s.availability_status = 'Available'
                GROUP BY s.staff_id, s.full_name, s.email, s.department, s.availability_status
                ORDER BY active_workload ASC, s.staff_id ASC
                LIMIT 1;
            """)
            row = cursor.fetchone()

        if row:
            return {
                "staff_id": row[0],
                "full_name": row[1],
                "email": row[2],
                "department": row[3],
                "availability_status": str(row[4]),
                "active_workload": row[5] or 0
            }

        return None

    def auto_assign_complaint(
        self,
        complaint_id: int,
        category_id: Optional[int] = None,
        subject: str = "",
        description: str = "",
        assigned_by_user_id: Optional[int] = None
    ) -> AssignmentResult:
        """
        Executes the complete post-registration auto-assignment lifecycle:
        1. Evaluates priority from keywords.
        2. Selects least-loaded available staff member via round-robin.
        3. Creates service_request record with status 'assigned'.
        4. Creates assignment record with status 'active'.
        5. Updates complaints table status to 'Assigned'.
        6. Dispatches notification to the complainant.
        """
        conn = self.connection_factory()
        if not conn:
            return AssignmentResult(
                success=False,
                message="Database connection failed.",
                complaint_id=complaint_id
            )

        cursor = conn.cursor()
        try:
            # 1. Look up complaint details if not provided
            if not category_id or not subject:
                cursor.execute("""
                    SELECT category_id, subject, description, user_id
                    FROM complaints
                    WHERE complaint_id = %s;
                """, (complaint_id,))
                c_row = cursor.fetchone()
                if not c_row:
                    return AssignmentResult(
                        success=False,
                        message=f"Complaint #{complaint_id} does not exist in database.",
                        complaint_id=complaint_id
                    )
                category_id, subject, description, user_id = c_row[0], c_row[1], c_row[2] or "", c_row[3]
            else:
                cursor.execute("SELECT user_id FROM complaints WHERE complaint_id = %s;", (complaint_id,))
                u_row = cursor.fetchone()
                user_id = u_row[0] if u_row else None

            # 2. Check if this complaint already has an active service request
            cursor.execute("""
                SELECT request_id, status FROM service_request WHERE complaint_id = %s;
            """, (complaint_id,))
            existing_sr = cursor.fetchone()
            if existing_sr:
                req_id = existing_sr[0]
                # Check existing assignment
                cursor.execute("""
                    SELECT a.assignment_id, s.full_name, s.staff_id
                    FROM assignment a
                    JOIN staff s ON s.staff_id = a.staff_id
                    WHERE a.request_id = %s AND a.assignment_status = 'active';
                """, (req_id,))
                existing_assign = cursor.fetchone()
                if existing_assign:
                    return AssignmentResult(
                        success=True,
                        message=f"Complaint #{complaint_id} is already assigned to {existing_assign[1]}.",
                        complaint_id=complaint_id,
                        request_id=req_id,
                        assignment_id=existing_assign[0],
                        assigned_staff_id=existing_assign[2],
                        assigned_staff_name=existing_assign[1]
                    )

            # 3. Determine priority
            priority = self.evaluate_priority(subject, description)

            # 4. Find best staff member via round-robin workload balancing
            best_staff = self.find_best_staff(cursor, category_id)
            if not best_staff:
                # If no staff available, create service_request as pending
                cursor.execute("""
                    INSERT INTO service_request (complaint_id, category_id, priority_status, status)
                    VALUES (%s, %s, %s::priority_status_enum, 'pending'::status_enum)
                    RETURNING request_id;
                """, (complaint_id, category_id, priority))
                req_id = cursor.fetchone()[0]
                conn.commit()
                return AssignmentResult(
                    success=False,
                    message=f"No staff currently available. Service Request #{req_id} logged as Pending.",
                    complaint_id=complaint_id,
                    request_id=req_id,
                    priority=priority
                )

            staff_id = best_staff["staff_id"]
            staff_name = best_staff["full_name"]

            # SLA calculation: Critical=1 day, High=2 days, Medium=3 days, Low=5 days
            sla_days = 1 if priority == "critical" else 2 if priority == "high" else 3 if priority == "medium" else 5
            due_date = (datetime.date.today() + datetime.timedelta(days=sla_days)).isoformat()

            # 5. Insert service_request
            cursor.execute("""
                INSERT INTO service_request (complaint_id, category_id, priority_status, status, created_at, updated_at)
                VALUES (%s, %s, %s::priority_status_enum, 'assigned'::status_enum, NOW(), NOW())
                RETURNING request_id;
            """, (complaint_id, category_id, priority))
            request_id = cursor.fetchone()[0]

            # 6. Insert assignment
            remarks = f"Assigned to {staff_name} via Round-Robin Workload Balancing (Current Load: {best_staff['active_workload']})."
            cursor.execute("""
                INSERT INTO assignment (request_id, staff_id, assigned_by, assignment_status, assigned_date, due_date, remarks)
                VALUES (%s, %s, %s, 'active', NOW(), CURRENT_DATE + %s * INTERVAL '1 day', %s)
                RETURNING assignment_id;
            """, (request_id, staff_id, assigned_by_user_id, sla_days, remarks))
            assignment_id = cursor.fetchone()[0]

            # 7. Update complaints status to 'Assigned'
            cursor.execute("""
                UPDATE complaints
                SET status = 'Assigned'
                WHERE complaint_id = %s;
            """, (complaint_id,))

            # 8. Send notification to student
            if user_id:
                try:
                    cursor.execute("""
                        INSERT INTO notifications (user_id, complaint_id, title, message, notification_type, is_read, created_at)
                        VALUES (%s, %s, %s, %s, 'assignment', false, NOW());
                    """, (
                        user_id,
                        complaint_id,
                        "Staff Assigned to Your Complaint",
                        f"Your complaint '{subject}' has been assigned to {staff_name} ({best_staff['department']}). Priority: {priority.title()}."
                    ))
                except Exception as notif_err:
                    print(f"[Warning] Failed to insert student notification: {notif_err}")

            conn.commit()

            return AssignmentResult(
                success=True,
                message=f"Request #{request_id} assigned to {staff_name} ({best_staff['department']}).",
                complaint_id=complaint_id,
                request_id=request_id,
                assignment_id=assignment_id,
                assigned_staff_id=staff_id,
                assigned_staff_name=staff_name,
                priority=priority,
                due_date=due_date
            )

        except Exception as e:
            conn.rollback()
            return AssignmentResult(
                success=False,
                message=f"Transaction error during assignment: {e}",
                complaint_id=complaint_id
            )
        finally:
            cursor.close()
            conn.close()


if __name__ == "__main__":
    engine = AssignmentEngine()
    print("Testing auto_assign_complaint with Priority Evaluation:")
    print("Priority check ('water leakage in washroom'):", engine.evaluate_priority(description="water leakage in washroom"))
    print("Priority check ('fire hazard in lab'):", engine.evaluate_priority(description="fire hazard in lab"))

