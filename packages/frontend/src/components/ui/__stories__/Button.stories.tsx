import type { Meta, StoryObj } from "@storybook/react";
import { Plus, Settings } from "lucide-react";
import { Button } from "../Button";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "danger", "ghost"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    isDisabled: { control: "boolean" },
  },
  args: {
    children: "Button",
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: "primary" },
};

export const Secondary: Story = {
  args: { variant: "secondary" },
};

export const Danger: Story = {
  args: { variant: "danger" },
};

export const Ghost: Story = {
  args: { variant: "ghost" },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: { isDisabled: true },
};

export const WithIcon: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <Button variant="primary">
        <Plus size={16} />
        Add Item
      </Button>
      <Button variant="secondary">
        <Settings size={16} />
        Settings
      </Button>
    </div>
  ),
};
