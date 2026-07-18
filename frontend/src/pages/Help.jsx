import { NavBar } from "@/components/NavBar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FACEBOOK_URL } from "@/data/constants";
import { Facebook, MessageCircle } from "lucide-react";

const FAQ = [
  { q: "Ce este Cartoonix?", a: "Cartoonix este platforma ta de streaming cu desenele copilăriei de pe Cartoon Network, Jetix, Minimax și Boomerang." },
  { q: "Ce include Cartoonix PLUS?", a: "PLUS îți deblochează toate episoadele, streaming fără reclame, descărcări offline și avatare exclusive, la 50 RON pe lună." },
  { q: "Cum descarc un episod?", a: "Membrii PLUS pot descărca orice episod apăsând pe iconița de descărcare din dreptul fiecărui episod." },
  { q: "Cum îmi creez un playlist?", a: "Pe pagina unui desen, apasă butonul + din dreptul unui episod și alege sau creează un playlist." },
  { q: "Pot anula abonamentul oricând?", a: "Da, abonamentul PLUS poate fi anulat oricând din pagina de Setări." },
];

const Help = () => (
  <div className="min-h-screen bg-[#0a0a0a] text-white">
    <NavBar />
    <div className="pt-24 px-4 md:px-12 pb-16 max-w-3xl mx-auto">
      <h1 className="font-display text-4xl md:text-5xl mb-2">Help Center</h1>
      <p className="text-white/50 mb-8">Întrebări frecvente și suport</p>

      <Accordion type="single" collapsible className="space-y-3">
        {FAQ.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="bg-[#0f0f0f] border border-white/10 rounded-xl px-4">
            <AccordionTrigger className="text-left font-semibold hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="text-white/70">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-10 p-6 bg-[#0f0f0f] border border-white/10 rounded-2xl">
        <h2 className="font-display text-2xl mb-3">Ai nevoie de ajutor?</h2>
        <div className="flex flex-wrap gap-3">
          <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 font-semibold transition-colors duration-200">
            <Facebook className="h-4 w-4" /> Facebook
          </a>
          <a href="https://discord.gg" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 font-semibold transition-colors duration-200">
            <MessageCircle className="h-4 w-4" /> Discord
          </a>
        </div>
      </div>
    </div>
  </div>
);

export default Help;
