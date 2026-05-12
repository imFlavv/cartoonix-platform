import React from "react";
import PublicLayout from "@/components/PublicLayout";

export default function TermsPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <h1 className="font-display text-4xl tracking-wider">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: 2026</p>
        <div className="prose prose-invert dark:prose-invert mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>Welcome to Cartoonix. By creating an account or using our streaming service, you agree to these Terms and Conditions. Please read them carefully.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">1. Service description</h2>
          <p>Cartoonix is a streaming platform for classic animated cartoons from JETIX & Fox Kids, Cartoon Network, and Minimax. Content availability may vary by region.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">2. Account</h2>
          <p>You must provide accurate registration information. You are responsible for keeping your password safe. You must be at least 13 years old to use Cartoonix.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">3. Subscription plans</h2>
          <p>Cartoonix Free includes SD streaming with ads and limited daily watching. Cartoonix Plus includes ad-free Full HD streaming, playlists, downloads, and early access. Plans and pricing may change with notice.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">4. Content & copyright</h2>
          <p>All content on Cartoonix is the property of the respective rights holders. You may not copy, redistribute, or rebroadcast any content.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">5. Privacy</h2>
          <p>We collect minimal personal data necessary to deliver the service. Your email is used for verification and important account communication.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">6. Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms.</p>
          <h2 className="font-display text-2xl tracking-wider text-foreground mt-6">7. Contact</h2>
          <p>For any questions about these terms, contact us at support@cartoonix.ro.</p>
        </div>
      </section>
    </PublicLayout>
  );
}
