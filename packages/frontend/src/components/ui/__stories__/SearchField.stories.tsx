import type { Meta, StoryObj } from "@storybook/react";
import { SearchField } from "../SearchField";

const meta = {
  title: "UI/SearchField",
  component: SearchField,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    showLabel: { control: "boolean" },
  },
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Search...",
  },
};

export const Small: Story = {
  args: {
    size: "sm",
    placeholder: "Quick search...",
  },
};

export const Medium: Story = {
  args: {
    size: "md",
    placeholder: "Search users...",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    placeholder: "Search posts...",
  },
};

export const WithVisibleLabel: Story = {
  args: {
    label: "Search posts",
    showLabel: true,
    placeholder: "Enter keywords...",
  },
};

export const WithHiddenLabel: Story = {
  args: {
    label: "Search users",
    showLabel: false,
    placeholder: "Search users...",
  },
};

export const CustomPlaceholder: Story = {
  args: {
    placeholder: "Type to filter results...",
    size: "md",
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "320px" }}>
      <SearchField size="sm" placeholder="Small search..." />
      <SearchField size="md" placeholder="Medium search..." />
      <SearchField size="lg" placeholder="Large search..." />
    </div>
  ),
};
