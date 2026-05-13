import React from "react";
import PublicLayout from "@/components/PublicLayout";

export default function TermsPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <h1 className="font-display text-4xl tracking-wider">Termeni și Condiții</h1>
        <p className="text-sm text-muted-foreground mt-1">Ultima actualizare: 2026</p>
        <div className="prose prose-invert dark:prose-invert mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>Bine ai venit pe Cartoonix. Prin crearea unui cont sau utilizarea serviciului nostru de streaming, ești de acord cu acești Termeni și Condiții. Te rugăm să îi citești cu atenție.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">1. Descrierea serviciului</h2>
          <p>Cartoonix este o platformă de streaming pentru desene animate clasice de la JETIX & Fox Kids, Cartoon Network și Minimax. Disponibilitatea conținutului poate varia în funcție de regiune.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">2. Cont</h2>
          <p>Trebuie să furnizezi informații corecte la înregistrare. Ești responsabil pentru păstrarea parolei în siguranță. Trebuie să ai cel puțin 13 ani pentru a folosi Cartoonix.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">3. Planuri de abonament</h2>
          <p>Cartoonix Free include streaming SD cu reclame și un timp limitat de vizionare zilnic. Cartoonix Plus include streaming Full HD fără reclame, playlist-uri, descărcări și acces anticipat. Planurile și prețurile pot fi modificate cu notificare prealabilă.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">4. Conținut și drepturi de autor</h2>
          <p>Tot conținutul de pe Cartoonix este proprietatea deținătorilor de drepturi respectivi. Nu ai voie să copiezi, să redistribui sau să retransmiți niciun conținut.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">5. Confidențialitate</h2>
          <p>Colectăm doar datele personale minime necesare pentru a furniza serviciul. Adresa ta de email este folosită pentru verificare și comunicări importante legate de cont.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">6. Concursuri</h2>
          <p>Concursurile gratuite necesită doar o adresă de email validă. Pentru concursul cu plată „Disneyland Paris", fiecare bilet achiziționat reprezintă o șansă de câștig. Maxim 5 tickete per utilizator. Câștigătorii sunt anunțați automat pe email după tragerea la sorți.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">7. Încetare</h2>
          <p>Ne rezervăm dreptul de a suspenda sau închide conturile care încalcă acești termeni.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">8. Contact</h2>
          <p>Pentru orice întrebări legate de acești termeni, contactează-ne la support@cartoonix.ro.</p>
        </div>
      </section>
    </PublicLayout>
  );
}
