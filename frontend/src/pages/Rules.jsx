import { Link } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { LOGO_TRANSPARENT } from "@/data/constants";
import { Users, FileText, ShieldCheck } from "lucide-react";

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

const Rules = () => (
  <div className="min-h-screen bg-[#0a0a0a] text-white">
    <NavBar />
    <div className="pt-24 px-4 md:px-8 pb-16 max-w-3xl mx-auto">
      <div
        data-testid="rules-page"
        className="rounded-3xl border border-white/10 bg-[#0f0f0f] shadow-[0_0_60px_rgba(0,0,0,0.5)] p-6 md:p-10"
      >
        <div className="flex items-center gap-3 mb-1">
          <Users className="h-7 w-7 text-[#ffcc00] shrink-0" />
          <h1 className="font-display text-3xl md:text-4xl">Regulamentul Comunității Cartoonix</h1>
        </div>
        <p className="text-white/40 text-xs mb-6">Ultima actualizare: iulie 2026</p>

        <div className="space-y-3 text-white/80 text-sm leading-relaxed">
          <p>
            Cartoonix își propune să ofere o comunitate prietenoasă, sigură și respectuoasă pentru toți
            utilizatorii.
          </p>
          <p>
            Prin utilizarea platformei și participarea la chat, comentarii, profiluri sau orice altă
            funcționalitate comunitară, accepți prezentul Regulament al Comunității.
          </p>
          <p>
            Nerespectarea acestor reguli poate conduce la avertismente, suspendarea temporară sau
            permanentă a contului ori la restricționarea accesului la anumite funcționalități.
          </p>
        </div>

        <Section title="1. Respectul față de ceilalți">
          <p>Toți utilizatorii trebuie să se comporte într-un mod civilizat și respectuos.</p>
          <p>Nu este permis:</p>
          <List
            items={[
              "jignirea, insultarea sau hărțuirea altor utilizatori;",
              "amenințările de orice fel;",
              "intimidarea;",
              "discriminarea pe baza rasei, naționalității, etniei, religiei, sexului, orientării sexuale, identității de gen, dizabilității sau a altor criterii protejate de lege;",
              "discursul instigator la ură;",
              "provocarea intenționată a conflictelor (trolling).",
            ]}
          />
        </Section>

        <Section title="2. Limbajul utilizat">
          <p>Este permis un limbaj decent și respectuos.</p>
          <p>Nu este permisă utilizarea:</p>
          <List
            items={[
              "limbajului vulgar excesiv;",
              "insultelor repetate;",
              "amenințărilor;",
              "mesajelor menite să provoace sau să hărțuiască;",
              "mesajelor care încurajează violența.",
            ]}
          />
          <p>
            Moderatorii pot interveni chiar dacă un mesaj nu încalcă în mod expres o regulă, atunci când
            acesta afectează atmosfera comunității.
          </p>
        </Section>

        <Section title="3. Spam și flood">
          <p>Nu este permis:</p>
          <List
            items={[
              "trimiterea repetată a acelorași mesaje;",
              "flood-ul în chat;",
              "folosirea excesivă a majusculelor;",
              "spam-ul cu emoji, caractere sau simboluri;",
              "publicarea repetată a acelorași link-uri;",
              "perturbarea conversațiilor.",
            ]}
          />
        </Section>

        <Section title="4. Publicitate și promovare">
          <p>Este interzisă promovarea fără acordul Cartoonix a:</p>
          <List
            items={[
              "altor platforme;",
              "website-uri;",
              "servere Discord;",
              "grupuri de social media;",
              "aplicații;",
              "produse sau servicii;",
              "canale YouTube, Twitch sau TikTok;",
              "coduri de afiliere sau referral.",
            ]}
          />
          <p>Excepțiile pot fi aprobate în mod expres de echipa Cartoonix.</p>
        </Section>

        <Section title="5. Conținut ilegal sau nepotrivit">
          <p>Este strict interzisă publicarea sau distribuirea de conținut care:</p>
          <List
            items={[
              "încalcă legislația aplicabilă;",
              "promovează activități ilegale;",
              "conține materiale pornografice;",
              "conține nuditate explicită;",
              "promovează violența extremă;",
              "promovează terorismul sau extremismul;",
              "încurajează autovătămarea;",
              "conține programe malware sau link-uri periculoase.",
            ]}
          />
        </Section>

        <Section title="6. Drepturile de autor">
          <p>
            Nu este permisă publicarea de materiale asupra cărora nu deții drepturile necesare, atunci
            când acest lucru încalcă legislația privind drepturile de autor.
          </p>
          <p>
            La solicitarea titularilor drepturilor sau atunci când este necesar, Cartoonix poate elimina
            conținutul respectiv fără notificare prealabilă.
          </p>
        </Section>

        <Section title="7. Profilurile utilizatorilor">
          <p>
            Fotografiile de profil, numele de utilizator, descrierile și alte informații afișate public
            trebuie să respecte prezentul regulament.
          </p>
          <p>Nu sunt permise:</p>
          <List
            items={[
              "nume ofensatoare;",
              "imitarea altor persoane sau a echipei Cartoonix;",
              "utilizarea identității altor persoane fără acordul acestora;",
              "conținut obscen;",
              "imagini violente sau șocante;",
              "imagini pornografice;",
              "conținut destinat înșelării altor utilizatori.",
            ]}
          />
          <p>
            Cartoonix poate solicita modificarea profilului sau poate efectua modificări atunci când este
            necesar pentru protejarea comunității.
          </p>
        </Section>

        <Section title="8. Comentarii și chat">
          <p>Chat-ul și comentariile trebuie utilizate exclusiv pentru comunicare civilizată.</p>
          <p>Nu este permis:</p>
          <List
            items={[
              "provocarea certurilor;",
              "răspândirea intenționată de informații false;",
              "publicarea datelor personale ale altor persoane fără acord;",
              "distribuirea de conținut înșelător;",
              "încercarea de manipulare a altor utilizatori.",
            ]}
          />
        </Section>

        <Section title="9. Conturi multiple">
          <p>Crearea mai multor conturi în scopul:</p>
          <List
            items={[
              "fraudării concursurilor;",
              "evitării sancțiunilor;",
              "manipulării voturilor;",
              "perturbării comunității;",
            ]}
          />
          <p>este interzisă. Cartoonix poate suspenda toate conturile implicate.</p>
        </Section>

        <Section title="10. Securitatea platformei">
          <p>Este interzisă orice încercare de:</p>
          <List
            items={[
              "acces neautorizat;",
              "testare a vulnerabilităților fără permisiune;",
              "utilizare de boți sau scripturi automate;",
              "exploatare a erorilor platformei;",
              "afectare intenționată a funcționării serviciilor.",
            ]}
          />
          <p>Descoperirea unei vulnerabilități trebuie raportată echipei Cartoonix și nu exploatată.</p>
        </Section>

        <Section title="11. Respectarea echipei Cartoonix">
          <p>Deciziile moderatorilor și administratorilor trebuie respectate.</p>
          <p>Nu este permis:</p>
          <List
            items={[
              "hărțuirea membrilor echipei;",
              "impersonarea moderatorilor;",
              "publicarea conversațiilor private cu echipa fără acordul acesteia, dacă prin aceasta sunt încălcate drepturile altor persoane sau sunt divulgate informații confidențiale;",
              "încercarea de influențare a deciziilor prin amenințări sau șantaj.",
            ]}
          />
          <p>Dacă nu ești de acord cu o decizie, poți solicita o reanalizare prin canalele oficiale de suport.</p>
        </Section>

        <Section title="12. Raportarea încălcărilor">
          <p>Orice utilizator poate raporta conținut sau comportamente care încalcă prezentul regulament.</p>
          <p>Echipa Cartoonix va analiza fiecare raport și poate lua măsurile pe care le consideră necesare.</p>
          <p>
            Transmiterea repetată de raportări false sau cu rea-credință poate conduce la aplicarea de
            sancțiuni.
          </p>
        </Section>

        <Section title="13. Sancțiuni">
          <p>
            În funcție de gravitatea încălcării, Cartoonix poate aplica una sau mai multe dintre
            următoarele măsuri:
          </p>
          <List
            items={[
              "avertisment verbal sau scris;",
              "ștergerea mesajelor sau comentariilor;",
              "eliminarea conținutului publicat;",
              "restricționarea temporară a accesului la chat sau alte funcționalități;",
              "suspendarea temporară a contului;",
              "suspendarea permanentă a contului;",
              "blocarea accesului de pe anumite adrese IP sau dispozitive, atunci când este necesar pentru protejarea platformei.",
            ]}
          />
          <p>
            Aplicarea unei sancțiuni nu exclude posibilitatea luării unor măsuri suplimentare dacă
            utilizatorul continuă să încalce regulamentul.
          </p>
        </Section>

        <Section title="14. Interpretarea regulamentului">
          <p>Nu este posibilă enumerarea tuturor comportamentelor nepermise.</p>
          <p>
            Cartoonix își rezervă dreptul de a lua măsuri și în situații care nu sunt prevăzute expres în
            prezentul regulament, atunci când apreciază în mod rezonabil că un comportament afectează
            securitatea platformei, buna funcționare a serviciilor sau experiența comunității.
          </p>
          <p>
            Deciziile vor fi luate cu bună-credință, ținând cont de gravitatea situației și de
            circumstanțele concrete.
          </p>
        </Section>

        <Section title="15. Modificarea regulamentului">
          <p>Cartoonix poate actualiza prezentul Regulament al Comunității ori de câte ori este necesar.</p>
          <p>
            Versiunea actualizată va fi publicată pe platformă și va intra în vigoare la data publicării,
            cu excepția cazului în care legislația aplicabilă prevede altfel.
          </p>
          <p>Continuarea utilizării platformei după publicarea modificărilor reprezintă acceptarea acestora.</p>
        </Section>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-x-6 gap-y-2">
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

export default Rules;
