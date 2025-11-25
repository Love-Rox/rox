import '../styles/globals.css';

import { I18nProvider } from '../components/I18nProvider.js';
import { ToastContainer } from '../components/ui/Toast';

/**
 * Root layout component for the application.
 * Wraps all pages with basic HTML structure and i18n support.
 *
 * @param children - Child components to render
 * @returns Root HTML structure
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Rox - Lightweight ActivityPub Server</title>
      <I18nProvider>
        <div className="min-h-screen bg-gray-50">{children}</div>
        <ToastContainer />
      </I18nProvider>
    </>
  );
}

/**
 * Waku configuration for root layout
 * Marks this layout as statically rendered at build time
 *
 * @returns Configuration object with render mode
 */
export const getConfig = async () => {
  return {
    render: 'static',
  };
};
