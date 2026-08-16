import { Link } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { LOGO_TRANSPARENT } from "@/data/constants";
import { FileText, ShieldCheck } from "lucide-react";

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="font-display text-2xl text-[#ffcc00] mb-3">{title}</h2>
    <div className="space-y-3 text-white/75 text-sm leading-relaxed">{children}</div>
  </section>
);

const Terms = () => (
  <div className="min-h-screen bg-[#0a0a0a] text-white">
    <NavBar />
    <div className="pt-24 px-4 md:px-12 pb-16 max-w-3xl mx-auto" data-testid="terms-page">
      <div className="flex items-center gap-3 mb-2">
        <FileText className="h-8 w-8 text-[#ec1c24]" />
        <h1 className="font-display text-4xl md:text-5xl">Termeni și Condiții</h1>
      </div>
      <p className="text-white/40 text-sm mb-10">Ultima actualizare: iunie 2026</p>

      <Section title="1. Acceptarea termenilor">
        <p>
          Prin accesarea și utilizarea platformei Cartoonix („Platforma”), confirmi că ai citit,
          ai înțeles și ești de acord cu prezentii Termeni și Condiții. Dacă nu ești de acord cu
          acești termeni, te rugăm să nu utilizezi Platforma.
        </p>
      </Section>

      <Section title="2. Descrierea serviciului">
        <p>
          Cartoonix este o platformă de streaming care oferă acces la desene animate din copilărie.
          Ne rezervăm dreptul de a modifica, suspenda sau întrerupe, temporar sau permanent, orice
          parte a serviciului, cu sau fără notificare prealabilă.
        </p>
      </Section>

      <Section title="3. Contul de utilizator">
        <p>
          Pentru a folosi anumite funcții este necesară crearea unui cont. Ești responsabil de
          păstrarea confidențialității datelor de autentificare și de toate activitățile desfășurate
          prin contul tău. Te obligi să furnizezi informații reale și actuale la înregistrare.
        </p>
      </Section>

      <Section title="4. Abonamentul Cartoonix PLUS și plăți">
        <p>
          Cartoonix PLUS este disponibil ca plată unică. Prețul afișat include beneficiile descrise
          la momentul achiziției. Plățile sunt procesate securizat prin furnizorul nostru de plăți
          (Stripe). Nu stocăm datele complete ale cardurilor tale.
        </p>
        <p>
          Cererile de rambursare sunt analizate în conformitate cu legislația aplicabilă privind
          protecția consumatorilor.
        </p>
      </Section>

      <Section title="5. Conținut și drepturi de autor">
        <p>
          Tot conținutul disponibil pe Platformă este protejat de legile privind drepturile de autor.
          Este interzisă copierea, distribuirea, redistribuirea sau utilizarea comercială a
          conținutului fără acordul scris al deținătorilor de drepturi.
        </p>
      </Section>

      <Section title="6. Conduita utilizatorului">
        <p>
          În secțiunile de chat și în comunitate, te obligi să nu postezi conținut ilegal, ofensator,
          abuziv sau care încalcă drepturile altora. Ne rezervăm dreptul de a modera, restricționa
          sau suspenda conturile care încalcă aceste reguli.
        </p>
      </Section>

      <Section title="7. Limitarea răspunderii">
        <p>
          Platforma este oferită „ca atare”. Nu garantăm că serviciul va fi neîntrerupt sau lipsit de
          erori. În limitele permise de lege, Cartoonix nu răspunde pentru daune indirecte rezultate
          din utilizarea sau imposibilitatea utilizării Platformei.
        </p>
      </Section>

      <Section title="8. Modificări ale termenilor">
        <p>
          Putem actualiza acești Termeni periodic. Versiunea actualizată devine efectivă la momentul
          publicării pe această pagină. Continuarea utilizării Platformei constituie acceptarea
          termenilor revizuiți.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          Pentru orice întrebare legată de acești termeni, ne poți contacta prin pagina de{" "}
          <Link to="/help" className="text-[#ffcc00] hover:underline">Suport</Link> sau pe rețelele
          noastre sociale.
        </p>
        <p className="pt-2">
          Vezi și{" "}
          <Link to="/confidentialitate" className="text-[#ffcc00] hover:underline inline-flex items-center gap-1">
            <ShieldCheck className="h-4 w-4" /> Politica de Confidențialitate
          </Link>.
        </p>
      </Section>
    </div>

    <footer className="border-t border-white/10 px-4 md:px-12 py-8 text-center">
      <img src={LOGO_TRANSPARENT} alt="Cartoonix" className="h-8 mx-auto mb-3" />
      <p className="text-xs text-white/30">© 2026 Cartoonix. Toate drepturile rezervate.</p>
    </footer>
  </div>
);

export default Terms;
