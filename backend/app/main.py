from fastapi import APIRouter, Depends, HTTPException
from staff_due_date_alert import StaffAlertManager

# Import your authentication function here (e.g., get_current_user)
# from your_auth_module import get_current_user

router = APIRouter(prefix="/api/staff", tags=["Staff Notifications"])

@router.get("/dashboard/notifications")
async def get_my_notifications(current_user = Depends(get_current_user)):
    # Extract the UUID from the current user object
    user_id = current_user.get("user_id") 
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")

    manager = StaffAlertManager()
    
    # 1. Check for alerts from the database
    manager.get_assignments_from_database()
    
    # 2. Save any new alerts to the notifications table (is_read = False)
    manager.save_alerts_to_notifications()
    
    # 3. Return only the unread notifications for this specific user
    notifications = manager.get_unread_notifications_for_user(user_id)
    
    return {
        "unread_count": len(notifications),
        "notifications": notifications
    }


@router.put("/dashboard/notifications/{notification_id}/read")
async def read_notification(notification_id: int, current_user = Depends(get_current_user)):
    # Extract the UUID from the current user object
    user_id = current_user.get("user_id")
    
    manager = StaffAlertManager()
    
    # Mark the specific notification as read in the database
    success = manager.mark_notification_as_read(notification_id, user_id)
    
    if not success:
        raise HTTPException(
            status_code=404, 
            detail="Notification not found or already read"
        )
        
    return {"message": "Marked as read successfully"}
"""
FastAPI application entrypoint.

NOTE: this is starting scaffolding, written because no backend code existed
yet. When Team 1/2 add their own routers (auth, complaints, assignments),
register them here the same way the dashboard router is registered below.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import connect_db, disconnect_db
from app.routers import dashboard

app = FastAPI(title="Complaint & Service Request Portal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server default - update for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await connect_db()


@app.on_event("shutdown")
async def on_shutdown():
    await disconnect_db()


app.include_router(dashboard.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
