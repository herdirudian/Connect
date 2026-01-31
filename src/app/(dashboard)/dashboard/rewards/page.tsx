'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
import Image from 'next/image';
import { checkIsBirthdayPeriod } from '@/lib/utils';

interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: string;
  imageUrl?: string;
  active: boolean;
  claimed?: boolean;
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [rewardsRes, userRes] = await Promise.all([
        fetch('/api/rewards', { cache: 'no-store' }),
        fetch('/api/auth/me', { cache: 'no-store' })
      ]);

      let dob: string | null = null;
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserPoints(userData.user?.points || 0);
        dob = userData.user?.dateOfBirth;
      }

      if (rewardsRes.ok) {
        let rewardsData = await rewardsRes.json();
        const isBirthday = checkIsBirthdayPeriod(dob);
        
        // Filter active and birthday check
        rewardsData = rewardsData.filter((r: any) => {
            if (!r.active) return false;
            if (r.type === 'BIRTHDAY') return isBirthday;
            return true;
        });
        
        setRewards(rewardsData);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem(rewardId: string) {
    try {
      setMessage(null);
      setRedeemingId(rewardId);
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId })
      });
      const data = await res.json();
      if (res.ok) {
        setUserPoints(data.user?.points ?? userPoints);
        setMessage({ type: 'success', text: 'Redeem berhasil' });
        setRewards(prev => prev.map(r => r.id === rewardId ? { ...r, claimed: true } : r));
      } else {
        setMessage({ type: 'error', text: data.error || 'Redeem gagal' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Redeem gagal' });
    } finally {
      setRedeemingId(null);
    }
  }

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Benefit & Reward</h2>
          <p className="text-gray-500 font-medium mt-1">Exchange your adventure points for exclusive perks.</p>
        </div>
        <div className="px-5 py-2 rounded-xl bg-brand-50 border border-brand-100 text-brand-dark font-bold text-sm flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
           Your Balance: {userPoints.toLocaleString()} PTS
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rewards.map((item) => (
          <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 border-gray-100 shadow-md overflow-hidden flex flex-col h-full rounded-2xl bg-white">
            <div className="h-48 bg-gray-50 relative overflow-hidden flex items-center justify-center group-hover:bg-brand-50/50 transition-colors">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
              ) : (
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-brand shadow-sm">
                    <Gift className="h-10 w-10" />
                  </div>
              )}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-black text-brand-dark shadow-sm border border-gray-100">
                 REWARD
              </div>
            </div>
            <CardHeader className="pb-2 pt-6 px-6">
              <div className="flex justify-between items-start gap-4">
                <CardTitle className="text-xl font-black text-gray-900 leading-tight uppercase tracking-tight">{item.name}</CardTitle>
                <span className={`px-3 py-1 rounded-lg text-sm font-black whitespace-nowrap shadow-sm ${
                    item.cost === 0 ? 'bg-green-500 text-white' : 'bg-brand text-white'
                }`}>
                  {item.cost === 0 ? 'FREE' : `${item.cost} PTS`}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col px-6 pb-6">
              <p className="text-gray-500 mb-6 text-sm font-medium leading-relaxed">{item.description}</p>
              <div className="mt-auto">
                <Button
                  className={`w-full font-bold uppercase tracking-wider h-12 rounded-xl shadow-none ${
                    redeemingId === item.id || item.claimed || (item.cost > 0 && userPoints < item.cost) 
                      ? 'bg-gray-100 text-gray-400 border-none' 
                      : 'bg-brand-dark hover:bg-brand text-white'
                  }`}
                  onClick={() => handleRedeem(item.id)}
                  disabled={redeemingId === item.id || item.claimed || (item.cost > 0 && userPoints < item.cost)}
                >
                  {redeemingId === item.id ? 'Processing...' : 
                   item.claimed ? 'Claimed' :
                   (item.cost > 0 && userPoints < item.cost) ? 'Insufficient Points' : 'Redeem Reward'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
