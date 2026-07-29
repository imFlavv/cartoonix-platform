import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";
import { NavBar } from "@/components/NavBar";

const PaymentCancel = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="flex flex-col items-center justify-center pt-40 px-4 text-center">
        <XCircle className="w-16 h-16 text-white/40 mb-6" />
        <h1 className="text-2xl font-bold mb-2">Plată anulată</h1>
        <p className="text-white/60 mb-8 max-w-md">
          Nu ai fost taxat. Poți încerca oricând să activezi Cartoonix PLUS.
        </p>
        <button
          onClick={() => navigate("/plus")}
          className="px-8 py-3 rounded-full bg-[#ffcc00] text-black font-bold hover:bg-[#ffd633] transition"
        >
          Înapoi la PLUS
        </button>
      </div>
    </div>
  );
};

export default PaymentCancel;
