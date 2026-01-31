'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, CheckCircle, XCircle, Clock, Search, Loader2 } from 'lucide-react';
import { getTicketDetails, redeemTicket, TicketValidationResult } from '@/app/actions/ticket';
import { useToast } from '@/hooks/use-toast';

export default function ValidatePage() {
  const [ticketId, setTicketId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TicketValidationResult | null>(null);
  const { toast } = useToast();

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ticketId.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await getTicketDetails(ticketId);
      setResult(res);
      if (!res.success) {
        toast({
          title: "Error",
          description: res.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (id?: string) => {
    const targetId = id || result?.data?.id || result?.ticket?.id;
    if (!targetId) return;
    
    setLoading(true);
    try {
      const res = await redeemTicket(targetId);
      setResult(res);
      
      if (res.success) {
        toast({
          title: "Success",
          description: "Redemption successful!",
          className: "bg-green-600 text-white"
        });
      } else {
        toast({
          title: "Failed",
          description: res.message,
          variant: "destructive"
        });
      }
    } catch (error) {
       toast({
        title: "Error",
        description: "Failed to redeem",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: any) => {
    setResult({
      success: true,
      message: 'Item selected',
      type: item.type,
      data: item,
      ticket: item.type === 'TICKET' ? item : undefined
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Gatekeeper Validation</h2>
        <p className="text-muted-foreground">Scan atau masukkan ID tiket untuk validasi masuk.</p>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <QrCode className="h-5 w-5 text-brand" />
            Scan Ticket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="ticketId">Ticket ID / QR Code</Label>
              <Input 
                id="ticketId" 
                placeholder="Ex: TICKET-123-ABC" 
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                className="text-lg font-mono uppercase"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" size="lg" disabled={loading || !ticketId}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">Check</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* List View for Multiple Items */}
      {result?.type === 'LIST' && result.items && (
         <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                  Active Items ({result.items.length})
              </h3>
              <span className="text-sm text-muted-foreground">Select an item to redeem</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {result.items.map((item) => (
                    <Card 
                        key={`${item.type}-${item.id}`} 
                        className="cursor-pointer hover:border-blue-500 transition-colors border-l-4 border-l-green-500 shadow-sm"
                        onClick={() => handleSelect(item)}
                    >
                        <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {item.type}
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">
                                    ACTIVE
                                </span>
                            </div>
                            <CardTitle className="text-base font-bold text-gray-900 leading-tight mt-1">
                                {item.reward?.name || item.title || 'Unknown Item'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 text-sm text-gray-600">
                            <p className="mb-1">
                                <span className="font-semibold">User:</span> {item.user?.name}
                            </p>
                            <p>
                                <span className="font-semibold">Valid until:</span> {
                                    (item.type === 'PROMO' ? item.promo?.validUntil : item.validUntil) 
                                    ? new Date(item.type === 'PROMO' ? item.promo.validUntil : item.validUntil).toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })
                                    : 'One-time use'
                                }
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
         </div>
      )}

      {result && result.type !== 'LIST' && (result.data || result.ticket) && (() => {
        const item = result.data || result.ticket;
        const isVoucher = result.type === 'VOUCHER';
        const isPromo = result.type === 'PROMO';
        const title = isVoucher ? item.reward.name : isPromo ? item.promo.title : item.title;
        const description = isVoucher ? item.reward.description : isPromo ? item.promo.description : item.description;
        const label = isVoucher ? 'Voucher Details' : isPromo ? 'Partner Promo Details' : 'Ticket Details';
        
        return (
        <Card className={`border-2 shadow-xl overflow-hidden ${
          item.status === 'ACTIVE' ? 'border-green-100' : 'border-gray-100'
        }`}>
          <div className={`h-2 ${
             item.status === 'ACTIVE' ? 'bg-green-500' : 
             item.status === 'USED' ? 'bg-gray-400' : 'bg-red-500'
          }`} />
          
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                <CardTitle className="text-2xl font-black text-gray-900">{title}</CardTitle>
              </div>
              <div className={`px-4 py-2 rounded-full font-bold text-sm border ${
                 item.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' : 
                 item.status === 'USED' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-red-100 text-red-700 border-red-200'
              }`}>
                {item.status}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-gray-50 p-4 rounded-xl">
                 <p className="text-xs text-gray-500 font-bold uppercase mb-1">Holder Name</p>
                 <p className="font-bold text-gray-900 text-lg">{item.user.name}</p>
                 <p className="text-sm text-gray-500">{item.user.email}</p>
               </div>
               <div className="bg-gray-50 p-4 rounded-xl">
                 <p className="text-xs text-gray-500 font-bold uppercase mb-1">Valid Until</p>
                 <p className="font-bold text-gray-900 text-lg">
                   {isVoucher
                     ? 'One-time use'
                     : isPromo
                       ? (item.promo.validUntil
                           ? new Date(item.promo.validUntil).toLocaleDateString('id-ID', {
                               day: 'numeric',
                               month: 'long',
                               year: 'numeric',
                             })
                           : 'One-time use')
                       : new Date(item.validUntil).toLocaleDateString('id-ID', {
                           day: 'numeric',
                           month: 'long',
                           year: 'numeric',
                         })}
                 </p>
                 <p className="text-sm text-gray-500">
                    {isVoucher
                      ? 'Valid'
                      : isPromo
                        ? (item.promo.validUntil && new Date(item.promo.validUntil) < new Date()
                            ? <span className="text-red-500 font-bold">EXPIRED</span>
                            : 'Valid')
                        : (new Date(item.validUntil) < new Date()
                            ? <span className="text-red-500 font-bold">EXPIRED</span>
                            : 'Valid')}
                 </p>
               </div>
            </div>

            {description && (
               <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm">
                  {description}
               </div>
            )}

            {item.status === 'USED' && item.usedAt && (
                <div className="flex items-center gap-2 text-gray-500 justify-center bg-gray-50 p-3 rounded-lg">
                   <Clock className="h-4 w-4" />
                   <span className="text-sm font-medium">
                      Redeemed on {new Date(item.usedAt).toLocaleString('id-ID')}
                   </span>
                </div>
            )}
          </CardContent>

          <CardFooter className="bg-gray-50 p-6 flex justify-end">
             {item.status === 'ACTIVE' ? (
                <Button 
                   size="lg" 
                   className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg h-14 shadow-lg shadow-green-200"
                   onClick={() => handleRedeem(item.id)}
                   disabled={loading}
                >
                   {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                   VALIDATE & REDEEM {isVoucher ? 'VOUCHER' : isPromo ? 'PROMO' : 'TICKET'}
                </Button>
             ) : (
                <Button size="lg" variant="outline" className="w-full h-14 font-bold text-gray-400 cursor-not-allowed" disabled>
                   <XCircle className="mr-2 h-5 w-5" />
                   {(isVoucher ? 'VOUCHER' : isPromo ? 'PROMO' : 'TICKET')} CANNOT BE USED
                </Button>
             )}
          </CardFooter>
        </Card>
        );
      })()}
    </div>
  );
}
