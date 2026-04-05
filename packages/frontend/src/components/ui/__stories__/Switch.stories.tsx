import type { Meta, StoryObj } from "@storybook/react";
import { Switch } from "../Switch";

const meta = {
  title: "UI/Switch",
  component: Switch,
  tags: ["autodocs"],
  argTypes: {
    isSelected: { control: "boolean" },
    isDisabled: { control: "boolean" },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    "aria-label": "Toggle setting",
  },
};

export const Selected: Story = {
  args: {
    isSelected: true,
    "aria-label": "Toggle setting",
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
    "aria-label": "Toggle setting",
  },
};

export const DisabledSelected: Story = {
  args: {
    isSelected: true,
    isDisabled: true,
    "aria-label": "Toggle setting",
  },
};

export const WithLabel: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Switch aria-label="Enable notifications" />
        <span>Enable notifications</span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Switch aria-label="Dark mode" defaultSelected />
        <span>Dark mode</span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Switch aria-label="Maintenance mode" isDisabled />
        <span>Maintenance mode (disabled)</span>
      </label>
    </div>
  ),
};
