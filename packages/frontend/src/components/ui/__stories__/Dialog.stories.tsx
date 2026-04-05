import type { Meta, StoryObj } from "@storybook/react";
import { Dialog } from "../Dialog";
import { Button } from "../Button";

const meta = {
  title: "UI/Dialog",
  component: Dialog,
  tags: ["autodocs"],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic dialog with a title and text content.
 */
export const Default: Story = {
  args: {
    title: "Dialog Title",
    trigger: <Button variant="primary">Open Dialog</Button>,
    children: (
      <p>
        This is the dialog content. You can place any content here including forms, text, or other
        components.
      </p>
    ),
  },
};

/**
 * Dialog with footer action buttons.
 */
export const WithActions: Story = {
  args: {
    title: "Save Changes",
    trigger: <Button variant="primary">Open Dialog</Button>,
    children: <p>You have unsaved changes. Would you like to save them before leaving?</p>,
    actions: (
      <>
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Save</Button>
      </>
    ),
  },
};

/**
 * Dialog with an onClose callback.
 */
export const WithOnClose: Story = {
  args: {
    title: "Notification",
    trigger: <Button variant="secondary">Show Notification</Button>,
    children: <p>This dialog fires an onClose callback when dismissed.</p>,
    onClose: () => console.log("Dialog closed"),
  },
};

/**
 * Dialog with rich content.
 */
export const RichContent: Story = {
  args: {
    title: "User Settings",
    trigger: <Button variant="primary">Settings</Button>,
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <label
            htmlFor="dialog-display-name"
            style={{ display: "block", fontWeight: 600, marginBottom: 4 }}
          >
            Display Name
          </label>
          <input
            id="dialog-display-name"
            type="text"
            defaultValue="Jane Doe"
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
            }}
          />
        </div>
        <div>
          <label
            htmlFor="dialog-bio"
            style={{ display: "block", fontWeight: 600, marginBottom: 4 }}
          >
            Bio
          </label>
          <textarea
            id="dialog-bio"
            rows={3}
            defaultValue="Hello world!"
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
            }}
          />
        </div>
      </div>
    ),
    actions: (
      <>
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Save</Button>
      </>
    ),
  },
};
