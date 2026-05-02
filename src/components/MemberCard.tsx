'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { X, ZoomIn, Ticket, Calendar } from 'lucide-react';

interface ActiveItem {
  id: string;
  type: string;
  name: string;
  category: string;
  date: string | null;
  status: string;
}

export default function MemberCard({ user }: { user: any }) {
  const [qrUrl, setQrUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [tiers, setTiers] = useState<any[]>([]);
  const [activeItems, setActiveItems] = useState<ActiveItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (user?.id) {
      QRCode.toDataURL(JSON.stringify({ id: user.id, type: 'MEMBER' }))
        .then(url => setQrUrl(url))
        .catch(err => console.error(err));
    }
  }, [user]);

  useEffect(() => {
    fetchTiers();
  }, []);

  useEffect(() => {
    if (showQrModal) {
      fetchActiveItems();
    }
  }, [showQrModal]);

  async function fetchActiveItems() {
    setLoadingItems(true);
    try {
      const res = await fetch('/api/user/active-items');
      if (res.ok) {
        const data = await res.json();
        setActiveItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch active items', error);
    } finally {
      setLoadingItems(false);
    }
  }

  async function fetchTiers() {
    try {
      const res = await fetch('/api/tiers');
      if (res.ok) {
        const data = await res.json();
        setTiers(data.sort((a: any, b: any) => a.minPoints - b.minPoints));
      }
    } catch (error) {
      console.error('Failed to fetch tiers', error);
    }
  }

  const points = user?.points || 0;
  
  // Dynamic Tier Logic
  const getTierProgress = (currentPoints: number) => {
    if (tiers.length === 0) return { nextTierName: 'Loading...', pointsNeeded: 0, progress: 0 };

    // Find current tier
    let currentTierIndex = 0;
    for (let i = tiers.length - 1; i >= 0; i--) {
        if (currentPoints >= tiers[i].minPoints) {
            currentTierIndex = i;
            break;
        }
    }

    // Check if max level
    if (currentTierIndex >= tiers.length - 1) {
        return { nextTierName: 'MAX LEVEL', pointsNeeded: 0, progress: 100 };
    }

    const nextTier = tiers[currentTierIndex + 1];
    const currentTier = tiers[currentTierIndex];
    
    // Progress calculation based on range between current and next
    // Range = Next - Current
    // Progress = (Points - Current) / Range
    // Example: Current 1000, Next 5000. User 3000.
    // Range = 4000. Progress = (3000 - 1000) / 4000 = 0.5 (50%)
    
    // However, if using absolute points (0 to 5000) for progress bar?
    // Usually progress bars for levels show progress within the level.
    const range = nextTier.minPoints - currentTier.minPoints;
    const progressInLevel = currentPoints - currentTier.minPoints;
    const progress = Math.min(100, Math.max(0, (progressInLevel / range) * 100));

    return {
      nextTierName: nextTier.name,
      pointsNeeded: nextTier.minPoints - currentPoints,
      progress
    };
  };

  const { nextTierName, pointsNeeded, progress } = getTierProgress(points);

  return (
    <Card className="bg-gradient-to-br from-brand to-brand-dark text-white overflow-hidden relative w-full h-full shadow-2xl border-none rounded-2xl">
      <div className="absolute top-0 right-0 p-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 p-32 bg-black/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
      
      <CardContent className="p-6 sm:p-8 relative z-10 flex flex-col justify-between h-full min-h-[240px]">
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="bg-white/95 w-14 h-14 sm:w-[72px] sm:h-[72px] flex items-center justify-center rounded-2xl mb-3 shadow-sm">
              <Image src="/logotlm.png" alt="The Lodge" width={140} height={52} className="w-10 sm:w-14 h-auto object-contain" />
            </div>
            <h2 className="text-xs sm:text-sm font-medium text-brand-100 tracking-wider uppercase">Access Pass</h2>
          </div>
          <div 
            className="bg-white p-2 rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform group relative shrink-0"
            onClick={() => setShowQrModal(true)}
          >
             {qrUrl ? (
                <>
                   <img src={qrUrl} alt="Member QR" className="w-20 h-20 sm:w-24 sm:h-24 mix-blend-multiply" />
                   <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="text-brand-dark h-6 w-6" />
                   </div>
                </>
             ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 animate-pulse rounded-lg" />
             )}
          </div>
        </div>
        
        {/* QR Code Modal - Moved to Portal */}
        {showQrModal && createPortal(
           <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full relative shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                 <button 
                    onClick={() => setShowQrModal(false)}
                    className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
                 >
                    <X className="h-6 w-6 text-gray-600" />
                 </button>
                 
                 <div className="text-center space-y-4 shrink-0">
                    <div>
                       <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Access Pass</h3>
                       <p className="text-gray-500 font-medium text-sm">Scan at the gate</p>
                    </div>
                    
                    <div className="bg-white border-2 border-brand-100 p-4 rounded-3xl inline-block shadow-lg">
                       <img src={qrUrl} alt="Large Member QR" className="w-48 h-48 mix-blend-multiply" />
                    </div>

                    <div>
                      <p className="font-bold text-lg text-gray-900">{user.name}</p>
                      <p className="text-brand font-bold uppercase tracking-widest text-xs mb-1">{user.tier || 'MEMBER'}</p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                         <p className="text-sm text-gray-800 font-black font-mono bg-yellow-100 px-4 py-2 rounded-lg border border-yellow-200 shadow-sm tracking-wider">
                            ID: {user.id}
                         </p>
                      </div>
                   </div>
                </div>

                {/* Active Items Section */}
                <div className="mt-6 border-t border-gray-100 pt-4 flex-1 overflow-y-auto min-h-0">
                   <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 text-center">Your Active Items</h4>
                   {loadingItems ? (
                      <div className="text-center py-4 text-gray-400 text-sm">Loading items...</div>
                   ) : activeItems.length > 0 ? (
                      <div className="space-y-3">
                         {activeItems.map((item) => (
                            <div key={item.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-start gap-3">
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.type === 'VOUCHER' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {item.type === 'VOUCHER' ? <Ticket size={18} /> : <Calendar size={18} />}
                               </div>
                               <div className="flex-1 min-w-0 text-left">
                                  <p className="font-bold text-gray-900 text-sm truncate">{item.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                     <span className="text-xs text-gray-500 font-medium">{item.category}</span>
                                     {item.date && (
                                        <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">
                                           {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                        </span>
                                     )}
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                         No active vouchers or bookings found.
                      </div>
                   )}
                </div>
             </div>
             <div className="absolute inset-0 -z-10" onClick={() => setShowQrModal(false)}></div>
           </div>,
           document.body
        )}
        
        <div className="space-y-6">
          <div className="flex justify-between items-end">
             <div>
                <p className="text-xs text-brand-100 uppercase tracking-wider mb-1">Adventurer</p>
                <p className="text-xl sm:text-2xl font-black tracking-tight text-white line-clamp-1">{user.name.toUpperCase()}</p>
             </div>
             <div className="text-right shrink-0 ml-2">
                <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/10">
                   <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase">{user.tier || 'MEMBER'}</span>
                </div>
             </div>
          </div>

          {/* Progress Tier Section */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-brand-100">
              <span>Progress to {nextTierName}</span>
              <span>{pointsNeeded > 0 ? `${pointsNeeded.toLocaleString()} PTS left` : 'Completed'}</span>
            </div>
            <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/10 flex justify-between items-end">
             <Link href="/dashboard/history" className="group">
                <p className="text-xs text-brand-100 uppercase tracking-wider mb-1 group-hover:text-white transition-colors">Adventure Points</p>
                <p className="text-3xl font-black tabular-nums group-hover:text-yellow-400 transition-colors">{points.toLocaleString()}</p>
             </Link>
             <div className="text-right">
                <p className="text-xs text-brand-100 uppercase tracking-wider mb-1">Joined Date</p>
                <p className="text-sm font-medium">{new Date(user.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-[10px] text-white/50 font-mono mt-1">#{user.id.substring(0,8)}</p>
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
