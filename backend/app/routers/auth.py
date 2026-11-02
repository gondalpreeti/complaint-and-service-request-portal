"""
Auth & Role-Based Routing Router
=================================
Connects frontend authentication directly to Supabase PostgreSQL:
1. Resolves user role ('student', 'staff', 'manager', 'admin') by email or user_id.
2. Fetches real-time complaints and status updates for logged-in students.
"""
import os
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel
import psycopg2

router = APIRouter(prefix="/api/auth", tags=["auth"])

def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return None
    try:
        return psycopg2.connect(db_url)
    except Exception as e:
        print(f"Database connection error in auth router: {e}")
        return None


class UserProfileResponse(BaseModel):
    success: bool
    email: str
    role: str
    role_id: Optional[int] = 1
    fullname: Optional[str] = ""
    user_id: Optional[str] = ""
    department: Optional[str] = ""
    staff_id: Optional[int] = None


class StudentComplaintItem(BaseModel):
    complaint_id: int
    request_id: Optional[int] = None
    subject: str
    description: Optional[str] = ""
    category_name: str
    priority: str
    status: str
    assigned_staff: str
    department: Optional[str] = ""
    created_at: str
    image_url: Optional[str] = None


@router.get("/user-profile", response_model=UserProfileResponse)
async def get_user_profile(
    email: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None)
):
    """
    Looks up the real role in Supabase database:
    1. Checks 'public.users' joined with 'public.roles'.
    2. Checks 'public.staff' by email.
    3. Normalizes to: 'student' (role_id 1), 'admin' (role_id 2), 'manager' (role_id 3), 'staff' (role_id 4).
    """
    if not email and not user_id:
        raise HTTPException(status_code=400, detail="email or user_id is required.")

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection unavailable.")

    cursor = conn.cursor()
    try:
        # 1. Check staff table by email
        if email:
            cursor.execute("""
                SELECT staff_id, full_name, email, department, designation
                FROM staff
                WHERE LOWER(email) = LOWER(%s);
            """, (email.strip(),))
            staff_row = cursor.fetchone()
            if staff_row:
                designation = str(staff_row[4]).lower()
                is_mgr = "manager" in designation
                role = "manager" if is_mgr else "staff"
                role_id = 3 if is_mgr else 4
                return UserProfileResponse(
                    success=True,
                    email=staff_row[2],
                    role=role,
                    role_id=role_id,
                    fullname=staff_row[1],
                    department=staff_row[3],
                    staff_id=staff_row[0]
                )

        # 2. Check public.users table joined with roles
        if user_id:
            cursor.execute("""
                SELECT u.user_id, u.fullname, u.email, r.role_name, u.role_id
                FROM users u
                LEFT JOIN roles r ON r.role_id = u.role_id
                WHERE u.user_id = %s;
            """, (user_id,))
        else:
            cursor.execute("""
                SELECT u.user_id, u.fullname, u.email, r.role_name, u.role_id
                FROM users u
                LEFT JOIN roles r ON r.role_id = u.role_id
                WHERE LOWER(u.email) = LOWER(%s);
            """, (email.strip(),))

        u_row = cursor.fetchone()
        if u_row:
            raw_role = str(u_row[3] or "user").strip().lower()
            role_id = int(u_row[4]) if u_row[4] is not None else 1
            if role_id == 2 or raw_role == "admin":
                role = "admin"
                role_id = 2
            elif role_id == 3 or raw_role == "manager":
                role = "manager"
                role_id = 3
            elif role_id == 4 or raw_role == "staff":
                role = "staff"
                role_id = 4
            else:
                role = "student"
                role_id = 1

            return UserProfileResponse(
                success=True,
                email=u_row[2] or (email or ""),
                role=role,
                role_id=role_id,
                fullname=u_row[1] or "",
                user_id=str(u_row[0]) if u_row[0] else ""
            )

        # Default fallback: student (role_id 1)
        return UserProfileResponse(
            success=True,
            email=email or "",
            role="student",
            role_id=1,
            fullname="",
            user_id=user_id or ""
        )
    finally:
        cursor.close()
        conn.close()


@router.get("/student-complaints", response_model=List[StudentComplaintItem])
async def get_student_complaints(
    user_id: Optional[str] = Query(None),
    email: Optional[str] = Query(None)
):
    """
    Returns live complaints submitted by the student from Supabase,
    including current status, priority, and assigned staff member.
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection unavailable.")

    cursor = conn.cursor()
    try:
        # If user_id is missing, look it up by email
        resolved_user_id = user_id
        if not resolved_user_id and email:
            cursor.execute("SELECT user_id FROM users WHERE LOWER(email) = LOWER(%s);", (email.strip(),))
            row = cursor.fetchone()
            if row:
                resolved_user_id = str(row[0])

        if resolved_user_id:
            cursor.execute("""
                SELECT 
                    c.complaint_id,
                    sr.request_id,
                    c.subject,
                    c.description,
                    COALESCE(cat.category_name, 'General') AS category_name,
                    COALESCE(sr.priority_status::text, 'medium') AS priority,
                    COALESCE(sr.status::text, c.status::text, 'Pending') AS status,
                    COALESCE(s.full_name, 'Unassigned') AS assigned_staff,
                    s.department,
                    c.created_at::text,
                    c.image_url
                FROM complaints c
                LEFT JOIN service_request sr ON sr.complaint_id = c.complaint_id
                LEFT JOIN categories cat ON cat.category_id = c.category_id
                LEFT JOIN assignment a ON a.request_id = sr.request_id AND a.assignment_status = 'active'
                LEFT JOIN staff s ON s.staff_id = a.staff_id
                WHERE c.user_id = %s
                ORDER BY c.complaint_id DESC;
            """, (resolved_user_id,))
        else:
            # Fallback for demo / preview: return the most recent complaints
            cursor.execute("""
                SELECT 
                    c.complaint_id,
                    sr.request_id,
                    c.subject,
                    c.description,
                    COALESCE(cat.category_name, 'General') AS category_name,
                    COALESCE(sr.priority_status::text, 'medium') AS priority,
                    COALESCE(sr.status::text, c.status::text, 'Pending') AS status,
                    COALESCE(s.full_name, 'Unassigned') AS assigned_staff,
                    s.department,
                    c.created_at::text,
                    c.image_url
                FROM complaints c
                LEFT JOIN service_request sr ON sr.complaint_id = c.complaint_id
                LEFT JOIN categories cat ON cat.category_id = c.category_id
                LEFT JOIN assignment a ON a.request_id = sr.request_id AND a.assignment_status = 'active'
                LEFT JOIN staff s ON s.staff_id = a.staff_id
                ORDER BY c.complaint_id DESC
                LIMIT 10;
            """)

        rows = cursor.fetchall()
        return [
            StudentComplaintItem(
                complaint_id=r[0],
                request_id=r[1],
                subject=r[2],
                description=r[3] or "",
                category_name=r[4],
                priority=(r[5] or "medium").title(),
                status=(r[6] or "Pending").title(),
                assigned_staff=r[7],
                department=r[8] or "",
                created_at=r[9][:10] if r[9] else "",
                image_url=r[10]
            )
            for r in rows
        ]
    finally:
        cursor.close()
        conn.close()

