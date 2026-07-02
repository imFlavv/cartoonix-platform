"""Cartoonix Shop: products, Stripe checkout, orders, reviews."""
import logging
import os
import json
import random
import string
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Literal, Optional

import stripe as stripe_sdk
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field

from emergentintegrations.payments.stripe.checkout import (
    CheckoutSessionRequest,
    StripeCheckout,
)

ORDER_STATUSES = ["pending_payment", "paid", "processing", "shipped", "delivered", "cancelled"]

DEFAULT_SHOP_SETTINGS = {
    "key": "main",
    "shipping_cost": 19.99,
    "free_shipping_threshold": 200.0,
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _order_number() -> str:
    return "CX-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


# ---------- Pydantic models ----------
class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=5000)
    price: float = Field(gt=0)
    images: List[str] = []
    category: str = Field(default="Diverse", max_length=60)
    stock_enabled: bool = False
    stock: int = Field(default=0, ge=0)
    active: bool = True
    badge: Optional[str] = Field(default=None, max_length=30)


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=5000)
    price: Optional[float] = Field(default=None, gt=0)
    images: Optional[List[str]] = None
    category: Optional[str] = Field(default=None, max_length=60)
    stock_enabled: Optional[bool] = None
    stock: Optional[int] = Field(default=None, ge=0)
    active: Optional[bool] = None
    badge: Optional[str] = Field(default=None, max_length=30)


class CheckoutItem(BaseModel):
    product_id: str
    qty: int = Field(ge=1, le=50)


class ShippingInfo(BaseModel):
    full_name: str = Field(min_length=3, max_length=100)
    phone: str = Field(min_length=6, max_length=20)
    address: str = Field(min_length=5, max_length=250)
    city: str = Field(min_length=2, max_length=80)
    county: str = Field(min_length=2, max_length=80)
    postal_code: str = Field(default="", max_length=12)
    notes: str = Field(default="", max_length=500)


class CheckoutRequest(BaseModel):
    items: List[CheckoutItem] = Field(min_length=1)
    shipping: ShippingInfo
    origin_url: str


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=1500)


class OrderStatusUpdate(BaseModel):
    status: Literal["paid", "processing", "shipped", "delivered", "cancelled"]


class ShopSettingsUpdate(BaseModel):
    shipping_cost: float = Field(ge=0)
    free_shipping_threshold: float = Field(ge=0)


def attach_shop_handlers(get_current_user, require_admin, db, upload_dir: Path) -> APIRouter:
    router = APIRouter(prefix="/shop", tags=["shop"])
    shop_upload = upload_dir / "shop"
    shop_upload.mkdir(parents=True, exist_ok=True)

    def _stripe(request: Request) -> StripeCheckout:
        api_key = os.environ.get("STRIPE_API_KEY") or os.environ.get("STRIPE_SECRET_KEY")
        if not api_key:
            raise HTTPException(503, "Stripe nu este configurat pe server.")
        webhook_url = f"{str(request.base_url).rstrip('/')}/api/shop/webhook/stripe"
        return StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    async def _get_settings() -> dict:
        doc = await db.shop_settings.find_one({"key": "main"}, {"_id": 0})
        if not doc:
            await db.shop_settings.insert_one({**DEFAULT_SHOP_SETTINGS})
            doc = {**DEFAULT_SHOP_SETTINGS}
        return doc

    async def _mark_paid(session_id: str, payment_status: str, status: str):
        """Idempotently update transaction + order and decrement stock once."""
        txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if not txn:
            return None
        if txn.get("payment_status") == "paid":
            return txn  # already processed
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": payment_status, "status": status, "updated_at": _now_iso()}},
        )
        if payment_status != "paid":
            return None
        order = await db.shop_orders.find_one({"id": txn.get("order_id")}, {"_id": 0})
        if not order or order.get("payment_status") == "paid":
            return txn
        await db.shop_orders.update_one(
            {"id": order["id"]},
            {"$set": {"status": "paid", "payment_status": "paid", "updated_at": _now_iso()}},
        )
        for item in order.get("items", []):
            await db.shop_products.update_one(
                {"id": item["product_id"], "stock_enabled": True},
                {"$inc": {"stock": -item["qty"]}},
            )
        await db.shop_products.update_many({"stock_enabled": True, "stock": {"$lt": 0}}, {"$set": {"stock": 0}})
        return txn

    # ================= PUBLIC / USER =================
    @router.get("/config")
    async def shop_config():
        settings = await _get_settings()
        categories = await db.shop_products.distinct("category", {"active": True})
        return {
            "shipping_cost": settings["shipping_cost"],
            "free_shipping_threshold": settings["free_shipping_threshold"],
            "categories": sorted([c for c in categories if c]),
        }

    @router.get("/products")
    async def list_products(category: Optional[str] = None, search: Optional[str] = None, sort: str = "newest"):
        q = {"active": True}
        if category:
            q["category"] = category
        if search:
            q["name"] = {"$regex": search, "$options": "i"}
        sort_map = {
            "newest": [("created_at", -1)],
            "price_asc": [("price", 1)],
            "price_desc": [("price", -1)],
            "rating": [("rating_avg", -1)],
        }
        cursor = db.shop_products.find(q, {"_id": 0}).sort(sort_map.get(sort, sort_map["newest"]))
        return await cursor.to_list(500)

    @router.get("/products/{product_id}")
    async def get_product(product_id: str):
        p = await db.shop_products.find_one({"id": product_id, "active": True}, {"_id": 0})
        if not p:
            raise HTTPException(404, "Produsul nu a fost găsit.")
        return p

    @router.get("/products/{product_id}/reviews")
    async def list_reviews(product_id: str):
        cursor = db.shop_reviews.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1)
        return await cursor.to_list(200)

    @router.post("/products/{product_id}/reviews")
    async def create_review(product_id: str, payload: ReviewCreate, user=Depends(get_current_user)):
        p = await db.shop_products.find_one({"id": product_id}, {"_id": 0, "id": 1})
        if not p:
            raise HTTPException(404, "Produsul nu a fost găsit.")
        purchased = await db.shop_orders.find_one({
            "user_id": user["id"],
            "payment_status": "paid",
            "items.product_id": product_id,
        }, {"_id": 0, "id": 1})
        if not purchased:
            raise HTTPException(403, "Poți lăsa o recenzie doar dacă ai cumpărat acest produs.")
        existing = await db.shop_reviews.find_one({"product_id": product_id, "user_id": user["id"]}, {"_id": 0, "id": 1})
        if existing:
            raise HTTPException(409, "Ai lăsat deja o recenzie pentru acest produs.")
        review = {
            "id": str(uuid.uuid4()),
            "product_id": product_id,
            "user_id": user["id"],
            "nickname": user.get("nickname", ""),
            "avatar_url": user.get("avatar_url", ""),
            "rating": payload.rating,
            "comment": payload.comment.strip(),
            "created_at": _now_iso(),
        }
        await db.shop_reviews.insert_one({**review})
        # recompute aggregates
        all_reviews = await db.shop_reviews.find({"product_id": product_id}, {"_id": 0, "rating": 1}).to_list(1000)
        count = len(all_reviews)
        avg = round(sum(r["rating"] for r in all_reviews) / count, 2) if count else 0
        await db.shop_products.update_one({"id": product_id}, {"$set": {"rating_avg": avg, "rating_count": count}})
        return review

    @router.get("/reviews/eligibility/{product_id}")
    async def review_eligibility(product_id: str, user=Depends(get_current_user)):
        purchased = await db.shop_orders.find_one({
            "user_id": user["id"], "payment_status": "paid", "items.product_id": product_id,
        }, {"_id": 0, "id": 1})
        existing = await db.shop_reviews.find_one({"product_id": product_id, "user_id": user["id"]}, {"_id": 0, "id": 1})
        return {"can_review": bool(purchased) and not existing, "purchased": bool(purchased), "already_reviewed": bool(existing)}

    # ================= CHECKOUT =================
    @router.post("/checkout")
    async def create_checkout(payload: CheckoutRequest, request: Request, user=Depends(get_current_user)):
        settings = await _get_settings()
        items = []
        subtotal = 0.0
        for it in payload.items:
            p = await db.shop_products.find_one({"id": it.product_id, "active": True}, {"_id": 0})
            if not p:
                raise HTTPException(400, "Un produs din coș nu mai este disponibil.")
            if p.get("stock_enabled") and p.get("stock", 0) < it.qty:
                raise HTTPException(400, f"Stoc insuficient pentru „{p['name']}” (disponibil: {p.get('stock', 0)}).")
            line = round(float(p["price"]) * it.qty, 2)
            subtotal = round(subtotal + line, 2)
            items.append({
                "product_id": p["id"],
                "name": p["name"],
                "price": float(p["price"]),
                "qty": it.qty,
                "image": (p.get("images") or [""])[0],
            })
        shipping_cost = 0.0 if subtotal >= settings["free_shipping_threshold"] else float(settings["shipping_cost"])
        total = round(subtotal + shipping_cost, 2)

        order_id = str(uuid.uuid4())
        origin = payload.origin_url.rstrip("/")
        success_url = f"{origin}/shop/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin}/shop/checkout?cancelled=1"

        stripe_checkout = _stripe(request)
        session = await stripe_checkout.create_checkout_session(CheckoutSessionRequest(
            amount=float(total),
            currency="ron",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"order_id": order_id, "user_id": user["id"], "source": "cartoonix_shop"},
        ))

        order = {
            "id": order_id,
            "order_number": _order_number(),
            "user_id": user["id"],
            "user_email": user.get("email", ""),
            "user_nickname": user.get("nickname", ""),
            "items": items,
            "subtotal": subtotal,
            "shipping_cost": shipping_cost,
            "total": total,
            "currency": "RON",
            "status": "pending_payment",
            "payment_status": "pending",
            "shipping": payload.shipping.model_dump(),
            "session_id": session.session_id,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        await db.shop_orders.insert_one({**order})
        await db.payment_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": session.session_id,
            "order_id": order_id,
            "user_id": user["id"],
            "email": user.get("email", ""),
            "amount": total,
            "currency": "RON",
            "metadata": {"order_id": order_id, "source": "cartoonix_shop"},
            "status": "initiated",
            "payment_status": "pending",
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        })
        return {"url": session.url, "session_id": session.session_id, "order_id": order_id}

    @router.get("/checkout/status/{session_id}")
    async def checkout_status(session_id: str, request: Request, user=Depends(get_current_user)):
        txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if not txn:
            raise HTTPException(404, "Sesiunea de plată nu a fost găsită.")
        if txn.get("payment_status") == "paid":
            order = await db.shop_orders.find_one({"id": txn.get("order_id")}, {"_id": 0})
            return {"status": "complete", "payment_status": "paid", "order_number": order.get("order_number") if order else None}
        stripe_checkout = _stripe(request)
        try:
            cs = await stripe_checkout.get_checkout_status(session_id)
            cs_status, cs_payment_status = cs.status, cs.payment_status
        except Exception:
            try:
                # emergentintegrations metadata validation bug fallback: use SDK directly
                session = stripe_sdk.checkout.Session.retrieve(session_id)
                cs_status, cs_payment_status = session.status, session.payment_status
            except Exception as e:
                # Stripe unreachable — report stored state; webhook/polling will retry
                logging.getLogger(__name__).warning(f"[shop] checkout status retrieve failed for {session_id}: {e}")
                return {
                    "status": txn.get("status", "open"),
                    "payment_status": txn.get("payment_status", "pending"),
                    "order_number": None,
                }
        await _mark_paid(session_id, cs_payment_status, cs_status)
        order = await db.shop_orders.find_one({"id": txn.get("order_id")}, {"_id": 0})
        return {
            "status": cs_status,
            "payment_status": cs_payment_status,
            "order_number": order.get("order_number") if order else None,
        }

    @router.post("/webhook/stripe")
    async def shop_stripe_webhook(request: Request):
        body = await request.body()
        stripe_checkout = _stripe(request)
        session_id = None
        payment_status = None
        try:
            wh = await stripe_checkout.handle_webhook(body, request.headers.get("Stripe-Signature"))
            session_id, payment_status = wh.session_id, wh.payment_status
        except Exception:
            try:
                event = json.loads(body)
                obj = event.get("data", {}).get("object", {})
                if obj.get("object") == "checkout.session":
                    session_id = obj.get("id")
                    payment_status = obj.get("payment_status")
            except Exception:
                raise HTTPException(400, "Webhook invalid")
        if session_id and payment_status:
            await _mark_paid(session_id, payment_status, "complete")
        return {"received": True}

    @router.get("/orders/my")
    async def my_orders(user=Depends(get_current_user)):
        cursor = db.shop_orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
        return await cursor.to_list(200)

    # ================= ADMIN =================
    @router.post("/admin/products")
    async def admin_create_product(payload: ProductCreate, admin=Depends(require_admin)):
        product = {
            "id": str(uuid.uuid4()),
            **payload.model_dump(),
            "rating_avg": 0,
            "rating_count": 0,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        await db.shop_products.insert_one({**product})
        return product

    @router.put("/admin/products/{product_id}")
    async def admin_update_product(product_id: str, payload: ProductUpdate, admin=Depends(require_admin)):
        updates = {k: v for k, v in payload.model_dump().items() if v is not None}
        if payload.badge is None and "badge" in payload.model_fields_set:
            updates["badge"] = None
        if not updates:
            raise HTTPException(400, "Nimic de actualizat.")
        updates["updated_at"] = _now_iso()
        res = await db.shop_products.update_one({"id": product_id}, {"$set": updates})
        if res.matched_count == 0:
            raise HTTPException(404, "Produsul nu a fost găsit.")
        return await db.shop_products.find_one({"id": product_id}, {"_id": 0})

    @router.delete("/admin/products/{product_id}")
    async def admin_delete_product(product_id: str, admin=Depends(require_admin)):
        res = await db.shop_products.delete_one({"id": product_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "Produsul nu a fost găsit.")
        await db.shop_reviews.delete_many({"product_id": product_id})
        return {"deleted": True}

    @router.get("/admin/products")
    async def admin_list_products(admin=Depends(require_admin)):
        return await db.shop_products.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

    @router.post("/admin/upload")
    async def admin_upload_image(file: UploadFile = File(...), admin=Depends(require_admin)):
        ext = (file.filename or "img.png").rsplit(".", 1)[-1].lower()
        if ext not in ("png", "jpg", "jpeg", "webp", "gif"):
            raise HTTPException(400, "Format de imagine neacceptat.")
        name = f"{uuid.uuid4().hex}.{ext}"
        dest = shop_upload / name
        max_bytes = 8 * 1024 * 1024
        written = 0
        with open(dest, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                written += len(chunk)
                if written > max_bytes:
                    f.close()
                    dest.unlink(missing_ok=True)
                    raise HTTPException(413, "Imaginea depășește 8MB.")
                f.write(chunk)
        return {"url": f"/api/uploads/shop/{name}"}

    @router.get("/admin/orders")
    async def admin_list_orders(status: Optional[str] = None, admin=Depends(require_admin)):
        q = {}
        if status:
            q["status"] = status
        return await db.shop_orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)

    @router.put("/admin/orders/{order_id}/status")
    async def admin_update_order(order_id: str, payload: OrderStatusUpdate, admin=Depends(require_admin)):
        res = await db.shop_orders.update_one(
            {"id": order_id},
            {"$set": {"status": payload.status, "updated_at": _now_iso()}},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "Comanda nu a fost găsită.")
        return await db.shop_orders.find_one({"id": order_id}, {"_id": 0})

    @router.get("/admin/reviews")
    async def admin_list_reviews(admin=Depends(require_admin)):
        reviews = await db.shop_reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
        pids = list({r["product_id"] for r in reviews})
        products = await db.shop_products.find({"id": {"$in": pids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
        names = {p["id"]: p["name"] for p in products}
        for r in reviews:
            r["product_name"] = names.get(r["product_id"], "—")
        return reviews

    @router.delete("/admin/reviews/{review_id}")
    async def admin_delete_review(review_id: str, admin=Depends(require_admin)):
        review = await db.shop_reviews.find_one({"id": review_id}, {"_id": 0})
        if not review:
            raise HTTPException(404, "Recenzia nu a fost găsită.")
        await db.shop_reviews.delete_one({"id": review_id})
        pid = review["product_id"]
        all_reviews = await db.shop_reviews.find({"product_id": pid}, {"_id": 0, "rating": 1}).to_list(1000)
        count = len(all_reviews)
        avg = round(sum(r["rating"] for r in all_reviews) / count, 2) if count else 0
        await db.shop_products.update_one({"id": pid}, {"$set": {"rating_avg": avg, "rating_count": count}})
        return {"deleted": True}

    @router.get("/admin/settings")
    async def admin_get_settings(admin=Depends(require_admin)):
        return await _get_settings()

    @router.put("/admin/settings")
    async def admin_update_settings(payload: ShopSettingsUpdate, admin=Depends(require_admin)):
        await db.shop_settings.update_one(
            {"key": "main"},
            {"$set": payload.model_dump()},
            upsert=True,
        )
        return await _get_settings()

    @router.get("/admin/stats")
    async def admin_stats(admin=Depends(require_admin)):
        paid_orders = await db.shop_orders.find(
            {"payment_status": "paid"}, {"_id": 0, "total": 1, "status": 1}
        ).to_list(10000)
        revenue = round(sum(o.get("total", 0) for o in paid_orders), 2)
        by_status = {}
        async for doc in db.shop_orders.aggregate([{"$group": {"_id": "$status", "n": {"$sum": 1}}}]):
            by_status[doc["_id"]] = doc["n"]
        products_count = await db.shop_products.count_documents({})
        reviews_count = await db.shop_reviews.count_documents({})
        return {
            "revenue": revenue,
            "paid_orders": len(paid_orders),
            "orders_by_status": by_status,
            "products_count": products_count,
            "reviews_count": reviews_count,
        }

    return router
