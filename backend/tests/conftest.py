import asyncio
import os
import sys

import pytest

# Make `backend` importable for tests in subfolders.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


def pytest_collection_modifyitems(config, items):
    """Mark all async test functions/fixtures with pytest.mark.asyncio."""
    for item in items:
        if asyncio.iscoroutinefunction(getattr(item, "obj", None)):
            item.add_marker(pytest.mark.asyncio)
