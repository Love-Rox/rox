import { useState, useRef, useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Search, Settings, Plus, Globe } from "lucide-react";
import { PageHeader, type PageHeaderTab, type PageHeaderAction } from "../PageHeader";

const meta = {
  title: "UI/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  args: {
    title: "Page Title",
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Basic header with title only. */
export const SimpleTitle: Story = {
  args: {
    title: "Search",
  },
};

/** Header with subtitle. */
export const WithSubtitle: Story = {
  args: {
    title: "Timeline",
    subtitle: "View your latest posts and updates",
  },
};

/** Header with icon. */
export const WithIcon: Story = {
  args: {
    title: "Search",
    subtitle: "Find users, notes, and more",
    icon: <Search className="w-6 h-6" />,
  },
};

/** Header with tab navigation. */
export const WithTabs: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState("local");
    const tabs: PageHeaderTab[] = [
      { key: "local", label: "Local" },
      { key: "global", label: "Global", icon: <Globe className="w-4 h-4" /> },
      { key: "social", label: "Social" },
    ];
    return (
      <PageHeader title="Timeline" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    );
  },
};

/** Header with action buttons. */
export const WithActions: Story = {
  render: () => {
    const actions: PageHeaderAction[] = [
      {
        key: "create",
        label: "New Post",
        icon: <Plus className="w-4 h-4" />,
        onPress: () => {},
        variant: "primary",
      },
      {
        key: "settings",
        label: "Settings",
        icon: <Settings className="w-4 h-4" />,
        onPress: () => {},
        variant: "secondary",
      },
    ];
    return <PageHeader title="Dashboard" actions={actions} />;
  },
};

/** Header with back navigation. */
export const WithBackButton: Story = {
  args: {
    title: "Note Detail",
    backHref: "/timeline",
    backLabel: "Back",
  },
};

/** Header with reload functionality. */
export const WithReload: Story = {
  render: () => {
    const [isReloading, setIsReloading] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => () => clearTimeout(timeoutRef.current), []);
    return (
      <PageHeader
        title="Timeline"
        showReload
        isReloading={isReloading}
        onReload={() => {
          setIsReloading(true);
          timeoutRef.current = setTimeout(() => setIsReloading(false), 1500);
        }}
      />
    );
  },
};

/** All features combined. */
export const FullFeatured: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState("local");
    const [isReloading, setIsReloading] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => () => clearTimeout(timeoutRef.current), []);
    const tabs: PageHeaderTab[] = [
      { key: "local", label: "Local" },
      { key: "global", label: "Global", icon: <Globe className="w-4 h-4" /> },
    ];
    const actions: PageHeaderAction[] = [
      {
        key: "create",
        label: "New Post",
        icon: <Plus className="w-4 h-4" />,
        onPress: () => {},
        variant: "primary",
      },
    ];
    return (
      <PageHeader
        title="Timeline"
        subtitle="Latest updates from your network"
        icon={<Globe className="w-6 h-6" />}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actions={actions}
        showReload
        isReloading={isReloading}
        onReload={() => {
          setIsReloading(true);
          timeoutRef.current = setTimeout(() => setIsReloading(false), 1500);
        }}
      />
    );
  },
};
