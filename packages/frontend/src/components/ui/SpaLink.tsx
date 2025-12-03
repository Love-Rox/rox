"use client";

/**
 * SPA Link Component
 *
 * Wraps Waku's Link component for client-side navigation without full page reloads.
 * Provides a drop-in replacement for standard anchor tags with SPA behavior.
 *
 * @module components/ui/SpaLink
 */

import { Link } from "waku";
import type { ReactNode, ComponentProps } from "react";

/**
 * Props for SpaLink component
 */
export interface SpaLinkProps extends Omit<ComponentProps<"a">, "href"> {
  /** Target URL path */
  to: string;
  /** Child elements */
  children: ReactNode;
  /** Whether to prefetch on hover (for dynamic routes) */
  prefetchOnEnter?: boolean;
}

/**
 * SPA Link Component
 *
 * Uses Waku's Link component for soft navigation that doesn't require
 * a full page reload. Automatically prefetches routes for faster navigation.
 *
 * @example
 * ```tsx
 * <SpaLink to="/timeline" className="nav-link">
 *   Home
 * </SpaLink>
 * ```
 */
export function SpaLink({ to, children, prefetchOnEnter, className, ...props }: SpaLinkProps) {
  // Cast to 'any' to bypass Waku's strict route typing
  // This allows dynamic routes like user profiles (/:username)
  return (
    <Link
      to={to as `/${string}`}
      className={className}
      unstable_prefetchOnEnter={prefetchOnEnter}
      {...props}
    >
      {children}
    </Link>
  );
}

/**
 * Hook for programmatic navigation
 *
 * Re-exports Waku's useRouter for convenience
 */
export { useRouter } from "waku";
