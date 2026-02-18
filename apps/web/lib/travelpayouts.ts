/**
 * Travelpayouts server-only helper.
 * Use only in Server Components, API routes, or server actions.
 * TRAVELPAYOUTS_TOKEN must NEVER be exposed to the browser.
 */
if (typeof window !== 'undefined') {
  throw new Error('travelpayouts.ts can only be imported on the server');
}
export function getTravelpayoutsToken() {
  return process.env.TRAVELPAYOUTS_TOKEN || '';
}

export function getTravelpayoutsMarker() {
  return process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER || '613624';
}

export function assertTravelpayoutsConfigured() {
  const token = getTravelpayoutsToken();

  if (!token || token.trim() === '') {
    throw new Error(
      'Travelpayouts API token is missing. Add TRAVELPAYOUTS_TOKEN to .env.local'
    );
  }
}
