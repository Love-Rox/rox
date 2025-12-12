"use client";

import {
  Tab as AriaTab,
  TabList as AriaTabList,
  TabPanel as AriaTabPanel,
  Tabs as AriaTabs,
  type TabProps as AriaTabProps,
  type TabListProps as AriaTabListProps,
  type TabPanelProps as AriaTabPanelProps,
  type TabsProps as AriaTabsProps,
} from "react-aria-components";
import { type ReactNode } from "react";

/**
 * Props for the Tabs container component
 */
export interface TabsProps extends Omit<AriaTabsProps, "className"> {
  /** Additional CSS class names */
  className?: string;
  /** Content (TabList and TabPanels) */
  children: ReactNode;
}

/**
 * Accessible Tabs container built on React Aria Components
 *
 * Manages the state and relationships between TabList, Tabs, and TabPanels.
 *
 * @example
 * ```tsx
 * <Tabs selectedKey={activeTab} onSelectionChange={setActiveTab}>
 *   <TabList aria-label="Navigation">
 *     <Tab id="home">Home</Tab>
 *     <Tab id="settings">Settings</Tab>
 *   </TabList>
 *   <TabPanel id="home">Home content</TabPanel>
 *   <TabPanel id="settings">Settings content</TabPanel>
 * </Tabs>
 * ```
 */
export function Tabs({ className, children, ...props }: TabsProps) {
  return (
    <AriaTabs className={className} {...props}>
      {children}
    </AriaTabs>
  );
}

/**
 * Props for the TabList component
 */
export interface TabListProps<T extends object> extends Omit<AriaTabListProps<T>, "className"> {
  /** Additional CSS class names */
  className?: string;
}

/**
 * Accessible TabList built on React Aria Components
 *
 * Renders the list of tabs. Handles keyboard navigation (arrow keys).
 */
export function TabList<T extends object>({ className, ...props }: TabListProps<T>) {
  const baseClass = "flex gap-1 overflow-x-auto scrollbar-hide -mb-px";
  return <AriaTabList className={`${baseClass} ${className || ""}`} {...props} />;
}

/**
 * Props for the Tab component
 */
export interface TabProps extends Omit<AriaTabProps, "className"> {
  /** Additional CSS class names */
  className?: string;
  /** Tab content */
  children: ReactNode;
}

/**
 * Accessible Tab button built on React Aria Components
 *
 * Provides proper ARIA attributes and keyboard interaction automatically.
 */
export function Tab({ className, children, ...props }: TabProps) {
  return (
    <AriaTab
      className={({ isSelected, isFocusVisible }) =>
        `flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer outline-none ${
          isSelected
            ? "border-primary-500 text-primary-600 dark:text-primary-400"
            : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600"
        } ${isFocusVisible ? "ring-2 ring-primary-500 ring-offset-2" : ""} ${className || ""}`
      }
      {...props}
    >
      {children}
    </AriaTab>
  );
}

/**
 * Props for the TabPanel component
 */
export interface TabPanelProps extends Omit<AriaTabPanelProps, "className"> {
  /** Additional CSS class names */
  className?: string;
  /** Panel content */
  children: ReactNode;
}

/**
 * Accessible TabPanel built on React Aria Components
 *
 * Content panel associated with a Tab. Only visible when corresponding Tab is selected.
 */
export function TabPanel({ className, children, ...props }: TabPanelProps) {
  return (
    <AriaTabPanel className={className} {...props}>
      {children}
    </AriaTabPanel>
  );
}
