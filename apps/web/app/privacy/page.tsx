import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | GePanda',
  description: 'Privacy Policy for GePanda AI Travel Companion',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-gp-text-secondary mb-4">
        Last updated: {new Date().toLocaleDateString()}
      </p>
      <div className="prose prose-invert max-w-none space-y-4">
        <p>
          GePanda respects your privacy. We collect only what is necessary to provide the service,
          such as account information and usage data.
        </p>
        <p>
          We do not sell your personal data. Data may be used to improve the service and for
          security purposes in line with applicable privacy laws.
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
