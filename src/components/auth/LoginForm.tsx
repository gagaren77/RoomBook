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
  const [email, setEmail] = emailState;
  const [password, setPassword] = passwordState;
  const [loading, setLoading] = useState(false);
  
  const emailState = useState('');
  const passwordState = useState('');

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
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
            <BuildingOfficeIcon className="h-10 w-10 text-blue-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          School Room Booking
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="mb-6">
            <Button
              type="button"
              variant="primary"
              className="w-full h-11 text-base font-semibold"
              onClick={handleOktaSignIn}
            >
              Sign in with Okta
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">or sign in with email</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleCredentialsSignIn}>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              label="Email address"
              value={emailState[0]}
              onChange={(e) => emailState[1](e.target.value)}
            />

            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              label="Password"
              value={passwordState[0]}
              onChange={(e) => passwordState[1](e.target.value)}
            />

            <div>
              <Button
                type="submit"
                className="w-full"
                loading={loading}
              >
                Sign in
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <p className="text-center text-sm text-gray-500">
              Forgot password? Contact your administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
