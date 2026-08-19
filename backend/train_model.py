import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from audit_and_retrain import run_audit_and_retrain

if __name__ == "__main__":
    run_audit_and_retrain()