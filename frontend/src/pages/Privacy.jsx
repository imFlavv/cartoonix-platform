import { Link } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { LOGO_TRANSPARENT } from "@/data/constants";
import { ShieldCheck, FileText } from "lucide-react";

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="font-display text-2xl text-[#ffcc00] mb-3">{title}</h2>
    <div className="space-y-3 text-white/75 text-sm leading-relaxed">{children}</div>
  </section>
);

const Privacy = () => (
  <div className="min-h-screen bg-[#0a0a0a] text-white">
    <NavBar />
    <div className="pt-24 px-4 md:px-12 pb-16 max-w-3xl mx-auto" data-testid="privacy-page">
      <div className="flex items-center gap-3 mb-2">
        <ShieldCheck className="h-8 w-8 text-[#ec1c24]" />
        <h1 className="font-display text-4xl md:text-5xl">Politica de Confidențialitate</h1>
      </div>
      <p className="text-white/40 text-sm mb-10">Ultima actualizare: iunie 2026</p>

      <Section title="1. Introducere">
        <p>
          Confidențialitatea ta este importantă pentru noi. Această politică explică ce date colectăm,
          cum le folosim și ce drepturi ai, în conformitate cu Regulamentul General privind Protecția
          Datelor (GDPR).
        </p>
      </Section>

      <Section title="2. Datele pe care le colectăm">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Date de cont: nume/nickname, adresă de email, avatar.</li>
          <li>Date de utilizare: istoric de vizionare, favorite, playlisturi, mesaje în chat.</li>
          <li>Date tehnice: adresă IP, tip de dispozitiv și browser, pentru securitate și diagnosticare.</li>
          <li>Date de plată: procesate exclusiv de furnizorul de plăți; nu stocăm datele complete ale cardului.</li>
        </ul>
      </Section>

      <Section title="3. Scopul prelucrării">
        <p>Folosim datele tale pentru a:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>oferi și îmbunătăți serviciile Platformei;</li>
          <li>gestiona contul și abonamentul PLUS;</li>
          <li>asigura securitatea și preveni abuzurile;</li>
          <li>comunica informații importante despre serviciu.</li>
        </ul>
      </Section>

      <Section title="4. Temeiul legal">
        <p>
          Prelucrăm datele pe baza executării contractului (furnizarea serviciului), a consimțământului
          tău, a interesului nostru legitim (securitate) și a obligațiilor legale aplicabile.
        </p>
      </Section>

      <Section title="5. Cookie-uri și stocare locală">
        <p>
          Utilizăm cookie-uri și stocare locală (localStorage) pentru a menține sesiunea de
          autentificare și preferințele tale. Poți gestiona aceste opțiuni din setările browserului.
        </p>
      </Section>

      <Section title="6. Partajarea datelor">
        <p>
          Nu vindem datele tale personale. Le putem partaja doar cu furnizori de servicii care ne ajută
          să operăm Platforma (de exemplu procesatorul de plăți Stripe și serviciul de email pentru
          verificare), strict în scopurile menționate.
        </p>
      </Section>

      <Section title="7. Securitatea datelor">
        <p>
          Aplicăm măsuri tehnice și organizatorice rezonabile pentru a proteja datele tale, inclusiv
          criptarea parolelor. Cu toate acestea, nicio metodă de transmisie pe internet nu este 100%
          sigură.
        </p>
      </Section>

      <Section title="8. Drepturile tale">
        <p>Conform GDPR, ai dreptul de a:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>accesa, rectifica sau șterge datele tale;</li>
          <li>restricționa sau te opune prelucrării;</li>
          <li>solicita portabilitatea datelor;</li>
          <li>retrage consimțământul în orice moment.</li>
        </ul>
      </Section>

      <Section title="9. Păstrarea datelor">
        <p>
          Păstrăm datele tale atât timp cât contul este activ sau cât este necesar pentru a-ți oferi
          serviciile și pentru a respecta obligațiile legale.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Pentru exercitarea drepturilor tale sau pentru orice întrebare privind confidențialitatea,
          ne poți contacta prin pagina de{" "}
          <Link to="/help" className="text-[#ffcc00] hover:underline">Suport</Link>.
        </p>
        <p className="pt-2">
          Vezi și{" "}
          <Link to="/termeni" className="text-[#ffcc00] hover:underline inline-flex items-center gap-1">
            <FileText className="h-4 w-4" /> Termeni și Condiții
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

export default Privacy;
