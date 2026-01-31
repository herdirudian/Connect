'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Registration failed');
        }

        if (json.needVerification && json.email) {
            router.push(`/verify?email=${encodeURIComponent(json.email)}`);
            return;
        }

        router.push('/dashboard');
      } else {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        throw new Error("Server error. Please try again later.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-bold uppercase tracking-wide text-gray-700">
            Full Name
          </label>
          <Input 
            id="name" 
            name="name" 
            required 
            placeholder="John Doe" 
            className="h-12 rounded-lg border-gray-300 focus:border-green-600 focus:ring-green-600"
          />
        </div>

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
          <label htmlFor="password" className="block text-sm font-bold uppercase tracking-wide text-gray-700">
            Password
          </label>
          <Input 
            id="password" 
            name="password" 
            type="password" 
            required 
            className="h-12 rounded-lg border-gray-300 focus:border-green-600 focus:ring-green-600"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-bold uppercase tracking-wide text-gray-700">
            Phone Number (Optional)
          </label>
          <Input 
            id="phone" 
            name="phone" 
            type="tel" 
            placeholder="+62..."
            className="h-12 rounded-lg border-gray-300 focus:border-green-600 focus:ring-green-600"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="referralCode" className="block text-sm font-bold uppercase tracking-wide text-gray-700">
            Referral Code (Optional)
          </label>
          <Input 
            id="referralCode" 
            name="referralCode" 
            defaultValue={referralCode || ''}
            placeholder="Enter code if you have one"
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
          {loading ? 'Creating Account...' : 'CREATE ACCOUNT'} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <div className="relative mt-8">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Sudah punya akun?</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
           <Link href="/login">
             <Button variant="outline" className="w-full h-12 rounded-full font-bold border-gray-300 hover:bg-gray-50 text-gray-700">
               SIGN IN
             </Button>
           </Link>
        </div>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-black uppercase tracking-tight text-gray-900">
          Join The Club
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Daftar sekarang dan mulai kumpulkan poin liburan Anda.
        </p>
      </div>

      <Suspense fallback={<div className="text-center p-4">Loading form...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
