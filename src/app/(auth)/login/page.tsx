'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        
        if (json.needVerification && json.email) {
            router.push(`/verify?email=${encodeURIComponent(json.email)}`);
            return;
        }

        throw new Error(json.error || 'Login failed');
      }

      const json = await res.json();
      const role = json?.user?.role;
      if (role === 'ADMIN' || role === 'STAFF' || role === 'VERIFICATOR') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
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
          Welcome Back
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Masuk untuk mengakses akun membership Anda.
        </p>
      </div>

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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-bold uppercase tracking-wide text-gray-700">
              Password
            </label>
            <div className="text-sm">
              <Link href="/forgot-password" className="font-semibold text-green-600 hover:text-green-500">
                Lupa password?
              </Link>
            </div>
          </div>
          <Input 
            id="password" 
            name="password" 
            type="password" 
            required 
            className="h-12 rounded-lg border-gray-300 focus:border-green-600 focus:ring-green-600"
          />
        </div>
        
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full h-12 bg-brand hover:bg-brand-dark text-white rounded-full font-bold uppercase tracking-wider text-sm shadow-lg transition-all hover:scale-[1.02]" 
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Sign In'} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <div className="relative mt-8">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Belum punya akun?</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
           <Link href="/register">
             <Button variant="outline" className="w-full h-12 rounded-full font-bold border-gray-300 hover:bg-gray-50 text-gray-700">
               DAFTAR SEKARANG
             </Button>
           </Link>
        </div>
      </form>
    </div>
  );
}
