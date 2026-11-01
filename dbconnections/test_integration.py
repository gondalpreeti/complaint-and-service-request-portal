"""
End-to-End Integration Test for Complaint Status Updates and Escalation Modules
================================================================================
Validates complete lifecycle integration with existing database and team architecture:
  1. Ticket Setup & Assignment (Team 1 & 2 flow)
  2. Status Transition: Assigned -> In Progress (complaints & service_request sync)
  3. Escalation: Staff -> Manager with priority elevation and escalation_logs audit
  4. Status Transition: In Progress -> Completed / Resolved with notes & assignment closure
  5. Status Transition: Completed -> Closed
  6. Escalation KPI metrics for Team 3 Dashboard
"""

import datetime
from connections import get_connection
from status_manager import ComplaintStatusManager, ComplaintStatus
from escalation import EscalationService


def print_banner(text: str):
    print("\n" + "=" * 68)
    print(f"  {text.upper()}")
    print("=" * 68)


def run_integration_tests():
    status_mgr = ComplaintStatusManager()
    esc_service = EscalationService()
    
    conn = get_connection()
    if not conn:
        print("[Error] Could not connect to database.")
        return
    cur = conn.cursor()

    print_banner("1. Setting up Test Complaint & Service Request")

    # Step 1: Ensure we have a valid test user
    cur.execute("SELECT user_id FROM users LIMIT 1;")
    user_row = cur.fetchone()
    test_user_id = user_row[0] if user_row else None
    print(f"Using user_id: {test_user_id}")

    # Insert a test complaint (simulating Team 1 React submission)
    cur.execute("""
        INSERT INTO complaints (user_id, category_id, subject, description, status, details)
        VALUES (%s, 8, 'E2E Test: Electrical Short Circuit in Lab', 'Power tripping repeatedly during practicals.', 'Pending', '{}'::jsonb)
        RETURNING complaint_id;
    """, (test_user_id,))
    test_complaint_id = cur.fetchone()[0]

    # Insert a test service request with medium priority (simulating Team 2 priority keyword check)
    cur.execute("""
        INSERT INTO service_request (complaint_id, category_id, priority_status, status)
        VALUES (%s, 8, 'medium'::priority_status_enum, 'assigned'::status_enum)
        RETURNING request_id;
    """, (test_complaint_id,))
    test_request_id = cur.fetchone()[0]

    # Assign to Staff Priya Patil (ID: 2) with active status (simulating Team 2 round-robin assignment)
    cur.execute("""
        INSERT INTO assignment (request_id, staff_id, assigned_by, assignment_status, assigned_date, due_date, remarks)
        VALUES (%s, 2, NULL, 'active', NOW(), CURRENT_DATE + INTERVAL '2 days', 'Assigned via workload balancing')
        RETURNING assignment_id;
    """, (test_request_id,))
    test_assignment_id = cur.fetchone()[0]
    conn.commit()

    print(f" Created Test Complaint #{test_complaint_id} -> Service Request #{test_request_id}")
    print(f" Initial Assignment #{test_assignment_id} active under Staff Priya Patil (ID: 2)")

    # -----------------------------------------------------------------
    print_banner("2. Testing Status Transition: Assigned -> In Progress")
    # -----------------------------------------------------------------
    start_res = status_mgr.start_progress(
        request_id=test_request_id,
        staff_id=2,
        notes="Inspected switchboard; capacitor replacement initiated."
    )
    start_res.print_summary()
    assert start_res.success is True

    # Verify database synchronization
    cur.execute("SELECT status FROM service_request WHERE request_id = %s;", (test_request_id,))
    sr_status = cur.fetchone()[0]
    cur.execute("SELECT status FROM complaints WHERE complaint_id = %s;", (test_complaint_id,))
    cmp_status = cur.fetchone()[0]
    cur.execute("SELECT remarks FROM assignment WHERE assignment_id = %s;", (test_assignment_id,))
    assign_remarks = cur.fetchone()[0]

    print(f"Database Verification:")
    print(f" - service_request.status: '{sr_status}' (expected: 'in progress')")
    print(f" - complaints.status:      '{cmp_status}' (expected: 'In Progress')")
    print(f" - assignment.remarks:     '{assign_remarks}'")
    assert sr_status == "in progress"
    assert cmp_status == "In Progress"
    assert "In Progress" in assign_remarks

    # -----------------------------------------------------------------
    print_banner("3. Testing Staff to Manager Escalation")
    # -----------------------------------------------------------------
    # Staff cannot resolve without manager authorization -> escalates to manager
    esc_res = esc_service.escalate_to_manager(
        request_id=test_request_id,
        from_staff_id=2,
        reason="Requires transformer inspection and budget approval from departmental manager.",
        elevate_priority=True
    )
    esc_res.print_summary()
    assert esc_res.success is True
    assert esc_res.escalation_id is not None
    assert esc_res.new_assignment_id is not None

    # Verify old assignment reassigned and manager assignment active
    cur.execute("SELECT assignment_status FROM assignment WHERE assignment_id = %s;", (test_assignment_id,))
    old_status = cur.fetchone()[0]
    cur.execute("""
        SELECT staff_id, assignment_status, due_date, remarks 
        FROM assignment WHERE assignment_id = %s;
    """, (esc_res.new_assignment_id,))
    mgr_assign = cur.fetchone()

    cur.execute("SELECT priority_status FROM service_request WHERE request_id = %s;", (test_request_id,))
    elevated_priority = cur.fetchone()[0]

    cur.execute("SELECT escalation_type, status, priority_before, priority_after FROM escalation_logs WHERE escalation_id = %s;", (esc_res.escalation_id,))
    esc_log_row = cur.fetchone()

    print(f"Database Verification Post-Escalation:")
    print(f" - Old Staff Assignment:     Status='{old_status}' (expected: 'reassigned')")
    print(f" - Manager Assignment:       StaffID={mgr_assign[0]}, Status='{mgr_assign[1]}', DueDate={mgr_assign[2]}")
    print(f" - Priority Elevation:       {elevated_priority} (expected: 'high')")
    print(f" - Escalation Log:           Type={esc_log_row[0]}, Status={esc_log_row[1]}, Shift={esc_log_row[2]}->{esc_log_row[3]}")

    assert old_status == "reassigned"
    assert mgr_assign[0] == 5 # Sanjay Kulkarni (Manager)
    assert mgr_assign[1] == "active"
    assert elevated_priority == "high"
    assert esc_log_row[0] == "staff_to_manager"

    # -----------------------------------------------------------------
    print_banner("4. Testing Manager Resolution & Status Transition to Completed")
    # -----------------------------------------------------------------
    # Manager reviews and resolves the issue
    resolve_res = status_mgr.resolve_complaint(
        request_id=test_request_id,
        resolved_by_staff_id=5, # Resolved by Manager Sanjay Kulkarni
        resolution_notes="Transformer coils replaced and safety fuse upgraded. Lab circuit restored."
    )
    resolve_res.print_summary()
    assert resolve_res.success is True

    # Verify database state after resolution
    cur.execute("SELECT status FROM service_request WHERE request_id = %s;", (test_request_id,))
    sr_status_resolved = cur.fetchone()[0]
    cur.execute("SELECT status FROM complaints WHERE complaint_id = %s;", (test_complaint_id,))
    cmp_status_resolved = cur.fetchone()[0]
    cur.execute("SELECT assignment_status, remarks FROM assignment WHERE assignment_id = %s;", (esc_res.new_assignment_id,))
    mgr_assign_final = cur.fetchone()
    cur.execute("SELECT status, resolution_notes FROM escalation_logs WHERE escalation_id = %s;", (esc_res.escalation_id,))
    esc_log_final = cur.fetchone()

    print(f"Database Verification Post-Resolution:")
    print(f" - service_request.status:   '{sr_status_resolved}' (expected: 'completed')")
    print(f" - complaints.status:        '{cmp_status_resolved}' (expected: 'Resolved')")
    print(f" - Manager Assignment:       Status='{mgr_assign_final[0]}' (expected: 'completed')")
    print(f" - Escalation Log:           Status='{esc_log_final[0]}' (expected: 'resolved')")
    print(f" - Resolution Notes:         '{esc_log_final[1]}'")

    assert sr_status_resolved == "completed"
    assert cmp_status_resolved == "Resolved"
    assert mgr_assign_final[0] == "completed"
    assert esc_log_final[0] == "resolved"

    # -----------------------------------------------------------------
    print_banner("5. Testing Complaint Closure")
    # -----------------------------------------------------------------
    close_res = status_mgr.close_complaint(
        request_id=test_request_id,
        closing_remarks="Student confirmed power stability. Ticket closed."
    )
    close_res.print_summary()
    assert close_res.success is True

    cur.execute("SELECT status FROM service_request WHERE request_id = %s;", (test_request_id,))
    assert cur.fetchone()[0] == "closed"
    cur.execute("SELECT status FROM complaints WHERE complaint_id = %s;", (test_complaint_id,))
    assert cur.fetchone()[0] == "Closed"

    # -----------------------------------------------------------------
    print_banner("6. Checking Notifications & Dashboard Stats Integration")
    # -----------------------------------------------------------------
    # Check notifications dispatched during lifecycle
    cur.execute("""
        SELECT notification_id, title, message, notification_type
        FROM notifications
        WHERE complaint_id = %s
        ORDER BY created_at ASC;
    """, (test_complaint_id,))
    notifs = cur.fetchall()
    print(f"Total Notifications dispatched for Complaint #{test_complaint_id}: {len(notifs)}")
    for n in notifs:
        print(f" - [{n[3]}] {n[1]}: {n[2]}")
    assert len(notifs) >= 3 # in progress, escalation, resolution, closure

    # Check dashboard escalation metrics
    stats = esc_service.get_escalation_stats()
    print(f"\nLive Dashboard Escalation KPI Stats:")
    print(f" - Total Escalations:    {stats['total_escalations']}")
    print(f" - Open Escalations:     {stats['open_escalations']}")
    print(f" - Resolved Escalations: {stats['resolved_escalations']}")
    assert stats["total_escalations"] > 0
    assert stats["resolved_escalations"] > 0

    cur.close()
    conn.close()

    print_banner("ALL INTEGRATION TESTS PASSED 100% SUCCESSFULLY!")


if __name__ == "__main__":
    run_integration_tests()
