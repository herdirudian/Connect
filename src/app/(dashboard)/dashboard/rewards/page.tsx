'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Map, Award, CheckCircle2, Circle } from 'lucide-react';
import Image from 'next/image';
import { checkIsBirthdayPeriod } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface Passport {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  missions: Mission[];
}

interface Mission {
  id: string;
  name: string;
  targetCount: number;
  currentCount: number;
  pointsReward: number;
  isCompleted: boolean;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  isEarned: boolean;
  earnedAt: string | null;
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [passports, setPassports] = useState<Passport[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [rewardsRes, userRes, passportsRes, badgesRes] = await Promise.all([
        fetch('/api/rewards', { cache: 'no-store' }),
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/gamification/passports', { cache: 'no-store' }),
        fetch('/api/gamification/badges', { cache: 'no-store' })
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

      if (passportsRes.ok) {
        setPassports(await passportsRes.json());
      }
      if (badgesRes.ok) {
        setBadges(await badgesRes.json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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

      <Tabs defaultValue="rewards" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-8 bg-gray-100 p-1 rounded-2xl">
          <TabsTrigger value="rewards" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-sm">Rewards</TabsTrigger>
          <TabsTrigger value="passports" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-sm">Passports</TabsTrigger>
          <TabsTrigger value="badges" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-sm">Badges</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        </TabsContent>

        <TabsContent value="passports" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-6 md:grid-cols-2">
            {passports.length === 0 ? (
              <div className="col-span-full p-12 text-center text-gray-500">Belum ada Passport aktif saat ini.</div>
            ) : passports.map(passport => (
              <Card key={passport.id} className="border-gray-100 shadow-md rounded-3xl overflow-hidden flex flex-col bg-white">
                <div className="h-48 bg-gray-900 relative">
                  {passport.imageUrl && <Image src={passport.imageUrl} alt={passport.name} fill className="object-cover opacity-60" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{passport.name}</h3>
                    <p className="text-gray-300 text-sm">{passport.description}</p>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Missions</h4>
                  <div className="space-y-4">
                    {passport.missions.map(mission => (
                      <div key={mission.id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${mission.isCompleted ? 'bg-green-100 text-green-600' : 'bg-white text-gray-300 border border-gray-200'}`}>
                          {mission.isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                        </div>
                        <div className="flex-1">
                          <h5 className={`font-bold text-sm ${mission.isCompleted ? 'text-gray-900' : 'text-gray-600'}`}>{mission.name}</h5>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500">
                              Progress: {mission.currentCount} / {mission.targetCount}
                            </span>
                            <span className="text-xs font-bold text-brand">+{mission.pointsReward} PTS</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div 
                              className={`h-1.5 rounded-full ${mission.isCompleted ? 'bg-green-500' : 'bg-brand'}`} 
                              style={{ width: `${Math.min(100, (mission.currentCount / mission.targetCount) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="badges" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {badges.length === 0 ? (
              <div className="col-span-full p-12 text-center text-gray-500">Belum ada Badge yang tersedia.</div>
            ) : badges.map(badge => (
              <div key={badge.id} className={`p-6 rounded-3xl border flex flex-col items-center text-center transition-all ${badge.isEarned ? 'bg-white border-brand-100 shadow-md' : 'bg-gray-50 border-gray-100 opacity-60 grayscale'}`}>
                <div className="w-20 h-20 mb-4 relative">
                  {badge.imageUrl ? (
                    <Image src={badge.imageUrl} alt={badge.name} fill className="object-contain" />
                  ) : (
                    <div className={`w-full h-full rounded-full flex items-center justify-center ${badge.isEarned ? 'bg-brand-50 text-brand' : 'bg-gray-200 text-gray-400'}`}>
                      <Award size={32} />
                    </div>
                  )}
                </div>
                <h4 className="font-black text-gray-900 text-sm uppercase leading-tight mb-1">{badge.name}</h4>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{badge.description}</p>
                {badge.isEarned && badge.earnedAt && (
                  <span className="mt-3 text-[9px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md uppercase tracking-wider">
                    Earned
                  </span>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
