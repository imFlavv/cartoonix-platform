import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingCart,
  Truck,
  PackageCheck,
  PackageX,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import PublicLayout from "@/components/PublicLayout";
import { api, mediaUrl } from "@/lib/api";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { RatingStars } from "@/components/shop/ProductCard";
import { ShopUnavailable, AdminShopPreviewBanner } from "@/components/shop/ShopUnavailable";
import { useCart, fmtPrice } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function ReviewForm({ productId, onCreated }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await api.post(`/shop/products/${productId}/reviews`, { rating, comment });
      toast.success("Recenzia ta a fost publicată. Mulțumim!");
      onCreated(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Nu am putut publica recenzia.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="review-form" className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-4">
      <h3 className="text-base font-semibold text-white">Lasă o recenzie</h3>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            data-testid={`review-star-${n}`}
            onClick={() => setRating(n)}
            className="p-0.5"
            aria-label={`${n} stele`}
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                n <= rating ? "fill-amber-400 text-amber-400" : "text-white/25 hover:text-white/50"
              }`}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Spune-ne părerea ta despre produs..."
        data-testid="review-comment-input"
        className="min-h-[90px] border-white/10 bg-white/[0.04] text-white placeholder:text-white/30"
        maxLength={1500}
      />
      <Button
        onClick={submit}
        disabled={submitting}
        data-testid="review-submit-button"
        className="rounded-full bg-amber-400 text-black font-bold hover:bg-amber-300"
      >
        {submitting ? "Se publică..." : "Publică recenzia"}
      </Button>
    </div>
  );
}

export default function ShopProductPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addItem, setDrawerOpen } = useCart();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [qty, setQty] = useState(1);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    api.get("/shop/config").then((r) => setConfig(r.data)).catch(() => {});
    api.get(`/shop/products/${id}`).then((r) => setProduct(r.data)).catch(() => setNotFound(true));
    api.get(`/shop/products/${id}/reviews`).then((r) => setReviews(r.data)).catch(() => {});
    api.get(`/shop/reviews/eligibility/${id}`).then((r) => setEligibility(r.data)).catch(() => {});
  }, [id]);

  const isAdmin = user?.role === "admin";
  const shopDisabled = config && config.shop_enabled === false;

  if (shopDisabled && !isAdmin) {
    return <ShopUnavailable message={config.shop_disabled_message} />;
  }

  if (notFound) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <p className="text-white/60">Produsul nu a fost găsit.</p>
          <Link to="/shop" className="mt-4 inline-block text-amber-400 hover:underline">
            Înapoi la shop
          </Link>
        </div>
      </PublicLayout>
    );
  }

  if (!product) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-3xl bg-white/[0.04]" />
            <div className="space-y-4">
              <div className="h-8 w-2/3 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-24 animate-pulse rounded bg-white/[0.04]" />
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const outOfStock = product.stock_enabled && product.stock <= 0;
  const maxQty = product.stock_enabled ? product.stock : 50;

  const handleAdd = () => {
    addItem(product, qty);
    toast.success(`„${product.name}” (x${qty}) a fost adăugat în coș`);
    setDrawerOpen(true);
  };

  return (
    <PublicLayout>
      {shopDisabled && isAdmin && <AdminShopPreviewBanner />}
      <div data-testid="shop-product-page" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-24">
        <Link
          to="/shop"
          data-testid="back-to-shop-link"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Înapoi la shop
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-2 lg:gap-12">
          {/* Gallery */}
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-black/40"
            >
              {product.images?.[activeImage] ? (
                <img
                  src={mediaUrl(product.images[activeImage])}
                  alt={product.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-white/20">
                  <ShoppingCart className="h-16 w-16" />
                </div>
              )}
              {product.badge && (
                <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-black">
                  {product.badge}
                </span>
              )}
            </motion.div>
            {product.images?.length > 1 && (
              <div className="mt-3 flex gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={`h-16 w-16 overflow-hidden rounded-xl border transition-colors ${
                      i === activeImage ? "border-amber-400" : "border-white/10 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={mediaUrl(img)} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-5">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
                {product.category}
              </span>
              <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {product.name}
              </h1>
              <div className="mt-2">
                {product.rating_count > 0 ? (
                  <RatingStars value={product.rating_avg} count={product.rating_count} size="h-4 w-4" />
                ) : (
                  <span className="text-xs text-white/35">Fără recenzii încă</span>
                )}
              </div>
            </div>

            <p className="text-[15px] leading-relaxed text-white/65 whitespace-pre-line">{product.description}</p>

            <div className="text-3xl font-extrabold text-amber-400" data-testid="product-detail-price">
              {fmtPrice(product.price)}
            </div>

            {product.stock_enabled && (
              <div className="text-sm">
                {outOfStock ? (
                  <span className="inline-flex items-center gap-1.5 text-red-400">
                    <PackageX className="h-4 w-4" /> Stoc epuizat
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400" data-testid="product-stock-info">
                    <PackageCheck className="h-4 w-4" /> {product.stock} bucăți în stoc
                  </span>
                )}
              </div>
            )}

            {!outOfStock && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 px-2 py-1.5">
                  <button
                    type="button"
                    data-testid="qty-minus"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="p-1.5 text-white/60 hover:text-white"
                    aria-label="Scade cantitatea"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-bold text-white" data-testid="qty-value">{qty}</span>
                  <button
                    type="button"
                    data-testid="qty-plus"
                    onClick={() => setQty(Math.min(maxQty, qty + 1))}
                    className="p-1.5 text-white/60 hover:text-white"
                    aria-label="Crește cantitatea"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <Button
                  onClick={handleAdd}
                  data-testid="product-add-to-cart"
                  className="h-12 rounded-full bg-amber-400 px-8 text-black font-bold hover:bg-amber-300 transition-transform hover:scale-[1.02]"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" /> Adaugă în coș
                </Button>
              </div>
            )}

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 flex items-center gap-3 text-sm text-white/60">
              <Truck className="h-5 w-5 shrink-0 text-amber-400" />
              <span>Livrare prin curier în toată România. Gratuit peste pragul afișat în shop.</span>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-14 max-w-3xl">
          <h2 className="text-lg font-bold text-white">
            Recenzii {reviews.length > 0 && <span className="text-white/40 font-normal">({reviews.length})</span>}
          </h2>

          <div className="mt-4 space-y-4">
            {eligibility?.can_review && (
              <ReviewForm
                productId={id}
                onCreated={(rev) => {
                  setReviews((prev) => [rev, ...prev]);
                  setEligibility((e) => ({ ...e, can_review: false, already_reviewed: true }));
                }}
              />
            )}
            {eligibility && !eligibility.purchased && (
              <p className="text-[13px] text-white/40" data-testid="review-not-purchased-note">
                Doar clienții care au cumpărat acest produs pot lăsa o recenzie.
              </p>
            )}

            {reviews.length === 0 ? (
              <p className="text-sm text-white/40">Acest produs nu are încă recenzii.</p>
            ) : (
              reviews.map((r) => (
                <div
                  key={r.id}
                  data-testid={`review-${r.id}`}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="flex items-center gap-3">
                    {r.avatar_url && (
                      <img src={mediaUrl(r.avatar_url)} alt="" className="h-8 w-8 rounded-full object-cover" />
                    )}
                    <div>
                      <p className="text-[13px] font-semibold text-white">{r.nickname}</p>
                      <RatingStars value={r.rating} />
                    </div>
                    <span className="ml-auto text-[11px] text-white/30">
                      {new Date(r.created_at).toLocaleDateString("ro-RO")}
                    </span>
                  </div>
                  {r.comment && <p className="mt-2.5 text-sm text-white/65">{r.comment}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <CartDrawer />
    </PublicLayout>
  );
}
