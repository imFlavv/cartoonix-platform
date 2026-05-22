"""Cartoonix Staff Applications module.

Users apply to become moderators. Admins review and update status.

Storage:
  - staff_applications: id, user_id, status, answers, status_updated_at, ...

Status values: "pending" | "accepted" | "rejected"
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger("cartoonix.staff")


# ============================================================
# MODELS
# ============================================================
class StaffApplyPayload(BaseModel):
    # 1. Basic info
    age: int = Field(ge=10, le=99)
    used_since: str = Field(min_length=1, max_length=200)       # "De cât timp folosești platforma?"
    activity_level: str = Field(min_length=1, max_length=200)   # zilnic / ocazional
    social_link: Optional[str] = Field(default=None, max_length=300)  # Facebook/Instagram URL
    # 2. Motivation
    motivation: str = Field(min_length=30, max_length=2000)
    # 3. Experience
    moderation_experience: str = Field(min_length=2, max_length=2000)
    conflict_handling: str = Field(min_length=20, max_length=2000)
    # 4. Practical scenarios
    scenario_spam: str = Field(min_length=10, max_length=2000)
    scenario_toxic_joke: str = Field(min_length=10, max_length=2000)
    scenario_friend_breaks_rules: str = Field(min_length=10, max_length=2000)
    # 5. Availability
    hours_per_day: str = Field(min_length=1, max_length=200)
    time_intervals: str = Field(min_length=1, max_length=200)
    # 6. Extra (optional)
    improvements: Optional[str] = Field(default=None, max_length=2000)


class StaffStatusUpdate(BaseModel):
    status: Literal["pending", "accepted", "rejected"]
    admin_note: Optional[str] = Field(default=None, max_length=2000)


# ============================================================
# HELPERS
# ============================================================
def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _get_db():
    from server import db
    return db


def _format_application(doc: dict) -> dict:
    if not doc:
        return doc
    out = {k: v for k, v in doc.items() if k != "_id"}
    for k in ("created_at", "status_updated_at"):
        if isinstance(out.get(k), datetime):
            out[k] = out[k].isoformat()
    return out


# ============================================================
# ROUTER
# ============================================================
staff_router = APIRouter(prefix="/staff", tags=["staff"])


def attach_staff_handlers(get_current_user, require_admin):
    """Wire endpoints with auth deps to avoid circular import from server.py."""
    staff_router.routes.clear()

    # --------- USER ENDPOINTS ---------
    @staff_router.get("/me")
    async def my_application(user=Depends(get_current_user)):
        """Return current user's application (if any). Used by the /staff page."""
        db = await _get_db()
        doc = await db.staff_applications.find_one(
            {"user_id": user["id"]}, {"_id": 0}
        )
        return {"application": _format_application(doc) if doc else None}

    @staff_router.post("/apply")
    async def submit_application(
        payload: StaffApplyPayload, user=Depends(get_current_user)
    ):
        db = await _get_db()
        # Block duplicate while pending / accepted
        existing = await db.staff_applications.find_one({"user_id": user["id"]})
        if existing:
            status = existing.get("status", "pending")
            if status == "pending":
                raise HTTPException(
                    400, "Ai deja o aplicație în revizuire. Așteaptă verdictul."
                )
            if status == "accepted":
                raise HTTPException(400, "Faci deja parte din staff Cartoonix.")
            # If previously rejected, allow re-apply (overwrite the doc)

        from models import new_id

        doc = {
            "id": new_id(),
            "user_id": user["id"],
            "nickname": user.get("nickname"),
            "email": user.get("email"),
            "avatar_url": user.get("avatar_url"),
            "subscription": user.get("subscription", "free"),
            "user_created_at": user.get("created_at"),
            "status": "pending",
            "answers": payload.model_dump(),
            "admin_note": None,
            "created_at": _now(),
            "status_updated_at": _now(),
            "status_updated_by": None,
        }
        # Upsert (overwrites rejected applications cleanly)
        await db.staff_applications.update_one(
            {"user_id": user["id"]}, {"$set": doc}, upsert=True
        )
        return {"success": True, "application": _format_application(doc)}

    # --------- ADMIN ENDPOINTS ---------
    @staff_router.get("/admin/applications")
    async def admin_list_applications(
        status: Optional[Literal["pending", "accepted", "rejected", "all"]] = "all",
        limit: int = 200,
        user=Depends(require_admin),
    ):
        db = await _get_db()
        q = {}
        if status and status != "all":
            q["status"] = status
        limit = max(1, min(500, int(limit or 200)))
        items = await db.staff_applications.find(
            q, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        counts_cursor = db.staff_applications.aggregate([
            {"$group": {"_id": "$status", "n": {"$sum": 1}}}
        ])
        counts_raw = await counts_cursor.to_list(10)
        counts = {c["_id"]: c["n"] for c in counts_raw}
        return {
            "items": [_format_application(i) for i in items],
            "counts": {
                "pending": counts.get("pending", 0),
                "accepted": counts.get("accepted", 0),
                "rejected": counts.get("rejected", 0),
                "total": sum(counts.values()),
            },
        }

    @staff_router.patch("/admin/applications/{app_id}/status")
    async def admin_update_status(
        app_id: str,
        payload: StaffStatusUpdate,
        user=Depends(require_admin),
    ):
        db = await _get_db()
        existing = await db.staff_applications.find_one({"id": app_id})
        if not existing:
            raise HTTPException(404, "Aplicație inexistentă.")
        update = {
            "status": payload.status,
            "status_updated_at": _now(),
            "status_updated_by": user["id"],
        }
        if payload.admin_note is not None:
            update["admin_note"] = payload.admin_note.strip() or None
        await db.staff_applications.update_one(
            {"id": app_id}, {"$set": update}
        )
        doc = await db.staff_applications.find_one({"id": app_id}, {"_id": 0})

        # Optional: send an in-app notification to the user
        try:
            label = {
                "pending": "este în revizuire",
                "accepted": "a fost ACCEPTATĂ",
                "rejected": "a fost respinsă",
            }.get(payload.status, "a fost actualizată")
            await db.notifications.insert_one({
                "id": __import__("models").new_id(),
                "user_id": existing["user_id"],
                "title": "Aplicație Staff Cartoonix",
                "body": f"Aplicația ta pentru staff {label}.",
                "kind": "staff",
                "read": False,
                "created_at": _now(),
            })
        except Exception as e:
            logger.warning(f"staff notify failed: {e}")

        return {"success": True, "application": _format_application(doc)}

    @staff_router.get("/admin/applications/{app_id}")
    async def admin_get_application(app_id: str, user=Depends(require_admin)):
        db = await _get_db()
        doc = await db.staff_applications.find_one({"id": app_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Aplicație inexistentă.")
        return {"application": _format_application(doc)}

    return staff_router
