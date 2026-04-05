import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  InteractiveCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../Card";

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {
    padding: {
      control: "select",
      options: ["none", "sm", "md", "lg"],
    },
    shadow: {
      control: "select",
      options: ["none", "sm", "md", "lg"],
    },
    hover: { control: "boolean" },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Basic card content",
  },
};

export const WithHeaderAndContent: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>This is a description of the card.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the main content area of the card.</p>
      </CardContent>
    </Card>
  ),
};

export const PaddingVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "300px" }}>
      <Card padding="none">
        <CardContent>padding: none</CardContent>
      </Card>
      <Card padding="sm">
        <CardContent>padding: sm</CardContent>
      </Card>
      <Card padding="md">
        <CardContent>padding: md</CardContent>
      </Card>
      <Card padding="lg">
        <CardContent>padding: lg</CardContent>
      </Card>
    </div>
  ),
};

export const ShadowVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "300px" }}>
      <Card shadow="none">
        <CardContent>shadow: none</CardContent>
      </Card>
      <Card shadow="sm">
        <CardContent>shadow: sm</CardContent>
      </Card>
      <Card shadow="md">
        <CardContent>shadow: md</CardContent>
      </Card>
      <Card shadow="lg">
        <CardContent>shadow: lg</CardContent>
      </Card>
    </div>
  ),
};

export const WithHover: Story = {
  args: {
    hover: true,
    children: "Hover over this card to see the shadow effect",
  },
};

export const Interactive: Story = {
  render: () => (
    <InteractiveCard onPress={() => alert("Card pressed!")}>
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>Click or press Enter to interact</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This card is built with React Aria Button for full accessibility.</p>
      </CardContent>
    </InteractiveCard>
  ),
};

export const InteractiveDisabled: Story = {
  render: () => (
    <InteractiveCard isDisabled onPress={() => {}}>
      <CardHeader>
        <CardTitle>Disabled Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p>This interactive card is disabled.</p>
      </CardContent>
    </InteractiveCard>
  ),
};
