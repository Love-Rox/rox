import type React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Provider, createStore } from "jotai";
import { useAtom } from "jotai";
import { ToastContainer } from "../Toast";
import { addToastAtom, type ToastType } from "../../../lib/atoms/toast";
import { Button } from "../Button";

const meta = {
  title: "UI/Toast",
  component: ToastContainer,
  tags: ["autodocs"],
  decorators: [
    (Story: React.ComponentType) => {
      const store = createStore();
      return (
        <Provider store={store}>
          <Story />
        </Provider>
      );
    },
  ],
} satisfies Meta<typeof ToastContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Helper component to trigger toasts interactively
 */
function ToastTrigger({ type, message }: { type: ToastType; message: string }) {
  const [, addToast] = useAtom(addToastAtom);
  return (
    <Button
      variant={type === "error" ? "danger" : type === "success" ? "primary" : "secondary"}
      onPress={() => addToast({ type, message })}
    >
      Show {type} toast
    </Button>
  );
}

function AllToastDemo() {
  const [, addToast] = useAtom(addToastAtom);
  return (
    <div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <Button
          variant="primary"
          onPress={() => addToast({ type: "success", message: "Action completed successfully!" })}
        >
          Success
        </Button>
        <Button
          variant="danger"
          onPress={() =>
            addToast({ type: "error", message: "Something went wrong. Please try again." })
          }
        >
          Error
        </Button>
        <Button
          variant="secondary"
          onPress={() => addToast({ type: "info", message: "Here is some useful information." })}
        >
          Info
        </Button>
        <Button
          variant="ghost"
          onPress={() =>
            addToast({
              type: "info",
              message: "A default notification.",
            })
          }
        >
          Default
        </Button>
      </div>
      <ToastContainer />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <AllToastDemo />,
};

export const Success: Story = {
  render: () => (
    <div>
      <ToastTrigger type="success" message="Changes saved successfully!" />
      <ToastContainer />
    </div>
  ),
};

export const Error: Story = {
  render: () => (
    <div>
      <ToastTrigger type="error" message="Failed to save changes." />
      <ToastContainer />
    </div>
  ),
};

export const Info: Story = {
  render: () => (
    <div>
      <ToastTrigger type="info" message="New update available." />
      <ToastContainer />
    </div>
  ),
};
