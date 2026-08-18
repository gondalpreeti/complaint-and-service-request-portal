from sqlalchemy import text
from sqlalchemy.orm import Session


def create_notification(
    db: Session,
    user_id,
    complaint_id,
    title: str,
    message: str,
    notification_type: str
):
    query = text("""
        INSERT INTO notifications
        (
            user_id,
            complaint_id,
            title,
            message,
            notification_type
        )
        VALUES
        (
            :user_id,
            :complaint_id,
            :title,
            :message,
            :notification_type
        )
    """)

    db.execute(query, {
        "user_id": user_id,
        "complaint_id": complaint_id,
        "title": title,
        "message": message,
        "notification_type": notification_type
    })


def get_request_owner(db: Session, request_id: int):
    query = text("""
        SELECT
            c.user_id,
            c.complaint_id,
            c.subject
        FROM service_request sr
        JOIN complaints c
            ON c.complaint_id = sr.complaint_id
        WHERE sr.request_id = :request_id
    """)

    result = db.execute(
        query,
        {"request_id": request_id}
    )

    row = result.fetchone()

    if not row:
        return None

    return dict(row._mapping)

def get_assignment_request_owner(
    db: Session,
    assignment_id: int
):
    query = text("""
        SELECT
            c.user_id,
            c.complaint_id,
            c.subject
        FROM assignment a
        JOIN service_request sr
            ON sr.request_id = a.request_id
        JOIN complaints c
            ON c.complaint_id = sr.complaint_id
        WHERE a.assignment_id = :assignment_id
    """)

    result = db.execute(
        query,
        {"assignment_id": assignment_id}
    )

    row = result.fetchone()

    if not row:
        return None

    return dict(row._mapping)