import type { Meta, StoryObj } from "@storybook/react";
import { Spinner, SpinnerWithLabel } from "../Spinner";

const meta = {
  title: "UI/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg"],
    },
    variant: {
      control: "select",
      options: ["primary", "white", "gray"],
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
      <Spinner size="xs" />
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        gap: "16px",
        alignItems: "center",
        background: "#1f2937",
        padding: "16px",
        borderRadius: "8px",
      }}
    >
      <Spinner variant="primary" />
      <Spinner variant="white" />
      <Spinner variant="gray" />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <SpinnerWithLabel label="Loading..." />
      <SpinnerWithLabel label="Fetching data..." size="sm" />
      <SpinnerWithLabel label="Please wait..." size="lg" variant="gray" />
    </div>
  ),
};
