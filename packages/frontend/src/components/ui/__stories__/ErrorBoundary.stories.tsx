import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ErrorBoundary } from "../ErrorBoundary";
import { Button } from "../Button";

const meta = {
  title: "UI/ErrorBoundary",
  component: ErrorBoundary,
  tags: ["autodocs"],
  args: {
    children: null,
  },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Component that throws an error on demand
 */
function BuggyComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("This is a test error thrown intentionally to demonstrate ErrorBoundary.");
  }
  return (
    <div style={{ padding: "16px", background: "#f0fdf4", borderRadius: "8px" }}>
      <p>This component is working normally. Click the button to trigger an error.</p>
    </div>
  );
}

/**
 * Wrapper that manages the throw state and re-mounts ErrorBoundary on reset
 */
function ErrorDemo({ inline }: { inline?: boolean }) {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <div>
      {!shouldThrow && (
        <div style={{ marginBottom: "16px" }}>
          <Button variant="danger" onPress={() => setShouldThrow(true)}>
            Trigger Error
          </Button>
        </div>
      )}
      {shouldThrow && (
        <div style={{ marginBottom: "16px" }}>
          <Button
            variant="secondary"
            onPress={() => {
              setShouldThrow(false);
              setKey((k) => k + 1);
            }}
          >
            Reset
          </Button>
        </div>
      )}
      <ErrorBoundary key={key} inline={inline}>
        <BuggyComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </div>
  );
}

export const FullPageFallback: Story = {
  render: () => <ErrorDemo />,
};

export const InlineFallback: Story = {
  render: () => <ErrorDemo inline />,
};

export const CustomFallback: Story = {
  render: () => {
    const [shouldThrow, setShouldThrow] = useState(false);
    const [key, setKey] = useState(0);
    return (
      <div>
        <div style={{ marginBottom: "16px" }}>
          <Button
            variant={shouldThrow ? "secondary" : "danger"}
            onPress={() => {
              if (shouldThrow) {
                setShouldThrow(false);
                setKey((k) => k + 1);
              } else {
                setShouldThrow(true);
              }
            }}
          >
            {shouldThrow ? "Reset" : "Trigger Error"}
          </Button>
        </div>
        <ErrorBoundary
          key={key}
          fallback={
            <div
              style={{
                padding: "24px",
                background: "#fef2f2",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>Custom Error View</h3>
              <p style={{ color: "#991b1b" }}>
                This is a custom fallback provided via the fallback prop.
              </p>
            </div>
          }
        >
          <BuggyComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      </div>
    );
  },
};

export const WorkingState: Story = {
  render: () => (
    <ErrorBoundary>
      <div style={{ padding: "16px", background: "#f0fdf4", borderRadius: "8px" }}>
        <p>No error here. The ErrorBoundary wraps this content transparently.</p>
      </div>
    </ErrorBoundary>
  ),
};
