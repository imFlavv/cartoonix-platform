import React from "react";
import { Link } from "react-router-dom";
import { Star, ShoppingCart, PackageX } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import { useCart, fmtPrice } from "@/contexts/CartContext";
import { toast } from "sonner";

export function RatingStars({ value = 0, count, size = "h-3.5 w-3.5" }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-white/20"}`}
        />
      ))}
      {typeof count === "number" && (
        <span className="ml-1 text-[11px] text-white/40">({count})</span>
      )}
    </span>
  );
}

export function ProductCard({ product }) {
  const { addItem, setDrawerOpen } = useCart();
  const outOfStock = product.stock_enabled && product.stock <= 0;

  const handleAdd = (e) => {
    e.preventDefault();
    if (outOfStock) return;
    addItem(product, 1);
    toast.success(`„${product.name}” a fost adăugat în coș`);
    setDrawerOpen(true);
  };

  return (
    <Link
      to={`/shop/product/${product.id}`}
      data-testid={`product-card-${product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur transition-all duration-300 hover:border-amber-400/30 hover:bg-white/[0.05] hover:-translate-y-1"
    >
      <div className="relative aspect-square overflow-hidden bg-black/40">
        {product.images?.[0] ? (
          <img
            src={mediaUrl(product.images[0])}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/20">
            <ShoppingCart className="h-10 w-10" />
          </div>
        )}
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
            {product.badge}
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80">
              <PackageX className="h-3.5 w-3.5" /> Stoc epuizat
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-amber-400/80">
          {product.category}
        </span>
        <h3 className="text-[15px] font-semibold leading-snug text-white line-clamp-2">{product.name}</h3>
        {product.rating_count > 0 ? (
          <RatingStars value={product.rating_avg} count={product.rating_count} />
        ) : (
          <span className="text-[11px] text-white/30">Fără recenzii încă</span>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-white" data-testid={`product-price-${product.id}`}>
            {fmtPrice(product.price)}
          </span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            data-testid={`add-to-cart-${product.id}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-black transition-all hover:bg-amber-300 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
            aria-label="Adaugă în coș"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}
