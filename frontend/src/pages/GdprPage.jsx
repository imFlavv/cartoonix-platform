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

function MailLink({ children }) {
  return (
    <a
      href="mailto:contact@cartoonix.ro"
      data-testid="gdpr-contact-mail"
      className="text-[hsl(var(--primary))] underline-offset-4 hover:underline transition-colors"
    >
      {children}
    </a>
  );
}

export default function GdprPage() {
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
            data-testid="gdpr-back-button"
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
            Politică de Confidențialitate (GDPR)
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Ultima actualizare: 1 Iunie 2026
          </p>
        </header>

        <P>Bine ați venit pe Cartoonix.</P>
        <P>
          Protejarea datelor dumneavoastră cu caracter personal este importantă
          pentru noi. Această Politică de Confidențialitate explică ce date
          colectăm, cum le folosim și care sunt drepturile dumneavoastră conform
          Regulamentului (UE) 2016/679 („GDPR”).
        </P>

        <Divider />

        <H2>1. Introducere</H2>
        <P>
          Această Politică de Confidențialitate descrie modul în care platforma
          Cartoonix, operată de Alban Flaviu-Ciprian PFA, colectează, utilizează
          și protejează datele personale ale utilizatorilor.
        </P>
        <P>
          Prin utilizarea platformei, sunteți de acord cu această politică și cu
          prelucrarea datelor conform prevederilor GDPR.
        </P>
        <P>
          Pentru întrebări legate de protecția datelor, ne puteți contacta la:{" "}
          <MailLink>contact@cartoonix.ro</MailLink>
        </P>

        <Divider />

        <H2>2. Date colectate</H2>
        <P>
          În funcție de modul în care utilizați platforma, putem colecta
          următoarele date:
        </P>
        <UL>
          <li>Nume utilizator</li>
          <li>Adresă de e-mail</li>
          <li>Parolă criptată</li>
          <li>Adresă IP</li>
          <li>Informații despre browser și dispozitiv</li>
          <li>Istoric de autentificare</li>
          <li>Preferințe din platformă (favorite, playlist-uri etc.)</li>
          <li>Informații legate de abonamente și plăți</li>
        </UL>
        <P>
          Plățile sunt procesate securizat prin servicii terțe precum Stripe.
          Cartoonix nu stochează date complete ale cardurilor bancare.
        </P>

        <Divider />

        <H2>3. Scopul prelucrării datelor</H2>
        <P>Datele colectate sunt utilizate pentru:</P>
        <UL>
          <li>Crearea și administrarea conturilor</li>
          <li>Oferirea accesului la funcționalitățile platformei</li>
          <li>Gestionarea abonamentelor și plăților</li>
          <li>Comunicări administrative și notificări importante</li>
          <li>Îmbunătățirea performanței și securității platformei</li>
          <li>Prevenirea fraudelor și utilizării abuzive</li>
          <li>Respectarea obligațiilor legale</li>
        </UL>

        <Divider />

        <H2>4. Temeiul legal al prelucrării</H2>
        <P>Datele sunt prelucrate în baza:</P>
        <UL>
          <li>Consimțământului utilizatorului</li>
          <li>Executării serviciilor oferite prin platformă</li>
          <li>
            Interesului legitim privind securitatea și funcționarea platformei
          </li>
          <li>Obligațiilor legale aplicabile</li>
        </UL>

        <Divider />

        <H2>5. Stocarea datelor</H2>
        <P>
          Datele sunt păstrate atât timp cât contul utilizatorului rămâne activ
          sau cât este necesar pentru respectarea obligațiilor legale și
          fiscale.
        </P>
        <P>
          Utilizatorii pot solicita ștergerea contului și a datelor asociate
          printr-un e-mail trimis la{" "}
          <MailLink>contact@cartoonix.ro</MailLink>.
        </P>

        <Divider />

        <H2>6. Divulgarea datelor către terți</H2>
        <P>
          Datele pot fi partajate doar cu furnizori necesari funcționării
          platformei, precum:
        </P>
        <UL>
          <li>Servicii de hosting</li>
          <li>Procesatori de plăți</li>
          <li>Furnizori de servicii e-mail</li>
          <li>Servicii de securitate și monitorizare</li>
        </UL>
        <P>
          Nu vindem și nu distribuim datele personale către terți în scop
          comercial.
        </P>

        <Divider />

        <H2>7. Cookie-uri</H2>
        <P>Platforma poate utiliza cookie-uri și tehnologii similare pentru:</P>
        <UL>
          <li>Autentificare și menținerea sesiunii</li>
          <li>Salvarea preferințelor utilizatorilor</li>
          <li>Analiză și performanță</li>
          <li>Funcționarea corectă a platformei</li>
        </UL>
        <P>
          Prin utilizarea platformei, sunteți de acord cu utilizarea
          cookie-urilor conform acestei politici.
        </P>

        <Divider />

        <H2>8. Drepturile utilizatorilor</H2>
        <P>Conform GDPR, utilizatorii beneficiază de următoarele drepturi:</P>
        <UL>
          <li>Dreptul de acces la date</li>
          <li>Dreptul la rectificare</li>
          <li>Dreptul la ștergerea datelor</li>
          <li>Dreptul la restricționarea prelucrării</li>
          <li>Dreptul la portabilitatea datelor</li>
          <li>Dreptul de opoziție</li>
          <li>Dreptul de a depune o plângere la autoritatea competentă</li>
        </UL>
        <P>
          Solicitările pot fi transmise la:{" "}
          <MailLink>contact@cartoonix.ro</MailLink>
        </P>

        <Divider />

        <H2>9. Securitatea datelor</H2>
        <P>
          Cartoonix implementează măsuri tehnice și organizatorice rezonabile
          pentru protejarea datelor împotriva accesului neautorizat,
          modificării, divulgării sau distrugerii acestora.
        </P>

        <Divider />

        <H2>10. Modificări ale politicii</H2>
        <P>
          Ne rezervăm dreptul de a actualiza această Politică de Confidențialitate
          în orice moment. Orice modificare va fi publicată în cadrul
          platformei.
        </P>

        <Divider />

        <H2>11. Contact</H2>
        <P>
          Pentru întrebări legate de această Politică de Confidențialitate sau
          de datele personale, ne puteți contacta la:
        </P>
        <P>
          <MailLink>contact@cartoonix.ro</MailLink>
        </P>

        <Divider />

        <p className="text-center text-xs text-muted-foreground tracking-wider">
          © 2026 Cartoonix. Toate drepturile rezervate.
        </p>
      </section>
    </div>
  );
}
