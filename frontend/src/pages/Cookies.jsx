import { Link } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { LOGO_TRANSPARENT } from "@/data/constants";
import { Cookie, ShieldCheck, FileText } from "lucide-react";

const Section = ({ title, children }) => (
  <section className="mt-8">
    <h2 className="font-display text-xl md:text-2xl text-[#ffcc00] mb-3">{title}</h2>
    <div className="space-y-3 text-white/75 text-sm leading-relaxed">{children}</div>
  </section>
);

const Sub = ({ title, children }) => (
  <div className="mt-4">
    <h3 className="font-semibold text-white/90 mb-1.5">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const List = ({ items }) => (
  <ul className="list-disc pl-5 space-y-1.5 marker:text-[#ec1c24]">
    {items.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </ul>
);

const Cookies = () => (
  <div className="min-h-screen bg-[#0a0a0a] text-white">
    <NavBar />
    <div className="pt-24 px-4 md:px-8 pb-16 max-w-3xl mx-auto">
      <div
        data-testid="cookies-page"
        className="rounded-3xl border border-white/10 bg-[#0f0f0f] shadow-[0_0_60px_rgba(0,0,0,0.5)] p-6 md:p-10"
      >
        <div className="flex items-center gap-3 mb-1">
          <Cookie className="h-7 w-7 text-[#ffcc00] shrink-0" />
          <h1 className="font-display text-3xl md:text-4xl">Politică privind Cookie-urile</h1>
        </div>
        <p className="text-white/40 text-xs mb-6">Ultima actualizare: iulie 2026</p>

        <div className="space-y-3 text-white/80 text-sm leading-relaxed">
          <p className="font-semibold text-white">Bine ai venit pe Cartoonix!</p>
          <p>
            Prezenta Politică privind Cookie-urile explică ce sunt cookie-urile, cum sunt utilizate în
            cadrul platformei Cartoonix și ce opțiuni ai în ceea ce privește gestionarea acestora.
          </p>
          <p>
            Prin utilizarea platformei Cartoonix, anumite cookie-uri strict necesare pot fi stocate pe
            dispozitivul tău pentru asigurarea funcționării serviciilor. Pentru celelalte categorii de
            cookie-uri, acolo unde legislația aplicabilă o impune, îți vom solicita acordul înainte de
            utilizare.
          </p>
        </div>

        <Section title="1. Ce sunt cookie-urile?">
          <p>
            Cookie-urile sunt fișiere text de mici dimensiuni stocate pe dispozitivul tău (computer,
            telefon, tabletă sau alt dispozitiv) atunci când vizitezi un website.
          </p>
          <p>
            Acestea permit recunoașterea dispozitivului tău și contribuie la funcționarea platformei,
            îmbunătățirea experienței utilizatorului și, în anumite cazuri, la colectarea de informații
            statistice.
          </p>
          <p>
            Cookie-urile nu conțin, în mod obișnuit, programe software și nu pot executa cod sau instala
            aplicații pe dispozitivul tău.
          </p>
        </Section>

        <Section title="2. Ce tipuri de cookie-uri utilizează Cartoonix?">
          <p>Cartoonix poate utiliza următoarele categorii de cookie-uri:</p>

          <Sub title="a) Cookie-uri strict necesare">
            <p>
              Aceste cookie-uri sunt indispensabile pentru funcționarea platformei și nu pot fi
              dezactivate prin intermediul sistemelor Cartoonix. Ele pot fi utilizate pentru:
            </p>
            <List
              items={[
                "autentificarea utilizatorilor;",
                "menținerea sesiunii active;",
                "protecția împotriva atacurilor informatice;",
                "securizarea formularelor;",
                "memorarea preferințelor esențiale;",
                "echilibrarea traficului și funcționarea infrastructurii.",
              ]}
            />
            <p>
              Fără aceste cookie-uri, anumite funcționalități ale platformei nu pot funcționa
              corespunzător.
            </p>
          </Sub>

          <Sub title="b) Cookie-uri de preferințe">
            <p>
              Aceste cookie-uri permit memorarea anumitor opțiuni alese de utilizator pentru a oferi o
              experiență personalizată. Acestea pot reține, de exemplu:
            </p>
            <List
              items={[
                "limba preferată;",
                "tema aplicației;",
                "preferințele playerului video;",
                "alte setări personalizate.",
              ]}
            />
          </Sub>

          <Sub title="c) Cookie-uri de analiză și performanță">
            <p>
              Aceste cookie-uri ne ajută să înțelegem modul în care este utilizată platforma și să
              îmbunătățim serviciile oferite. Datele colectate pot include informații precum:
            </p>
            <List
              items={[
                "paginile vizitate;",
                "durata sesiunii;",
                "erori întâlnite;",
                "performanța website-ului;",
                "tipul dispozitivului și al browserului.",
              ]}
            />
            <p>Atunci când este posibil, aceste informații sunt agregate sau pseudonimizate.</p>
          </Sub>

          <Sub title="d) Cookie-uri funcționale">
            <p>
              Aceste cookie-uri permit funcționarea unor servicii suplimentare și îmbunătățesc
              experiența utilizatorului. Acestea pot fi utilizate pentru:
            </p>
            <List
              items={[
                "păstrarea autentificării;",
                "memorarea progresului în utilizarea platformei;",
                "funcționalități interactive;",
                "optimizarea încărcării conținutului.",
              ]}
            />
          </Sub>
        </Section>

        <Section title="3. Cookie-uri plasate de terți">
          <p>
            Cartoonix poate utiliza servicii furnizate de terți care pot seta propriile cookie-uri, în
            funcție de funcționalitățile active ale platformei. Aceste servicii pot include, fără a se
            limita la:
          </p>
          <List
            items={[
              "procesatori de plăți;",
              "servicii de securitate;",
              "furnizori de infrastructură și livrare a conținutului;",
              "servicii de analiză și monitorizare;",
              "furnizori de e-mail și notificări.",
            ]}
          />
          <p>Fiecare furnizor terț își gestionează propriile cookie-uri și propriile politici de confidențialitate.</p>
        </Section>

        <Section title="4. Durata de stocare a cookie-urilor">
          <p>Cartoonix poate utiliza două categorii principale de cookie-uri:</p>
          <Sub title="Cookie-uri de sesiune">
            <p>Acestea sunt șterse automat atunci când închizi browserul.</p>
          </Sub>
          <Sub title="Cookie-uri persistente">
            <p>
              Acestea rămân stocate pe dispozitiv pentru o perioadă determinată sau până când sunt
              șterse manual de utilizator.
            </p>
          </Sub>
          <p>Durata exactă diferă în funcție de scopul fiecărui cookie.</p>
        </Section>

        <Section title="5. Cum poți controla cookie-urile?">
          <p>Majoritatea browserelor permit gestionarea cookie-urilor. Poți:</p>
          <List
            items={[
              "bloca toate cookie-urile;",
              "șterge cookie-urile existente;",
              "permite doar anumite categorii;",
              "primi notificări înainte de stocarea acestora.",
            ]}
          />
          <p>
            De asemenea, dacă platforma afișează un banner de consimțământ pentru cookie-uri, îți poți
            modifica opțiunile în orice moment, în măsura în care această funcționalitate este
            disponibilă.
          </p>
          <p>Reține că dezactivarea cookie-urilor strict necesare poate afecta funcționarea normală a platformei.</p>
        </Section>

        <Section title="6. Alte tehnologii similare">
          <p>Pe lângă cookie-uri, Cartoonix poate utiliza și tehnologii similare, precum:</p>
          <List
            items={[
              "Local Storage;",
              "Session Storage;",
              "token-uri de autentificare;",
              "alte tehnologii necesare funcționării și securității platformei.",
            ]}
          />
          <p>
            Aceste tehnologii pot avea un rol similar cookie-urilor și sunt utilizate exclusiv în
            scopurile descrise în această politică și în{" "}
            <Link to="/confidentialitate" className="text-[#ffcc00] hover:underline">
              Politica de Confidențialitate
            </Link>
            .
          </p>
        </Section>

        <Section title="7. Modificarea acestei politici">
          <p>Cartoonix își rezervă dreptul de a modifica oricând prezenta Politică privind Cookie-urile.</p>
          <p>
            Versiunea actualizată va fi publicată pe platformă și va produce efecte de la data
            publicării, cu excepția cazului în care legislația aplicabilă prevede altfel.
          </p>
          <p>Te încurajăm să consulți periodic această pagină pentru a fi la curent cu eventualele modificări.</p>
        </Section>

        <Section title="8. Contact">
          <p>
            Pentru întrebări privind utilizarea cookie-urilor sau protecția datelor, ne poți contacta
            prin canalele oficiale de suport disponibile în cadrul platformei sau la adresa de e-mail:{" "}
            <a href="mailto:contact@cartoonix.ro" className="text-[#ffcc00] hover:underline">
              contact@cartoonix.ro
            </a>
          </p>
        </Section>

        <p className="mt-8 pt-6 border-t border-white/10 text-white/80 text-sm">
          Prin continuarea utilizării platformei Cartoonix, confirmi că ai luat cunoștință de prezenta
          Politică privind Cookie-urile și de modul în care sunt utilizate cookie-urile și tehnologiile
          similare, în conformitate cu legislația aplicabilă.
        </p>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/termeni" className="inline-flex items-center gap-1.5 text-[#ffcc00] hover:underline text-sm font-semibold">
            <FileText className="h-4 w-4" /> Termeni și Condiții
          </Link>
          <Link to="/confidentialitate" className="inline-flex items-center gap-1.5 text-[#ffcc00] hover:underline text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" /> Politica de Confidențialitate
          </Link>
        </div>
      </div>
    </div>

    <footer className="border-t border-white/10 px-4 md:px-12 py-8 text-center">
      <img src={LOGO_TRANSPARENT} alt="Cartoonix" className="h-8 mx-auto mb-3" />
      <p className="text-xs text-white/30">© 2026 Cartoonix. Toate drepturile rezervate.</p>
    </footer>
  </div>
);

export default Cookies;
