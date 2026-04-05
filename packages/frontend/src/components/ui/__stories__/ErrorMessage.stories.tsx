import type { Meta, StoryObj } from "@storybook/react";
import { ErrorMessage } from "../ErrorMessage";

const meta = {
  title: "UI/ErrorMessage",
  component: ErrorMessage,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["error", "warning", "info"],
    },
    isRetrying: { control: "boolean" },
  },
} satisfies Meta<typeof ErrorMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default error variant with title only.
 */
export const Default: Story = {
  args: {
    title: "Something went wrong",
  },
};

/**
 * Error with a detailed message.
 */
export const WithMessage: Story = {
  args: {
    title: "Failed to load notes",
    message: "The server returned an unexpected error. Please try again later.",
  },
};

/**
 * Error with a retry button.
 */
export const WithRetry: Story = {
  args: {
    title: "Network error",
    message: "Could not connect to the server.",
    onRetry: () => console.log("Retry clicked"),
  },
};

/**
 * Error in retrying state (button disabled with loading text).
 */
export const Retrying: Story = {
  args: {
    title: "Network error",
    message: "Could not connect to the server.",
    onRetry: () => console.log("Retry clicked"),
    isRetrying: true,
  },
};

/**
 * Warning variant.
 */
export const Warning: Story = {
  args: {
    title: "Rate limit approaching",
    message: "You have used 90% of your API quota for this month.",
    variant: "warning",
  },
};

/**
 * Info variant.
 */
export const Info: Story = {
  args: {
    title: "Maintenance scheduled",
    message: "The server will be unavailable for maintenance on Sunday 2:00 AM - 4:00 AM UTC.",
    variant: "info",
  },
};

/**
 * All variants side by side.
 */
export const AllVariants: Story = {
  args: {
    title: "All Variants",
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "500px" }}>
      <ErrorMessage title="Error" message="Something went wrong." variant="error" />
      <ErrorMessage title="Warning" message="Please check your input." variant="warning" />
      <ErrorMessage title="Info" message="Your session will expire soon." variant="info" />
    </div>
  ),
};
