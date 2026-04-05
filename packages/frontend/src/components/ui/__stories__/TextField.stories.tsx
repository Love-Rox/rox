import type { Meta, StoryObj } from "@storybook/react";
import { TextField } from "../TextField";

const meta = {
  title: "UI/TextField",
  component: TextField,
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["text", "password", "email", "url", "number", "tel", "date"],
    },
    multiline: { control: "boolean" },
    isDisabled: { control: "boolean" },
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Enter text...",
  },
};

export const WithLabel: Story = {
  args: {
    label: "Username",
    placeholder: "Enter your username",
  },
};

export const WithDescription: Story = {
  args: {
    label: "Email",
    placeholder: "you@example.com",
    description: "We will never share your email.",
  },
};

export const WithError: Story = {
  args: {
    label: "Password",
    type: "password",
    errorMessage: "Password must be at least 8 characters.",
  },
};

export const Multiline: Story = {
  args: {
    label: "Bio",
    multiline: true,
    rows: 5,
    placeholder: "Tell us about yourself...",
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled Field",
    isDisabled: true,
    value: "Cannot edit this",
  },
};

export const AllTypes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "300px" }}>
      <TextField label="Text" type="text" placeholder="Text input" />
      <TextField label="Email" type="email" placeholder="you@example.com" />
      <TextField label="Password" type="password" placeholder="Enter password" />
      <TextField label="Number" type="number" placeholder="0" />
      <TextField label="URL" type="url" placeholder="https://example.com" />
      <TextField label="Date" type="date" />
    </div>
  ),
};
