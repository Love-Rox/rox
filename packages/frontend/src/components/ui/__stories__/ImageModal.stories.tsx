import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ImageModal } from "../ImageModal";
import { Button } from "../Button";

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect fill='%234a90d9' width='600' height='400'/%3E%3Ctext fill='white' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='24'%3ESample Image%3C/text%3E%3C/svg%3E";
const PLACEHOLDER_IMAGES = [
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect fill='%234a90d9' width='600' height='400'/%3E%3Ctext fill='white' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='24'%3EImage 1%3C/text%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect fill='%2345b26b' width='600' height='400'/%3E%3Ctext fill='white' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='24'%3EImage 2%3C/text%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect fill='%23d94a4a' width='600' height='400'/%3E%3Ctext fill='white' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='24'%3EImage 3%3C/text%3E%3C/svg%3E",
];

const meta = {
  title: "UI/ImageModal",
  component: ImageModal,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ImageModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Single image modal. Click the button to open.
 */
export const Default: Story = {
  args: {
    images: [PLACEHOLDER_IMAGE],
    onClose: () => {},
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div style={{ padding: "24px" }}>
        <Button variant="primary" onPress={() => setIsOpen(true)}>
          Open Image Modal
        </Button>
        {isOpen && (
          <ImageModal
            {...args}
            images={[PLACEHOLDER_IMAGE]}
            onClose={() => setIsOpen(false)}
            alt="Sample image"
          />
        )}
      </div>
    );
  },
};

/**
 * Gallery mode with multiple images and navigation arrows.
 */
export const Gallery: Story = {
  args: {
    images: PLACEHOLDER_IMAGES,
    onClose: () => {},
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div style={{ padding: "24px" }}>
        <Button variant="primary" onPress={() => setIsOpen(true)}>
          Open Gallery (3 images)
        </Button>
        {isOpen && (
          <ImageModal
            {...args}
            images={PLACEHOLDER_IMAGES}
            onClose={() => setIsOpen(false)}
            alt="Gallery image"
          />
        )}
      </div>
    );
  },
};

/**
 * Gallery starting at a specific image index.
 */
export const StartAtSecondImage: Story = {
  args: {
    images: PLACEHOLDER_IMAGES,
    initialIndex: 1,
    onClose: () => {},
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div style={{ padding: "24px" }}>
        <Button variant="secondary" onPress={() => setIsOpen(true)}>
          Open at 2nd image
        </Button>
        {isOpen && (
          <ImageModal
            {...args}
            images={PLACEHOLDER_IMAGES}
            initialIndex={1}
            onClose={() => setIsOpen(false)}
            alt="Gallery image"
          />
        )}
      </div>
    );
  },
};
