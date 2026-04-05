import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabList, Tab, TabPanel } from "../Tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultSelectedKey="home">
      <TabList aria-label="Navigation">
        <Tab id="home">Home</Tab>
        <Tab id="profile">Profile</Tab>
        <Tab id="settings">Settings</Tab>
      </TabList>
      <TabPanel id="home">
        <p style={{ padding: "16px" }}>Welcome to the home tab.</p>
      </TabPanel>
      <TabPanel id="profile">
        <p style={{ padding: "16px" }}>Your profile information goes here.</p>
      </TabPanel>
      <TabPanel id="settings">
        <p style={{ padding: "16px" }}>Application settings.</p>
      </TabPanel>
    </Tabs>
  ),
};

export const TwoTabs: Story = {
  render: () => (
    <Tabs defaultSelectedKey="posts">
      <TabList aria-label="Content">
        <Tab id="posts">Posts</Tab>
        <Tab id="replies">Replies</Tab>
      </TabList>
      <TabPanel id="posts">
        <p style={{ padding: "16px" }}>User posts will appear here.</p>
      </TabPanel>
      <TabPanel id="replies">
        <p style={{ padding: "16px" }}>User replies will appear here.</p>
      </TabPanel>
    </Tabs>
  ),
};

export const ManyTabs: Story = {
  render: () => (
    <Tabs defaultSelectedKey="overview">
      <TabList aria-label="Dashboard">
        <Tab id="overview">Overview</Tab>
        <Tab id="analytics">Analytics</Tab>
        <Tab id="reports">Reports</Tab>
        <Tab id="notifications">Notifications</Tab>
        <Tab id="integrations">Integrations</Tab>
      </TabList>
      <TabPanel id="overview">
        <p style={{ padding: "16px" }}>Dashboard overview.</p>
      </TabPanel>
      <TabPanel id="analytics">
        <p style={{ padding: "16px" }}>Analytics data.</p>
      </TabPanel>
      <TabPanel id="reports">
        <p style={{ padding: "16px" }}>Generated reports.</p>
      </TabPanel>
      <TabPanel id="notifications">
        <p style={{ padding: "16px" }}>Notification settings.</p>
      </TabPanel>
      <TabPanel id="integrations">
        <p style={{ padding: "16px" }}>Third-party integrations.</p>
      </TabPanel>
    </Tabs>
  ),
};

export const WithRichContent: Story = {
  render: () => (
    <Tabs defaultSelectedKey="details">
      <TabList aria-label="Item info">
        <Tab id="details">Details</Tab>
        <Tab id="activity">Activity</Tab>
      </TabList>
      <TabPanel id="details">
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <h3 style={{ margin: 0, fontWeight: 600 }}>Item Details</h3>
          <p style={{ margin: 0, color: "#6b7280" }}>
            This panel contains detailed information about the selected item.
          </p>
        </div>
      </TabPanel>
      <TabPanel id="activity">
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <h3 style={{ margin: 0, fontWeight: 600 }}>Recent Activity</h3>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#6b7280" }}>
            <li>Created on Jan 1, 2026</li>
            <li>Updated on Feb 15, 2026</li>
            <li>Reviewed on Mar 10, 2026</li>
          </ul>
        </div>
      </TabPanel>
    </Tabs>
  ),
};
