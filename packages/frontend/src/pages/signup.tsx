'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import { Form } from 'react-aria-components';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useLingui } from '@lingui/react';
import { tokenAtom, currentUserAtom } from '../lib/atoms/auth';
import { apiClient } from '../lib/api/client';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

/**
 * Signup page component
 * Provides user registration functionality
 */
export default function SignupPage() {
  const { _ } = useLingui();
  const [, setToken] = useAtom(tokenAtom);
  const [, setCurrentUser] = useAtom(currentUserAtom);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = await apiClient.post<{ user: any; token: string }>('/api/users', {
        username,
        email,
        password,
        name: name || undefined,
      });

      setToken(data.token);
      setCurrentUser(data.user);
      apiClient.setToken(data.token);

      // Redirect to home page
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : _(t`Registration failed. Please try again.`));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md" padding="lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            <Trans>Create your account</Trans>
          </CardTitle>
          <CardDescription className="text-center">
            <Trans>Join Rox and start sharing</Trans>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form onSubmit={handleSignup} className="space-y-4">
            <TextField
              label={_(t`Username`)}
              type="text"
              value={username}
              onChange={setUsername}
              description={_(t`3-20 characters, letters, numbers, and underscores only`)}
              errorMessage={error && !username ? _(t`Username is required`) : undefined}
              isRequired
            />

            <TextField
              label={_(t`Email`)}
              type="email"
              value={email}
              onChange={setEmail}
              errorMessage={error && !email ? _(t`Email is required`) : undefined}
              isRequired
            />

            <TextField
              label={_(t`Password`)}
              type="password"
              value={password}
              onChange={setPassword}
              description={_(t`Minimum 8 characters`)}
              errorMessage={error && !password ? _(t`Password is required`) : undefined}
              isRequired
            />

            <TextField
              label={_(t`Display Name`)}
              type="text"
              value={name}
              onChange={setName}
              description={_(t`Optional`)}
            />

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              isDisabled={isSubmitting || !username || !email || !password}
              className="w-full"
            >
              {isSubmitting ? <Trans>Creating account...</Trans> : <Trans>Sign up</Trans>}
            </Button>
          </Form>

          <div className="mt-4 text-center text-sm text-gray-600">
            <Trans>Already have an account?</Trans>{' '}
            <a href="/login" className="font-medium text-primary-600 hover:text-primary-500">
              <Trans>Sign in</Trans>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
