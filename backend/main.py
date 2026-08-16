from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db

app = FastAPI()


@app.get("/")
def home():
    return {"message": "API is online"}


@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"message": "Connected to Supabase!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/staff")
def get_staff(db: Session = Depends(get_db)):

    query = text("""
        SELECT staff_id, full_name, email,
               phone, department, designation,
               availability_status, category_id
        FROM staff
        ORDER BY staff_id
    """)

    result = db.execute(query)

    staff = []

    for row in result:
        staff.append(dict(row._mapping))

    return staff


@app.get("/categories/{category_id}/staff")
def get_category_staff(category_id: int, db: Session = Depends(get_db)):

    query = text("""
        SELECT staff_id, full_name, email,
               department, designation,
               availability_status
        FROM staff
        WHERE category_id = :category
    """)

    result = db.execute(query, {"category": category_id})

    staff = []

    for row in result:
        staff.append(dict(row._mapping))

    return staff


@app.put("/staff/{staff_id}/availability")
def update_availability(
    staff_id: int,
    availability_status: str,
    db: Session = Depends(get_db)
):

    query = text("""
        UPDATE staff
        SET availability_status = :status
        WHERE staff_id = :id
    """)

    db.execute(query, {
        "status": availability_status,
        "id": staff_id
    })

    db.commit()

    return {"message": "Availability updated"}


@app.get("/requests/pending")
def pending_requests(db: Session = Depends(get_db)):

    query = text("""
        SELECT request_id, complaint_id, priority_status
        FROM service_request
        WHERE status = 'pending'
    """)

    result = db.execute(query)

    requests = []

    for row in result:
        requests.append(dict(row._mapping))

    return requests


@app.get("/requests/next")
def next_request(db: Session = Depends(get_db)):

    query = text("""
        SELECT request_id, complaint_id, priority_status
        FROM service_request
        WHERE status = 'pending'
        ORDER BY
            CASE
                WHEN priority_status = 'high' THEN 1
                WHEN priority_status = 'medium' THEN 2
                ELSE 3
            END
        LIMIT 1
    """)

    result = db.execute(query)
    row = result.fetchone()

    if row:
        return dict(row._mapping)

    return {"message": "No pending requests"}


@app.post("/assign/{request_id}")
def assign_request(request_id: int, db: Session = Depends(get_db)):

    query = text("""
        SELECT c.category_id
        FROM complaints c
        JOIN service_request s
        ON c.complaint_id = s.complaint_id
        WHERE s.request_id = :id
    """)

    result = db.execute(query, {"id": request_id})
    row = result.fetchone()

    if not row:
        return {"message": "Request not found"}

    category_id = row[0]

    query = text("""
        SELECT s.staff_id
        FROM staff s
        LEFT JOIN assignment a
        ON s.staff_id = a.staff_id
        WHERE s.category_id = :category
        AND s.availability_status = 'Available'
        GROUP BY s.staff_id
        ORDER BY COUNT(a.assignment_id)
        LIMIT 1
    """)

    result = db.execute(query, {"category": category_id})
    row = result.fetchone()

    if not row:
        return {"message": "No available staff"}

    staff_id = row[0]

    query = text("""
        INSERT INTO assignment
        (request_id, staff_id, assigned_by, due_date)
        VALUES
        (:request, :staff, NULL, CURRENT_DATE)
    """)

    db.execute(query, {
        "request": request_id,
        "staff": staff_id
    })

    query = text("""
        UPDATE service_request
        SET status = 'assigned'
        WHERE request_id = :id
    """)

    db.execute(query, {"id": request_id})

    db.commit()

    return {
        "message": "Request assigned",
        "staff_id": staff_id
    }


@app.put("/assignment/{assignment_id}/reassign")
def reassign(
    assignment_id: int,
    staff_id: int,
    manager_id: int,
    db: Session = Depends(get_db)
):

    query = text("""
        UPDATE assignment
        SET staff_id = :staff_id,
            assigned_by = :manager_id
        WHERE assignment_id = :assignment_id
    """)

    db.execute(query, {
        "staff_id": staff_id,
        "manager_id": manager_id,
        "assignment_id": assignment_id
    })

    db.commit()

    return {"message": "Assignment reassigned"}