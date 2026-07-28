import { PLUS_ICON, FOUNDER_BADGE } from "@/data/constants";

/**
 * Renders all badges the user is entitled to, in order:
 *   - ADMIN (Founder shield)
 *   - PLUS (gold plus)
 *   Future badges can be added below.
 *
 * Props:
 *   user: { plus, role, ...badges }
 *   size: "sm" | "md" | "lg"        (default "md")
 *   showLabel: boolean               show text label next to the badge icon
 *   className: extra classes for the wrapper
 */
export const UserBadges = ({ user, size = "md", showLabel = false, className = "" }) => {
  if (!user) return null;

  const SIZES = {
    xs: { icon: "h-3.5 w-3.5", text: "text-[10px]", gap: "gap-1" },
    sm: { icon: "h-4 w-4", text: "text-[11px]", gap: "gap-1.5" },
    md: { icon: "h-5 w-5", text: "text-xs", gap: "gap-1.5" },
    lg: { icon: "h-7 w-7", text: "text-sm", gap: "gap-2" },
    xl: { icon: "h-10 w-10", text: "text-base", gap: "gap-2" },
  };
  const s = SIZES[size] || SIZES.md;

  const badges = [];
  if (user.role === "admin") {
    badges.push({
      key: "admin",
      label: "Founder",
      title: "Cartoonix Founder / Admin",
      src: FOUNDER_BADGE,
      pillClass: "bg-gradient-to-r from-[#ec1c24]/20 to-[#ffcc00]/20 border border-[#ffcc00]/50 text-[#ffcc00]",
      iconExtra: "drop-shadow-[0_0_6px_rgba(255,204,0,0.6)]",
    });
  }
  if (user.plus) {
    badges.push({
      key: "plus",
      label: "PLUS",
      title: "Membru Cartoonix PLUS",
      src: PLUS_ICON,
      pillClass: "bg-[#ffcc00]/15 border border-[#ffcc00]/40 text-[#ffcc00]",
      iconExtra: "",
    });
  }

  if (badges.length === 0) return null;

  if (!showLabel) {
    return (
      <span className={`inline-flex items-center ${s.gap} ${className}`}>
        {badges.map((b) => (
          <img
            key={b.key}
            src={b.src}
            alt={b.label}
            title={b.title}
            draggable={false}
            className={`inline-block object-contain ${s.icon} ${b.iconExtra}`}
          />
        ))}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center flex-wrap ${s.gap} ${className}`}>
      {badges.map((b) => (
        <span
          key={b.key}
          title={b.title}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wide ${s.text} ${b.pillClass}`}
        >
          <img
            src={b.src}
            alt={b.label}
            draggable={false}
            className={`inline-block object-contain ${s.icon} ${b.iconExtra}`}
          />
          {b.label}
        </span>
      ))}
    </span>
  );
};
