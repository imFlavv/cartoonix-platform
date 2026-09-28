import { useEffect, useRef, useState } from "react";
import { Cast, Tv } from "lucide-react";

// Standalone, public page to quickly test "Cast to TV" (AirPlay / Chromecast)
// with a short sample clip. No login required — open this on your phone/PC.
const CastTest = () => {
  const videoRef = useRef(null);
  const [castAvailable, setCastAvailable] = useState(false);
  const [castKind, setCastKind] = useState(null); // "airplay" | "remote" | null
  const [status, setStatus] = useState("");

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (typeof v.webkitShowPlaybackTargetPicker === "function") {
      setCastKind("airplay");
      setCastAvailable(true);
    } else if (v.remote && typeof v.remote.watchAvailability === "function") {
      setCastKind("remote");
      v.remote.watchAvailability((available) => setCastAvailable(available)).catch(() => setCastAvailable(true));
    } else if (v.remote && typeof v.remote.prompt === "function") {
      setCastKind("remote");
      setCastAvailable(true);
    }
  }, []);

  const handleCast = () => {
    const v = videoRef.current;
    if (!v) return;
    setStatus("");
    if (castKind === "airplay" && v.webkitShowPlaybackTargetPicker) {
      v.webkitShowPlaybackTargetPicker();
    } else if (v.remote?.prompt) {
      v.remote.prompt()
        .then(() => setStatus("Selector de dispozitiv afișat — alege TV-ul tău."))
        .catch(() => setStatus("Niciun dispozitiv găsit sau anulat."));
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4" data-testid="cast-test-page">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Tv className="h-6 w-6 text-[#ffcc00]" />
          <h1 className="font-display text-2xl">Test Cast pe TV</h1>
        </div>
        <p className="text-white/50 text-sm mb-6">
          Clip de test (30s). Deschide această pagină pe telefon/PC cu Chrome sau Safari,
          conectat la aceeași rețea Wi-Fi ca TV-ul/Chromecast-ul tău, apoi apasă butonul de mai jos.
        </p>

        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video mb-5 shadow-[0_0_40px_rgba(236,28,36,0.15)]">
          <video
            ref={videoRef}
            data-testid="cast-test-video"
            src="/test-cast.mp4"
            controls
            playsInline
            x-webkit-airplay="allow"
            className="w-full h-full object-contain bg-black"
          />
        </div>

        {castAvailable ? (
          <button
            type="button"
            onClick={handleCast}
            data-testid="cast-test-button"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200"
          >
            <Cast className="h-5 w-5" /> Transmite pe TV
          </button>
        ) : (
          <p className="text-white/40 text-sm" data-testid="cast-test-unavailable">
            Browser-ul tău nu suportă cast (necesită Chrome sau Safari, nu Firefox).
          </p>
        )}

        {status && <p className="mt-3 text-xs text-white/50" data-testid="cast-test-status">{status}</p>}
      </div>
    </div>
  );
};

export default CastTest;
