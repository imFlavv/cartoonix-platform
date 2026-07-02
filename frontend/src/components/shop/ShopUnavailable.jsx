import React from "react";
import { Link } from "react-router-dom";
import { PackageX, ArrowLeft } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";

const DEFAULT_MSG = "Shop-ul este momentan indisponibil. Revenim în curând!";

export function ShopUnavailable({ message }) {
  return (
    <PublicLayout>
      <div
        data-testid="shop-unavailable"
        className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center"
      >
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/10">
          <PackageX className="h-10 w-10 text-amber-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Shop indisponibil
        </h1>
        <p className="mt-4 max-w-md whitespace-pre-line text-base text-white/60" data-testid="shop-unavailable-message">
          {message?.trim() || DEFAULT_MSG}
        </p>
        <Link
          to="/"
          data-testid="shop-unavailable-home-link"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/80 hover:bg-white/[0.08] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Înapoi la pagina principală
        </Link>
      </div>
    </PublicLayout>
  );
}

export function AdminShopPreviewBanner() {
  return (
    <div
      data-testid="shop-admin-preview-banner"
      className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-[13px] text-amber-200">
        <strong className="font-semibold">Previzualizare admin:</strong>{" "}
        Shop-ul este momentan dezactivat pentru utilizatori. Îl poți reactiva din{" "}
        <Link to="/admin/shop" className="underline underline-offset-2 hover:text-amber-100">
          Admin → Shop → Setări
        </Link>
        .
      </div>
    </div>
  );
}
