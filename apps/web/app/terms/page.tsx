import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | GePanda',
  description: 'Terms of Service for GePanda AI Travel Companion',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
      <p className="text-gp-text-secondary mb-4">
        Last updated: {new Date().toLocaleDateString()}
      </p>
      <div className="prose prose-invert max-w-none space-y-4">
        <p>
          Welcome to GePanda. By using our service you agree to these terms. Use the app responsibly
          and in accordance with applicable laws.
        </p>
        <p>
          We may update these terms from time to time. Continued use of the service after changes
          constitutes acceptance of the updated terms.
        </p>
      </div>
      <Link
        href="/"
        className="inline-block mt-6 text-[var(--gp-primary)] hover:underline"
      >
        ← Back to app
      </Link>
    </div>
  );
}
