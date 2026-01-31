'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim email reset password');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Link href="/login" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali ke Login
      </Link>

      <div className="mb-8">
        <h2 className="text-3xl font-black uppercase tracking-tight text-gray-900">
          Lupa Password
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Masukkan email Anda dan kami akan mengirimkan link untuk mereset password Anda.
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
                Email terkirim
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Jika email tersebut terdaftar, kami telah mengirimkan instruksi reset password.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-bold uppercase tracking-wide text-gray-700">
              Email Address
            </label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              required 
              placeholder="name@example.com" 
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
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Kirim Link Reset'}
          </Button>
        </form>
      )}
    </div>
  );
}
