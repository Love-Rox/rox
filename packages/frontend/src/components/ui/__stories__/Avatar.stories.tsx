import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "../Avatar";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl"],
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  args: {
    src: "https://i.pravatar.cc/150",
    alt: "User avatar",
    size: "md",
  },
};

export const FallbackInitials: Story = {
  args: {
    fallback: "JD",
    alt: "John Doe",
    size: "md",
  },
};

export const DefaultFallback: Story = {
  args: {
    alt: "Unknown user",
    size: "md",
  },
};

export const Small: Story = {
  args: {
    src: "https://i.pravatar.cc/150?u=sm",
    alt: "Small avatar",
    size: "sm",
  },
};

export const Medium: Story = {
  args: {
    src: "https://i.pravatar.cc/150?u=md",
    alt: "Medium avatar",
    size: "md",
  },
};

export const Large: Story = {
  args: {
    src: "https://i.pravatar.cc/150?u=lg",
    alt: "Large avatar",
    size: "lg",
  },
};

export const ExtraLarge: Story = {
  args: {
    src: "https://i.pravatar.cc/150?u=xl",
    alt: "Extra large avatar",
    size: "xl",
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <Avatar src="https://i.pravatar.cc/150?u=1" alt="Small" size="sm" />
      <Avatar src="https://i.pravatar.cc/150?u=2" alt="Medium" size="md" />
      <Avatar src="https://i.pravatar.cc/150?u=3" alt="Large" size="lg" />
      <Avatar src="https://i.pravatar.cc/150?u=4" alt="Extra large" size="xl" />
    </div>
  ),
};

export const AllFallbacks: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <Avatar fallback="AB" alt="AB" size="sm" />
      <Avatar fallback="CD" alt="CD" size="md" />
      <Avatar fallback="EF" alt="EF" size="lg" />
      <Avatar fallback="GH" alt="GH" size="xl" />
    </div>
  ),
};
