'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Search, Ticket, Gift, Tag, Calendar } from 'lucide-react';
import { getTicketDetails, redeemTicket, TicketValidationResult, getRedemptionHistory, RedemptionHistoryItem } from '@/app/actions/ticket';
import { useToast } from '@/hooks/use-toast';

export default function AdminScanPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<TicketValidationResult | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<RedemptionHistoryItem[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const items = await getRedemptionHistory(50, dateFilter || undefined);
        setHistory(items);
      } catch {}
    })();
  }, [dateFilter]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code) return;
    
    setLoading(true);
    setResult(null);
    setSelectedItem(null);
    
    try {
      const res = await getTicketDetails(code);
      if (res.success) {
        setResult(res);
      } else {
        toast({
            title: "Not Found",
            description: res.message || "Item not found",
            variant: "destructive"
        });
        setResult(null);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (id?: string) => {
    const targetId = id || selectedItem?.id || result?.data?.id || result?.ticket?.id;
    if (!targetId) return;

    setLoading(true);
    try {
      const res = await redeemTicket(targetId);
      
      if (res.success) {
        // Update local state if it was a selection from list
        if (selectedItem && result?.type === 'LIST' && result.items) {
             const updatedItems = result.items.map(item => 
                item.id === targetId ? { ...item, status: 'USED' } : item
             );
             setResult({ ...result, items: updatedItems });
             setSelectedItem({ ...selectedItem, status: 'USED' });
        } else {
            setResult(res);
            setSelectedItem(null);
        }

        toast({
            title: "Success",
            description: res.message,
            className: "bg-green-600 text-white border-none"
        });
      } else {
        toast({
            title: "Redemption Failed",
            description: res.message,
            variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to redeem",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract display data
  const getDisplayData = () => {
    let item = selectedItem;
    let type = selectedItem?.type;

    if (!item && result && result.type !== 'LIST') {
        item = result.data || result.ticket;
        type = result.type;
    }

    if (!item) return null;
    
    let title = '';
    let description = '';
    let userName = item.user?.name || 'Unknown User';
    let status = item.status;
    let id = item.id;
    let Icon = Ticket;

    if (type === 'VOUCHER') {
        title = item.reward?.name || 'Voucher';
        description = item.reward?.description || '';
        Icon = Gift;
    } else if (type === 'PROMO') {
        title = item.promo?.title || 'Partner Promo';
        description = item.promo?.description || '';
        Icon = Tag;
    } else { // TICKET
        title = item.title || (item.reward?.name) || 'Ticket';
        description = item.description || (item.reward?.description) || '';
        Icon = Ticket;
    }

    return { title, description, userName, status, id, Icon };
  };

  const display = getDisplayData();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Scan Voucher</h2>
        <p className="text-gray-500 font-medium mt-1">Verify and redeem member vouchers, tickets, and promos</p>
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-8">
          <form onSubmit={handleSearch} className="flex gap-4 mb-8">
            <Input 
              placeholder="Enter code (Ticket, Voucher, Promo)..." 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-12 text-lg font-mono uppercase"
            />
            <Button type="submit" className="h-12 px-8 bg-brand-dark hover:bg-brand" disabled={loading}>
              <Search className="h-5 w-5" />
            </Button>
          </form>

          {/* LIST VIEW */}
          {result?.type === 'LIST' && !selectedItem && result.items && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Active Items ({result.items.length})</h3>
                  <span className="text-sm text-gray-500">Select to redeem</span>
                </div>
                <div className="grid gap-3">
                    {result.items.map((item) => (
                        <div 
                            key={`${item.type}-${item.id}`}
                            onClick={() => setSelectedItem(item)}
                            className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:border-brand hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${item.type === 'VOUCHER' ? 'bg-purple-100 text-purple-600' : item.type === 'PROMO' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {item.type === 'VOUCHER' ? <Gift className="h-6 w-6" /> : item.type === 'PROMO' ? <Tag className="h-6 w-6" /> : <Ticket className="h-6 w-6" />}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{item.reward?.name || item.title || (item.promo?.title) || 'Item'}</p>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{item.type}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-2 py-1 text-xs font-bold rounded uppercase ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {item.status || 'ACTIVE'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          )}

          {/* SINGLE ITEM VIEW */}
          {display && (
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 text-center animate-in fade-in slide-in-from-bottom-4">
               {selectedItem && (
                   <div className="mb-4 flex justify-start">
                       <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-gray-900">
                           &larr; Back to List
                       </Button>
                   </div>
               )}
               
               <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${display.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                  {display.status === 'ACTIVE' ? <display.Icon className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
               </div>
               
               <h3 className="text-2xl font-black text-gray-900 mb-2">{display.title}</h3>
               <p className="text-gray-500 font-medium mb-6">{display.description}</p>
               
               <div className="grid grid-cols-2 gap-4 mb-8 text-left max-w-sm mx-auto bg-white p-4 rounded-xl shadow-sm">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Holder</p>
                    <p className="font-bold text-gray-900">{display.userName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Status</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase ${display.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {display.status}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">ID</p>
                    <p className="font-mono text-sm text-gray-600 break-all">{display.id}</p>
                  </div>
               </div>

               {display.status === 'ACTIVE' ? (
                  <Button onClick={() => handleRedeem(display.id)} disabled={loading} className="w-full bg-brand text-white hover:bg-brand-dark h-12 rounded-xl font-bold uppercase tracking-wider text-lg shadow-lg shadow-brand/20">
                    {loading ? 'Processing...' : 'Redeem Now'}
                  </Button>
               ) : (
                  <div className="text-gray-400 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Already redeemed
                  </div>
               )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Redemption History</h3>
            <div className="flex items-center gap-2">
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input 
                        type="date" 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="pl-9 h-9 w-40 text-sm"
                    />
                </div>
                <span className="text-xs text-gray-500">Latest 50</span>
            </div>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No redemption performed yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={`${h.type}-${h.id}-${h.usedAt}`} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      h.type === 'VOUCHER' ? 'bg-purple-100 text-purple-600' : h.type === 'PROMO' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {h.type === 'VOUCHER' ? <Gift className="h-4 w-4" /> : h.type === 'PROMO' ? <Tag className="h-4 w-4" /> : <Ticket className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{h.title}</p>
                      <p className="text-xs text-gray-500">by {h.userName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">{new Date(h.usedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
