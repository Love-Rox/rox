import { Switch as AriaSwitch, type SwitchProps as AriaSwitchProps } from "react-aria-components";

/**
 * Props for the Switch component
 */
export interface SwitchProps extends Omit<AriaSwitchProps, "className" | "children"> {
  /** Additional CSS class names */
  className?: string;
  /** Accessible label for the switch */
  "aria-label"?: string;
}

/**
 * Accessible toggle switch component built on React Aria Components
 * Provides WAI-ARIA compliant switch with customizable styling
 *
 * @param isSelected - Whether the switch is on
 * @param onChange - Callback when switch state changes
 * @param isDisabled - Whether the switch is disabled
 * @param className - Additional CSS classes to apply
 * @param props - All other React Aria SwitchProps
 *
 * @example
 * ```tsx
 * <Switch
 *   isSelected={enabled}
 *   onChange={(enabled) => setEnabled(enabled)}
 *   aria-label="Enable notifications"
 * />
 * ```
 */
export function Switch({ className, ...props }: SwitchProps) {
  return (
    <AriaSwitch
      className={`group inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 data-selected:bg-primary-500 bg-gray-300 dark:bg-gray-600 ${className ?? ""}`}
      {...props}
    >
      <span className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform group-data-selected:translate-x-5 translate-x-0.5" />
    </AriaSwitch>
  );
}
