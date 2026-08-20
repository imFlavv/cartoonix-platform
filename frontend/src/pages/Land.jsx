// Cartoonix Land — full-screen landing image (no navbar, no chrome).
const Land = () => {
  return (
    <div
      data-testid="land-page"
      className="fixed inset-0 bg-[#63b7e4] bg-center bg-cover bg-no-repeat"
      style={{ backgroundImage: "url('/land/land-full.webp')" }}
    />
  );
};

export default Land;
