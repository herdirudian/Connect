'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Users, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';

type RefUser = { id: string; name: string; email: string; createdAt: string };
type Dashboard = {
  user: { id: string; name: string; email: string; referralCode: string; points: number; createdAt: string; referrals: RefUser[] };
  stats: { totalReferrals: number; bonusPoints: number };
};

export default function ReferralPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const ref = params.get('ref');
      if (ref) setReferralCode(ref);
    } catch {}
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch('/api/referral/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      } else {
        setDashboard(null);
      }
    } catch {
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }

  const shareLink = useMemo(() => {
    const code = dashboard?.user.referralCode || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://family.thelodgegroup.id';
    return `${origin}/referral?ref=${code}`;
  }, [dashboard?.user.referralCode]);

  useEffect(() => {
    async function genQR() {
      if (!shareLink) return;
      try {
        const url = await QRCode.toDataURL(shareLink, { width: 256, margin: 2 });
        setQrUrl(url);
      } catch {}
    }
    genQR();
  }, [shareLink]);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setRegistering(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, referralCode }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Registrasi berhasil. Silakan verifikasi email Anda.');
        setName(''); setEmail(''); setPassword(''); setPhone('');
      } else {
        alert(data.error || 'Gagal registrasi');
      }
    } catch {
      alert('Gagal registrasi');
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="rounded-2xl p-6 bg-gradient-to-r from-brand/10 to-brand/5 border border-brand/20">
        <h1 className="text-3xl font-black uppercase tracking-tight text-brand-dark">Referral</h1>
        <p className="text-gray-700 mt-1">Bagikan kode Anda, ajak teman bergabung, dan kumpulkan poin.</p>
        {dashboard && (
          <div className="mt-4 flex flex-col sm:flex-row gap-6">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Link Referral</div>
              <div className="mt-1 font-mono text-sm break-all">{shareLink}</div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                  {copied ? <><Check className="h-4 w-4 mr-2" /> Tersalin</> : <><Copy className="h-4 w-4 mr-2" /> Salin Link</>}
                </Button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Yuk gabung The Lodge Connect pakai kode saya: ${dashboard.user.referralCode}\n${shareLink}`)}`}
                  target="_blank" rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">Bagikan via WhatsApp</Button>
                </a>
              </div>
            </div>
            {qrUrl && (
              <div className="flex items-center">
                <div className="p-3 bg-white rounded-xl border">
                  <img src={qrUrl} alt="QR Referral" className="h-40 w-40" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight">Registrasi dengan Kode Referral</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={register} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com" required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" required />
            </div>
            <div className="space-y-2">
              <Label>No. Handphone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Kode Referral</Label>
              <Input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="Masukkan kode referral" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={registering} className="bg-brand text-white hover:bg-brand-dark w-full sm:w-auto">
                {registering ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mendaftar...</> : 'Daftar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight">Dashboard Referral Saya</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-brand" /></div>
          ) : dashboard ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 border rounded-xl">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Kode Saya</div>
                  <div className="mt-1 font-bold text-lg">{dashboard.user.referralCode || '-'}</div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      navigator.clipboard.writeText(dashboard.user.referralCode || '');
                      setCopied(true); setTimeout(() => setCopied(false), 2000);
                    }}>
                      {copied ? <><Check className="h-4 w-4 mr-2" /> Tersalin</> : <><Copy className="h-4 w-4 mr-2" /> Salin</>}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      setCopied(true); setTimeout(() => setCopied(false), 2000);
                    }}>
                      Salin Link
                    </Button>
                  </div>
                </div>
                <div className="p-4 border rounded-xl">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Total Referral</div>
                  <div className="mt-1 font-bold text-lg">{dashboard.stats.totalReferrals}</div>
                </div>
                <div className="p-4 border rounded-xl">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Poin Referral</div>
                  <div className="mt-1 font-bold text-lg">{dashboard.stats.bonusPoints}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2 text-gray-700 font-semibold"><Users className="h-4 w-4" /> Anggota Referral</div>
                <div className="mt-3 grid gap-3">
                  {dashboard.user.referrals.length === 0 ? (
                    <div className="text-gray-500">Belum ada anggota yang bergabung.</div>
                  ) : (
                    dashboard.user.referrals.map((r) => (
                      <div key={r.id} className="p-3 border rounded-xl flex justify-between">
                        <div>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-gray-500">{r.email}</div>
                        </div>
                        <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString('id-ID')}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Silakan login untuk melihat dashboard referral Anda.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
