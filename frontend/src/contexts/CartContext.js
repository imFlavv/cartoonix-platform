import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "cartoonix_cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, qty = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product_id === product.id);
      const maxStock = product.stock_enabled ? product.stock : Infinity;
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: Math.min(next[idx].qty + qty, maxStock) };
        return next;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          image: (product.images || [])[0] || "",
          qty: Math.min(qty, maxStock),
          stock_enabled: !!product.stock_enabled,
          stock: product.stock ?? 0,
        },
      ];
    });
  };

  const setQty = (productId, qty) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.product_id !== productId)
        : prev.map((i) => (i.product_id === productId ? { ...i, qty } : i))
    );
  };

  const removeItem = (productId) => setItems((prev) => prev.filter((i) => i.product_id !== productId));
  const clearCart = () => setItems([]);

  const subtotal = useMemo(
    () => Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100,
    [items]
  );
  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, setQty, removeItem, clearCart, subtotal, count, drawerOpen, setDrawerOpen }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

export const fmtPrice = (v) => `${Number(v || 0).toFixed(2)} lei`;
