'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="text-center text-red-600">
        Token tidak valid atau tidak ditemukan.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Password tidak sama');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal mereset password');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-black uppercase tracking-tight text-gray-900">
          Reset Password
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Masukkan password baru Anda.
        </p>
      </div>

      {success ? (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Password berhasil diubah
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Anda akan dialihkan ke halaman login dalam 3 detik...
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-bold uppercase tracking-wide text-gray-700">
              Password Baru
            </label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              required 
              minLength={6}
              className="h-12 rounded-lg border-gray-300 focus:border-green-600 focus:ring-green-600"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-bold uppercase tracking-wide text-gray-700">
              Konfirmasi Password
            </label>
            <Input 
              id="confirmPassword" 
              name="confirmPassword" 
              type="password" 
              required 
              minLength={6}
              className="h-12 rounded-lg border-gray-300 focus:border-green-600 focus:ring-green-600"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 bg-green-700 hover:bg-green-800 text-white font-bold uppercase tracking-widest rounded-lg shadow-lg shadow-green-900/20"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Reset Password'}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-green-700" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
