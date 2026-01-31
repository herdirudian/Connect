'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Star, Crown, Shield, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function MembershipPage() {
  const [user, setUser] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchUser(), fetchTiers()]).finally(() => setLoading(false));
  }, []);

  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }

  async function fetchTiers() {
    try {
      const res = await fetch('/api/tiers');
      if (res.ok) {
        const data = await res.json();
        // Ensure sorted by minPoints
        setTiers(data.sort((a: any, b: any) => a.minPoints - b.minPoints));
      }
    } catch (error) {
      console.error('Error fetching tiers:', error);
    }
  }

  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'Crown': return Crown;
      case 'Shield': return Shield;
      case 'Star': return Star;
      default: return Star;
    }
  };

  const getCurrentTier = (currentPoints: number) => {
    if (tiers.length === 0) return null;
    // Find the highest tier that the user qualifies for
    for (let i = tiers.length - 1; i >= 0; i--) {
        if (currentPoints >= tiers[i].minPoints) {
            return tiers[i];
        }
    }
    return tiers[0];
  };

  const getNextTier = (currentPoints: number) => {
    if (tiers.length === 0) return null;
    const currentTier = getCurrentTier(currentPoints);
    if (!currentTier) return tiers[0];
    
    const currentIndex = tiers.findIndex(t => t.id === currentTier.id || t.tier === currentTier.tier);
    if (currentIndex >= tiers.length - 1) return null;
    
    return tiers[currentIndex + 1];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  const currentPoints = user?.points || 0;
  const nextTier = getNextTier(currentPoints);
  const currentTier = getCurrentTier(currentPoints);
  
  // Calculate progress
  // If nextTier exists, progress is based on (current - currentTierBase) / (nextTierBase - currentTierBase)
  // OR just absolute progress towards next tier?
  // Previous logic: (currentPoints / nextTier.minPoints) * 100. This is simple and works for 0-based start.
  // But if tiers are 0, 1000, 5000.
  // User has 500. Next is 1000. 500/1000 = 50%.
  // User has 1500. Next is 5000. 1500/5000 = 30%.
  const progress = nextTier 
    ? Math.min(100, Math.max(0, (currentPoints / nextTier.minPoints) * 100))
    : 100;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Membership Level</h2>
        <p className="text-gray-500 font-medium mt-1">Unlock exclusive benefits as you explore more.</p>
      </div>

      {/* Current Status Card */}
      <div className="bg-gradient-to-br from-brand to-brand-dark rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <p className="text-brand-100 font-bold uppercase tracking-widest text-sm mb-2">Current Status</p>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">{user?.tier || currentTier?.name || 'EXPLORER'}</h1>
                </div>
                <div className="text-right">
                    <p className="text-4xl font-black">{currentPoints.toLocaleString()}</p>
                    <p className="text-brand-100 font-bold uppercase tracking-wider text-xs">Total Points</p>
                </div>
            </div>

            {nextTier ? (
                <div className="space-y-3">
                    <div className="flex justify-between text-sm font-bold uppercase tracking-wider text-brand-100">
                        <span>Progress to {nextTier.name}</span>
                        <span>{nextTier.minPoints - currentPoints} pts needed</span>
                    </div>
                    <Progress value={progress} className="h-3 bg-black/20" indicatorClassName="bg-white" />
                </div>
            ) : (
                <div className="bg-white/20 backdrop-blur-md p-4 rounded-xl inline-flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-yellow-300" />
                    <span className="font-bold uppercase tracking-wider">Max Level Reached! You are a legend.</span>
                </div>
            )}
        </div>
      </div>

      {/* Tiers Grid */}
      <div>
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-6">Tier Benefits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier) => {
                // Determine if this is the current tier
                // Logic: User's tier field matches tier.tier ID OR fallback to calculated currentTier
                const isCurrent = (user?.tier === tier.tier) || (!user?.tier && currentTier?.tier === tier.tier);
                const isUnlocked = currentPoints >= tier.minPoints;
                const Icon = getIcon(tier.icon);

                return (
                    <Card key={tier.id || tier.tier} className={`rounded-2xl border bg-white relative overflow-hidden group transition-all duration-300 ${isCurrent ? 'border-brand shadow-xl ring-1 ring-brand/20 z-10' : 'border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-brand/30'}`}>
                        {isCurrent && (
                            <div className="absolute top-0 right-0 bg-brand text-white text-xs font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm">
                                Current Plan
                            </div>
                        )}
                        <CardHeader className="pb-4">
                            <div className={`w-14 h-14 rounded-2xl ${tier.color} text-white flex items-center justify-center mb-4 shadow-lg`}>
                                <Icon className="h-7 w-7" strokeWidth={2.5} />
                            </div>
                            <CardTitle className="text-xl font-black text-gray-900 uppercase tracking-tight mb-1">{tier.name}</CardTitle>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                {tier.minPoints === 0 ? 'Entry Level' : `${tier.minPoints.toLocaleString()} Points`}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {tier.benefits.map((benefit: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm font-medium text-gray-600">
                                        <div className={`mt-0.5 rounded-full p-0.5 ${isUnlocked ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <Check className="h-3 w-3" />
                                        </div>
                                        <span className={isUnlocked ? 'text-gray-900' : 'text-gray-500'}>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                            
                            {!isUnlocked && (
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <p className="text-xs text-center font-bold text-gray-400 uppercase">
                                        {tier.minPoints - currentPoints} more points to unlock
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
      </div>
    </div>
  );
}
