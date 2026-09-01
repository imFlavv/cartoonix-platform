import { motion } from "framer-motion";
import { LOGO_AUTUMN } from "@/data/constants";

export const SplashScreen = () => {
  return (
    <div
      data-testid="splash-screen"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0a0a] overflow-hidden"
      style={{
        backgroundImage: "url('/boot-bg.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* dark overlay for readability */}
      <div className="absolute inset-0 bg-black/60" />
      {/* radial glow */}
      <div className="absolute inset-0 opacity-40" style={{
        background:
          "radial-gradient(circle at 50% 45%, rgba(236,28,36,0.25), transparent 60%)",
      }} />
      {/* floating dots */}
      {[...Array(12)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: 6 + (i % 3) * 4,
            height: 6 + (i % 3) * 4,
            background: i % 2 ? "#ffcc00" : "#ec1c24",
            left: `${(i * 83) % 100}%`,
            top: `${(i * 47) % 100}%`,
          }}
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.15 }}
        />
      ))}

      <motion.img
        src={LOGO_AUTUMN}
        alt="Cartoonix"
        className="cx-pop relative w-80 md:w-[28rem] drop-shadow-[0_10px_40px_rgba(236,28,36,0.5)]"
        data-testid="splash-logo"
      />

      <div className="relative mt-12 ml-5 md:ml-7 w-56 md:w-72 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="cx-loadbar h-full rounded-full" style={{ background: "linear-gradient(90deg,#ec1c24,#ffcc00)" }} />
      </div>
      <motion.p
        className="relative mt-5 text-sm tracking-[0.3em] text-white/50 uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Se încarcă nostalgia...
      </motion.p>
    </div>
  );
};
