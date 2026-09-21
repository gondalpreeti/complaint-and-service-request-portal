"""
Pydantic schemas for the Escalation module.
Defines strict validation models for Staff->Staff and Staff->Manager workflows.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class StaffEscalationRequest(BaseModel):
    """Payload for Staff -> Staff horizontal peer escalation."""
    request_id: int = Field(..., description="Service request ID to escalate")
    target_staff_id: int = Field(..., description="Target peer staff member ID")
    reason: str = Field(..., min_length=5, max_length=500, description="Escalation explanation")


class ManagerEscalationRequest(BaseModel):
    """Payload for Staff -> Manager hierarchical escalation."""
    request_id: int = Field(..., description="Service request ID to escalate")
    reason: str = Field(..., min_length=5, max_length=500, description="Escalation justification")


class EligibleStaffMember(BaseModel):
    """Eligible peer staff member details."""
    staff_id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    department: str
    designation: str
    availability_status: str


class EligibleStaffResponse(BaseModel):
    """Response containing list of eligible peer staff."""
    success: bool
    message: Optional[str] = None
    department: Optional[str] = None
    staff: List[EligibleStaffMember] = []


class DepartmentManager(BaseModel):
    """Department Manager details."""
    staff_id: int
    full_name: str
    email: str
    department: str
    designation: str
    availability_status: str


class DepartmentManagerResponse(BaseModel):
    """Response containing designated department manager."""
    success: bool
    message: Optional[str] = None
    manager: Optional[DepartmentManager] = None


class EscalationResponse(BaseModel):
    """Response payload for escalation actions."""
    success: bool
    message: str
    escalation_id: Optional[int] = None
    new_assignment_id: Optional[int] = None
    from_staff_name: Optional[str] = None
    to_staff_name: Optional[str] = None
    priority_upgrade: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class StaffActiveRequest(BaseModel):
    """Active service request details for staff queue."""
    request_id: int
    complaint_id: Optional[int] = None
    subject: str
    description: str
    category_name: str
    priority_status: str
    status: str
    due_date: Optional[str] = None
    assigned_date: Optional[str] = None
    remarks: Optional[str] = ""


class EscalationLogEntry(BaseModel):
    """Escalation history log entry."""
    escalation_id: int
    request_id: int
    escalation_type: str
    reason: str
    priority_before: Optional[str] = None
    priority_after: Optional[str] = None
    status: str
    escalated_at: str
    from_person: str
    to_person: str
