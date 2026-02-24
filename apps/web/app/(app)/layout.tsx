/**
 * App Route Group Layout
 * Ensures styles and providers are available for all app routes
 * This layout wraps (app) group routes and inherits from root layout
 */
import 'stream-chat-react/dist/css/v2/index.css';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout inherits from root layout.tsx
  // No need to duplicate Providers or styles here
  return <>{children}</>;
}

