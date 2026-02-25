import { Suspense } from 'react';
import SignupPageClient from './SignupPageClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SignupPageClient />
    </Suspense>
  );
}
