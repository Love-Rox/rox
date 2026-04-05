import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton, NoteCardSkeleton, TimelineSkeleton } from "../Skeleton";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  argTypes: {
    rounded: {
      control: "select",
      options: ["none", "sm", "md", "lg", "full"],
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Basic skeleton with configurable dimensions. */
export const Default: Story = {
  args: {
    width: "200px",
    height: "20px",
  },
};

/** Different rounded variants. */
export const Shapes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Skeleton width="200px" height="16px" rounded="sm" />
      <Skeleton width="300px" height="20px" rounded="md" />
      <Skeleton width="100%" height="120px" rounded="lg" />
      <Skeleton width="48px" height="48px" rounded="full" />
      <Skeleton width="250px" height="24px" rounded="none" />
    </div>
  ),
};

/** NoteCardSkeleton composition. */
export const NoteCard: Story = {
  render: () => <NoteCardSkeleton />,
};

/** TimelineSkeleton with configurable count. */
export const Timeline: Story = {
  render: () => (
    <div style={{ width: "400px" }}>
      <TimelineSkeleton count={3} />
    </div>
  ),
};
