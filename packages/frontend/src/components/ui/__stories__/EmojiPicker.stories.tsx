import type { Meta, StoryObj } from "@storybook/react";
import { EmojiPicker } from "../EmojiPicker";
import { Button } from "../Button";

const meta = {
  title: "UI/EmojiPicker",
  component: EmojiPicker,
  tags: ["autodocs"],
  args: {
    onEmojiSelect: (emoji: string) => console.log("Selected emoji:", emoji),
  },
} satisfies Meta<typeof EmojiPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default emoji picker with the built-in smile trigger button.
 * Click the trigger to open the picker modal with accordion-based categories.
 */
export const Default: Story = {};

/**
 * Emoji picker with a custom trigger button.
 */
export const CustomTrigger: Story = {
  args: {
    trigger: <Button variant="primary">Pick Emoji</Button>,
  },
};

/**
 * Disabled state - the default trigger button is disabled.
 */
export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};
