import os
import sys

# Vercel runs this file from the function bundle; make `app` importable.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: E402,F401
