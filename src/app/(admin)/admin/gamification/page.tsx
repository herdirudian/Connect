'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge as BadgeUI } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, Map, Award, CheckCircle2, Circle } from 'lucide-react';
import Image from 'next/image';

interface Mission {
  id: string;
  name: string;
  targetCount: number;
  pointsReward: number;
}

interface Passport {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  active: boolean;
  missions: Mission[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  condition: string | null;
  active: boolean;
}

export default function AdminGamificationPage() {
  const [passports, setPassports] = useState<Passport[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [pRes, bRes] = await Promise.all([
        fetch('/api/gamification/passports'),
        fetch('/api/gamification/badges')
      ]);
      if (pRes.ok) setPassports(await pRes.json());
      if (bRes.ok) setBadges(await bRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 uppercase italic">Gamification</h2>
        <p className="text-muted-foreground">Kelola Passport, Misi, dan Lencana (Badge) untuk member.</p>
      </div>

      <Tabs defaultValue="passports" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 bg-gray-100 p-1 rounded-2xl">
          <TabsTrigger value="passports" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-sm">Passports & Missions</TabsTrigger>
          <TabsTrigger value="badges" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-sm">Badges</TabsTrigger>
        </TabsList>

        <TabsContent value="passports" className="space-y-6">
          <div className="flex justify-end">
            <Button className="bg-brand hover:bg-brand-dark">
              <Plus size={16} className="mr-2" /> Add Passport
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {loading ? <div className="p-4 text-center">Loading...</div> : passports.map(passport => (
              <Card key={passport.id} className="overflow-hidden border-gray-100 shadow-md">
                <div className="h-40 bg-gray-900 relative">
                  {passport.imageUrl && <Image src={passport.imageUrl} alt={passport.name} fill className="object-cover opacity-50" />}
                  <div className="absolute top-4 right-4">
                    <BadgeUI className={passport.active ? 'bg-green-500' : 'bg-gray-400'}>
                      {passport.active ? 'Active' : 'Inactive'}
                    </BadgeUI>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-xl font-black uppercase">{passport.name}</h3>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-6">{passport.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 uppercase text-xs tracking-wider">Missions ({passport.missions?.length || 0})</h4>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      <Plus size={14} className="mr-1" /> Add Mission
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {passport.missions?.map(mission => (
                      <div key={mission.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{mission.name}</p>
                          <p className="text-xs text-gray-500">Target: {mission.targetCount}x | Reward: <span className="text-brand font-bold">{mission.pointsReward} pts</span></p>
                        </div>
                        <div className="flex gap-2">
                          <button className="text-gray-400 hover:text-brand"><Edit2 size={14} /></button>
                          <button className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                    <Button variant="outline" size="sm"><Edit2 size={14} className="mr-2" /> Edit</Button>
                    <Button variant="destructive" size="sm"><Trash2 size={14} className="mr-2" /> Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="badges" className="space-y-6">
          <div className="flex justify-end">
            <Button className="bg-brand hover:bg-brand-dark">
              <Plus size={16} className="mr-2" /> Add Badge
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                <tr>
                  <th className="px-6 py-4">Badge</th>
                  <th className="px-6 py-4">Condition</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-4 text-center">Loading...</td></tr>
                ) : badges.map(badge => (
                  <tr key={badge.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 relative bg-brand-50 rounded-full flex items-center justify-center">
                          {badge.imageUrl ? <Image src={badge.imageUrl} alt={badge.name} fill className="object-contain p-1" /> : <Award className="text-brand" size={16} />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{badge.name}</p>
                          <p className="text-xs text-gray-500">{badge.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      {badge.condition || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <BadgeUI className={badge.active ? 'bg-green-500' : 'bg-gray-400'}>
                        {badge.active ? 'Active' : 'Inactive'}
                      </BadgeUI>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Edit2 size={14} /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600"><Trash2 size={14} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}