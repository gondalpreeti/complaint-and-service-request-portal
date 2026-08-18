from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from helpers.notification_helper import (
    create_notification,
    get_request_owner,
    get_assignment_request_owner
)

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

    # Check if request is already assigned
    query = text("""
        SELECT assignment_id
        FROM assignment
        WHERE request_id = :id
        AND assignment_status = 'active'
    """)

    result = db.execute(query, {"id": request_id})
    row = result.fetchone()

    if row:
        return {"message": "Request already assigned"}

    # Get complaint category
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

    # Find available staff with least assignments
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

    # Create assignment
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

    # Update request status
    query = text("""
        UPDATE service_request
        SET status = 'assigned'
        WHERE request_id = :id
    """)

    db.execute(query, {"id": request_id})

    # notification
    # Get the student who created this complaint
    owner = get_request_owner(db, request_id)

    if owner:
        create_notification(
            db=db,
            user_id=owner["user_id"],
            complaint_id=owner["complaint_id"],
            title="Complaint Assigned",
            message=f"Your complaint '{owner['subject']}' has been assigned to a staff member.",
            notification_type="assignment"
        )
    

    db.commit()

    return {
        "message": "Request assigned and notification created",
        "staff_id": staff_id
    }


@app.put("/assignment/{assignment_id}/reassign")
def reassign(
    assignment_id: int,
    staff_id: int,
    manager_id: int,
    db: Session = Depends(get_db)
):

    owner = get_assignment_request_owner(db, assignment_id)

    # Make old assignment inactive
    
    ## team 3 changes: change in assignment_status value from " inactive -> cancelled " 
    query = text("""
        UPDATE assignment
        SET assignment_status = 'cancelled'
        WHERE assignment_id = :id
    """)

    db.execute(query, {"id": assignment_id})

    # Create new assignment
    query = text("""
        INSERT INTO assignment
        (request_id, staff_id, assigned_by, due_date)
        SELECT request_id, :staff, :manager, due_date
        FROM assignment
        WHERE assignment_id = :id
    """)

    db.execute(query, {
        "staff": staff_id,
        "manager": manager_id,
        "id": assignment_id
    })

    # create a notification on reassignment
    create_notification(
        db=db,
        user_id=owner["user_id"],
        complaint_id=owner["complaint_id"],
        title="Complaint Reassigned",
        message=f"Your complaint '{owner['subject']}' has been reassigned to another staff member.",
        notification_type="reassignment"
    )


    db.commit()

    return {"message": "Assignment reassigned and notification created"}

# get all notification for user
@app.get("/notifications/{user_id}")
def get_notifications(
    user_id: str,
    db: Session = Depends(get_db)
):
    query = text("""
        SELECT
            notification_id,
            complaint_id,
            title,
            message,
            notification_type,
            is_read,
            created_at
        FROM notifications
        WHERE user_id = :user_id
        ORDER BY created_at DESC
    """)

    result = db.execute(
        query,
        {"user_id": user_id}
    )

    notifications = [
        dict(row._mapping)
        for row in result
    ]

    return notifications

# get notification count which are not readed yet
@app.get("/notifications/{user_id}/unread-count")
def get_unread_notification_count(
    user_id: str,
    db: Session = Depends(get_db)
):
    query = text("""
        SELECT COUNT(*) AS unread_count
        FROM notifications
        WHERE user_id = :user_id
        AND is_read = FALSE
    """)

    result = db.execute(
        query,
        {"user_id": user_id}
    )

    row = result.fetchone()

    return {
        "unread_count": row._mapping["unread_count"]
    }

# mark notification as read
@app.put("/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db)
):
    query = text("""
        UPDATE notifications
        SET is_read = TRUE
        WHERE notification_id = :notification_id
    """)

    result = db.execute(
        query,
        {"notification_id": notification_id}
    )

    if result.rowcount == 0:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    db.commit()

    return {
        "message": "Notification marked as read"
    }

# mark all notifications as read
@app.put("/notifications/{user_id}/read-all")
def mark_all_notifications_as_read(
    user_id: str,
    db: Session = Depends(get_db)
):
    query = text("""
        UPDATE notifications
        SET is_read = TRUE
        WHERE user_id = :user_id
        AND is_read = FALSE
    """)

    result = db.execute(
        query,
        {"user_id": user_id}
    )

    db.commit()

    return {
        "message": "All notifications marked as read",
        "updated_count": result.rowcount
    }