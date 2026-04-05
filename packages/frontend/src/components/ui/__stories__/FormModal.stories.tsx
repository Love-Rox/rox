import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FormModal } from "../FormModal";
import { TextField } from "../TextField";
import { Button } from "../Button";

const meta = {
  title: "UI/FormModal",
  component: FormModal,
  tags: ["autodocs"],
  argTypes: {
    maxWidth: {
      control: "select",
      options: ["sm", "md", "lg", "xl"],
    },
    isDismissable: { control: "boolean" },
  },
} satisfies Meta<typeof FormModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <Button variant="primary" onPress={() => setIsOpen(true)}>
          Open Modal
        </Button>
        <FormModal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create Item">
          <TextField label="Name" placeholder="Enter a name" />
          <TextField label="Description" placeholder="Enter a description" multiline rows={3} />
        </FormModal>
      </div>
    );
  },
};

export const SmallWidth: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <Button variant="secondary" onPress={() => setIsOpen(true)}>
          Small Modal
        </Button>
        <FormModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Small Modal"
          maxWidth="sm"
        >
          <TextField label="Email" placeholder="you@example.com" type="email" />
        </FormModal>
      </div>
    );
  },
};

export const LargeWidth: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <Button variant="secondary" onPress={() => setIsOpen(true)}>
          Large Modal
        </Button>
        <FormModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Large Modal"
          maxWidth="lg"
        >
          <TextField label="Title" placeholder="Enter title" />
          <TextField label="Content" placeholder="Write your content here..." multiline rows={5} />
        </FormModal>
      </div>
    );
  },
};

export const ExtraLargeWidth: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <Button variant="secondary" onPress={() => setIsOpen(true)}>
          XL Modal
        </Button>
        <FormModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Extra Large Modal"
          maxWidth="xl"
        >
          <TextField label="First Name" placeholder="First name" />
          <TextField label="Last Name" placeholder="Last name" />
          <TextField label="Bio" placeholder="Tell us about yourself..." multiline rows={4} />
        </FormModal>
      </div>
    );
  },
};

export const WithFooter: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <Button variant="primary" onPress={() => setIsOpen(true)}>
          Open With Footer
        </Button>
        <FormModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Create List"
          footer={
            <>
              <Button variant="secondary" onPress={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onPress={() => setIsOpen(false)}>
                Create
              </Button>
            </>
          }
        >
          <TextField label="List Name" placeholder="My List" />
          <TextField label="Description" placeholder="Optional description" multiline rows={2} />
        </FormModal>
      </div>
    );
  },
};
