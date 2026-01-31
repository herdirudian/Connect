'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, ShoppingCart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'EARN' | 'REDEEM'>('ALL');

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      const res = await fetch('/api/user/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'ALL') return true;
    return tx.type === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Points History</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mt-1">Track your earnings and redemptions</p>
        </div>
      </div>

      <div className="flex gap-2">
         <Button 
            variant={filter === 'ALL' ? 'primary' : 'outline'} 
            onClick={() => setFilter('ALL')}
            size="sm"
            className="rounded-full"
         >
            All
         </Button>
         <Button 
            variant={filter === 'EARN' ? 'primary' : 'outline'} 
            onClick={() => setFilter('EARN')}
            size="sm"
            className="rounded-full"
         >
            Earned
         </Button>
         <Button 
            variant={filter === 'REDEEM' ? 'primary' : 'outline'} 
            onClick={() => setFilter('REDEEM')}
            size="sm"
            className="rounded-full"
         >
            Redeemed
         </Button>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
         <CardContent className="p-0">
            {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : filteredTransactions.length > 0 ? (
               <div className="divide-y divide-gray-100">
                  {filteredTransactions.map((tx: any) => (
                     <div key={tx.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              tx.type === 'EARN' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                           }`}>
                              {tx.type === 'EARN' ? <TrendingUp className="h-6 w-6" /> : <ShoppingCart className="h-6 w-6" />}
                           </div>
                           <div>
                              <p className="font-bold text-gray-900">{tx.description}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                                   {new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                                <span className="text-xs text-gray-300">•</span>
                                <span className="text-xs text-gray-400 font-medium">
                                   {new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                           </div>
                        </div>
                        <div className={`text-right font-black ${
                           tx.type === 'EARN' ? 'text-green-600' : 'text-orange-600'
                        }`}>
                           {tx.type === 'EARN' ? '+' : '-'}{tx.amount} PTS
                        </div>
                     </div>
                  ))}
               </div>
            ) : (
               <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                  <p className="font-medium">No transactions found</p>
               </div>
            )}
         </CardContent>
      </Card>
    </div>
  );
}
