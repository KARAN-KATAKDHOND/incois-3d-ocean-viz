"""
INCOIS Tests — Pytest Configuration
"""

import sys
from pathlib import Path

# Ensure both backend and data-pipeline are importable
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "data-pipeline"))
