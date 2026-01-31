'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!email) {
      return (
        <div className="text-center">
            <h2 className="text-xl font-bold text-red-600">Invalid Request</h2>
            <p className="text-gray-500 mt-2">Email parameter is missing.</p>
            <Button onClick={() => router.push('/register')} variant="outline" className="mt-4">
                Back to Register
            </Button>
        </div>
      );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
      <div className="w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black uppercase tracking-tight text-gray-900">
            Verifikasi Email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Kami telah mengirimkan kode verifikasi ke <span className="font-bold text-brand-dark">{email}</span>.
            Silakan masukkan 6 digit kode tersebut di bawah ini.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="code" className="sr-only">Kode Verifikasi</label>
            <Input
              id="code"
              name="code"
              type="text"
              required
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="h-14 text-center text-2xl tracking-widest font-bold rounded-lg border-gray-300 focus:border-green-600 focus:ring-green-600"
              maxLength={6}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 bg-brand hover:bg-brand-dark text-white rounded-full font-bold uppercase tracking-wider text-sm shadow-lg transition-all hover:scale-[1.02]"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'VERIFIKASI AKUN'}
          </Button>
          
          <div className="text-center text-sm text-gray-500 mt-4">
            Tidak menerima kode? <button type="button" className="text-brand font-bold hover:underline">Kirim Ulang</button>
          </div>
        </form>
      </div>
  );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-brand" /></div>}>
            <VerifyForm />
        </Suspense>
    )
}
