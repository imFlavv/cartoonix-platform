// Cartoonix Land — full-screen landing image (no navbar, no widgets, no chrome).
// Displayed at native resolution (no artificial upscaling) for maximum sharpness.
const Land = () => {
  return (
    <div data-testid="land-page" className="fixed inset-0 overflow-hidden bg-[#63b7e4]">
      <img
        src="/land/land-full.webp"
        alt="Cartoonix Land"
        draggable={false}
        className="w-full h-full object-cover object-center select-none"
      />
    </div>
  );
};

export default Land;
