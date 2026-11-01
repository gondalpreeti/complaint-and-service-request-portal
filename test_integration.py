"""
Root-level test runner for Complaint & Service Portal integration tests.
Allows running `python test_integration.py` directly from the workspace root.
"""
import os
import sys

# Ensure dbconnections directory is on path and loaded as working directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DBCONN_DIR = os.path.join(BASE_DIR, "dbconnections")

if DBCONN_DIR not in sys.path:
    sys.path.insert(0, DBCONN_DIR)

os.chdir(DBCONN_DIR)

from test_integration import run_integration_tests

if __name__ == "__main__":
    run_integration_tests()
