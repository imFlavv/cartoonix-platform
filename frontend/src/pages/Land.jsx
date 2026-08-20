// Cartoonix Land — full-screen landing image (no navbar, no widgets, no chrome).
// Rendered at native resolution with object-cover + a slight zoom toward the center for a closer view.
const Land = () => {
  return (
    <div data-testid="land-page" className="fixed inset-0 overflow-hidden bg-[#63b7e4]">
      <img
        src="/land/land-full.webp"
        alt="Cartoonix Land"
        draggable={false}
        className="w-full h-full object-cover select-none"
        style={{ transform: "scale(1.18)", transformOrigin: "center 44%", imageRendering: "auto" }}
      />
    </div>
  );
};

export default Land;
