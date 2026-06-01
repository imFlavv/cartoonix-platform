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
            Ultima actualizare: Iunie 2026
          </p>
        </header>

        <P>
          Prin accesarea platformei Cartoonix, crearea unui cont sau utilizarea
          serviciilor disponibile, confirmi că ai citit, înțeles și acceptat
          integral acești Termeni și Condiții.
        </P>
        <P>
          Dacă nu ești de acord cu acești termeni, te rugăm să nu utilizezi
          platforma.
        </P>

        <Divider />

        <H2>1. Despre Cartoonix</H2>
        <P>
          Cartoonix este o platformă online dedicată comunității nostalgice de
          animație și divertisment clasic, inspirată din perioada anilor 1990 —
          2010.
        </P>
        <P>Platforma poate include:</P>
        <UL>
          <li>colecții tematice de animație</li>
          <li>transmisii LIVE</li>
          <li>playlist-uri și favorite</li>
          <li>funcționalități comunitare</li>
          <li>elemente interactive</li>
          <li>evenimente și campanii dedicate utilizatorilor</li>
        </UL>
        <P>
          Disponibilitatea anumitor materiale sau funcționalități poate varia în
          funcție de regiune, mentenanță, limitări tehnice sau alte situații
          independente de controlul platformei.
        </P>

        <Divider />

        <H2>2. Eligibilitate și Conturi</H2>
        <P>Pentru utilizarea platformei trebuie:</P>
        <UL>
          <li>să ai minimum 13 ani împliniți</li>
          <li>să furnizezi informații reale și actualizate</li>
          <li>să păstrezi confidențialitatea contului și parolei</li>
        </UL>
        <P>
          Utilizatorul este responsabil pentru toate activitățile desfășurate
          prin contul său.
        </P>
        <P>
          Cartoonix își rezervă dreptul de a suspenda sau închide conturi care:
        </P>
        <UL>
          <li>folosesc date false</li>
          <li>desfășoară activități frauduloase</li>
          <li>afectează securitatea platformei</li>
          <li>folosesc platforma abuziv</li>
          <li>distribuie conținut malițios</li>
          <li>încearcă exploatarea sistemului</li>
        </UL>
        <P>Nu este permisă vânzarea, transferul sau partajarea conturilor.</P>

        <Divider />

        <H2>3. Programul Cartoonix PLUS și Contribuțiile Utilizatorilor</H2>
        <P>
          Cartoonix poate oferi atât acces gratuit, cât și programe opționale de
          susținere a platformei.
        </P>
        <P>
          Programul Cartoonix PLUS reprezintă o modalitate prin care
          utilizatorii pot susține dezvoltarea, infrastructura, mentenanța și
          funcționarea comunității Cartoonix.
        </P>
        <P>
          Contribuțiile efectuate pentru programul PLUS NU reprezintă:
        </P>
        <UL>
          <li>achiziția desenelor animate</li>
          <li>achiziția drepturilor asupra conținutului</li>
          <li>licențierea producțiilor media</li>
          <li>
            plata pentru acces exclusiv la materiale protejate prin drepturi de
            autor
          </li>
        </UL>
        <P>
          Planul PLUS poate include beneficii comunitare și funcționalități
          suplimentare precum:
        </P>
        <UL>
          <li>badge-uri și elemente vizuale speciale</li>
          <li>funcții de personalizare</li>
          <li>acces la evenimente comunitare</li>
          <li>participare la campanii promoționale și giveaway-uri</li>
          <li>acces prioritar la anumite funcționalități ale platformei</li>
          <li>beneficii cosmetice sau sociale în cadrul comunității</li>
        </UL>
        <P>
          Prețurile, beneficiile și disponibilitatea programului PLUS pot fi
          modificate oricând.
        </P>
        <P>
          Toate plățile sunt procesate securizat prin furnizori terți autorizați
          (ex: Stripe). Cartoonix nu stochează date complete ale cardurilor
          bancare.
        </P>

        <Divider />

        <H2>4. Politica de Rambursare</H2>
        <P>
          Contribuțiile digitale deja procesate sau utilizate pot fi considerate
          finale și nerambursabile, exceptând situațiile prevăzute de
          legislația aplicabilă.
        </P>
        <P>În anumite cazuri speciale, Cartoonix poate oferi:</P>
        <UL>
          <li>compensații promoționale</li>
          <li>prelungiri ale beneficiilor comunitare</li>
          <li>rambursări parțiale sau complete</li>
        </UL>
        <P>Acordarea acestora rămâne la discreția platformei.</P>

        <Divider />

        <H2>5. Drepturi de Autor și Proprietate Intelectuală</H2>
        <P>
          Cartoonix respectă drepturile de autor și proprietatea intelectuală.
        </P>
        <P>
          Anumite denumiri, personaje, titluri, imagini, materiale media sau
          elemente vizuale menționate ori afișate în platformă pot aparține
          titularilor lor legitimi, inclusiv:
        </P>
        <UL>
          <li>Disney</li>
          <li>Cartoon Network</li>
          <li>Warner Bros.</li>
          <li>Jetix</li>
          <li>Fox Kids</li>
          <li>Minimax</li>
          <li>sau altor proprietari și licențiatori internaționali</li>
        </UL>
        <P>
          Cartoonix nu revendică drepturi de proprietate asupra acestor mărci,
          personaje sau producții originale.
        </P>
        <P>
          Toate mărcile comerciale și materialele protejate rămân proprietatea
          titularilor lor de drept.
        </P>
        <P>
          Dacă un titular de drept consideră că anumite materiale disponibile în
          platformă îi încalcă drepturile legale, acesta poate transmite o
          solicitare oficială de analiză și eliminare a conținutului respectiv.
        </P>
        <P>
          Cartoonix își rezervă dreptul de a elimina sau restricționa accesul la
          orice material în urma unei solicitări rezonabile sau pentru
          conformitate legală.
        </P>
        <P>Utilizatorilor le este interzis:</P>
        <UL>
          <li>să copieze sau redistribuie materiale din platformă</li>
          <li>să retransmită stream-uri fără permisiune</li>
          <li>să elimine watermark-uri sau elemente de identificare</li>
          <li>
            să utilizeze conținutul în scop comercial fără acordul titularilor de
            drept
          </li>
          <li>să descarce sau arhiveze conținut prin metode neautorizate</li>
        </UL>

        <Divider />

        <H2>6. Reguli de Utilizare</H2>
        <P>
          Prin utilizarea Cartoonix, utilizatorii sunt de acord să NU:
        </P>
        <UL>
          <li>utilizeze boți, scripturi automate sau exploit-uri</li>
          <li>încerce accesarea neautorizată a serverelor</li>
          <li>distribuie malware sau conținut periculos</li>
          <li>afecteze funcționarea platformei</li>
          <li>folosească limbaj abuziv față de comunitate sau echipă</li>
          <li>
            creeze conturi multiple pentru fraudarea campaniilor sau concursurilor
          </li>
        </UL>
        <P>
          Cartoonix poate restricționa accesul anumitor utilizatori, IP-uri sau
          regiuni pentru protecția platformei.
        </P>

        <Divider />

        <H2>7. Concursuri și Campanii Promoționale</H2>
        <P>Cartoonix poate organiza:</P>
        <UL>
          <li>concursuri</li>
          <li>giveaway-uri</li>
          <li>campanii promoționale</li>
          <li>tombole</li>
          <li>evenimente speciale</li>
        </UL>
        <P>Participarea poate necesita:</P>
        <UL>
          <li>cont valid</li>
          <li>email verificat</li>
          <li>respectarea regulamentului campaniei</li>
        </UL>
        <P>
          Tentativele de fraudă pot duce la descalificare și suspendarea
          contului.
        </P>
        <P>
          Premiile pot fi înlocuite cu alternative similare în situații
          independente de voința organizatorului.
        </P>

        <Divider />

        <H2>8. Disponibilitatea Serviciului</H2>
        <P>Cartoonix nu garantează:</P>
        <UL>
          <li>funcționarea neîntreruptă a platformei</li>
          <li>lipsa erorilor</li>
          <li>compatibilitatea cu toate dispozitivele</li>
          <li>
            disponibilitatea permanentă a anumitor materiale sau funcționalități
          </li>
        </UL>
        <P>Platforma poate intra temporar în:</P>
        <UL>
          <li>mentenanță</li>
          <li>actualizări</li>
          <li>migrări de infrastructură</li>
          <li>limitări tehnice</li>
        </UL>
        <P>fără notificare prealabilă.</P>

        <Divider />

        <H2>9. Limitarea Răspunderii</H2>
        <P>Utilizarea platformei se face pe propria răspundere.</P>
        <P>Cartoonix nu poate fi tras la răspundere pentru:</P>
        <UL>
          <li>întreruperi temporare ale serviciului</li>
          <li>probleme cauzate de conexiunea utilizatorului</li>
          <li>incompatibilități software sau hardware</li>
          <li>pierderea datelor cauzată de factori externi</li>
          <li>indisponibilitatea temporară a platformei</li>
        </UL>

        <Divider />

        <H2>10. Confidențialitate și Date Personale</H2>
        <P>Cartoonix poate colecta date necesare pentru:</P>
        <UL>
          <li>funcționarea contului</li>
          <li>autentificare</li>
          <li>procesarea plăților</li>
          <li>comunicări importante</li>
          <li>prevenirea fraudei și securitate</li>
        </UL>
        <P>Datele utilizatorilor nu sunt vândute către terți.</P>
        <P>
          Prin utilizarea platformei, utilizatorul este de acord cu prelucrarea
          datelor conform politicii de confidențialitate aplicabile.
        </P>

        <Divider />

        <H2>11. Suspendarea sau Închiderea Contului</H2>
        <P>
          Cartoonix poate suspenda temporar sau permanent orice cont care:
        </P>
        <UL>
          <li>încalcă acești termeni</li>
          <li>afectează securitatea platformei</li>
          <li>utilizează metode frauduloase</li>
          <li>încearcă exploatarea sistemului</li>
          <li>afectează funcționarea comunității</li>
        </UL>
        <P>
          În anumite situații, accesul poate fi restricționat fără notificare
          prealabilă.
        </P>

        <Divider />

        <H2>12. Modificarea Termenilor</H2>
        <P>
          Cartoonix își rezervă dreptul de a modifica acești Termeni și Condiții
          oricând.
        </P>
        <P>
          Continuarea utilizării platformei după actualizare reprezintă
          acceptarea noilor termeni.
        </P>

        <Divider />

        <H2>13. Contact</H2>
        <P>
          Pentru întrebări, sesizări sau solicitări oficiale, utilizatorii pot
          contacta echipa Cartoonix prin canalele oficiale disponibile în
          platformă.
        </P>

        <Divider />

        <p className="text-center text-xs text-muted-foreground tracking-wider">
          © 2026 Cartoonix. Toate drepturile rezervate.
        </p>
      </section>
    </div>
  );
}
