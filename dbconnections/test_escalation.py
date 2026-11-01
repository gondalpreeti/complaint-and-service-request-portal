"""
Test Suite for OOP Complaint and Service Escalation System
=========================================================
Tests Staff-to-Manager and Staff-to-Staff escalations,
database transactions, validation guards, and audit trail queries.
"""

import datetime
from connections import get_connection
from escalation import (
    StaffMember,
    ServiceRequest,
    EscalationResult,
    EscalationService
)


def print_section(title: str):
    print("\n" + "=" * 65)
    print(f" {title.upper()}")
    print("=" * 65)


def run_tests():
    service = EscalationService()
    conn = get_connection()
    cur = conn.cursor()

    print_section("1. Verifying System Entities via OOP Models")
    
    # Test StaffMember model
    staff = service.fetch_staff_by_id(2, cur)
    print(f"Staff (ID 2): {staff.full_name} | Dept: {staff.department} | Role: {staff.designation} | Avail: {staff.availability_status}")
    assert staff is not None
    assert staff.is_staff() is True
    assert staff.is_manager() is False
    assert staff.is_available() is True

    # Test Manager discovery
    manager = service.fetch_department_manager("Infrastructure", cur)
    print(f"Manager (Infrastructure): {manager.full_name} | Role: {manager.designation} | Avail: {manager.availability_status}")
    assert manager is not None
    assert manager.is_manager() is True
    assert manager.is_same_department("Infrastructure") is True

    print(" Staff and Manager models validated successfully.")

    # -------------------------------------------------------------
    print_section("2. Testing Edge Cases & Guard Conditions")
    # -------------------------------------------------------------
    
    # 2.1 Escalating when staff has no active assignment
    res_no_assign = service.escalate_to_manager(
        request_id=99999,
        from_staff_id=2,
        reason="Testing non-existent assignment"
    )
    print(f"Result (Non-existent request): Success={res_no_assign.success} | Message='{res_no_assign.message}'")
    assert res_no_assign.success is False

    # 2.2 Escalating to someone who is NOT a Manager
    res_not_mgr = service.escalate_to_manager(
        request_id=2,
        from_staff_id=2,
        to_manager_id=3, # Neha Joshi is Staff, not Manager
        reason="Testing invalid manager designation"
    )
    print(f"Result (Target is Staff not Manager): Success={res_not_mgr.success} | Message='{res_not_mgr.message}'")
    assert res_not_mgr.success is False
    assert "not 'Manager'" in res_not_mgr.message

    # 2.3 Peer escalation to someone on leave
    res_on_leave = service.escalate_to_staff(
        request_id=2,
        from_staff_id=2,
        to_staff_id=4, # Amit Kulkarni is On leave
        reason="Testing on-leave reassignment"
    )
    print(f"Result (Target is On leave): Success={res_on_leave.success} | Message='{res_on_leave.message}'")
    # 2.4 Self-escalation prevention
    res_self_staff = service.escalate_to_staff(
        request_id=2,
        from_staff_id=2,
        to_staff_id=2,
        reason="Testing self escalation"
    )
    print(f"Result (Self escalation to staff): Success={res_self_staff.success} | Message='{res_self_staff.message}'")
    assert res_self_staff.success is False
    assert "cannot escalate to yourself" in res_self_staff.message.lower()

    res_self_mgr = service.escalate_to_manager(
        request_id=2,
        from_staff_id=2,
        to_manager_id=2,
        reason="Testing self escalation to manager"
    )
    print(f"Result (Self escalation to manager): Success={res_self_mgr.success} | Message='{res_self_mgr.message}'")
    assert res_self_mgr.success is False
    assert "cannot escalate to yourself" in res_self_mgr.message.lower()

    print(" All guard validations passed successfully.")

    # -------------------------------------------------------------
    print_section("3. Testing Staff to Manager Escalation Workflow")
    # -------------------------------------------------------------

    # Ensure Request #2 has an active assignment for Staff ID 2 (Priya Patil)
    # Check current active assignment for request #2
    cur.execute("""
        SELECT assignment_id, staff_id, assignment_status 
        FROM assignment 
        WHERE request_id = 2 AND assignment_status = 'active';
    """)
    current_active = cur.fetchone()
    print(f"Pre-test active assignment for Request #2: {current_active}")

    # If not assigned to staff 2, reset or create active assignment for testing
    if not current_active or current_active[1] != 2:
        cur.execute("UPDATE assignment SET assignment_status = 'cancelled' WHERE request_id = 2;")
        cur.execute("""
            INSERT INTO assignment (request_id, staff_id, assigned_by, assignment_status, assigned_date, due_date, remarks)
            VALUES (2, 2, NULL, 'active', NOW(), CURRENT_DATE + INTERVAL '2 days', 'Initial assignment for testing')
            RETURNING assignment_id;
        """)
        conn.commit()
        print("Set up active assignment for Staff Priya Patil (ID: 2) on Request #2.")

    # Reset service request priority to 'medium' for the test
    cur.execute("UPDATE service_request SET priority_status = 'medium'::priority_status_enum WHERE request_id = 2;")
    conn.commit()

    # Execute Staff to Manager escalation (Auto-resolving Manager)
    escalate_res = service.escalate_to_manager(
        request_id=2,
        from_staff_id=2,
        reason="Infrastructure outage requires managerial vendor authorization and emergency budget.",
        elevate_priority=True
    )
    escalate_res.print_summary()
    assert escalate_res.success is True
    assert escalate_res.new_assignment_id is not None
    assert escalate_res.escalation_id is not None
    print(f" Escalation completed: Escalation Log #{escalate_res.escalation_id}, Assignment #{escalate_res.new_assignment_id}")

    # -------------------------------------------------------------
    print_section("4. Verifying Database State Post-Escalation")
    # -------------------------------------------------------------

    # 4.1 Check old assignment status
    cur.execute("""
        SELECT assignment_id, staff_id, assignment_status, remarks
        FROM assignment
        WHERE request_id = 2 AND staff_id = 2
        ORDER BY assignment_id DESC LIMIT 1;
    """)
    old_assign = cur.fetchone()
    print(f"Old Assignment (Staff 2): ID={old_assign[0]}, Status={old_assign[2]}, Remarks='{old_assign[3]}'")
    assert old_assign[2] == "reassigned"

    # 4.2 Check new assignment for Manager
    cur.execute("""
        SELECT assignment_id, staff_id, assigned_by, assignment_status, due_date, remarks
        FROM assignment
        WHERE request_id = 2 AND staff_id = 5
        ORDER BY assignment_id DESC LIMIT 1;
    """)
    new_assign = cur.fetchone()
    print(f"New Assignment (Manager 5): ID={new_assign[0]}, Assigned By={new_assign[2]}, Status={new_assign[3]}, DueDate={new_assign[4]}")
    assert new_assign[3] == "active"
    assert new_assign[1] == 5 # Sanjay Kulkarni
    assert new_assign[2] == 2 # Assigned by Priya Patil
    assert new_assign[4] is not None # Valid due_date!

    # 4.3 Check Service Request priority elevation
    cur.execute("SELECT priority_status, status, updated_at FROM service_request WHERE request_id = 2;")
    sr_row = cur.fetchone()
    print(f"Service Request #2: Priority={sr_row[0]}, Status={sr_row[1]}, UpdatedAt={sr_row[2]}")
    assert sr_row[0] == "high" # Elevated from medium -> high

    # 4.4 Check escalation_logs table
    cur.execute("""
        SELECT escalation_id, request_id, from_staff_id, to_staff_id, escalation_type, reason, priority_before, priority_after, status
        FROM escalation_logs
        WHERE escalation_id = %s;
    """, (escalate_res.escalation_id,))
    log_row = cur.fetchone()
    print(f"Escalation Log: {log_row}")
    assert log_row is not None
    assert log_row[4] == "staff_to_manager"
    assert log_row[6] == "medium"
    assert log_row[7] == "high"

    # 4.5 Check notification dispatch
    cur.execute("""
        SELECT notification_id, title, message, notification_type, is_read
        FROM notifications
        WHERE complaint_id = (SELECT complaint_id FROM service_request WHERE request_id = 2)
        ORDER BY created_at DESC LIMIT 1;
    """)
    notif_row = cur.fetchone()
    print(f"Notification Sent: {notif_row}")
    if notif_row:
        assert "Escalated to Manager" in notif_row[1]

    # -------------------------------------------------------------
    print_section("5. Testing History & Manager Queue Queries")
    # -------------------------------------------------------------
    history = service.get_escalation_history(request_id=2)
    print(f"Total escalation entries for Request #2: {len(history)}")
    for h in history:
        print(f" - Log #{h['escalation_id']} | Type: {h['escalation_type']} | From: {h['from_person']} -> To: {h['to_person']} | Reason: {h['reason']}")

    manager_queue = service.get_manager_escalations(manager_id=5)
    print(f"\nManager Sanjay Kulkarni (ID 5) Pending Escalations: {len(manager_queue)}")
    for q in manager_queue:
        print(f" - Ticket #{q['request_id']} | Priority: {q['priority']} | Subject: {q['subject']} | Escalated By: {q['escalated_by']}")

    # -------------------------------------------------------------
    print_section("6. Testing Staff to Staff Peer Escalation Workflow")
    # -------------------------------------------------------------
    # Re-assign ticket #2 to Priya Patil (ID 2) for peer test
    cur.execute("UPDATE assignment SET assignment_status = 'cancelled' WHERE request_id = 2;")
    cur.execute("""
        INSERT INTO assignment (request_id, staff_id, assigned_by, assignment_status, assigned_date, due_date, remarks)
        VALUES (2, 2, NULL, 'active', NOW(), CURRENT_DATE + INTERVAL '2 days', 'Assignment for peer test')
        RETURNING assignment_id;
    """)
    conn.commit()

    # Query eligible staff for Priya Patil (ID 2)
    eligible = service.get_eligible_staff(request_id=2, from_staff_id=2)
    print(f"Eligible peer staff for Staff #2: {[s['full_name'] for s in eligible['staff']]}")
    assert eligible["success"] is True
    assert any(s["staff_id"] == 3 for s in eligible["staff"])  # Neha Joshi is available

    # Query target manager
    mgr_res = service.get_target_manager(request_id=2, from_staff_id=2)
    print(f"Target manager for Staff #2: {mgr_res['manager']['full_name']} ({mgr_res['manager']['department']})")
    assert mgr_res["success"] is True
    assert mgr_res["manager"]["staff_id"] == 5

    # Execute Staff to Staff escalation (Priya -> Neha)
    peer_res = service.escalate_to_staff(
        request_id=2,
        from_staff_id=2,
        to_staff_id=3,
        reason="Testing peer escalation to specialist Neha Joshi"
    )
    print(f"Peer Escalation Result: Success={peer_res.success} | Message='{peer_res.message}'")
    assert peer_res.success is True
    assert peer_res.to_staff_name == "Neha Joshi"

    # Verify Neha Joshi now has the active assignment
    cur.execute("SELECT staff_id, assignment_status FROM assignment WHERE assignment_id = %s;", (peer_res.new_assignment_id,))
    neha_assign = cur.fetchone()
    assert neha_assign[0] == 3
    assert neha_assign[1] == "active"

    # Test get_staff_active_requests for Neha Joshi
    neha_reqs = service.get_staff_active_requests(staff_id=3)
    print(f"Active requests for Neha Joshi (ID 3): {len(neha_reqs)}")
    assert any(r["request_id"] == 2 for r in neha_reqs)

    cur.close()
    conn.close()

    print_section("ALL TESTS COMPLETED SUCCESSFULLY!")


if __name__ == "__main__":
    run_tests()
