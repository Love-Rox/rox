'use client';

import { useAtom } from 'jotai';
import { currentUserAtom } from '../../lib/atoms/auth';
import { Sidebar } from './Sidebar';

/**
 * Props for the Layout component
 */
export interface LayoutProps {
  /** Child components to render in the main content area */
  children: React.ReactNode;
  /** Whether to show the sidebar (false for login/signup pages) */
  showSidebar?: boolean;
  /** Maximum width for the content area */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

/**
 * Main layout component with Misskey-style sidebar
 * Provides consistent layout structure across authenticated pages
 */
export function Layout({ children, showSidebar = true, maxWidth = '2xl' }: LayoutProps) {
  const [currentUser] = useAtom(currentUserAtom);

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  }[maxWidth];

  // Don't show sidebar if user not logged in or explicitly disabled
  const shouldShowSidebar = showSidebar && currentUser;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      {shouldShowSidebar && <Sidebar />}

      {/* Main Content Area */}
      <main
        className={`${
          shouldShowSidebar ? 'ml-64' : ''
        } min-h-screen`}
      >
        {/* Page Content */}
        <div className="container mx-auto px-4 py-8">
          <div className={`${maxWidthClass} mx-auto`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
