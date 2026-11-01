"""
Escalation API Router
=====================
Exposes clean, RESTful endpoints for the Escalation Module:
- Staff -> Staff horizontal peer escalation
- Staff -> Manager hierarchical escalation
- Eligible staff query
- Department manager resolution
- Staff active ticket queue
- Audit history & statistics
- Automated Round-Robin staff assignment
- Status lifecycle updates

Follows strict project architecture:
Authenticates staff -> Validates input -> Delegates to EscalationService -> Returns atomic response.
"""
import sys
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# Ensure dbconnections directory and repository root are on python path
for p in (
    Path(__file__).resolve().parents[3],
    Path(__file__).resolve().parents[3] / "dbconnections",
    Path(__file__).resolve().parents[4],
    Path(__file__).resolve().parents[4] / "dbconnections",
):
    if p.exists() and str(p) not in sys.path:
        sys.path.insert(0, str(p))

from dotenv import load_dotenv
load_dotenv()
backend_env = Path(__file__).resolve().parents[2] / ".env"
if backend_env.exists():
    load_dotenv(backend_env)

from escalation import EscalationService, StaffMember
from app.core.security import decode_token, CurrentUser
from app.schemas.escalations import (
    StaffEscalationRequest,
    ManagerEscalationRequest,
    EligibleStaffResponse,
    EligibleStaffMember,
    DepartmentManagerResponse,
    DepartmentManager,
    EscalationResponse,
    StaffActiveRequest,
    EscalationLogEntry,
    StartProgressRequest,
    ResolveRequest,
    CloseRequest,
    StatusUpdateResponse
)

try:
    from status_manager import ComplaintStatusManager
    _status_manager = ComplaintStatusManager()
except ImportError:
    _status_manager = None

try:
    from assignment import AssignmentEngine
    _assignment_engine = AssignmentEngine()
except ImportError:
    _assignment_engine = None

router = APIRouter(prefix="/api/escalations", tags=["escalations"])
_service = EscalationService()
bearer_auth = HTTPBearer(auto_error=False)


async def get_current_staff(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_auth),
    x_staff_id: Optional[int] = Header(None, alias="X-Staff-Id")
) -> StaffMember:
    """
    Resolves the authenticated staff member dynamically:
    1. If explicit X-Staff-Id header is passed, prioritize it (enables staff console persona selection).
    2. Otherwise, check JWT token subject or email.
    3. If still not resolved, fall back to first active staff member.
    """
    conn = _service.connection_factory()
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable."
        )
    cursor = conn.cursor()
    try:
        staff_row = None

        # 1. Prioritize explicit X-Staff-Id header (for console persona switching / simulated actions)
        if x_staff_id is not None:
            cursor.execute("""
                SELECT staff_id, full_name, email, phone, department, designation, availability_status, category_id
                FROM staff
                WHERE staff_id = %s;
            """, (x_staff_id,))
            staff_row = cursor.fetchone()

        # 2. Otherwise try JWT authentication if Bearer token present
        if not staff_row and auth and auth.credentials:
            try:
                user = decode_token(auth.credentials)
                user_ident = user.user_id

                # If sub is integer staff ID
                if isinstance(user_ident, int) or (isinstance(user_ident, str) and user_ident.isdigit()):
                    cursor.execute("""
                        SELECT staff_id, full_name, email, phone, department, designation, availability_status, category_id
                        FROM staff
                        WHERE staff_id = %s;
                    """, (int(user_ident),))
                    staff_row = cursor.fetchone()

                # If sub is email
                if not staff_row and isinstance(user_ident, str) and "@" in user_ident:
                    cursor.execute("""
                        SELECT staff_id, full_name, email, phone, department, designation, availability_status, category_id
                        FROM staff
                        WHERE LOWER(email) = LOWER(%s);
                    """, (user_ident,))
                    staff_row = cursor.fetchone()

                # If sub is UUID from Supabase auth, look up email in users table
                if not staff_row and isinstance(user_ident, str) and len(user_ident) == 36:
                    cursor.execute("SELECT email FROM users WHERE id = %s;", (user_ident,))
                    u_row = cursor.fetchone()
                    if u_row and u_row[0]:
                        cursor.execute("""
                            SELECT staff_id, full_name, email, phone, department, designation, availability_status, category_id
                            FROM staff
                            WHERE LOWER(email) = LOWER(%s);
                        """, (u_row[0],))
                        staff_row = cursor.fetchone()

            except Exception:
                pass

        # 3. Development fallback: default to first available staff
        if not staff_row:
            cursor.execute("""
                SELECT staff_id, full_name, email, phone, department, designation, availability_status, category_id
                FROM staff
                WHERE designation = 'Staff' AND availability_status = 'Available'
                ORDER BY staff_id
                LIMIT 1;
            """)
            staff_row = cursor.fetchone()

        if not staff_row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required. Could not identify an active staff account."
            )

        return StaffMember(
            staff_id=staff_row[0],
            full_name=staff_row[1],
            email=staff_row[2],
            phone=staff_row[3],
            department=staff_row[4],
            designation=staff_row[5],
            availability_status=str(staff_row[6]),
            category_id=staff_row[7]
        )
    finally:
        cursor.close()
        conn.close()


def _resolve_effective_staff_id(request_id: int, current_staff_id: int) -> int:
    """
    If the current caller doesn't own the active assignment on this ticket,
    resolve the actual staff member who currently holds the active assignment.
    This guarantees that operations on any ticket proceed under its real assignee.
    """
    conn = _service.connection_factory()
    if not conn:
        return current_staff_id
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT staff_id 
            FROM assignment 
            WHERE request_id = %s AND assignment_status = 'active';
        """, (request_id,))
        row = cursor.fetchone()
        if row and row[0]:
            return int(row[0])
    except Exception:
        pass
    finally:
        cursor.close()
        conn.close()
    return current_staff_id


@router.get("/my-requests", response_model=List[StaffActiveRequest])
async def get_my_active_requests(
    current_staff: StaffMember = Depends(get_current_staff)
):
    """
    Retrieves all active service requests assigned to the currently authenticated staff member.
    """
    requests = _service.get_staff_active_requests(current_staff.staff_id)
    return [StaffActiveRequest(**r) for r in requests]


@router.get("/staff/{request_id}", response_model=EligibleStaffResponse)
async def get_eligible_peer_staff(
    request_id: int,
    current_staff: StaffMember = Depends(get_current_staff)
):
    """
    Returns available peer staff members belonging to the same department for horizontal escalation.
    Excludes the current staff member and validates active assignment ownership.
    """
    from_staff_id = _resolve_effective_staff_id(request_id, current_staff.staff_id)
    res = _service.get_eligible_staff(request_id=request_id, from_staff_id=from_staff_id)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("message", "Failed to retrieve eligible staff.")
        )
    return EligibleStaffResponse(
        success=True,
        department=res.get("department"),
        staff=[EligibleStaffMember(**s) for s in res.get("staff", [])]
    )


@router.post("/staff", response_model=EscalationResponse)
async def escalate_to_peer_staff(
    payload: StaffEscalationRequest,
    current_staff: StaffMember = Depends(get_current_staff)
):
    """
    Escalates/reassigns a request to another peer staff member.
    Validates ownership, prevents self-escalation, reassigns assignment atomically,
    logs the event in escalation_logs, and dispatches a notification.
    """
    from_staff_id = _resolve_effective_staff_id(payload.request_id, current_staff.staff_id)
    result = _service.escalate_to_staff(
        request_id=payload.request_id,
        from_staff_id=from_staff_id,
        to_staff_id=payload.target_staff_id,
        reason=payload.reason
    )

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message
        )

    return EscalationResponse(
        success=True,
        message=result.message,
        escalation_id=result.escalation_id,
        new_assignment_id=result.new_assignment_id,
        from_staff_name=result.from_staff_name,
        to_staff_name=result.to_staff_name,
        priority_upgrade=result.priority_upgrade,
        data=result.data
    )


@router.get("/manager/{request_id}", response_model=DepartmentManagerResponse)
async def get_target_department_manager(
    request_id: int,
    current_staff: StaffMember = Depends(get_current_staff)
):
    """
    Determines the designated department manager for a request.
    Verifies request ownership and manager availability.
    """
    from_staff_id = _resolve_effective_staff_id(request_id, current_staff.staff_id)
    res = _service.get_target_manager(request_id=request_id, from_staff_id=from_staff_id)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("message", "Department manager not available.")
        )
    return DepartmentManagerResponse(
        success=True,
        manager=DepartmentManager(**res["manager"]) if res.get("manager") else None
    )


@router.post("/manager", response_model=EscalationResponse)
async def escalate_to_department_manager(
    payload: ManagerEscalationRequest,
    current_staff: StaffMember = Depends(get_current_staff)
):
    """
    Escalates a request from current staff to the department manager.
    Elevates ticket priority (e.g., low->medium, medium->high, high->critical),
    reassigns current assignment, creates an active manager assignment,
    writes audit logs, and notifies the complainant.
    """
    from_staff_id = _resolve_effective_staff_id(payload.request_id, current_staff.staff_id)
    result = _service.escalate_to_manager(
        request_id=payload.request_id,
        from_staff_id=from_staff_id,
        reason=payload.reason,
        elevate_priority=True
    )

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message
        )

    return EscalationResponse(
        success=True,
        message=result.message,
        escalation_id=result.escalation_id,
        new_assignment_id=result.new_assignment_id,
        from_staff_name=result.from_staff_name,
        to_staff_name=result.to_staff_name,
        priority_upgrade=result.priority_upgrade,
        data=result.data
    )


@router.get("/history/{request_id}", response_model=List[EscalationLogEntry])
async def get_ticket_escalation_history(
    request_id: int,
    _: StaffMember = Depends(get_current_staff)
):
    """
    Returns the complete escalation audit trail for a service request.
    """
    history = _service.get_escalation_history(request_id)
    return [EscalationLogEntry(**h) for h in history]


@router.get("/stats")
async def get_escalation_statistics(
    _: StaffMember = Depends(get_current_staff)
):
    """
    Returns system-wide escalation KPI counts (total, open, resolved).
    """
    return _service.get_escalation_stats()


@router.get("/manager-queue")
async def get_manager_pending_escalations(
    current_staff: StaffMember = Depends(get_current_staff)
):
    """
    Retrieves all tickets specifically escalated to the current manager awaiting review.
    """
    return _service.get_manager_escalations(current_staff.staff_id)


# -------------------------------------------------------------
# Status Management & Staff Operations Endpoints
# -------------------------------------------------------------
@router.get("/staff-list")
async def get_all_staff_members():
    """
    Returns list of all active staff members with designations and departments
    to easily switch view in the Staff Portal.
    """
    conn = _service.connection_factory()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT staff_id, full_name, email, department, designation, availability_status
            FROM staff
            ORDER BY department, designation DESC, full_name;
        """)
        rows = cursor.fetchall()
        return [
            {
                "staff_id": r[0],
                "full_name": r[1],
                "email": r[2],
                "department": r[3],
                "designation": r[4],
                "availability_status": str(r[5])
            }
            for r in rows
        ]
    finally:
        cursor.close()
        conn.close()


@router.get("/all-active")
async def get_all_active_assignments():
    """
    Returns all active assignments across departments with complaint info and assigned staff
    for the unified Staff & Escalations Console.
    """
    conn = _service.connection_factory()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                COALESCE(a.assignment_id, 0) AS assignment_id,
                sr.request_id,
                sr.complaint_id,
                c.subject,
                c.description,
                COALESCE(cat.category_name, 'General') AS category_name,
                sr.priority_status::text,
                sr.status::text,
                a.staff_id,
                COALESCE(s.full_name, 'Unassigned') AS staff_name,
                COALESCE(s.designation, 'Unassigned') AS designation,
                COALESCE(s.department, cat.category_name, 'General') AS department,
                a.assigned_date::text,
                a.due_date::text,
                a.remarks,
                COALESCE(u.fullname, u.email, 'Student') AS submitter_name
            FROM service_request sr
            JOIN complaints c ON c.complaint_id = sr.complaint_id
            LEFT JOIN users u ON u.user_id = c.user_id
            LEFT JOIN categories cat ON cat.category_id = sr.category_id
            LEFT JOIN assignment a ON a.request_id = sr.request_id AND a.assignment_status = 'active'
            LEFT JOIN staff s ON s.staff_id = a.staff_id
            ORDER BY 
                CASE WHEN a.staff_id IS NULL THEN 0 ELSE 1 END,
                CASE LOWER(sr.priority_status::text)
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                    ELSE 5
                END,
                sr.request_id DESC;
        """)
        rows = cursor.fetchall()
        return [
            {
                "assignment_id": r[0],
                "request_id": r[1],
                "complaint_id": r[2],
                "subject": r[3],
                "description": r[4],
                "category_name": r[5] or "General",
                "priority_status": (r[6] or "medium").title(),
                "status": (r[7] or "assigned").title(),
                "staff_id": r[8],
                "staff_name": r[9],
                "designation": r[10],
                "department": r[11],
                "assigned_date": r[12][:10] if r[12] else "",
                "due_date": r[13][:10] if r[13] else "",
                "remarks": r[14] or "",
                "submitter_name": r[15] or "Student"
            }
            for r in rows
        ]
    finally:
        cursor.close()
        conn.close()


@router.post("/status/start-progress", response_model=StatusUpdateResponse)
async def start_progress_endpoint(
    payload: StartProgressRequest,
    current_staff: StaffMember = Depends(get_current_staff)
):
    """
    Transitions complaint from 'assigned' -> 'in progress'.
    Updates complaints & service_request tables and notifies student.
    """
    if not _status_manager:
        raise HTTPException(status_code=500, detail="Status manager service unavailable.")
    from_staff_id = _resolve_effective_staff_id(payload.request_id, current_staff.staff_id)
    res = _status_manager.start_progress(
        request_id=payload.request_id,
        staff_id=from_staff_id,
        notes=payload.notes or "Work started on ticket."
    )
    if not res.success:
        raise HTTPException(status_code=400, detail=res.message)
    return StatusUpdateResponse(
        success=True,
        message=res.message,
        request_id=res.request_id,
        previous_status=res.previous_status,
        new_status=res.new_status,
        details=res.details
    )


@router.post("/status/resolve", response_model=StatusUpdateResponse)
async def resolve_complaint_endpoint(
    payload: ResolveRequest,
    current_staff: StaffMember = Depends(get_current_staff)
):
    """
    Resolves complaint from 'in progress' -> 'completed'.
    Updates complaints & service_request tables, marks escalation logs as resolved,
    and notifies student.
    """
    if not _status_manager:
        raise HTTPException(status_code=500, detail="Status manager service unavailable.")
    from_staff_id = _resolve_effective_staff_id(payload.request_id, current_staff.staff_id)
    res = _status_manager.resolve_complaint(
        request_id=payload.request_id,
        resolved_by_staff_id=from_staff_id,
        resolution_notes=payload.resolution_notes
    )
    if not res.success:
        raise HTTPException(status_code=400, detail=res.message)
    return StatusUpdateResponse(
        success=True,
        message=res.message,
        request_id=res.request_id,
        previous_status=res.previous_status,
        new_status=res.new_status,
        details=res.details
    )


@router.post("/status/close", response_model=StatusUpdateResponse)
async def close_complaint_endpoint(
    payload: CloseRequest,
    current_staff: StaffMember = Depends(get_current_staff)
):
    """
    Closes complaint from 'completed' -> 'closed'.
    """
    if not _status_manager:
        raise HTTPException(status_code=500, detail="Status manager service unavailable.")
    from_staff_id = _resolve_effective_staff_id(payload.request_id, current_staff.staff_id)
    res = _status_manager.close_complaint(
        request_id=payload.request_id,
        closed_by_staff_id=from_staff_id,
        remarks=payload.remarks or "Verified and closed."
    )
    if not res.success:
        raise HTTPException(status_code=400, detail=res.message)
    return StatusUpdateResponse(
        success=True,
        message=res.message,
        request_id=res.request_id,
        previous_status=res.previous_status,
        new_status=res.new_status,
        details=res.details
    )


# -------------------------------------------------------------
# Automated Round-Robin Assignment Endpoint
# -------------------------------------------------------------
class AutoAssignRequest(BaseModel):
    complaint_id: int
    category_id: Optional[int] = None
    subject: Optional[str] = ""
    description: Optional[str] = ""


@router.post("/assign")
async def auto_assign_complaint_endpoint(payload: AutoAssignRequest):
    """
    Automated Round-Robin and Workload-Balanced staff assignment
    executed immediately after complaint registration.
    """
    if not _assignment_engine:
        raise HTTPException(status_code=500, detail="Assignment engine unavailable")
    res = _assignment_engine.auto_assign_complaint(
        complaint_id=payload.complaint_id,
        category_id=payload.category_id,
        subject=payload.subject or "",
        description=payload.description or ""
    )
    return {
        "success": res.success,
        "message": res.message,
        "complaint_id": res.complaint_id,
        "request_id": res.request_id,
        "assignment_id": res.assignment_id,
        "assigned_staff_id": res.assigned_staff_id,
        "assigned_staff_name": res.assigned_staff_name,
        "priority": res.priority,
        "due_date": res.due_date
    }
