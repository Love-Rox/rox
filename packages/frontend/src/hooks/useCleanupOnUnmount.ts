import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Hook to track component mount state and prevent state updates after unmount.
 *
 * Returns a ref that is true while mounted and false after unmount.
 * Use this to guard setState calls in async operations.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isMounted = useIsMounted();
 *
 *   useEffect(() => {
 *     fetchData().then(data => {
 *       if (isMounted.current) {
 *         setData(data);
 *       }
 *     });
 *   }, []);
 * }
 * ```
 */
export function useIsMounted() {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}

/**
 * Hook to run cleanup function synchronously before component unmounts.
 *
 * Uses a layout effect cleanup to run before DOM removal during unmount,
 * ensuring deterministic cleanup order.
 *
 * @param cleanup - Cleanup function to run before unmount
 */
export function useBeforeUnmount(cleanup: () => void) {
  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;

  useLayoutEffect(() => {
    return () => {
      cleanupRef.current();
    };
  }, []);
}
