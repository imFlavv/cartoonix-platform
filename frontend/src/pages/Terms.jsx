import { Link } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { LOGO_TRANSPARENT } from "@/data/constants";
import { FileText, ShieldCheck } from "lucide-react";

const Section = ({ title, children }) => (
  <section className="mt-8">
    <h2 className="font-display text-xl md:text-2xl text-[#ffcc00] mb-3">{title}</h2>
    <div className="space-y-3 text-white/75 text-sm leading-relaxed">{children}</div>
  </section>
);

const List = ({ items }) => (
  <ul className="list-disc pl-5 space-y-1.5 marker:text-[#ec1c24]">
    {items.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </ul>
);

const Terms = () => (
  <div className="min-h-screen bg-[#0a0a0a] text-white">
    <NavBar />
    <div className="pt-24 px-4 md:px-8 pb-16 max-w-3xl mx-auto">
      <div
        data-testid="terms-page"
        className="rounded-3xl border border-white/10 bg-[#0f0f0f] shadow-[0_0_60px_rgba(0,0,0,0.5)] p-6 md:p-10"
      >
        <div className="flex items-center gap-3 mb-1">
          <FileText className="h-7 w-7 text-[#ffcc00] shrink-0" />
          <h1 className="font-display text-3xl md:text-4xl">Termeni și Condiții</h1>
        </div>
        <p className="text-white/40 text-xs mb-6">Ultima actualizare: iunie 2026</p>

        <div className="space-y-3 text-white/80 text-sm leading-relaxed">
          <p className="font-semibold text-white">Bine ai venit pe Cartoonix!</p>
          <p>
            Prin accesarea website-ului, crearea unui cont sau utilizarea oricăror servicii și
            funcționalități oferite de Cartoonix, confirmi că ai citit, ai înțeles și accepți în
            totalitate acești Termeni și Condiții.
          </p>
          <p>
            Dacă nu ești de acord cu oricare dintre prevederile acestui document, te rugăm să nu
            utilizezi platforma.
          </p>
        </div>

        <Section title="1. Definiții">
          <p>În cadrul acestor Termeni și Condiții:</p>
          <List
            items={[
              "Cartoonix reprezintă platforma online, website-ul, aplicațiile și serviciile asociate.",
              "Platforma reprezintă toate serviciile, funcționalitățile și conținutul oferit prin Cartoonix.",
              "Utilizator reprezintă orice persoană care accesează sau utilizează platforma.",
              "Cont reprezintă profilul creat de utilizator în cadrul Cartoonix.",
              "Cartoonix PLUS reprezintă programul opțional de susținere a platformei care oferă anumite beneficii și funcționalități suplimentare.",
            ]}
          />
        </Section>

        <Section title="2. Despre Cartoonix">
          <p>
            Cartoonix este o platformă online dedicată comunității pasionate de animație, divertisment
            și nostalgia producțiilor clasice. Platforma poate include, fără a se limita la:
          </p>
          <List
            items={[
              "colecții tematice;",
              "transmisiuni LIVE;",
              "playlist-uri;",
              "favorite;",
              "profiluri de utilizator;",
              "funcționalități sociale;",
              "chat și interacțiuni între utilizatori;",
              "evenimente și campanii promoționale;",
              "funcții premium;",
              "alte funcționalități dezvoltate ulterior.",
            ]}
          />
          <p>
            Disponibilitatea anumitor servicii sau funcționalități poate varia în funcție de regiune,
            mentenanță, actualizări tehnice, restricții legale sau alte situații independente de
            controlul Cartoonix.
          </p>
        </Section>

        <Section title="3. Eligibilitate">
          <p>Pentru utilizarea platformei este necesar:</p>
          <List
            items={[
              "să ai cel puțin 13 ani împliniți sau vârsta minimă prevăzută de legislația aplicabilă în jurisdicția ta;",
              "să furnizezi informații reale și actualizate;",
              "să utilizezi platforma în conformitate cu legea și cu acești Termeni.",
            ]}
          />
          <p>Prin utilizarea platformei declari că îndeplinești aceste condiții.</p>
        </Section>

        <Section title="4. Contul de utilizator">
          <p>Utilizatorul este responsabil pentru:</p>
          <List
            items={[
              "păstrarea confidențialității parolei;",
              "securitatea contului;",
              "toate activitățile desfășurate prin intermediul contului său.",
            ]}
          />
          <p>Nu este permisă:</p>
          <List
            items={[
              "vânzarea conturilor;",
              "închirierea conturilor;",
              "transferarea conturilor;",
              "partajarea conturilor cu alte persoane.",
            ]}
          />
          <p>
            În cazul în care suspectezi acces neautorizat asupra contului tău, trebuie să informezi
            Cartoonix cât mai curând posibil.
          </p>
        </Section>

        <Section title="5. Cartoonix PLUS">
          <p>
            Cartoonix PLUS este un program opțional prin care utilizatorii pot susține dezvoltarea,
            infrastructura, mentenanța și funcționarea platformei.
          </p>
          <p>
            Achiziționarea Cartoonix PLUS reprezintă o plată unică, iar beneficiile sunt acordate pe
            durata existenței și funcționării programului Cartoonix PLUS, conform prezentelor Termeni
            și Condiții.
          </p>
          <p>Beneficiile pot include:</p>
          <List
            items={[
              "funcționalități premium;",
              "elemente cosmetice;",
              "badge-uri speciale;",
              "personalizare suplimentară;",
              "acces anticipat la anumite funcționalități;",
              "participarea la evenimente comunitare;",
              "alte beneficii care pot fi introduse în viitor.",
            ]}
          />
          <p>
            Cartoonix poate modifica, adăuga sau elimina beneficii ale programului PLUS pentru a
            îmbunătăți experiența utilizatorilor.
          </p>
          <p>Achiziționarea Cartoonix PLUS nu reprezintă:</p>
          <List
            items={[
              "cumpărarea desenelor animate;",
              "cumpărarea drepturilor asupra conținutului;",
              "dobândirea unei licențe asupra materialelor media;",
              "achiziționarea drepturilor de autor;",
              "plata pentru acces exclusiv la opere protejate prin drepturi de autor.",
            ]}
          />
        </Section>

        <Section title="6. Plăți">
          <List
            items={[
              "Toate plățile sunt procesate prin furnizori de plăți terți autorizați.",
              "Cartoonix nu stochează datele complete ale cardurilor bancare.",
              "Prețurile afișate pot fi modificate pentru achizițiile viitoare, fără a afecta tranzacțiile deja finalizate.",
            ]}
          />
        </Section>

        <Section title="7. Rambursări">
          <p>Rambursările sunt acordate în conformitate cu legislația aplicabilă.</p>
          <p>
            În măsura permisă de lege, plățile efectuate pentru servicii digitale deja activate sau
            utilizate pot fi considerate finale și nerambursabile.
          </p>
          <p>În situații excepționale, Cartoonix poate acorda, la propria discreție:</p>
          <List
            items={[
              "rambursări totale;",
              "rambursări parțiale;",
              "compensații;",
              "prelungirea anumitor beneficii.",
            ]}
          />
        </Section>

        <Section title="8. Drepturi de autor și proprietate intelectuală">
          <p>Cartoonix respectă drepturile de autor și drepturile de proprietate intelectuală.</p>
          <p>
            Mărcile comerciale, personajele, denumirile, imaginile și alte materiale protejate aparțin
            titularilor lor legitimi. Prezența unor astfel de elemente în cadrul platformei nu implică
            existența unei relații de afiliere, parteneriat sau aprobare între Cartoonix și titularii
            respectivelor drepturi.
          </p>
          <p>
            Dacă un titular al drepturilor consideră că un material disponibil prin intermediul
            platformei îi încalcă drepturile, acesta poate transmite o notificare care să conțină cel
            puțin:
          </p>
          <List
            items={[
              "identificarea materialului;",
              "dovada drepturilor invocate;",
              "locația (URL-ul) conținutului;",
              "datele de contact.",
            ]}
          />
          <p>
            Cartoonix poate analiza solicitarea și poate restricționa sau elimina conținutul respectiv
            atunci când apreciază că este necesar pentru respectarea legislației aplicabile.
          </p>
        </Section>

        <Section title="9. Reguli de utilizare">
          <p>Utilizatorii se obligă să NU:</p>
          <List
            items={[
              "utilizeze boți sau scripturi automate;",
              "încerce accesarea neautorizată a sistemelor;",
              "exploateze vulnerabilități;",
              "distribuie malware;",
              "distribuie viruși sau alte programe malițioase;",
              "desfășoare activități frauduloase;",
              "facă spam;",
              "promoveze phishing sau înșelătorii;",
              "publice conținut ilegal;",
              "publice conținut violent sau pornografic;",
              "publice conținut care instigă la ură ori discriminare;",
              "hărțuiască alți utilizatori;",
              "divulge informațiile personale ale altor persoane fără acordul acestora;",
              "afecteze funcționarea platformei;",
              "creeze conturi multiple pentru fraudarea concursurilor sau campaniilor.",
            ]}
          />
          <p>
            Cartoonix poate suspenda, restricționa sau închide orice cont care încalcă aceste reguli.
          </p>
        </Section>

        <Section title="10. Conținut publicat de utilizatori">
          <p>Utilizatorul rămâne titularul drepturilor asupra conținutului publicat de acesta.</p>
          <p>
            Prin publicarea conținutului în cadrul Cartoonix, utilizatorul acordă Cartoonix o licență
            neexclusivă, gratuită și limitată la afișarea, stocarea și distribuirea acestuia în cadrul
            platformei, în măsura necesară funcționării serviciilor.
          </p>
          <p>
            Cartoonix își rezervă dreptul de a elimina orice conținut care încalcă legea, acești
            Termeni sau regulile comunității.
          </p>
        </Section>

        <Section title="11. Concursuri și campanii promoționale">
          <p>Cartoonix poate organiza:</p>
          <List
            items={[
              "concursuri;",
              "giveaway-uri;",
              "campanii promoționale;",
              "tombole;",
              "evenimente speciale.",
            ]}
          />
          <p>Participarea poate necesita:</p>
          <List items={["cont valid;", "adresă de e-mail verificată;", "respectarea regulamentului fiecărei campanii."]} />
          <p>Tentativele de fraudă pot conduce la descalificare și suspendarea contului.</p>
        </Section>

        <Section title="12. Disponibilitatea serviciului">
          <p>Cartoonix nu garantează:</p>
          <List
            items={[
              "funcționarea neîntreruptă a platformei;",
              "lipsa erorilor;",
              "compatibilitatea cu toate dispozitivele;",
              "disponibilitatea permanentă a anumitor funcționalități sau materiale.",
            ]}
          />
          <p>Platforma poate intra în mentenanță, actualizări sau modificări fără notificare prealabilă.</p>
          <p>Cartoonix poate modifica, suspenda sau elimina orice funcționalitate în orice moment.</p>
        </Section>

        <Section title="13. Limitarea răspunderii">
          <p>Platforma este oferită „ca atare” și „în limita disponibilității”.</p>
          <p>În măsura permisă de lege, Cartoonix nu răspunde pentru:</p>
          <List
            items={[
              "întreruperi temporare;",
              "indisponibilitatea serviciului;",
              "probleme ale conexiunii utilizatorului;",
              "incompatibilități software sau hardware;",
              "pierderea datelor;",
              "atacuri informatice;",
              "defecțiuni ale furnizorilor terți;",
              "evenimente de forță majoră;",
              "orice prejudicii indirecte rezultate din utilizarea sau imposibilitatea utilizării platformei.",
            ]}
          />
        </Section>

        <Section title="14. Confidențialitate">
          <p>Cartoonix poate prelucra date necesare pentru:</p>
          <List
            items={[
              "administrarea conturilor;",
              "autentificare;",
              "procesarea plăților;",
              "securitatea platformei;",
              "prevenirea fraudei;",
              "comunicări importante.",
            ]}
          />
          <p>
            Prelucrarea datelor cu caracter personal este realizată conform{" "}
            <Link to="/confidentialitate" className="text-[#ffcc00] hover:underline">
              Politicii de Confidențialitate
            </Link>
            , care face parte integrantă din acești Termeni și Condiții.
          </p>
          <p>Cartoonix nu vinde datele personale ale utilizatorilor către terți.</p>
        </Section>

        <Section title="15. Suspendarea sau închiderea contului">
          <p>Cartoonix poate suspenda temporar sau permanent orice cont care:</p>
          <List
            items={[
              "încalcă acești Termeni;",
              "afectează securitatea platformei;",
              "desfășoară activități frauduloase;",
              "încearcă exploatarea sistemelor;",
              "afectează funcționarea comunității.",
            ]}
          />
          <p>
            Suspendarea unui cont nu conferă automat dreptul la despăgubiri sau rambursări, cu excepția
            situațiilor prevăzute de legislația aplicabilă.
          </p>
        </Section>

        <Section title="16. Forța majoră">
          <p>
            Cartoonix nu răspunde pentru neexecutarea obligațiilor cauzată de evenimente independente
            de controlul său, inclusiv, fără a se limita la, dezastre naturale, incendii, conflicte
            armate, întreruperi majore ale rețelelor de comunicații, atacuri informatice de amploare,
            acte ale autorităților sau alte evenimente de forță majoră.
          </p>
        </Section>

        <Section title="17. Modificarea Termenilor">
          <p>Cartoonix își rezervă dreptul de a modifica oricând acești Termeni și Condiții.</p>
          <p>
            Versiunea actualizată va fi publicată pe platformă și va produce efecte de la data
            publicării, cu excepția cazului în care legislația aplicabilă impune o altă modalitate de
            informare.
          </p>
          <p>
            Continuarea utilizării platformei după intrarea în vigoare a modificărilor reprezintă
            acceptarea acestora.
          </p>
        </Section>

        <Section title="18. Legea aplicabilă">
          <p>
            Acești Termeni și Condiții sunt interpretați în conformitate cu legislația aplicabilă
            utilizatorului, în măsura în care aceasta este obligatorie. În celelalte cazuri, orice
            litigiu va fi soluționat potrivit legislației stabilite de operatorul platformei și de
            instanțele competente, fără a aduce atingere drepturilor consumatorilor prevăzute de lege.
          </p>
        </Section>

        <Section title="19. Contact">
          <p>
            Pentru întrebări, sesizări sau solicitări oficiale privind platforma, utilizatorii pot
            contacta echipa Cartoonix prin canalele oficiale de suport puse la dispoziție în cadrul
            platformei sau prin adresa de e-mail afișată pe website.
          </p>
        </Section>

        <p className="mt-8 pt-6 border-t border-white/10 text-white/80 text-sm font-semibold">
          Prin utilizarea Cartoonix, confirmi că ai citit, ai înțeles și accepți integral acești
          Termeni și Condiții.
        </p>

        <div className="mt-6">
          <Link
            to="/confidentialitate"
            className="inline-flex items-center gap-1.5 text-[#ffcc00] hover:underline text-sm font-semibold"
          >
            <ShieldCheck className="h-4 w-4" /> Vezi Politica de Confidențialitate
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

export default Terms;
