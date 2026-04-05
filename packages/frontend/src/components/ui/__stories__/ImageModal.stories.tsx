import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ImageModal } from "../ImageModal";
import { Button } from "../Button";

const PLACEHOLDER_IMAGE = "https://picsum.photos/id/237/800/600";
const PLACEHOLDER_IMAGES = [
  "https://picsum.photos/id/237/800/600",
  "https://picsum.photos/id/1025/800/600",
  "https://picsum.photos/id/1074/800/600",
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
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div style={{ padding: "24px" }}>
        <Button variant="primary" onPress={() => setIsOpen(true)}>
          Open Image Modal
        </Button>
        {isOpen && (
          <ImageModal
            images={[PLACEHOLDER_IMAGE]}
            onClose={() => setIsOpen(false)}
            alt="Sample dog"
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
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div style={{ padding: "24px" }}>
        <Button variant="primary" onPress={() => setIsOpen(true)}>
          Open Gallery (3 images)
        </Button>
        {isOpen && (
          <ImageModal
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
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div style={{ padding: "24px" }}>
        <Button variant="secondary" onPress={() => setIsOpen(true)}>
          Open at 2nd image
        </Button>
        {isOpen && (
          <ImageModal
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
