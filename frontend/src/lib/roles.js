// Rank titles (după numărul de mesaje pe chat) și badge-uri de rol (permisiuni/status).

export const rankTitle = (count) => {
  const c = Number(count) || 0;
  if (c >= 2000) return "Legendă Cartoonix";
  if (c >= 800) return "Super Fan";
  if (c >= 300) return "Veteran";
  if (c >= 100) return "Membru Avansat";
  if (c >= 25) return "Membru Activ";
  return "Membru";
};

const PILL = "inline-flex items-center rounded-full px-1.5 py-[1px] text-[9px] font-extrabold uppercase tracking-wide leading-none";

// Un singur badge, în ordinea priorității: FONDATOR > ADMIN > MODERATOR > PLUS > DONATOR.
export const roleBadge = (entity) => {
  if (!entity) return null;
  const role = entity.role;
  if (role === "founder") return { label: "FONDATOR", cls: `${PILL} bg-gradient-to-r from-amber-400 to-yellow-500 text-black` };
  if (role === "admin") return { label: "ADMIN", cls: `${PILL} bg-[#ec1c24] text-white` };
  if (role === "moderator") return { label: "MODERATOR", cls: `${PILL} bg-[#3b82f6] text-white` };
  if (entity.plus) return { label: "PLUS", cls: `${PILL} bg-[#a855f7] text-white` };
  if (entity.donor) return { label: "DONATOR", cls: `${PILL} bg-[#ec4899] text-white` };
  return null;
};
