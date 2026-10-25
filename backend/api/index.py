"""
Vercel Serverless Entry Point for D.I. Khan Doctor Appointment System.
This file exposes the FastAPI app for Vercel's Python runtime.
"""

import sys
import os

# Ensure backend root is on sys.path so 'app' package is found
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from app.main import app
