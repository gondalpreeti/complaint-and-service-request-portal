"""
Escalation Module for Complaint and Service Portal
=================================================
Provides Object-Oriented management for horizontal (Staff-to-Staff)
and vertical (Staff-to-Manager) escalations with database persistence,
audit logging, priority escalation, and notification dispatch.
"""

import datetime
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

try:
    from connections import get_connection
except ImportError:
    from dbconnections.connections import get_connection


@dataclass
class StaffMember:
    """Represents a staff or manager record in the database."""
    staff_id: int
    full_name: str
    email: str
    phone: str
    department: str
    designation: str
    availability_status: str
    category_id: Optional[int] = None

    def is_manager(self) -> bool:
        """Check if personnel holds a Manager designation."""
        return self.designation.strip().lower() == "manager"

    def is_staff(self) -> bool:
        """Check if personnel holds a Staff designation."""
        return self.designation.strip().lower() == "staff"

    def is_available(self) -> bool:
        """Check if personnel is currently available."""
        return self.availability_status.strip().lower() == "available"

    def is_on_leave(self) -> bool:
        """Check if personnel is on leave."""
        return self.availability_status.strip().lower() == "on leave"

    def is_same_department(self, other_department: str) -> bool:
        """Verify department match."""
        return self.department.strip().lower() == other_department.strip().lower()


@dataclass
class ServiceRequest:
    """Represents a service request ticket."""
    request_id: int
    complaint_id: Optional[int]
    priority_status: str
    status: str
    category_id: Optional[int] = None


@dataclass
class EscalationResult:
    """Encapsulates the response/outcome of an escalation action."""
    success: bool
    message: str
    escalation_id: Optional[int] = None
    new_assignment_id: Optional[int] = None
    from_staff_name: Optional[str] = None
    to_staff_name: Optional[str] = None
    priority_upgrade: Optional[str] = None
    data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
            "escalation_id": self.escalation_id,
            "new_assignment_id": self.new_assignment_id,
            "from_staff": self.from_staff_name,
            "to_staff": self.to_staff_name,
            "priority": self.priority_upgrade,
            "data": self.data,
        }

    def print_summary(self):
        """Prints a user-friendly status banner to the console."""
        print("-" * 55)
        if self.success:
            print("ESCALATION SUCCESSFUL")
            print(f"Message:         {self.message}")
            if self.escalation_id:
                print(f"Escalation Log ID: #{self.escalation_id}")
            if self.new_assignment_id:
                print(f"New Assignment ID: #{self.new_assignment_id}")
            if self.from_staff_name:
                print(f"Handled By:      {self.from_staff_name}")
            if self.to_staff_name:
                print(f"Assigned To:     {self.to_staff_name}")
            if self.priority_upgrade:
                print(f"Priority Level:  {self.priority_upgrade}")
        else:
            print("ESCALATION REJECTED / FAILED")
            print(f"Reason:          {self.message}")
        print("-" * 55)


class EscalationService:
    """
    Core Object-Oriented service orchestrating complaint and service
    ticket escalations, database consistency, and transaction handling.
    """

    def __init__(self, connection_factory=get_connection):
        self.connection_factory = connection_factory

    def _ensure_tables(self, cursor):
        """Ensures that the escalation_logs table exists."""
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS escalation_logs (
                escalation_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                request_id INT NOT NULL REFERENCES service_request(request_id) ON DELETE CASCADE,
                from_staff_id INT NOT NULL REFERENCES staff(staff_id),
                to_staff_id INT NOT NULL REFERENCES staff(staff_id),
                escalation_type VARCHAR(50) NOT NULL,
                reason TEXT NOT NULL,
                priority_before VARCHAR(20),
                priority_after VARCHAR(20),
                escalated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(30) DEFAULT 'pending_review',
                resolution_notes TEXT
            );
        """)

    def fetch_staff_by_id(self, staff_id: int, cursor) -> Optional[StaffMember]:
        """Fetch staff member object by primary key."""
        cursor.execute("""
            SELECT staff_id, full_name, email, phone, department, designation, availability_status, category_id
            FROM staff
            WHERE staff_id = %s
        """, (staff_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return StaffMember(
            staff_id=row[0],
            full_name=row[1],
            email=row[2],
            phone=row[3],
            department=row[4],
            designation=row[5],
            availability_status=row[6],
            category_id=row[7]
        )

    def fetch_department_manager(self, department: str, cursor) -> Optional[StaffMember]:
        """Find an active manager responsible for the given department."""
        cursor.execute("""
            SELECT staff_id, full_name, email, phone, department, designation, availability_status, category_id
            FROM staff
            WHERE LOWER(department) = LOWER(%s)
              AND LOWER(designation) = 'manager'
            ORDER BY 
              CASE WHEN availability_status = 'Available' THEN 1 ELSE 2 END
            LIMIT 1
        """, (department,))
        row = cursor.fetchone()
        if not row:
            return None
        return StaffMember(
            staff_id=row[0],
            full_name=row[1],
            email=row[2],
            phone=row[3],
            department=row[4],
            designation=row[5],
            availability_status=row[6],
            category_id=row[7]
        )

    def fetch_service_request(self, request_id: int, cursor) -> Optional[ServiceRequest]:
        """Fetch service request details."""
        cursor.execute("""
            SELECT request_id, complaint_id, priority_status, status, category_id
            FROM service_request
            WHERE request_id = %s
        """, (request_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return ServiceRequest(
            request_id=row[0],
            complaint_id=row[1],
            priority_status=str(row[2]),
            status=str(row[3]),
            category_id=row[4]
        )

    def fetch_active_assignment(self, request_id: int, staff_id: int, cursor) -> Optional[Dict[str, Any]]:
        """Fetch active assignment record for the given request and staff."""
        cursor.execute("""
            SELECT assignment_id, due_date, remarks
            FROM assignment
            WHERE request_id = %s
              AND staff_id = %s
              AND assignment_status = 'active'
            LIMIT 1
        """, (request_id, staff_id))
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "assignment_id": row[0],
            "due_date": row[1],
            "remarks": row[2]
        }

    @staticmethod
    def _elevate_priority(current_priority: str) -> str:
        """Escalates priority level: low -> medium -> high -> critical."""
        hierarchy = {
            "low": "medium",
            "medium": "high",
            "high": "critical",
            "critical": "critical"
        }
        return hierarchy.get(str(current_priority).lower(), "high")

    def escalate_to_manager(
        self,
        request_id: int,
        from_staff_id: int,
        to_manager_id: Optional[int] = None,
        reason: str = "Issue requires managerial escalation and review.",
        elevate_priority: bool = True,
        due_date: Optional[datetime.date] = None
    ) -> EscalationResult:
        """
        Escalates a service request from a Staff member to a Department Manager.

        Workflow:
        1. Validates that escalating staff exists.
        2. Validates that escalating staff holds an active assignment for the ticket.
        3. Identifies or verifies the manager (designation = 'Manager', department match).
        4. Validates manager availability (rejects if On leave).
        5. Marks existing staff assignment as 'reassigned'.
        6. Inserts new active assignment for Manager with calculated due_date and remarks.
        7. Elevates request priority and updates service_request.
        8. Writes an audit trail into `escalation_logs`.
        9. Sends a notification to the complainant if applicable.
        10. Commits the transaction securely.
        """
        conn = self.connection_factory()
        if not conn:
            return EscalationResult(success=False, message="Database connection failed.")

        cursor = conn.cursor()
        try:
            self._ensure_tables(cursor)

            # 1. Validate escalating staff
            from_staff = self.fetch_staff_by_id(from_staff_id, cursor)
            if not from_staff:
                return EscalationResult(success=False, message=f"Staff #{from_staff_id} does not exist.")

            # 2. Prevent self-escalation
            if to_manager_id is not None and from_staff_id == to_manager_id:
                return EscalationResult(success=False, message="You cannot escalate to yourself.")

            # 3. Locate or validate target manager
            if to_manager_id is not None:
                manager = self.fetch_staff_by_id(to_manager_id, cursor)
                if not manager:
                    return EscalationResult(success=False, message=f"Manager #{to_manager_id} does not exist.")
                if not manager.is_manager():
                    return EscalationResult(
                        success=False,
                        message=f"Target person '{manager.full_name}' (#{to_manager_id}) has designation '{manager.designation}', not 'Manager'."
                    )
                if not from_staff.is_same_department(manager.department):
                    return EscalationResult(
                        success=False,
                        message=f"Manager belongs to department '{manager.department}', but staff belongs to '{from_staff.department}'."
                    )
            else:
                # Auto-detect department manager
                manager = self.fetch_department_manager(from_staff.department, cursor)
                if not manager:
                    return EscalationResult(
                        success=False,
                        message=f"No Manager found for department '{from_staff.department}'."
                    )

            # 3. Check manager availability
            if manager.is_on_leave():
                return EscalationResult(
                    success=False,
                    message=f"Manager '{manager.full_name}' is currently On leave. Cannot escalate."
                )

            # 4. Check active assignment
            current_assignment = self.fetch_active_assignment(request_id, from_staff_id, cursor)
            if not current_assignment:
                return EscalationResult(
                    success=False,
                    message=f"Request #{request_id} has no active assignment under Staff '{from_staff.full_name}' (#{from_staff_id})."
                )

            # 5. Fetch Service Request for priority updates
            service_req = self.fetch_service_request(request_id, cursor)
            if not service_req:
                return EscalationResult(success=False, message=f"Service Request #{request_id} does not exist.")

            priority_before = service_req.priority_status
            priority_after = self._elevate_priority(priority_before) if elevate_priority else priority_before

            # 6. Reassign current staff's assignment
            cursor.execute("""
                UPDATE assignment
                SET assignment_status = 'reassigned',
                    remarks = COALESCE(remarks || ' | ', '') || %s
                WHERE assignment_id = %s
            """, (f"Escalated to Manager {manager.full_name} on {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}: {reason}",
                  current_assignment["assignment_id"]))

            # 7. Compute due_date (fall back to previous assignment or +2 days from now)
            effective_due_date = (
                due_date
                or current_assignment["due_date"]
                or (datetime.date.today() + datetime.timedelta(days=2))
            )

            # 8. Create new active assignment for Manager
            manager_remarks = f"ESCALATED TO MANAGER: {reason} (Escalated by Staff: {from_staff.full_name})"
            cursor.execute("""
                INSERT INTO assignment
                (request_id, staff_id, assigned_by, assignment_status, assigned_date, due_date, remarks)
                VALUES
                (%s, %s, %s, 'active', NOW(), %s, %s)
                RETURNING assignment_id
            """, (request_id, manager.staff_id, from_staff.staff_id, effective_due_date, manager_remarks))
            new_assignment_id = cursor.fetchone()[0]

            # 9. Update Service Request priority and updated_at
            cursor.execute("""
                UPDATE service_request
                SET priority_status = %s::priority_status_enum,
                    status = 'assigned'::status_enum,
                    updated_at = NOW()
                WHERE request_id = %s
            """, (priority_after, request_id))

            # 10. Audit in `escalation_logs`
            cursor.execute("""
                INSERT INTO escalation_logs
                (request_id, from_staff_id, to_staff_id, escalation_type, reason, priority_before, priority_after, status)
                VALUES
                (%s, %s, %s, 'staff_to_manager', %s, %s, %s, 'pending_review')
                RETURNING escalation_id
            """, (request_id, from_staff.staff_id, manager.staff_id, reason, priority_before, priority_after))
            escalation_id = cursor.fetchone()[0]

            # 11. Create a notification for the complainant if applicable
            if service_req.complaint_id:
                cursor.execute("SELECT user_id FROM complaints WHERE complaint_id = %s", (service_req.complaint_id,))
                user_row = cursor.fetchone()
                if user_row and user_row[0]:
                    user_uuid = user_row[0]
                    cursor.execute("""
                        INSERT INTO notifications
                        (user_id, complaint_id, title, message, notification_type, is_read, created_at)
                        VALUES
                        (%s, %s, %s, %s, 'escalation', false, NOW())
                    """, (
                        user_uuid,
                        service_req.complaint_id,
                        f"Request #{request_id} Escalated to Manager",
                        f"Your request has been escalated to Manager {manager.full_name}. Reason: {reason}"
                    ))

            # Commit transaction
            conn.commit()

            return EscalationResult(
                success=True,
                message=f"Request #{request_id} successfully escalated to Manager '{manager.full_name}' ({manager.department}).",
                escalation_id=escalation_id,
                new_assignment_id=new_assignment_id,
                from_staff_name=from_staff.full_name,
                to_staff_name=manager.full_name,
                priority_upgrade=f"{priority_before} -> {priority_after}",
                data={
                    "request_id": request_id,
                    "manager_id": manager.staff_id,
                    "department": manager.department,
                    "due_date": str(effective_due_date),
                    "reason": reason
                }
            )

        except Exception as e:
            conn.rollback()
            return EscalationResult(success=False, message=f"Database error during escalation: {e}")
        finally:
            cursor.close()
            conn.close()

    def escalate_to_staff(
        self,
        request_id: int,
        from_staff_id: int,
        to_staff_id: int,
        reason: str = "Horizontal peer reassignment",
        due_date: Optional[datetime.date] = None
    ) -> EscalationResult:
        """
        Escalates / reassigns a service request from one Staff member to another Staff member.

        Workflow:
        1. Validates that both staff exist and belong to the same department.
        2. Validates that target personnel is indeed a 'Staff' member and available.
        3. Validates current active assignment.
        4. Reassigns existing assignment.
        5. Creates new assignment with valid due_date.
        6. Logs escalation to `escalation_logs`.
        """
        conn = self.connection_factory()
        if not conn:
            return EscalationResult(success=False, message="Database connection failed.")

        cursor = conn.cursor()
        try:
            self._ensure_tables(cursor)

            # 1. Validate from_staff
            from_staff = self.fetch_staff_by_id(from_staff_id, cursor)
            if not from_staff:
                return EscalationResult(success=False, message=f"Staff #{from_staff_id} does not exist.")

            # 2. Prevent self-escalation
            if from_staff_id == to_staff_id:
                return EscalationResult(success=False, message="You cannot escalate to yourself.")

            # 3. Validate to_staff
            to_staff = self.fetch_staff_by_id(to_staff_id, cursor)
            if not to_staff:
                return EscalationResult(success=False, message=f"Target staff #{to_staff_id} does not exist.")

            if not to_staff.is_staff():
                return EscalationResult(
                    success=False,
                    message=f"Target '{to_staff.full_name}' is a '{to_staff.designation}'. Use escalate_to_manager() for managers."
                )

            if not from_staff.is_same_department(to_staff.department):
                return EscalationResult(
                    success=False,
                    message=f"Cannot escalate across departments ('{from_staff.department}' != '{to_staff.department}')."
                )

            if not to_staff.is_available():
                return EscalationResult(
                    success=False,
                    message=f"Target staff '{to_staff.full_name}' is currently {to_staff.availability_status}."
                )

            # 3. Validate active assignment
            current_assignment = self.fetch_active_assignment(request_id, from_staff_id, cursor)
            if not current_assignment:
                return EscalationResult(
                    success=False,
                    message=f"Request #{request_id} is not actively assigned to Staff '{from_staff.full_name}'."
                )

            # 4. Fetch service request for priority logging
            service_req = self.fetch_service_request(request_id, cursor)
            priority_current = service_req.priority_status if service_req else "medium"

            # 5. Mark old assignment reassigned
            cursor.execute("""
                UPDATE assignment
                SET assignment_status = 'reassigned',
                    remarks = COALESCE(remarks || ' | ', '') || %s
                WHERE assignment_id = %s
            """, (f"Reassigned to {to_staff.full_name}: {reason}", current_assignment["assignment_id"]))

            # 6. Insert new active assignment with due date
            effective_due_date = (
                due_date
                or current_assignment["due_date"]
                or (datetime.date.today() + datetime.timedelta(days=2))
            )

            cursor.execute("""
                INSERT INTO assignment
                (request_id, staff_id, assigned_by, assignment_status, assigned_date, due_date, remarks)
                VALUES
                (%s, %s, %s, 'active', NOW(), %s, %s)
                RETURNING assignment_id
            """, (request_id, to_staff.staff_id, from_staff.staff_id, effective_due_date, f"Reassigned: {reason}"))
            new_assignment_id = cursor.fetchone()[0]

            # 7. Audit log
            cursor.execute("""
                INSERT INTO escalation_logs
                (request_id, from_staff_id, to_staff_id, escalation_type, reason, priority_before, priority_after, status)
                VALUES
                (%s, %s, %s, 'staff_to_staff', %s, %s, %s, 'reassigned')
                RETURNING escalation_id
            """, (request_id, from_staff.staff_id, to_staff.staff_id, reason, priority_current, priority_current))
            escalation_id = cursor.fetchone()[0]

            # 8. Notification to complainant if applicable
            if service_req and service_req.complaint_id:
                cursor.execute("SELECT user_id FROM complaints WHERE complaint_id = %s", (service_req.complaint_id,))
                user_row = cursor.fetchone()
                if user_row and user_row[0]:
                    cursor.execute("""
                        INSERT INTO notifications
                        (user_id, complaint_id, title, message, notification_type, is_read, created_at)
                        VALUES
                        (%s, %s, %s, %s, 'escalation', false, NOW())
                    """, (
                        user_row[0],
                        service_req.complaint_id,
                        f"Request #{request_id} Reassigned to Peer Staff",
                        f"Your request has been reassigned to {to_staff.full_name}. Reason: {reason}"
                    ))

            conn.commit()

            return EscalationResult(
                success=True,
                message=f"Request #{request_id} successfully escalated from {from_staff.full_name} to {to_staff.full_name}.",
                escalation_id=escalation_id,
                new_assignment_id=new_assignment_id,
                from_staff_name=from_staff.full_name,
                to_staff_name=to_staff.full_name,
                priority_upgrade=priority_current,
                data={
                    "request_id": request_id,
                    "to_staff_id": to_staff.staff_id,
                    "due_date": str(effective_due_date)
                }
            )

        except Exception as e:
            conn.rollback()
            return EscalationResult(success=False, message=f"Database error during peer escalation: {e}")
        finally:
            cursor.close()
            conn.close()

    def get_escalation_history(self, request_id: int) -> List[Dict[str, Any]]:
        """Retrieve full escalation audit trail for a service request."""
        conn = self.connection_factory()
        if not conn:
            return []
        cursor = conn.cursor()
        try:
            self._ensure_tables(cursor)
            cursor.execute("""
                SELECT 
                    e.escalation_id,
                    e.request_id,
                    e.escalation_type,
                    e.reason,
                    e.priority_before,
                    e.priority_after,
                    e.status,
                    e.escalated_at,
                    s1.full_name AS from_staff_name,
                    s1.designation AS from_designation,
                    s2.full_name AS to_staff_name,
                    s2.designation AS to_designation
                FROM escalation_logs e
                JOIN staff s1 ON s1.staff_id = e.from_staff_id
                JOIN staff s2 ON s2.staff_id = e.to_staff_id
                WHERE e.request_id = %s
                ORDER BY e.escalated_at DESC
            """, (request_id,))
            rows = cursor.fetchall()
            history = []
            for r in rows:
                history.append({
                    "escalation_id": r[0],
                    "request_id": r[1],
                    "escalation_type": r[2],
                    "reason": r[3],
                    "priority_before": r[4],
                    "priority_after": r[5],
                    "status": r[6],
                    "escalated_at": str(r[7]),
                    "from_person": f"{r[8]} ({r[9]})",
                    "to_person": f"{r[10]} ({r[11]})"
                })
            return history
        finally:
            cursor.close()
            conn.close()

    def get_manager_escalations(self, manager_id: int) -> List[Dict[str, Any]]:
        """Retrieve all escalations currently directed to a specific manager."""
        conn = self.connection_factory()
        if not conn:
            return []
        cursor = conn.cursor()
        try:
            self._ensure_tables(cursor)
            cursor.execute("""
                SELECT 
                    e.escalation_id,
                    e.request_id,
                    sr.complaint_id,
                    cmp.subject,
                    e.reason,
                    e.priority_after,
                    e.escalated_at,
                    s.full_name AS escalated_by
                FROM escalation_logs e
                JOIN service_request sr ON sr.request_id = e.request_id
                LEFT JOIN complaints cmp ON cmp.complaint_id = sr.complaint_id
                JOIN staff s ON s.staff_id = e.from_staff_id
                WHERE e.to_staff_id = %s
                  AND e.escalation_type = 'staff_to_manager'
                ORDER BY e.escalated_at DESC
            """, (manager_id,))
            rows = cursor.fetchall()
            items = []
            for r in rows:
                items.append({
                    "escalation_id": r[0],
                    "request_id": r[1],
                    "complaint_id": r[2],
                    "subject": r[3],
                    "reason": r[4],
                    "priority": r[5],
                    "escalated_at": str(r[6]),
                    "escalated_by": r[7]
                })
            return items
        finally:
            cursor.close()
            conn.close()

    def resolve_escalation(
        self,
        escalation_id: int,
        manager_id: int,
        resolution_notes: str
    ) -> EscalationResult:
        """
        Allows a manager to mark an escalation as reviewed and resolved.
        Also marks the active manager assignment as completed and syncs the request status.
        """
        conn = self.connection_factory()
        if not conn:
            return EscalationResult(success=False, message="Database connection failed.")
        cursor = conn.cursor()
        try:
            self._ensure_tables(cursor)

            # 1. Fetch escalation details
            cursor.execute("""
                SELECT e.request_id, e.to_staff_id, e.status, sr.complaint_id, c.subject
                FROM escalation_logs e
                JOIN service_request sr ON sr.request_id = e.request_id
                JOIN complaints c ON c.complaint_id = sr.complaint_id
                WHERE e.escalation_id = %s;
            """, (escalation_id,))
            row = cursor.fetchone()
            if not row:
                return EscalationResult(success=False, message=f"Escalation #{escalation_id} not found.")

            request_id, assigned_manager_id, esc_status, complaint_id, subject = row
            if esc_status == "resolved":
                return EscalationResult(success=False, message=f"Escalation #{escalation_id} is already resolved.")

            # 2. Update escalation_logs
            cursor.execute("""
                UPDATE escalation_logs
                SET status = 'resolved',
                    resolution_notes = %s
                WHERE escalation_id = %s;
            """, (resolution_notes.strip(), escalation_id))

            # 3. Mark manager's assignment as completed
            timestamp_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
            cursor.execute("""
                UPDATE assignment
                SET assignment_status = 'completed'::assignment_status_enum,
                    remarks = COALESCE(remarks || ' | ', '') || %s
                WHERE request_id = %s AND staff_id = %s AND assignment_status = 'active';
            """, (f"Manager Resolved ({timestamp_str}): {resolution_notes.strip()}", request_id, manager_id))

            # 4. Update service_request and complaints
            cursor.execute("""
                UPDATE service_request
                SET status = 'completed'::status_enum,
                    updated_at = NOW()
                WHERE request_id = %s;
            """, (request_id,))

            cursor.execute("""
                UPDATE complaints
                SET status = 'Resolved'
                WHERE complaint_id = %s;
            """, (complaint_id,))

            # 5. Send notification to user
            cursor.execute("SELECT user_id FROM complaints WHERE complaint_id = %s;", (complaint_id,))
            user_row = cursor.fetchone()
            if user_row and user_row[0]:
                cursor.execute("""
                    INSERT INTO notifications
                    (user_id, complaint_id, title, message, notification_type, is_read, created_at)
                    VALUES (%s, %s, %s, %s, 'resolution', false, NOW());
                """, (
                    user_row[0],
                    complaint_id,
                    "Escalated Complaint Resolved",
                    f"Your escalated complaint '{subject}' has been resolved by management: {resolution_notes.strip()}"
                ))

            conn.commit()

            return EscalationResult(
                success=True,
                message=f"Escalation #{escalation_id} on Request #{request_id} successfully resolved by Manager #{manager_id}.",
                escalation_id=escalation_id,
                data={"request_id": request_id, "resolution_notes": resolution_notes}
            )

        except Exception as e:
            conn.rollback()
            return EscalationResult(success=False, message=f"Database error while resolving escalation: {e}")
        finally:
            cursor.close()
            conn.close()

    def get_escalation_stats(self) -> Dict[str, int]:
        """
        Escalation KPI metrics for Team 3 Dashboard integration:
        - total_escalations
        - open_escalations
        - resolved_escalations
        """
        conn = self.connection_factory()
        if not conn:
            return {"total_escalations": 0, "open_escalations": 0, "resolved_escalations": 0}
        cursor = conn.cursor()
        try:
            self._ensure_tables(cursor)
            cursor.execute("""
                SELECT 
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status != 'resolved') AS open_count,
                    COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count
                FROM escalation_logs;
            """)
            row = cursor.fetchone()
            return {
                "total_escalations": int(row[0]) if row and row[0] else 0,
                "open_escalations": int(row[1]) if row and row[1] else 0,
                "resolved_escalations": int(row[2]) if row and row[2] else 0,
            }
        finally:
            cursor.close()
            conn.close()

    def get_eligible_staff(self, request_id: int, from_staff_id: int) -> Dict[str, Any]:
        """
        Retrieves list of available peer staff within the same department for a given request.
        Excludes the requesting staff member and verifies active assignment.
        """
        conn = self.connection_factory()
        if not conn:
            return {"success": False, "message": "Database connection failed.", "staff": []}
        cursor = conn.cursor()
        try:
            self._ensure_tables(cursor)

            # 1. Validate from_staff
            from_staff = self.fetch_staff_by_id(from_staff_id, cursor)
            if not from_staff:
                return {"success": False, "message": f"Staff #{from_staff_id} does not exist.", "staff": []}

            # 2. Validate request exists
            service_req = self.fetch_service_request(request_id, cursor)
            if not service_req:
                return {"success": False, "message": f"Request #{request_id} does not exist.", "staff": []}

            # 3. Validate active assignment
            assignment = self.fetch_active_assignment(request_id, from_staff_id, cursor)
            if not assignment:
                return {
                    "success": False,
                    "message": "This request is no longer actively assigned to you.",
                    "staff": []
                }

            # 4. Query eligible peer staff
            cursor.execute("""
                SELECT staff_id, full_name, email, phone, department, designation, availability_status
                FROM staff
                WHERE LOWER(department) = LOWER(%s)
                  AND staff_id != %s
                  AND LOWER(designation) = 'staff'
                  AND LOWER(availability_status::text) = 'available'
                ORDER BY full_name ASC;
            """, (from_staff.department, from_staff_id))
            rows = cursor.fetchall()
            staff_list = []
            for r in rows:
                staff_list.append({
                    "staff_id": r[0],
                    "full_name": r[1],
                    "email": r[2],
                    "phone": r[3],
                    "department": r[4],
                    "designation": r[5],
                    "availability_status": str(r[6])
                })

            return {"success": True, "staff": staff_list, "department": from_staff.department}
        finally:
            cursor.close()
            conn.close()

    def get_target_manager(self, request_id: int, from_staff_id: int) -> Dict[str, Any]:
        """
        Determines the designated department manager for a request.
        Verifies request ownership and manager availability.
        """
        conn = self.connection_factory()
        if not conn:
            return {"success": False, "message": "Database connection failed.", "manager": None}
        cursor = conn.cursor()
        try:
            self._ensure_tables(cursor)

            # 1. Validate from_staff
            from_staff = self.fetch_staff_by_id(from_staff_id, cursor)
            if not from_staff:
                return {"success": False, "message": f"Staff #{from_staff_id} does not exist.", "manager": None}

            # 2. Validate request exists
            service_req = self.fetch_service_request(request_id, cursor)
            if not service_req:
                return {"success": False, "message": f"Request #{request_id} does not exist.", "manager": None}

            # 3. Validate active assignment
            assignment = self.fetch_active_assignment(request_id, from_staff_id, cursor)
            if not assignment:
                return {
                    "success": False,
                    "message": "This request is no longer actively assigned to you.",
                    "manager": None
                }

            # 4. Fetch department manager
            manager = self.fetch_department_manager(from_staff.department, cursor)
            if not manager:
                return {
                    "success": False,
                    "message": f"Department manager for '{from_staff.department}' could not be found.",
                    "manager": None
                }

            if not manager.is_available():
                return {
                    "success": False,
                    "message": f"Department manager '{manager.full_name}' is currently {manager.availability_status}.",
                    "manager": None
                }

            return {
                "success": True,
                "manager": {
                    "staff_id": manager.staff_id,
                    "full_name": manager.full_name,
                    "email": manager.email,
                    "department": manager.department,
                    "designation": manager.designation,
                    "availability_status": str(manager.availability_status)
                }
            }
        finally:
            cursor.close()
            conn.close()

    def get_staff_active_requests(self, staff_id: int) -> List[Dict[str, Any]]:
        """
        Fetches all active service requests assigned to a staff member.
        Used by the Staff Dashboard / Escalation UI.
        """
        conn = self.connection_factory()
        if not conn:
            return []
        cursor = conn.cursor()
        try:
            self._ensure_tables(cursor)
            cursor.execute("""
                SELECT 
                    s.request_id,
                    s.complaint_id,
                    c.subject,
                    c.description,
                    cat.category_name,
                    s.priority_status,
                    s.status,
                    a.due_date,
                    a.assigned_date,
                    a.remarks
                FROM assignment a
                JOIN service_request s ON a.request_id = s.request_id
                JOIN complaints c ON s.complaint_id = c.complaint_id
                LEFT JOIN categories cat ON c.category_id = cat.category_id
                WHERE a.staff_id = %s
                  AND a.assignment_status = 'active'
                ORDER BY a.due_date ASC, s.request_id ASC;
            """, (staff_id,))
            rows = cursor.fetchall()
            items = []
            for r in rows:
                items.append({
                    "request_id": r[0],
                    "complaint_id": r[1],
                    "subject": r[2],
                    "description": r[3],
                    "category_name": r[4] or "General",
                    "priority_status": str(r[5]),
                    "status": str(r[6]),
                    "due_date": str(r[7]) if r[7] else None,
                    "assigned_date": str(r[8]) if r[8] else None,
                    "remarks": r[9] or ""
                })
            return items
        finally:
            cursor.close()
            conn.close()



# =====================================================================
# Backward Compatibility Standalone Functions
# =====================================================================

_service_instance = EscalationService()

def escalate_to_staff(request_id: int, from_staff_id: int, to_staff_id: int, reason: str = "Horizontal escalation to peer staff"):
    """Standalone wrapper for Staff-to-Staff escalation."""
    result = _service_instance.escalate_to_staff(
        request_id=request_id,
        from_staff_id=from_staff_id,
        to_staff_id=to_staff_id,
        reason=reason
    )
    result.print_summary()
    return result

def escalate_to_manager(request_id: int, from_staff_id: int, to_manager_id: Optional[int] = None, reason: str = "Escalated to department manager"):
    """Standalone wrapper for Staff-to-Manager escalation."""
    result = _service_instance.escalate_to_manager(
        request_id=request_id,
        from_staff_id=from_staff_id,
        to_manager_id=to_manager_id,
        reason=reason
    )
    result.print_summary()
    return result


if __name__ == "__main__":
    print("EscalationService module loaded successfully. Run test_escalation.py to execute the test suite.")