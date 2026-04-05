import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FilterGroup } from "../FilterGroup";

const meta = {
  title: "UI/FilterGroup",
  component: FilterGroup,
  tags: ["autodocs"],
  args: {
    options: [],
    value: "",
    onChange: () => {},
    label: "Filter",
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md"],
    },
    showLabel: { control: "boolean" },
  },
} satisfies Meta<typeof FilterGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleOptions = [
  { value: "all", label: "All", count: 42 },
  { value: "active", label: "Active", count: 12 },
  { value: "inactive", label: "Inactive", count: 30 },
];

const optionsWithoutCounts = [
  { value: "all", label: "All" },
  { value: "local", label: "Local" },
  { value: "remote", label: "Remote" },
];

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("all");
    return (
      <FilterGroup
        label="Filter by status"
        options={sampleOptions}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const SmallSize: Story = {
  render: () => {
    const [value, setValue] = useState("all");
    return (
      <FilterGroup
        label="Filter by status"
        options={sampleOptions}
        value={value}
        onChange={setValue}
        size="sm"
      />
    );
  },
};

export const MediumSize: Story = {
  render: () => {
    const [value, setValue] = useState("all");
    return (
      <FilterGroup
        label="Filter by status"
        options={sampleOptions}
        value={value}
        onChange={setValue}
        size="md"
      />
    );
  },
};

export const WithCountBadges: Story = {
  render: () => {
    const [value, setValue] = useState("all");
    return (
      <FilterGroup
        label="Filter users"
        options={[
          { value: "all", label: "All", count: 100 },
          { value: "active", label: "Active", count: 85 },
          { value: "suspended", label: "Suspended", count: 15 },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const WithoutCounts: Story = {
  render: () => {
    const [value, setValue] = useState("all");
    return (
      <FilterGroup
        label="Filter by type"
        options={optionsWithoutCounts}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const WithVisibleLabel: Story = {
  render: () => {
    const [value, setValue] = useState("all");
    return (
      <FilterGroup
        label="Filter by status"
        showLabel
        options={sampleOptions}
        value={value}
        onChange={setValue}
      />
    );
  },
};
