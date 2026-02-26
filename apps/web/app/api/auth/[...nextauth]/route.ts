import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Ensure this route is always handled as dynamic on Vercel (avoids 404)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

