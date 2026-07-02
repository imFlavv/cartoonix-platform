import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Truck, Package, Sparkles, ReceiptText } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/shop/ProductCard";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { fmtPrice } from "@/contexts/CartContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    api.get("/shop/config").then((r) => setConfig(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params = {};
      if (category) params.category = category;
      if (search.trim()) params.search = search.trim();
      if (sort) params.sort = sort;
      api
        .get("/shop/products", { params })
        .then((r) => setProducts(r.data))
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [category, search, sort]);

  const categories = useMemo(() => config?.categories || [], [config]);

  return (
    <PublicLayout>
      <div data-testid="shop-page" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent mt-6 mb-8">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative px-6 py-10 sm:px-10 sm:py-14">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">
              <Sparkles className="h-3 w-3" /> Oficial
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Shop <span className="text-amber-400">Cartoonix</span>
            </h1>
            <p className="mt-3 max-w-xl text-base text-white/60">
              Figurine printate 3D, accesorii și obiecte de colecție inspirate din universul Cartoonix.
              Fiecare piesă este creată cu grijă pentru fanii adevărați.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {config && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] text-white/70">
                  <Truck className="h-4 w-4 text-amber-400" />
                  Livrare gratuită peste {fmtPrice(config.free_shipping_threshold)}
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] text-white/70">
                <Package className="h-4 w-4 text-amber-400" /> Printat & asamblat manual
              </span>
              <Link
                to="/shop/orders"
                data-testid="shop-my-orders-link"
                className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[13px] font-semibold text-amber-300 hover:bg-amber-400/20 transition-colors"
              >
                <ReceiptText className="h-4 w-4" /> Comenzile mele
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="shop-category-all"
              onClick={() => setCategory("")}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                !category
                  ? "bg-amber-400 text-black"
                  : "border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              Toate
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                data-testid={`shop-category-${c}`}
                onClick={() => setCategory(category === c ? "" : c)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  category === c
                    ? "bg-amber-400 text-black"
                    : "border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex flex-1 items-center gap-2 sm:justify-end">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Caută produse..."
                data-testid="shop-search-input"
                className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] pl-9 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400/40"
              />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-10 w-[160px] rounded-full border-white/10 bg-white/[0.04] text-sm text-white/80" data-testid="shop-sort-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Cele mai noi</SelectItem>
                <SelectItem value="price_asc">Preț crescător</SelectItem>
                <SelectItem value="price_desc">Preț descrescător</SelectItem>
                <SelectItem value="rating">Cele mai apreciate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] py-20 text-center">
            <Package className="h-12 w-12 text-white/15" />
            <p className="text-white/50">Nu am găsit produse pentru filtrele selectate.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            data-testid="shop-products-grid"
          >
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </motion.div>
        )}
      </div>
      <CartDrawer />
    </PublicLayout>
  );
}
