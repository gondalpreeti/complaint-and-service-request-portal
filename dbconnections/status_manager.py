"""
Complaint Status Management Module
==================================
Handles full complaint and service request lifecycle transitions:
  Assigned -> In Progress -> Completed (Solved) -> Closed
Maintains strict synchronization between `complaints` and `service_request`,
updates assignment records with completion notes, and dispatches user notifications.
"""

import datetime
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List

try:
    from connections import get_connection
except ImportError:
    from dbconnections.connections import get_connection


class ComplaintStatus:
    """Database status constants."""
    # service_request enum values
    SR_PENDING = "pending"
    SR_ASSIGNED = "assigned"
    SR_IN_PROGRESS = "in progress"
    SR_COMPLETED = "completed"
    SR_CLOSED = "closed"

    # complaints text values
    CMP_PENDING = "Pending"
    CMP_IN_PROGRESS = "In Progress"
    CMP_RESOLVED = "Resolved"
    CMP_CLOSED = "Closed"


@dataclass
class StatusUpdateResult:
    """Encapsulates the result of a status transition operation."""
    success: bool
    message: str
    request_id: int
    previous_status: str
    new_status: str
    details: Dict[str, Any] = field(default_factory=dict)

    def print_summary(self):
        print("-" * 55)
        if self.success:
            print("STATUS UPDATE SUCCESSFUL")
            print(f"Request ID:      #{self.request_id}")
            print(f"Transition:      {self.previous_status} -> {self.new_status}")
            print(f"Message:         {self.message}")
        else:
            print("STATUS UPDATE FAILED")
            print(f"Request ID:      #{self.request_id}")
            print(f"Reason:          {self.message}")
        print("-" * 55)


class ComplaintStatusManager:
    """
    Object-Oriented Manager for complaint lifecycle transitions,
    table synchronization, and notification dispatch.
    """

    def __init__(self, connection_factory=get_connection):
        self.connection_factory = connection_factory

    def _send_notification(
        self,
        cursor,
        request_id: int,
        title: str,
        message: str,
        notification_type: str = "status_update"
    ) -> bool:
        """Sends a notification to the user who filed the complaint."""
        try:
            cursor.execute("""
                SELECT c.user_id, c.complaint_id, c.subject
                FROM complaints c
                JOIN service_request sr ON sr.complaint_id = c.complaint_id
                WHERE sr.request_id = %s;
            """, (request_id,))
            row = cursor.fetchone()
            if row and row[0]:
                user_id, complaint_id, subject = row
                cursor.execute("""
                    INSERT INTO notifications
                    (user_id, complaint_id, title, message, notification_type, is_read, created_at)
                    VALUES (%s, %s, %s, %s, %s, false, NOW());
                """, (user_id, complaint_id, title, message, notification_type))
                return True
        except Exception as e:
            print(f"[Warning] Failed to send notification: {e}")
        return False

    def start_progress(
        self,
        request_id: int,
        staff_id: int,
        notes: str = "Staff has commenced work on this request."
    ) -> StatusUpdateResult:
        """
        Transitions complaint status from 'assigned' -> 'in progress'.
        
        Validates:
        1. Staff is actively assigned to this request.
        2. Request is currently 'assigned' or 'pending'.
        
        Updates:
        - service_request.status -> 'in progress'
        - complaints.status -> 'In Progress'
        - assignment.remarks -> notes appended
        - Dispatches notification to user.
        """
        conn = self.connection_factory()
        if not conn:
            return StatusUpdateResult(
                success=False,
                message="Database connection failed.",
                request_id=request_id,
                previous_status="unknown",
                new_status="unknown"
            )

        cursor = conn.cursor()
        try:
            # 1. Verify or create active assignment
            cursor.execute("""
                SELECT assignment_id, remarks
                FROM assignment
                WHERE request_id = %s AND assignment_status = 'active';
            """, (request_id,))
            assignment = cursor.fetchone()
            if assignment:
                assignment_id, existing_remarks = assignment
            else:
                # Auto-assign this unassigned request to the acting staff member
                cursor.execute("""
                    INSERT INTO assignment 
                    (request_id, staff_id, assigned_by, assignment_status, assigned_date, due_date, remarks)
                    VALUES (%s, %s, %s, 'active', NOW(), NOW() + INTERVAL '2 days', %s)
                    RETURNING assignment_id, remarks;
                """, (request_id, staff_id, staff_id, "Assigned upon starting progress."))
                assignment = cursor.fetchone()
                assignment_id, existing_remarks = assignment

            # 2. Verify current status
            cursor.execute("""
                SELECT sr.status, sr.complaint_id, c.subject
                FROM service_request sr
                JOIN complaints c ON c.complaint_id = sr.complaint_id
                WHERE sr.request_id = %s;
            """, (request_id,))
            sr_row = cursor.fetchone()
            if not sr_row:
                return StatusUpdateResult(
                    success=False,
                    message=f"Service Request #{request_id} does not exist.",
                    request_id=request_id,
                    previous_status="unknown",
                    new_status="unknown"
                )

            current_status = str(sr_row[0])
            complaint_id, subject = sr_row[1], sr_row[2]

            if current_status in (ComplaintStatus.SR_COMPLETED, ComplaintStatus.SR_CLOSED):
                return StatusUpdateResult(
                    success=False,
                    message=f"Cannot start work. Ticket is already '{current_status}'.",
                    request_id=request_id,
                    previous_status=current_status,
                    new_status=current_status
                )

            # 3. Synchronize service_request and complaints
            cursor.execute("""
                UPDATE service_request
                SET status = %s::status_enum,
                    updated_at = NOW()
                WHERE request_id = %s;
            """, (ComplaintStatus.SR_IN_PROGRESS, request_id))

            cursor.execute("""
                UPDATE complaints
                SET status = %s
                WHERE complaint_id = %s;
            """, (ComplaintStatus.CMP_IN_PROGRESS, complaint_id))

            # 4. Update assignment remarks
            timestamp_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
            append_remark = f"In Progress ({timestamp_str}): {notes}"
            cursor.execute("""
                UPDATE assignment
                SET remarks = COALESCE(remarks || ' | ', '') || %s
                WHERE assignment_id = %s;
            """, (append_remark, assignment_id))

            # 5. Send notification to student
            self._send_notification(
                cursor=cursor,
                request_id=request_id,
                title="Complaint In Progress",
                message=f"Work has started on your complaint '{subject}'. Assigned staff is actively addressing the issue.",
                notification_type="status_update"
            )

            conn.commit()

            return StatusUpdateResult(
                success=True,
                message=f"Request #{request_id} transitioned to In Progress.",
                request_id=request_id,
                previous_status=current_status,
                new_status=ComplaintStatus.SR_IN_PROGRESS,
                details={"complaint_id": complaint_id, "assignment_id": assignment_id}
            )

        except Exception as e:
            conn.rollback()
            return StatusUpdateResult(
                success=False,
                message=f"Database transaction error: {e}",
                request_id=request_id,
                previous_status="error",
                new_status="error"
            )
        finally:
            cursor.close()
            conn.close()

    def resolve_complaint(
        self,
        request_id: int,
        resolved_by_staff_id: int,
        resolution_notes: str
    ) -> StatusUpdateResult:
        """
        Transitions complaint status from 'in progress' / 'assigned' -> 'completed' (Solved / Resolved).
        
        Updates:
        - service_request.status -> 'completed'
        - complaints.status -> 'Resolved'
        - assignment.assignment_status -> 'completed'
        - assignment.remarks -> resolution notes appended
        - escalation_logs.status -> 'resolved' (if this was an escalated ticket)
        - Dispatches resolution notification to the user.
        """
        if not resolution_notes or not resolution_notes.strip():
            return StatusUpdateResult(
                success=False,
                message="Resolution notes are required to resolve a complaint.",
                request_id=request_id,
                previous_status="unknown",
                new_status="unknown"
            )

        conn = self.connection_factory()
        if not conn:
            return StatusUpdateResult(
                success=False,
                message="Database connection failed.",
                request_id=request_id,
                previous_status="unknown",
                new_status="unknown"
            )

        cursor = conn.cursor()
        try:
            # 1. Verify or create active assignment for completion
            cursor.execute("""
                SELECT assignment_id
                FROM assignment
                WHERE request_id = %s AND assignment_status = 'active';
            """, (request_id,))
            assignment = cursor.fetchone()
            if assignment:
                assignment_id = assignment[0]
            else:
                cursor.execute("""
                    INSERT INTO assignment 
                    (request_id, staff_id, assigned_by, assignment_status, assigned_date, due_date, remarks)
                    VALUES (%s, %s, %s, 'completed', NOW(), NOW(), %s)
                    RETURNING assignment_id;
                """, (request_id, resolved_by_staff_id, resolved_by_staff_id, f"Resolved: {resolution_notes}"))
                assignment_id = cursor.fetchone()[0]

            # 2. Get current ticket details
            cursor.execute("""
                SELECT sr.status, sr.complaint_id, c.subject
                FROM service_request sr
                JOIN complaints c ON c.complaint_id = sr.complaint_id
                WHERE sr.request_id = %s;
            """, (request_id,))
            sr_row = cursor.fetchone()
            if not sr_row:
                return StatusUpdateResult(
                    success=False,
                    message=f"Service Request #{request_id} does not exist.",
                    request_id=request_id,
                    previous_status="unknown",
                    new_status="unknown"
                )

            current_status = str(sr_row[0])
            complaint_id, subject = sr_row[1], sr_row[2]

            if current_status in (ComplaintStatus.SR_COMPLETED, ComplaintStatus.SR_CLOSED):
                return StatusUpdateResult(
                    success=False,
                    message=f"Request #{request_id} is already '{current_status}'.",
                    request_id=request_id,
                    previous_status=current_status,
                    new_status=current_status
                )

            # 3. Synchronize service_request and complaints
            cursor.execute("""
                UPDATE service_request
                SET status = %s::status_enum,
                    updated_at = NOW()
                WHERE request_id = %s;
            """, (ComplaintStatus.SR_COMPLETED, request_id))

            cursor.execute("""
                UPDATE complaints
                SET status = %s
                WHERE complaint_id = %s;
            """, (ComplaintStatus.CMP_RESOLVED, complaint_id))

            # 4. Mark assignment completed with resolution notes
            timestamp_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
            append_remark = f"Resolved on {timestamp_str}: {resolution_notes.strip()}"
            cursor.execute("""
                UPDATE assignment
                SET assignment_status = 'completed'::assignment_status_enum,
                    remarks = COALESCE(remarks || ' | ', '') || %s
                WHERE assignment_id = %s;
            """, (append_remark, assignment_id))

            # 5. If ticket has an active escalation log, mark it resolved
            cursor.execute("""
                UPDATE escalation_logs
                SET status = 'resolved',
                    resolution_notes = %s
                WHERE request_id = %s AND status != 'resolved';
            """, (resolution_notes.strip(), request_id))

            # 6. Dispatch notification to user
            self._send_notification(
                cursor=cursor,
                request_id=request_id,
                title="Complaint Resolved",
                message=f"Your complaint '{subject}' has been resolved. Resolution: {resolution_notes.strip()}",
                notification_type="resolution"
            )

            conn.commit()

            return StatusUpdateResult(
                success=True,
                message=f"Request #{request_id} marked as Solved/Resolved.",
                request_id=request_id,
                previous_status=current_status,
                new_status=ComplaintStatus.SR_COMPLETED,
                details={
                    "complaint_id": complaint_id,
                    "assignment_id": assignment_id,
                    "resolution_notes": resolution_notes.strip()
                }
            )

        except Exception as e:
            conn.rollback()
            return StatusUpdateResult(
                success=False,
                message=f"Database transaction error: {e}",
                request_id=request_id,
                previous_status="error",
                new_status="error"
            )
        finally:
            cursor.close()
            conn.close()

    def close_complaint(
        self,
        request_id: int,
        closed_by_user_id: Optional[str] = None,
        closing_remarks: str = "Complaint verified and closed."
    ) -> StatusUpdateResult:
        """
        Transitions complaint status from 'completed' -> 'closed'.
        """
        conn = self.connection_factory()
        if not conn:
            return StatusUpdateResult(
                success=False,
                message="Database connection failed.",
                request_id=request_id,
                previous_status="unknown",
                new_status="unknown"
            )

        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT sr.status, sr.complaint_id, c.subject
                FROM service_request sr
                JOIN complaints c ON c.complaint_id = sr.complaint_id
                WHERE sr.request_id = %s;
            """, (request_id,))
            sr_row = cursor.fetchone()
            if not sr_row:
                return StatusUpdateResult(
                    success=False,
                    message=f"Service Request #{request_id} does not exist.",
                    request_id=request_id,
                    previous_status="unknown",
                    new_status="unknown"
                )

            current_status = str(sr_row[0])
            complaint_id, subject = sr_row[1], sr_row[2]

            if current_status == ComplaintStatus.SR_CLOSED:
                return StatusUpdateResult(
                    success=False,
                    message=f"Request #{request_id} is already closed.",
                    request_id=request_id,
                    previous_status=current_status,
                    new_status=current_status
                )

            # Update service_request and complaints
            cursor.execute("""
                UPDATE service_request
                SET status = %s::status_enum,
                    updated_at = NOW()
                WHERE request_id = %s;
            """, (ComplaintStatus.SR_CLOSED, request_id))

            cursor.execute("""
                UPDATE complaints
                SET status = %s
                WHERE complaint_id = %s;
            """, (ComplaintStatus.CMP_CLOSED, complaint_id))

            # Send notification
            self._send_notification(
                cursor=cursor,
                request_id=request_id,
                title="Complaint Closed",
                message=f"Your complaint '{subject}' has been officially closed. {closing_remarks}",
                notification_type="closure"
            )

            conn.commit()

            return StatusUpdateResult(
                success=True,
                message=f"Request #{request_id} officially closed.",
                request_id=request_id,
                previous_status=current_status,
                new_status=ComplaintStatus.SR_CLOSED,
                details={"complaint_id": complaint_id}
            )

        except Exception as e:
            conn.rollback()
            return StatusUpdateResult(
                success=False,
                message=f"Database error: {e}",
                request_id=request_id,
                previous_status="error",
                new_status="error"
            )
        finally:
            cursor.close()
            conn.close()

    def get_complaint_status_details(self, request_id: int) -> Optional[Dict[str, Any]]:
        """Fetch current synchronized status details across all tables."""
        conn = self.connection_factory()
        if not conn:
            return None
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT 
                    sr.request_id,
                    c.complaint_id,
                    c.subject,
                    c.status AS complaint_status,
                    sr.status AS service_request_status,
                    sr.priority_status,
                    s.full_name AS assigned_staff_name,
                    s.designation AS staff_designation,
                    a.assignment_status,
                    a.due_date,
                    a.remarks
                FROM service_request sr
                JOIN complaints c ON c.complaint_id = sr.complaint_id
                LEFT JOIN assignment a ON a.request_id = sr.request_id AND a.assignment_status = 'active'
                LEFT JOIN staff s ON s.staff_id = a.staff_id
                WHERE sr.request_id = %s;
            """, (request_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "request_id": row[0],
                "complaint_id": row[1],
                "subject": row[2],
                "complaint_status": row[3],
                "service_request_status": str(row[4]),
                "priority_status": str(row[5]),
                "assigned_to": f"{row[6]} ({row[7]})" if row[6] else "Unassigned",
                "assignment_status": str(row[8]) if row[8] else None,
                "due_date": str(row[9]) if row[9] else None,
                "remarks": row[10]
            }
        finally:
            cursor.close()
            conn.close()


# Module-level convenience instance
_status_manager_instance = ComplaintStatusManager()

def start_progress(request_id: int, staff_id: int, notes: str = ""):
    result = _status_manager_instance.start_progress(request_id, staff_id, notes)
    result.print_summary()
    return result

def resolve_complaint(request_id: int, staff_id: int, resolution_notes: str):
    result = _status_manager_instance.resolve_complaint(request_id, staff_id, resolution_notes)
    result.print_summary()
    return result

def close_complaint(request_id: int, closing_remarks: str = ""):
    result = _status_manager_instance.close_complaint(request_id, closing_remarks=closing_remarks)
    result.print_summary()
    return result
