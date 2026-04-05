import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ConfirmDialog } from "../ConfirmDialog";
import { Button } from "../Button";

const meta = {
  title: "UI/ConfirmDialog",
  component: ConfirmDialog,
  tags: ["autodocs"],
  argTypes: {
    confirmVariant: {
      control: "select",
      options: ["primary", "danger"],
    },
    isLoading: { control: "boolean" },
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <Button variant="primary" onPress={() => setIsOpen(true)}>
          Open Dialog
        </Button>
        <ConfirmDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={() => setIsOpen(false)}
          title="Confirm Action"
          message="Are you sure you want to proceed with this action?"
          confirmVariant="primary"
        />
      </div>
    );
  },
};

export const Danger: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <Button variant="danger" onPress={() => setIsOpen(true)}>
          Delete Item
        </Button>
        <ConfirmDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={() => setIsOpen(false)}
          title="Delete Item"
          message="This action cannot be undone. Are you sure you want to delete this item?"
          confirmText="Delete"
          confirmVariant="danger"
        />
      </div>
    );
  },
};

export const Loading: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    return (
      <div>
        <Button variant="danger" onPress={() => setIsOpen(true)}>
          Delete Note
        </Button>
        <ConfirmDialog
          isOpen={isOpen}
          isLoading={isLoading}
          onClose={() => {
            setIsOpen(false);
            setIsLoading(false);
          }}
          onConfirm={() => {
            setIsLoading(true);
            setTimeout(() => {
              setIsLoading(false);
              setIsOpen(false);
            }, 2000);
          }}
          title="Delete Note"
          message="Are you sure you want to delete this note?"
          confirmText="Delete"
          confirmVariant="danger"
          loadingText="Deleting..."
        />
      </div>
    );
  },
};

export const CustomButtonText: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <Button variant="primary" onPress={() => setIsOpen(true)}>
          Publish
        </Button>
        <ConfirmDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={() => setIsOpen(false)}
          title="Publish Post"
          message="This will make your post visible to everyone. Continue?"
          confirmText="Publish Now"
          cancelText="Go Back"
          confirmVariant="primary"
        />
      </div>
    );
  },
};
