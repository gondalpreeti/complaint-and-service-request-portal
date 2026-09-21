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

Follows strict project architecture:
Authenticates staff -> Validates input -> Delegates to EscalationService -> Returns atomic response.
"""
import sys
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Ensure dbconnections directory is on python path (checks repo root or parent workspace)
for p in (Path(__file__).resolve().parents[3] / "dbconnections", Path(__file__).resolve().parents[4] / "dbconnections"):
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
    EscalationLogEntry
)

router = APIRouter(prefix="/api/escalations", tags=["escalations"])
_service = EscalationService()
bearer_auth = HTTPBearer(auto_error=False)


async def get_current_staff(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_auth),
    x_staff_id: Optional[int] = Header(None, alias="X-Staff-Id")
) -> StaffMember:
    """
    Resolves the authenticated staff member dynamically without hardcoding.
    Resolution hierarchy:
    1. Decodes JWT token if provided in Authorization header.
    2. Maps token subject/email to the staff table in PostgreSQL.
    3. Falls back to X-Staff-Id header for development/testing environments.
    4. Rejects request with 401 if unauthenticated or non-staff user.
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

        # 1. Try JWT authentication if Bearer token present
        if auth and auth.credentials:
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
                pass  # Fall through to header or rejection

        # 2. Development / Testing header fallback if JWT did not resolve
        if not staff_row and x_staff_id is not None:
            cursor.execute("""
                SELECT staff_id, full_name, email, phone, department, designation, availability_status, category_id
                FROM staff
                WHERE staff_id = %s;
            """, (x_staff_id,))
            staff_row = cursor.fetchone()

        # 3. If still no staff found, reject with 401
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
    res = _service.get_eligible_staff(request_id=request_id, from_staff_id=current_staff.staff_id)
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
    result = _service.escalate_to_staff(
        request_id=payload.request_id,
        from_staff_id=current_staff.staff_id,
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
    res = _service.get_target_manager(request_id=request_id, from_staff_id=current_staff.staff_id)
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
    result = _service.escalate_to_manager(
        request_id=payload.request_id,
        from_staff_id=current_staff.staff_id,
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

