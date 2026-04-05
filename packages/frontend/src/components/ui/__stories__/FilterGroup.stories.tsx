import type { Meta, StoryObj } from "@storybook/react";
import { useArgs } from "storybook/preview-api";
import { FilterGroup } from "../FilterGroup";

const meta = {
  title: "UI/FilterGroup",
  component: FilterGroup,
  tags: ["autodocs"],
  args: {
    options: [],
    value: "",
    onChange: () => {},
    label: "Filter",
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md"],
    },
    showLabel: { control: "boolean" },
  },
} satisfies Meta<typeof FilterGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleOptions = [
  { value: "all", label: "All", count: 42 },
  { value: "active", label: "Active", count: 12 },
  { value: "inactive", label: "Inactive", count: 30 },
];

const optionsWithoutCounts = [
  { value: "all", label: "All" },
  { value: "local", label: "Local" },
  { value: "remote", label: "Remote" },
];

/** Shared render function that syncs FilterGroup value with Storybook Controls. */
const renderInteractive: Story["render"] = (args) => {
  const [{ value }, updateArgs] = useArgs();
  return (
    <FilterGroup {...args} value={value} onChange={(next: string) => updateArgs({ value: next })} />
  );
};

/** Default size variant. */
export const Default: Story = {
  args: {
    label: "Filter by status",
    options: sampleOptions,
    value: "all",
  },
  render: renderInteractive,
};

/** Small size variant. */
export const SmallSize: Story = {
  args: {
    label: "Filter by status",
    options: sampleOptions,
    value: "all",
    size: "sm",
  },
  render: renderInteractive,
};

/** Medium size variant. */
export const MediumSize: Story = {
  args: {
    label: "Filter by status",
    options: sampleOptions,
    value: "all",
    size: "md",
  },
  render: renderInteractive,
};

/** Options with count badges. */
export const WithCountBadges: Story = {
  args: {
    label: "Filter users",
    options: [
      { value: "all", label: "All", count: 100 },
      { value: "active", label: "Active", count: 85 },
      { value: "suspended", label: "Suspended", count: 15 },
    ],
    value: "all",
  },
  render: renderInteractive,
};

/** Options without counts. */
export const WithoutCounts: Story = {
  args: {
    label: "Filter by type",
    options: optionsWithoutCounts,
    value: "all",
  },
  render: renderInteractive,
};

/** Visible label display. */
export const WithVisibleLabel: Story = {
  args: {
    label: "Filter by status",
    showLabel: true,
    options: sampleOptions,
    value: "all",
  },
  render: renderInteractive,
};
