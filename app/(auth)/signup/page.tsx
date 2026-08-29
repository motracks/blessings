'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError('That did not work. Please check your details and try again.');
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-2 text-2xl font-light text-text">Almost there</h1>
          <p className="text-sm text-text-muted">
            We&apos;ve sent a confirmation link to {email}. Open it to finish creating your account.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-light text-text">Create an account</h1>
        <p className="mb-8 text-sm text-text-muted">A quiet place to arrive.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />

          {error && <p className="text-sm text-text-muted">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-accent-text underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
