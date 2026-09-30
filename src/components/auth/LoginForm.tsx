'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { BuildingOfficeIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOktaSignIn = () => {
    signIn('okta', { callbackUrl: '/dashboard' });
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Invalid email or password');
      } else {
        toast.success('Successfully logged in');
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      toast.error('An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <BuildingOfficeIcon className="h-6 w-6" />
          </span>
          <span className="text-xl font-bold tracking-tight">RoomBook</span>
        </div>
        <div className="relative max-w-md text-white">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Book any room, on any campus, in seconds.
          </h1>
          <p className="mt-4 text-lg text-indigo-100">
            One shared calendar for classrooms, labs and meeting spaces, with no double bookings.
          </p>
        </div>
        <p className="relative text-sm text-indigo-200">Midwestern Career College</p>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-600/30">
              <BuildingOfficeIcon className="h-6 w-6" />
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">RoomBook</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to manage and book rooms.</p>

          <div className="mt-8 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-8">
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleOktaSignIn}
            >
              Sign in with Okta
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                <span className="bg-white px-3 text-slate-400">or use email</span>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleCredentialsSignIn}>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                label="Email address"
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                label="Password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button type="submit" variant="secondary" size="lg" className="w-full" loading={loading}>
                Sign in
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Forgot your password? Ask an administrator to reset it.
          </p>
        </div>
      </div>
    </div>
  );
}
