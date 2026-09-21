from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from priority_keywords import HIGH, MEDIUM, LOW
import re

app = FastAPI()


# Complaint class
class Complaint:
    def __init__(self, user_id, subject, description, category_id):
        self.user_id = user_id
        self.subject = subject
        self.description = description
        self.category_id = category_id


# Priority checker
class PriorityChecker:
    def check(self, category, subject, description):

        text_data = (subject + " " + description).lower()

        # High priority
        for word in HIGH.get(category, []):
            if re.search(r'\b' + re.escape(word.lower()) + r'\b', text_data):
                return "high"

        # Medium priority
        for word in MEDIUM.get(category, []):
            if re.search(r'\b' + re.escape(word.lower()) + r'\b', text_data):
                return "medium"

        # Low priority
        for word in LOW.get(category, []):
            if re.search(r'\b' + re.escape(word.lower()) + r'\b', text_data):
                return "low"

        # No keyword matched
        return "medium"


priority_checker = PriorityChecker()


# Home
@app.get("/")
def home():
    return {"message": "API is online"}


# Database health check
@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"message": "Connected to Supabase!"}
    except Exception as e:
        return {"database_error": str(e)}


# Create complaint
@app.post("/complaints")
def create_complaint(
    user_id: str,
    subject: str,
    description: str,
    category_id: int,
    db: Session = Depends(get_db)
):

    complaint = Complaint(
        user_id,
        subject,
        description,
        category_id
    )

    priority = priority_checker.check(
        category_id,
        subject,
        description
    )

    # Insert complaint
    result = db.execute(text("""
        INSERT INTO complaints
        (user_id, subject, description, category_id)
        VALUES (:user_id, :subject, :description, :category_id)
        RETURNING complaint_id
    """), {
        "user_id": complaint.user_id,
        "subject": complaint.subject,
        "description": complaint.description,
        "category_id": complaint.category_id
    })

    complaint_id = result.fetchone()[0]

    # Create service request
    result = db.execute(text("""
        INSERT INTO service_request
        (complaint_id, status, priority_status)
        VALUES (:id, 'pending', :priority)
        RETURNING request_id
    """), {
        "id": complaint_id,
        "priority": priority
    })

    request_id = result.fetchone()[0]

    db.commit()

    return {
        "message": "Complaint created",
        "complaint_id": complaint_id,
        "request_id": request_id,
        "priority": priority
    }


# Get all staff
@app.get("/staff")
def get_staff(db: Session = Depends(get_db)):

    result = db.execute(text("""
        SELECT staff_id, full_name, email, phone,
               department, designation,
               availability_status, category_id
        FROM staff
        ORDER BY staff_id
    """))

    return [dict(row._mapping) for row in result]


# Get staff of a category
@app.get("/categories/{category_id}/staff")
def get_category_staff(
    category_id: int,
    db: Session = Depends(get_db)
):

    result = db.execute(text("""
        SELECT staff_id, full_name, email,
               department, designation,
               availability_status
        FROM staff
        WHERE category_id = :category
    """), {
        "category": category_id
    })

    return [dict(row._mapping) for row in result]


# Update staff availability
@app.put("/staff/{staff_id}/availability")
def update_availability(
    staff_id: int,
    availability_status: str,
    db: Session = Depends(get_db)
):

    db.execute(text("""
        UPDATE staff
        SET availability_status = :status
        WHERE staff_id = :id
    """), {
        "status": availability_status,
        "id": staff_id
    })

    db.commit()

    return {"message": "Availability updated"}


# Get pending requests
@app.get("/requests/pending")
def pending_requests(db: Session = Depends(get_db)):

    result = db.execute(text("""
        SELECT request_id, complaint_id, priority_status
        FROM service_request
        WHERE status = 'pending'
    """))

    return [dict(row._mapping) for row in result]


# Get next request according to priority
@app.get("/requests/next")
def next_request(db: Session = Depends(get_db)):

    result = db.execute(text("""
        SELECT request_id, complaint_id, priority_status
        FROM service_request
        WHERE status = 'pending'
        ORDER BY CASE
            WHEN priority_status = 'high' THEN 1
            WHEN priority_status = 'medium' THEN 2
            ELSE 3
        END
        LIMIT 1
    """))

    row = result.fetchone()

    if row:
        return dict(row._mapping)

    return {"message": "No pending requests"}


# Automatically assign request
@app.post("/assign/{request_id}")
def assign_request(
    request_id: int,
    db: Session = Depends(get_db)
):

    # Find complaint category
    result = db.execute(text("""
        SELECT c.category_id
        FROM complaints c
        JOIN service_request s
        ON c.complaint_id = s.complaint_id
        WHERE s.request_id = :id
    """), {
        "id": request_id
    })

    row = result.fetchone()

    if not row:
        return {"message": "Request not found"}

    category_id = row[0]

    # Check duplicate active assignment
    result = db.execute(text("""
        SELECT assignment_id
        FROM assignment
        WHERE request_id = :id
        AND assignment_status = 'active'
    """), {
        "id": request_id
    })

    if result.fetchone():
        return {"message": "Request already assigned"}

    # Find available staff with lowest workload
    result = db.execute(text("""
        SELECT s.staff_id
        FROM staff s
        LEFT JOIN assignment a
        ON s.staff_id = a.staff_id
        WHERE s.category_id = :category
        AND s.availability_status = 'Available'
        GROUP BY s.staff_id
        ORDER BY COUNT(a.assignment_id)
        LIMIT 1
    """), {
        "category": category_id
    })

    row = result.fetchone()

    if not row:
        return {"message": "No available staff"}

    staff_id = row[0]

    # Create assignment
    db.execute(text("""
        INSERT INTO assignment
        (request_id, staff_id, assigned_by,
         due_date, assignment_status)
        VALUES
        (:request, :staff, NULL,
         CURRENT_DATE, 'active')
    """), {
        "request": request_id,
        "staff": staff_id
    })

    # Update request status
    db.execute(text("""
        UPDATE service_request
        SET status = 'assigned'
        WHERE request_id = :id
    """), {
        "id": request_id
    })

    db.commit()

    return {
        "message": "Request assigned",
        "staff_id": staff_id
    }


# Manager reassignment
@app.put("/assignment/{assignment_id}/reassign")
def reassign(
    assignment_id: int,
    staff_id: int,
    manager_id: int,
    db: Session = Depends(get_db)
):

    result = db.execute(text("""
        UPDATE assignment
        SET staff_id = :staff_id,
            assigned_by = :manager_id
        WHERE assignment_id = :assignment_id
        AND assignment_status = 'active'
        RETURNING assignment_id
    """), {
        "staff_id": staff_id,
        "manager_id": manager_id,
        "assignment_id": assignment_id
    })

    if not result.fetchone():
        return {"message": "Assignment not found"}

    db.commit()

    return {
        "message": "Assignment reassigned"
    }