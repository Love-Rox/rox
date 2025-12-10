"use client";

import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { Form } from "react-aria-components";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { tokenAtom, currentUserAtom } from "../lib/atoms/auth";
import { apiClient } from "../lib/api/client";
import { TextField } from "../components/ui/TextField";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";

interface OnboardingStatus {
  needsOnboarding: boolean;
}

type OnboardingStep = "admin" | "instance" | "registration" | "review";

/**
 * Server Onboarding Wizard
 * Guides administrators through initial server setup
 */
export default function OnboardingPage() {
  const { _ } = useLingui();
  const [, setToken] = useAtom(tokenAtom);
  const [, setCurrentUser] = useAtom(currentUserAtom);

  // Loading and status
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current step
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("admin");

  // Admin account fields
  const [adminUsername, setAdminUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [adminName, setAdminName] = useState("");

  // Instance settings fields
  const [instanceName, setInstanceName] = useState("");
  const [instanceDescription, setInstanceDescription] = useState("");
  const [maintainerEmail, setMaintainerEmail] = useState("");

  // Registration settings fields
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(false);

  // Check if onboarding is needed
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const data = await apiClient.get<OnboardingStatus>(
          "/api/onboarding/status"
        );
        setNeedsOnboarding(data.needsOnboarding);
        if (!data.needsOnboarding) {
          // Redirect to login if onboarding is already completed
          window.location.href = "/login";
        }
      } catch (err) {
        console.error("Failed to check onboarding status:", err);
        setError(_(t`Failed to check server status`));
      } finally {
        setIsLoading(false);
      }
    };
    checkOnboarding();
  }, [_]);

  const steps: OnboardingStep[] = ["admin", "instance", "registration", "review"];
  const currentStepIndex = steps.indexOf(currentStep);

  const validateAdminStep = () => {
    if (!adminUsername || adminUsername.length < 3) {
      setError(_(t`Username must be at least 3 characters`));
      return false;
    }
    if (!adminEmail || !adminEmail.includes("@")) {
      setError(_(t`Please enter a valid email address`));
      return false;
    }
    if (!adminPassword || adminPassword.length < 8) {
      setError(_(t`Password must be at least 8 characters`));
      return false;
    }
    if (adminPassword !== adminPasswordConfirm) {
      setError(_(t`Passwords do not match`));
      return false;
    }
    return true;
  };

  const validateInstanceStep = () => {
    if (!instanceName || instanceName.length < 1) {
      setError(_(t`Instance name is required`));
      return false;
    }
    return true;
  };

  const goToNextStep = () => {
    setError(null);

    if (currentStep === "admin" && !validateAdminStep()) {
      return;
    }
    if (currentStep === "instance" && !validateInstanceStep()) {
      return;
    }

    // Auto-fill maintainer email if not set
    if (currentStep === "admin" && !maintainerEmail) {
      setMaintainerEmail(adminEmail);
    }

    const nextIndex = currentStepIndex + 1;
    const nextStep = steps[nextIndex];
    if (nextStep) {
      setCurrentStep(nextStep);
    }
  };

  const goToPreviousStep = () => {
    setError(null);
    const prevIndex = currentStepIndex - 1;
    const prevStep = steps[prevIndex];
    if (prevStep) {
      setCurrentStep(prevStep);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = await apiClient.post<{
        user: any;
        session: { token: string; expiresAt: string };
      }>("/api/onboarding/complete", {
        admin: {
          username: adminUsername,
          email: adminEmail,
          password: adminPassword,
          name: adminName || adminUsername,
        },
        instance: {
          name: instanceName,
          description: instanceDescription,
          maintainerEmail: maintainerEmail || adminEmail,
        },
        registration: {
          enabled: registrationEnabled,
          inviteOnly,
          approvalRequired,
        },
      });

      // Set auth state
      setToken(data.session.token);
      setCurrentUser(data.user);
      apiClient.setToken(data.session.token);

      // Redirect to home page
      window.location.href = "/";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : _(t`Failed to complete setup. Please try again.`)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--bg-secondary)">
        <Spinner size="lg" />
      </div>
    );
  }

  if (needsOnboarding === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--bg-secondary)">
        <Card className="w-full max-w-md" padding="lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              <Trans>Setup Complete</Trans>
            </CardTitle>
            <CardDescription className="text-center">
              <Trans>This server has already been set up.</Trans>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <a
                href="/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                <Trans>Go to login</Trans>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--bg-secondary) px-4 py-8">
      <Card className="w-full max-w-lg" padding="lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            <Trans>Server Setup</Trans>
          </CardTitle>
          <CardDescription className="text-center">
            <Trans>Welcome to Rox! Let's configure your server.</Trans>
          </CardDescription>

          {/* Progress indicator */}
          <div className="mt-4 flex justify-center space-x-2">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`h-2 w-8 rounded-full transition-colors ${
                  index <= currentStepIndex
                    ? "bg-primary-600"
                    : "bg-neutral-200 dark:bg-neutral-700"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-center text-sm text-(--text-secondary)">
            <Trans>
              Step {currentStepIndex + 1} of {steps.length}
            </Trans>
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <Form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Admin Account */}
            {currentStep === "admin" && (
              <>
                <h3 className="text-lg font-medium text-(--text-primary)">
                  <Trans>Create Admin Account</Trans>
                </h3>
                <TextField
                  label={_(t`Username`)}
                  type="text"
                  value={adminUsername}
                  onChange={setAdminUsername}
                  autoComplete="username"
                  isRequired
                />
                <TextField
                  label={_(t`Email`)}
                  type="email"
                  value={adminEmail}
                  onChange={setAdminEmail}
                  autoComplete="email"
                  isRequired
                />
                <TextField
                  label={_(t`Display Name`)}
                  type="text"
                  value={adminName}
                  onChange={setAdminName}
                  placeholder={_(t`Optional`)}
                />
                <TextField
                  label={_(t`Password`)}
                  type="password"
                  value={adminPassword}
                  onChange={setAdminPassword}
                  autoComplete="new-password"
                  isRequired
                />
                <TextField
                  label={_(t`Confirm Password`)}
                  type="password"
                  value={adminPasswordConfirm}
                  onChange={setAdminPasswordConfirm}
                  autoComplete="new-password"
                  isRequired
                />
              </>
            )}

            {/* Step 2: Instance Settings */}
            {currentStep === "instance" && (
              <>
                <h3 className="text-lg font-medium text-(--text-primary)">
                  <Trans>Instance Settings</Trans>
                </h3>
                <TextField
                  label={_(t`Instance Name`)}
                  type="text"
                  value={instanceName}
                  onChange={setInstanceName}
                  placeholder={_(t`My Rox Server`)}
                  isRequired
                />
                <TextField
                  label={_(t`Description`)}
                  type="text"
                  value={instanceDescription}
                  onChange={setInstanceDescription}
                  placeholder={_(t`A community for...`)}
                />
                <TextField
                  label={_(t`Maintainer Email`)}
                  type="email"
                  value={maintainerEmail}
                  onChange={setMaintainerEmail}
                  placeholder={adminEmail || _(t`admin@example.com`)}
                />
              </>
            )}

            {/* Step 3: Registration Settings */}
            {currentStep === "registration" && (
              <>
                <h3 className="text-lg font-medium text-(--text-primary)">
                  <Trans>Registration Settings</Trans>
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={registrationEnabled}
                      onChange={(e) => setRegistrationEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-(--text-primary)">
                      <Trans>Enable user registration</Trans>
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={inviteOnly}
                      onChange={(e) => setInviteOnly(e.target.checked)}
                      disabled={!registrationEnabled}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                    />
                    <span
                      className={`${!registrationEnabled ? "opacity-50" : ""} text-(--text-primary)`}
                    >
                      <Trans>Require invitation code</Trans>
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={approvalRequired}
                      onChange={(e) => setApprovalRequired(e.target.checked)}
                      disabled={!registrationEnabled}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                    />
                    <span
                      className={`${!registrationEnabled ? "opacity-50" : ""} text-(--text-primary)`}
                    >
                      <Trans>Require admin approval</Trans>
                    </span>
                  </label>
                </div>
                <p className="text-sm text-(--text-secondary)">
                  <Trans>
                    You can change these settings later in the admin panel.
                  </Trans>
                </p>
              </>
            )}

            {/* Step 4: Review */}
            {currentStep === "review" && (
              <>
                <h3 className="text-lg font-medium text-(--text-primary)">
                  <Trans>Review Settings</Trans>
                </h3>
                <div className="space-y-4 rounded-lg bg-(--bg-tertiary) p-4">
                  <div>
                    <h4 className="font-medium text-(--text-primary)">
                      <Trans>Admin Account</Trans>
                    </h4>
                    <p className="text-sm text-(--text-secondary)">
                      {adminUsername} ({adminEmail})
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-(--text-primary)">
                      <Trans>Instance</Trans>
                    </h4>
                    <p className="text-sm text-(--text-secondary)">
                      {instanceName}
                      {instanceDescription && ` - ${instanceDescription}`}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-(--text-primary)">
                      <Trans>Registration</Trans>
                    </h4>
                    <p className="text-sm text-(--text-secondary)">
                      {registrationEnabled ? (
                        <>
                          <Trans>Enabled</Trans>
                          {inviteOnly && (
                            <>
                              {" "}
                              (<Trans>Invite only</Trans>)
                            </>
                          )}
                          {approvalRequired && (
                            <>
                              {" "}
                              (<Trans>Approval required</Trans>)
                            </>
                          )}
                        </>
                      ) : (
                        <Trans>Disabled</Trans>
                      )}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-4">
              {currentStepIndex > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onPress={goToPreviousStep}
                >
                  <Trans>Back</Trans>
                </Button>
              ) : (
                <div />
              )}

              {currentStep === "review" ? (
                <Button type="submit" isDisabled={isSubmitting}>
                  {isSubmitting ? <Spinner size="sm" /> : <Trans>Complete Setup</Trans>}
                </Button>
              ) : (
                <Button type="button" onPress={goToNextStep}>
                  <Trans>Next</Trans>
                </Button>
              )}
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
