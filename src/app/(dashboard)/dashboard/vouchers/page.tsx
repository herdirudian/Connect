'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, X, CheckCircle, Clock } from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';

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

interface UserReward {
  id: string;
  userId: string;
  rewardId: string;
  status: string; // ACTIVE, USED
  createdAt: string;
  usedAt?: string;
  reward: Reward;
}

export default function VouchersPage() {
  const [availableRewards, setAvailableRewards] = useState<Reward[]>([]);
  const [myVouchers, setMyVouchers] = useState<UserReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // QR Code Modal State
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<UserReward | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [rewardsRes, userRes, myVouchersRes] = await Promise.all([
        fetch('/api/rewards', { cache: 'no-store' }),
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/user/vouchers', { cache: 'no-store' })
      ]);

      if (rewardsRes.ok) {
        const rewardsData = await rewardsRes.json();
        const vouchers = rewardsData.filter((r: Reward) => r.type === 'VOUCHER');
        setAvailableRewards(vouchers);
      }

      if (userRes.ok) {
        const userData = await userRes.json();
        setUserPoints(userData.user?.points || 0);
      }

      if (myVouchersRes.ok) {
        const vouchersData = await myVouchersRes.json();
        setMyVouchers(vouchersData);
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
        setMessage({ type: 'success', text: 'Voucher claimed successfully!' });
        
        // Update local state
        setAvailableRewards(prev => prev.map(r => r.id === rewardId ? { ...r, claimed: true } : r));
        
        // Add to my vouchers
        if (data.userReward) {
            // Need to fetch full reward details or merge it
            const rewardDetails = availableRewards.find(r => r.id === rewardId);
            if (rewardDetails) {
                const newVoucher: UserReward = {
                    ...data.userReward,
                    reward: rewardDetails
                };
                setMyVouchers(prev => [newVoucher, ...prev]);
                
                // Automatically show QR for the new voucher
                showQr(newVoucher);
            }
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to claim voucher' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to claim voucher' });
    } finally {
      setRedeemingId(null);
    }
  }

  const showQr = async (voucher: UserReward) => {
    try {
      const url = await QRCode.toDataURL(voucher.id);
      setQrCodeUrl(url);
      setSelectedVoucher(voucher);
    } catch (err) {
      console.error(err);
    }
  };

  const closeQrModal = () => {
    setSelectedVoucher(null);
    setQrCodeUrl(null);
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tight">My Vouchers</h2>
          <p className="text-gray-500 font-medium mt-1">Manage and redeem your vouchers.</p>
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

      {/* Active Vouchers Section */}
      {myVouchers.length > 0 && (
        <div className="space-y-4">
            <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight">Your Active Vouchers</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myVouchers.map((voucher) => (
                    <Card key={voucher.id} className={`border-l-4 shadow-md overflow-hidden flex flex-col h-full rounded-xl bg-white ${voucher.status === 'USED' ? 'border-l-gray-300' : 'border-l-brand'}`}>
                        <CardContent className="p-6 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center text-brand">
                                    <Ticket className="h-6 w-6" />
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${voucher.status === 'USED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                    {voucher.status === 'USED' ? 'CLAIMED' : voucher.status}
                                </span>
                            </div>
                            <h4 className="font-bold text-gray-900 text-lg mb-1">{voucher.reward.name}</h4>
                            <p className="text-gray-500 text-sm mb-4 line-clamp-2">{voucher.reward.description}</p>
                            
                            <div className="mt-auto pt-4 border-t border-gray-100">
                                {voucher.status === 'ACTIVE' ? (
                                    <Button 
                                        onClick={() => showQr(voucher)}
                                        className="w-full bg-brand text-white hover:bg-brand-dark font-bold uppercase tracking-wider"
                                    >
                                        Show QR Code
                                    </Button>
                                ) : (
                                    <Button 
                                        disabled
                                        className="w-full bg-red-600 text-white font-bold uppercase tracking-wider opacity-100 disabled:opacity-100 disabled:bg-red-600 disabled:text-white"
                                    >
                                        Claimed
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
      )}

      {/* Available Rewards Section */}
      <div className="space-y-4 pt-8 border-t border-gray-100">
        <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight">Available to Claim</h3>
        {availableRewards.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                <p className="text-gray-500 font-medium">No vouchers available at the moment.</p>
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {availableRewards.filter(r => r.active).map((item) => {
                    const isClaimed = myVouchers.some(v => v.rewardId === item.id && item.cost === 0);
                    return (
                    <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 border-gray-100 shadow-md overflow-hidden flex flex-col h-full rounded-2xl bg-white">
                        <div className="h-40 bg-gray-50 relative overflow-hidden flex items-center justify-center group-hover:bg-brand-50/50 transition-colors">
                            {item.imageUrl ? (
                                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                            ) : (
                                <Ticket className="h-10 w-10 text-brand-200" />
                            )}
                             <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-black text-brand-dark shadow-sm">
                                {item.cost === 0 ? 'FREE' : `${item.cost} PTS`}
                            </div>
                        </div>
                        <CardContent className="p-6 flex-1 flex flex-col">
                            <h4 className="font-bold text-gray-900 mb-2">{item.name}</h4>
                            <p className="text-gray-500 text-sm mb-4 line-clamp-2">{item.description}</p>
                            <div className="mt-auto">
                                <Button
                                    className={`w-full font-bold uppercase tracking-wider rounded-xl shadow-none ${
                                        redeemingId === item.id || isClaimed || (item.cost > 0 && userPoints < item.cost) 
                                        ? 'bg-gray-100 text-gray-400 border-none' 
                                        : 'bg-brand-dark hover:bg-brand text-white'
                                    }`}
                                    onClick={() => handleRedeem(item.id)}
                                    disabled={redeemingId === item.id || isClaimed || (item.cost > 0 && userPoints < item.cost)}
                                >
                                    {redeemingId === item.id ? 'Processing...' : 
                                     isClaimed ? 'Claimed' :
                                     (item.cost > 0 && userPoints < item.cost) ? 'Insufficient Points' : 'Claim'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )})}
            </div>
        )}
      </div>

      {/* QR Code Modal Overlay */}
      {selectedVoucher && qrCodeUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
                <button 
                    onClick={closeQrModal}
                    className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
                
                <div className="text-center space-y-6">
                    <div>
                        <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight mb-1">Redeem Voucher</h3>
                        <p className="text-gray-500 text-sm font-medium">Show this QR code to the staff</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-2xl border-2 border-brand-100 shadow-inner inline-block">
                        <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="text-xs text-gray-400 uppercase font-bold mb-1">Voucher Name</p>
                        <p className="font-bold text-gray-900">{selectedVoucher.reward.name}</p>
                        <div className="h-px bg-gray-200 my-3"></div>
                        <p className="text-xs text-gray-400 uppercase font-bold mb-1">Voucher Code</p>
                        <p className="font-mono text-lg font-bold text-brand tracking-widest">{selectedVoucher.id.substring(0, 8).toUpperCase()}</p>
                    </div>

                    <p className="text-xs text-gray-400 font-medium">
                        Valid until used. One-time use only.
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
