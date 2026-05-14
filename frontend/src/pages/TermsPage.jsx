import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

function H2({ children }) {
  return (
    <h2 className="font-display text-2xl sm:text-3xl tracking-wider text-foreground mt-10 mb-3">
      {children}
    </h2>
  );
}

function H3({ children }) {
  return (
    <h3 className="font-display text-lg tracking-wide text-foreground mt-5 mb-2">
      {children}
    </h3>
  );
}

function P({ children }) {
  return <p className="text-sm leading-relaxed text-muted-foreground mb-3">{children}</p>;
}

function UL({ children }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground marker:text-[hsl(var(--primary))] mb-4">
      {children}
    </ul>
  );
}

function Divider() {
  return <div className="my-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />;
}

export default function TermsPage() {
  const navigate = useNavigate();
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-14 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            data-testid="terms-back-button"
            className="-ml-2 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Înapoi
          </Button>
        </div>
      </div>
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[hsl(var(--primary))] mb-3">
            <span className="h-px w-8 bg-[hsl(var(--primary))]/60" />
            Cartoonix · Documente legale
            <span className="h-px w-8 bg-[hsl(var(--primary))]/60" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wider">
            Termeni și Condiții
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Ultima actualizare: Mai 2026
          </p>
        </header>

        <P>
          Bine ai venit pe Cartoonix. Prin accesarea platformei, crearea unui
          cont sau utilizarea serviciilor oferite de Cartoonix, confirmi că ai
          citit, înțeles și acceptat integral acești Termeni și Condiții.
        </P>
        <P>
          Dacă nu ești de acord cu acești termeni, te rugăm să nu utilizezi platforma.
        </P>

        <Divider />

        <H2>1. Despre Cartoonix</H2>
        <P>
          Cartoonix este o platformă online de streaming dedicată desenelor
          animate clasice și conținutului nostalgic inspirat din perioada anilor
          1990 — 2010, incluzând categorii precum:
        </P>
        <UL>
          <li>Cartoon Network</li>
          <li>Jetix & Fox Kids</li>
          <li>Minimax</li>
          <li>alte colecții tematice disponibile în platformă</li>
        </UL>
        <P>Platforma poate include:</P>
        <UL>
          <li>episoade disponibile la cerere</li>
          <li>transmisii LIVE programate</li>
          <li>reclame clasice recreate sau arhivate</li>
          <li>playlist-uri personalizate</li>
          <li>conținut exclusiv pentru abonați</li>
        </UL>
        <P>
          Disponibilitatea conținutului poate varia în funcție de regiune,
          licențiere, mentenanță sau alte limitări tehnice.
        </P>

        <Divider />

        <H2>2. Eligibilitate și Conturi</H2>
        <P>Pentru utilizarea platformei trebuie:</P>
        <UL>
          <li>să ai minimum 13 ani împliniți</li>
          <li>să furnizezi informații reale și actualizate</li>
          <li>să păstrezi confidențialitatea credențialelor contului</li>
        </UL>
        <P>Ești responsabil pentru toate activitățile realizate prin contul tău.</P>
        <P>Cartoonix își rezervă dreptul de a suspenda sau închide conturile:</P>
        <UL>
          <li>false</li>
          <li>frauduloase</li>
          <li>inactive pe termen lung</li>
          <li>utilizate abuziv</li>
          <li>implicate în distribuirea ilegală de conținut</li>
        </UL>
        <P>Nu este permisă vânzarea, partajarea sau transferul conturilor către alte persoane.</P>

        <Divider />

        <H2>3. Abonamente și Plăți</H2>
        <P>Cartoonix poate oferi atât acces gratuit, cât și planuri premium.</P>

        <H3>Cartoonix Free</H3>
        <P>Poate include:</P>
        <UL>
          <li>streaming SD</li>
          <li>acces limitat la anumite episoade</li>
          <li>reclame</li>
          <li>limitări de timp sau funcționalitate</li>
        </UL>

        <H3>Cartoonix Plus</H3>
        <P>Poate include:</P>
        <UL>
          <li>streaming Full HD / 4K unde este disponibil</li>
          <li>conținut fără reclame</li>
          <li>acces anticipat</li>
          <li>playlist-uri personalizate</li>
          <li>descărcări offline</li>
          <li>acces la evenimente speciale sau concursuri exclusive</li>
        </UL>

        <P>
          Prețurile, beneficiile și disponibilitatea planurilor pot fi
          modificate oricând, cu notificare prealabilă.
        </P>
        <P>
          Toate plățile sunt procesate securizat prin furnizori terți autorizați
          (ex: Stripe). Cartoonix nu stochează date complete ale cardurilor bancare.
        </P>

        <Divider />

        <H2>4. Politica de Rambursare</H2>
        <P>
          Abonamentele digitale deja activate sau utilizate pot fi
          nerambursabile, exceptând cazurile prevăzute de legislația aplicabilă.
        </P>
        <P>În cazul unor probleme tehnice majore confirmate de echipa Cartoonix, pot fi oferite:</P>
        <UL>
          <li>prelungiri de abonament</li>
          <li>credite promoționale</li>
          <li>rambursări parțiale sau complete</li>
        </UL>

        <Divider />

        <H2>5. Drepturi de Autor și Licențiere Conținut</H2>
        <P>
          Cartoonix respectă legislația privind drepturile de autor și
          proprietatea intelectuală.
        </P>
        <P>
          Anumite desene animate, personaje, denumiri comerciale, elemente
          vizuale sau materiale media disponibile în platformă pot aparține
          unor companii, studiouri sau deținători de drepturi precum:
        </P>
        <UL>
          <li>Disney</li>
          <li>Jetix</li>
          <li>Fox Kids</li>
          <li>Cartoon Network</li>
          <li>Warner Bros.</li>
          <li>Minimax</li>
          <li>sau altor proprietari/licențiatori internaționali</li>
        </UL>
        <P>
          Cartoonix nu revendică drepturi de proprietate asupra acestor
          producții originale, personaje sau mărci comerciale, acolo unde
          acestea aparțin titularilor de drept legitimi.
        </P>
        <P>
          Conținutul disponibil în platformă este furnizat exclusiv în baza
          acordurilor, licențelor, permisiunilor sau drepturilor aplicabile de
          utilizare și difuzare, acolo unde este necesar conform legislației în
          vigoare.
        </P>
        <P>
          Toate mărcile comerciale, logo-urile, titlurile și materialele
          protejate rămân proprietatea titularilor lor de drept.
        </P>
        <P>Utilizatorilor le este strict interzis:</P>
        <UL>
          <li>să copieze conținutul</li>
          <li>să redistribuie episoadele</li>
          <li>să descarce sau retransmită stream-urile fără permisiune</li>
          <li>să publice conținutul pe alte platforme</li>
          <li>să elimine watermark-uri sau elemente de identificare</li>
          <li>să utilizeze conținutul în scop comercial fără acordul titularilor de drept</li>
        </UL>
        <P>
          Orice încălcare poate conduce la suspendarea permanentă a contului
          și, dacă este cazul, la acțiuni legale conform legislației aplicabile.
        </P>

        <Divider />

        <H2>6. Reguli de Utilizare</H2>
        <P>Prin utilizarea Cartoonix, ești de acord să NU:</P>
        <UL>
          <li>folosești boți, scripturi automate sau exploit-uri</li>
          <li>încerci accesarea neautorizată a serverelor</li>
          <li>distribui malware sau conținut periculos</li>
          <li>afectezi funcționarea platformei</li>
          <li>folosești limbaj abuziv față de echipă sau comunitate</li>
          <li>creezi conturi multiple pentru abuzarea concursurilor sau ofertelor</li>
        </UL>
        <P>
          Cartoonix poate limita accesul anumitor utilizatori, IP-uri sau
          regiuni pentru protecția platformei.
        </P>

        <Divider />

        <H2>7. Concursuri și Tombole</H2>
        <P>Cartoonix poate organiza periodic:</P>
        <UL>
          <li>concursuri gratuite</li>
          <li>giveaway-uri</li>
          <li>tombole promoționale</li>
          <li>campanii cu premii</li>
        </UL>
        <P>Participarea poate necesita:</P>
        <UL>
          <li>cont valid</li>
          <li>email verificat</li>
          <li>respectarea regulamentului campaniei</li>
        </UL>
        <P>Pentru tombolele cu participare plătită:</P>
        <UL>
          <li>fiecare ticket reprezintă o șansă individuală de câștig</li>
          <li>există o limită maximă de participare per utilizator unde este specificat</li>
          <li>plățile sunt finale după emiterea ticketului</li>
          <li>tentativele de fraudă duc la descalificare automată</li>
        </UL>
        <P>Câștigătorii pot fi contactați prin:</P>
        <UL>
          <li>email</li>
          <li>telefon</li>
          <li>anunț public pe platformă sau rețele sociale</li>
        </UL>
        <P>
          Dacă un câștigător nu răspunde într-un termen rezonabil, Cartoonix
          își rezervă dreptul de a selecta alt câștigător.
        </P>
        <P>
          Premiile pot fi modificate cu unele de valoare similară în situații
          excepționale independente de voința organizatorului.
        </P>

        <Divider />

        <H2>8. Disponibilitatea Serviciului</H2>
        <P>
          Deși depunem toate eforturile pentru funcționarea continuă a
          platformei, Cartoonix nu garantează:
        </P>
        <UL>
          <li>funcționarea neîntreruptă</li>
          <li>lipsa erorilor</li>
          <li>compatibilitatea cu toate dispozitivele</li>
          <li>disponibilitatea permanentă a anumitor episoade</li>
        </UL>
        <P>Platforma poate intra temporar în:</P>
        <UL>
          <li>mentenanță</li>
          <li>actualizări</li>
          <li>limitări tehnice</li>
          <li>migrări de infrastructură</li>
        </UL>
        <P>fără notificare prealabilă.</P>

        <Divider />

        <H2>9. Limitarea Răspunderii</H2>
        <P>Cartoonix nu poate fi tras la răspundere pentru:</P>
        <UL>
          <li>pierderi indirecte</li>
          <li>întreruperi temporare ale serviciului</li>
          <li>probleme cauzate de conexiunea utilizatorului</li>
          <li>incompatibilități software sau hardware</li>
          <li>pierderea datelor cauzată de factori externi</li>
        </UL>
        <P>Utilizarea platformei se face pe propria răspundere.</P>

        <Divider />

        <H2>10. Confidențialitate și Date Personale</H2>
        <P>Cartoonix colectează doar datele necesare pentru:</P>
        <UL>
          <li>funcționarea contului</li>
          <li>autentificare</li>
          <li>procesarea plăților</li>
          <li>comunicări importante</li>
          <li>securitate și prevenirea fraudei</li>
        </UL>
        <P>Datele utilizatorilor nu sunt vândute către terți.</P>
        <P>
          Prin utilizarea platformei, ești de acord cu prelucrarea datelor
          conform Politicii de Confidențialitate.
        </P>

        <Divider />

        <H2>11. Suspendarea sau Închiderea Contului</H2>
        <P>Cartoonix poate suspenda temporar sau permanent orice cont care:</P>
        <UL>
          <li>încalcă acești termeni</li>
          <li>afectează securitatea platformei</li>
          <li>folosește metode frauduloase</li>
          <li>încearcă exploatarea sistemului</li>
        </UL>
        <P>În anumite cazuri, accesul poate fi restricționat fără notificare prealabilă.</P>

        <Divider />

        <H2>12. Modificarea Termenilor</H2>
        <P>Cartoonix își rezervă dreptul de a modifica acești Termeni și Condiții oricând.</P>
        <P>Modificările importante vor fi afișate pe platformă sau comunicate prin email.</P>
        <P>Continuarea utilizării serviciului după actualizare reprezintă acceptarea noilor termeni.</P>

        <Divider />

        <H2>13. Contact</H2>
        <P>Pentru întrebări, sesizări sau solicitări oficiale:</P>
        <div className="rounded-xl border border-border bg-card/60 p-5 mt-2 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Email:</span>
            <a
              href="mailto:support@cartoonix.ro"
              className="text-[hsl(var(--primary))] hover:underline"
              data-testid="terms-contact-email"
            >
              support@cartoonix.ro
            </a>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-muted-foreground">Website:</span>
            <a
              href="https://cartoonix.ro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[hsl(var(--primary))] hover:underline"
              data-testid="terms-contact-website"
            >
              https://cartoonix.ro
            </a>
          </div>
        </div>

        <Divider />

        <p className="text-center text-xs text-muted-foreground tracking-wider">
          © 2026 Cartoonix. Toate drepturile rezervate.
        </p>
      </section>
    </div>
  );
}
