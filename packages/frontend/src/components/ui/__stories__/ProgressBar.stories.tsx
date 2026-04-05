import type { Meta, StoryObj } from "@storybook/react";
import { ProgressBar, IndeterminateProgress } from "../ProgressBar";

const meta = {
  title: "UI/ProgressBar",
  component: ProgressBar,
  tags: ["autodocs"],
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100 } },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    variant: {
      control: "select",
      options: ["primary", "success", "error", "info"],
    },
    showPercent: { control: "boolean" },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 60,
  },
};

export const WithPercentage: Story = {
  args: {
    value: 75,
    showPercent: true,
  },
};

export const Primary: Story = {
  args: {
    value: 50,
    variant: "primary",
    showPercent: true,
  },
};

export const Success: Story = {
  args: {
    value: 100,
    variant: "success",
    showPercent: true,
  },
};

export const Error: Story = {
  args: {
    value: 30,
    variant: "error",
    showPercent: true,
  },
};

export const Info: Story = {
  args: {
    value: 45,
    variant: "info",
    showPercent: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "320px" }}>
      <ProgressBar value={60} variant="primary" showPercent />
      <ProgressBar value={100} variant="success" showPercent />
      <ProgressBar value={30} variant="error" showPercent />
      <ProgressBar value={45} variant="info" showPercent />
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "320px" }}>
      <ProgressBar value={60} size="sm" />
      <ProgressBar value={60} size="md" />
      <ProgressBar value={60} size="lg" />
    </div>
  ),
};

export const Indeterminate: Story = {
  render: () => (
    <div style={{ width: "320px" }}>
      <IndeterminateProgress />
    </div>
  ),
};
