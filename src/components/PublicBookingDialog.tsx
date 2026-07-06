'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PAYMENT_METHODS, calculateFee } from '@/lib/fees';
import { TermsAndConditionsDialog } from '@/components/TermsAndConditionsDialog';

interface BookingItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  type: 'WAHANA' | 'GLAMPING';
  availability?: number;
  isEvent?: boolean;
  eventDate?: string | null;
  eventPromoPrice?: number | null;
  eventPromoQuota?: number | null;
  eventSoldQuota?: number | null;
  normalPrice?: number; // Added to store the base price for split calculation
}

interface PublicBookingDialogProps {
  item: BookingItem | null;
  allItems?: BookingItem[]; // List of other available items to add
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
  maxQty?: number;
}

export function PublicBookingDialog({ item, allItems = [], open, onOpenChange, initialDate, maxQty }: PublicBookingDialogProps) {
  const [date, setDate] = useState<string>(initialDate || '');
  // Cart state: map of itemId -> quantity
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [isAddingMore, setIsAddingMore] = useState(false);
  const [inventory, setInventory] = useState<BookingItem[]>([]);
  const [fetchingAvailability, setFetchingAvailability] = useState(false);
  
  // Guest Info
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCity, setGuestCity] = useState('');

  const [promoCode, setPromoCode] = useState('');
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]?.id || 'BCA_VA');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getLocalDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      if (item?.isEvent && item.eventDate) {
        setDate(item.eventDate.split('T')[0]);
      } else {
        setDate(initialDate || getLocalDateString());
      }
      // Initialize cart with the primary item
      if (item) {
        setCart({ [item.id]: 1 });
      }
      setIsAddingMore(false);
      setInventory([]);
      setPromoCode('');
      setPromoDiscount(0);
    }
  }, [open, initialDate, item, allItems, maxQty]);

  // Fetch availability when date changes
  useEffect(() => {
    let isActive = true;

    async function fetchAvailability() {
      // If date is empty or item is missing, do nothing
      if (!date || !item) return;
      
      // Fetch availability/pricing based on type
      if (item.type !== 'GLAMPING') {
        try {
          const res = await fetch(`/api/attractions?date=${date}`);
          const data = await res.json();
          if (Array.isArray(data)) {
            setInventory(data.map((i: any) => ({
              id: i.id,
              name: i.name,
              price: i.price,
              originalPrice: i.originalPrice,
              type: 'WAHANA',
              isEvent: i.isEvent,
              eventDate: i.eventDate,
              availability: i.isEvent && i.eventMaxQuota ? Math.max(0, i.eventMaxQuota - (i.eventSoldQuota || 0)) : undefined
            })));
          }
        } catch (e) {}
        return;
      }

      if (date === initialDate) {
         if (isActive) setInventory([]); 
         return;
      }
      
      if (isActive) setFetchingAvailability(true);
      try {
        const res = await fetch(`/api/accommodations?date=${date}`);
        if (!isActive) return;
        
        const data = await res.json();
        
        if (isActive && Array.isArray(data)) {
           setInventory(data.map((i: any) => ({
             id: i.id,
             name: i.name,
             price: i.price,
             originalPrice: i.originalPrice,
             type: 'GLAMPING', 
             availability: i.availability
           })));
        }
      } catch (error) {
        if (isActive) {
            console.error("Failed to fetch availability", error);
        }
      } finally {
        if (isActive) setFetchingAvailability(false);
      }
    }

    if (open) {
        const timeoutId = setTimeout(fetchAvailability, 500); // Debounce
        return () => {
            clearTimeout(timeoutId);
            isActive = false;
        };
    }
    
    return () => { isActive = false; };
  }, [date, initialDate, open, item]);

  const handleQtyChange = (itemId: string, val: number, itemMaxQty?: number) => {
    let newQty = val;
    if (newQty < 1) newQty = 1;

    if (itemMaxQty !== undefined && newQty > itemMaxQty) {
        newQty = itemMaxQty;
        toast({
            title: "Maksimal Pemesanan",
            description: `Hanya tersisa ${itemMaxQty} unit untuk item ini.`,
            variant: "destructive"
        });
    }
    setCart(prev => ({ ...prev, [itemId]: newQty }));
  };

  const addItemToCart = (newItem: BookingItem) => {
    setCart(prev => ({
      ...prev,
      [newItem.id]: (prev[newItem.id] || 0) + 1
    }));
    setIsAddingMore(false);
    toast({
      title: "Item Added",
      description: `${newItem.name} added to booking.`,
    });
  };

  const removeItemFromCart = (itemId: string) => {
    const newCart = { ...cart };
    delete newCart[itemId];
    setCart(newCart);
  };

  if (!open || !item) return null;

  // Calculate totals
  const validItemIds = new Set<string>();
  if (item) validItemIds.add(item.id);
  allItems.forEach(i => validItemIds.add(i.id));

  const currentItems = inventory.length > 0 
      ? inventory.filter(i => validItemIds.has(i.id))
      : [item, ...allItems].filter((i): i is BookingItem => i !== null);

  const availableItemsMap = new Map<string, BookingItem>();
  currentItems.forEach(i => availableItemsMap.set(i.id, i));

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const itemDetail = availableItemsMap.get(id);
    return itemDetail ? { ...itemDetail, qty } : null;
  }).filter(Boolean) as (BookingItem & { qty: number })[];

  let subtotal = 0;
  const cartPayloadItems: any[] = [];

  cartItems.forEach(i => {
    const isPromoActive = i.isEvent && i.eventPromoPrice && i.eventPromoQuota && i.normalPrice !== undefined;
    const soldQuota = i.eventSoldQuota || 0;
    const promoLeft = isPromoActive ? Math.max(0, i.eventPromoQuota! - soldQuota) : 0;

    if (isPromoActive && promoLeft > 0) {
      if (i.qty <= promoLeft) {
        subtotal += i.eventPromoPrice! * i.qty;
        cartPayloadItems.push({ id: i.id, name: `${i.name} (Early Bird)`, qty: i.qty, price: i.eventPromoPrice! });
      } else {
        const normalQty = i.qty - promoLeft;
        subtotal += (i.eventPromoPrice! * promoLeft) + (i.normalPrice! * normalQty);
        cartPayloadItems.push({ id: i.id, name: `${i.name} (Early Bird)`, qty: promoLeft, price: i.eventPromoPrice! });
        cartPayloadItems.push({ id: i.id, name: `${i.name} (Normal)`, qty: normalQty, price: i.normalPrice! });
      }
    } else {
      const priceToUse = (isPromoActive && promoLeft <= 0 && i.normalPrice !== undefined) ? i.normalPrice : i.price;
      subtotal += priceToUse * i.qty;
      cartPayloadItems.push({ id: i.id, name: i.name, qty: i.qty, price: priceToUse });
    }
  });

  const adminFee = calculateFee(subtotal, paymentMethod);
  const totalPrice = subtotal + adminFee - promoDiscount;

  const isCartInvalid = cartItems.some(i => i.availability !== undefined && i.qty > i.availability);

  async function handleApplyPromo() {
    if (!promoCode) {
      toast({
        title: "Kode promo wajib diisi",
        description: "Silakan masukkan kode promo terlebih dahulu.",
        variant: "destructive"
      });
      return;
    }

    if (cartPayloadItems.length === 0) {
      toast({
        title: "Keranjang kosong",
        description: "Tambahkan item sebelum menggunakan kode promo.",
        variant: "destructive"
      });
      return;
    }

    setPromoApplying(true);
    try {
      const res = await fetch('/api/promocodes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode,
          type: item!.type,
          items: cartPayloadItems,
          paymentMethod
        })
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Promo validate non-JSON response:', text);
        throw new Error('Server mengirim respons tidak valid untuk kode promo.');
      }

      if (!res.ok || !data.valid) {
        setPromoDiscount(0);
        toast({
          title: "Kode promo tidak dapat digunakan",
          description: data.error || 'Silakan periksa kembali kode promo Anda.',
          variant: "destructive"
        });
        return;
      }

      setPromoCode(data.code);
      setPromoDiscount(data.discount);
      toast({
        title: "Kode promo berhasil diterapkan",
        description: data.description || `Potongan sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.discount)} telah diterapkan.`,
      });
    } catch (error: any) {
      setPromoDiscount(0);
      toast({
        title: "Error",
        description: error.message || 'Gagal memproses kode promo.',
        variant: "destructive"
      });
    } finally {
      setPromoApplying(false);
    }
  }

  async function handleBooking() {
    if (!date) {
      toast({
        title: "Date required",
        description: "Please select a date for your booking.",
        variant: "destructive"
      });
      return;
    }

    if (!guestName || !guestEmail || !guestPhone || !guestCity) {
        toast({
            title: "Guest Info Required",
            description: "Please fill in all guest details (Name, Email, WhatsApp, Domisili).",
            variant: "destructive"
        });
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
        toast({
            title: "Invalid Email",
            description: "Please enter a valid email address.",
            variant: "destructive"
        });
        return;
    }

    if (cartItems.length === 0) {
       toast({
        title: "Cart Empty",
        description: "Please add at least one item.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: item!.type,
          date: new Date(date).toISOString(),
          paymentMethod,
          promoCode: promoDiscount > 0 ? promoCode : undefined,
          details: {
            guestName,
            guestEmail,
            guestPhone,
            guestCity,
            paymentMethodName: PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label,
            adminFee: adminFee,
            items: cartPayloadItems
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Booking failed');
      }

      if (data.paymentUrl) {
        toast({
          title: "Booking Created",
          description: "Redirecting to payment...",
        });
        window.location.href = data.paymentUrl;
      } else {
        toast({
          title: "Success",
          description: "Booking created successfully.",
        });
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-black text-brand-dark uppercase tracking-tight">
            Book {item.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">Guest Booking</p>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Guest Info */}
          <div className="space-y-3 p-4 bg-brand-50/50 rounded-xl border border-brand-50">
            <h3 className="font-bold text-sm text-brand-dark uppercase tracking-wide flex items-center gap-2">
                User Details
            </h3>
            <div className="space-y-2">
                <Label htmlFor="guestName" className="text-xs font-semibold uppercase text-gray-500">Full Name</Label>
                <Input 
                    id="guestName" 
                    value={guestName} 
                    onChange={e => setGuestName(e.target.value)} 
                    placeholder="Enter your full name" 
                    className="bg-white"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="guestEmail" className="text-xs font-semibold uppercase text-gray-500">Email Address</Label>
                <Input 
                    id="guestEmail" 
                    type="email" 
                    value={guestEmail} 
                    onChange={e => setGuestEmail(e.target.value)} 
                    placeholder="name@example.com" 
                    className="bg-white"
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="guestPhone" className="text-xs font-semibold uppercase text-gray-500">WhatsApp Number</Label>
                <Input 
                    id="guestPhone" 
                    type="tel" 
                    value={guestPhone} 
                    onChange={e => setGuestPhone(e.target.value)} 
                    placeholder="0812..." 
                    className="bg-white"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="guestCity" className="text-xs font-semibold uppercase text-gray-500">Domisili (Kota)</Label>
                <Input 
                    id="guestCity" 
                    type="text" 
                    value={guestCity} 
                    onChange={e => setGuestCity(e.target.value)} 
                    placeholder="Contoh: Bandung, Jakarta..." 
                    className="bg-white"
                />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Select Date</Label>
            <Input 
              id="date" 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full"
              disabled={item.isEvent}
            />
            {item.isEvent && (
                <p className="text-[10px] text-brand italic">Tanggal sudah ditetapkan untuk event ini.</p>
            )}
          </div>

          <div className="space-y-4">
             <Label>Items</Label>
             {cartItems.map((cartItem) => {
                const isPromoActive = cartItem.isEvent && cartItem.eventPromoPrice && cartItem.eventPromoQuota && cartItem.normalPrice !== undefined;
                const soldQuota = cartItem.eventSoldQuota || 0;
                const promoLeft = isPromoActive ? Math.max(0, cartItem.eventPromoQuota! - soldQuota) : 0;
                const hasSplit = isPromoActive && promoLeft > 0 && cartItem.qty > promoLeft;

                return (
                <div key={cartItem.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start">
                        <span className="font-bold text-sm">{cartItem.name}</span>
                        <div className="text-right">
                             {!hasSplit ? (
                                <>
                                 {cartItem.originalPrice && cartItem.originalPrice > cartItem.price && (
                                    <div className="text-xs text-gray-400 line-through">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(cartItem.originalPrice)}
                                    </div>
                                 )}
                                 <div className="font-medium text-sm">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(isPromoActive && promoLeft <= 0 && cartItem.normalPrice ? cartItem.normalPrice : cartItem.price)}
                                 </div>
                                </>
                             ) : (
                                <div className="text-xs space-y-1 text-right mt-1">
                                    <div className="flex justify-end gap-2">
                                        <span className="text-brand font-medium">{promoLeft}x Early Bird:</span>
                                        <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(cartItem.eventPromoPrice!)}</span>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <span className="text-gray-600">{cartItem.qty - promoLeft}x Normal:</span>
                                        <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(cartItem.normalPrice!)}</span>
                                    </div>
                                </div>
                             )}
                        </div>
                    </div>
                    {cartItem.availability !== undefined && cartItem.qty > cartItem.availability && (
                         <div className="text-xs text-red-500 font-medium bg-red-50 p-1 rounded mb-2">
                            {cartItem.availability === 0 
                                ? "Fully Booked" 
                                : `Only ${cartItem.availability} left.`}
                         </div>
                    )}
                    <div className="flex items-center justify-between">
                         <Button 
                             variant="ghost" 
                             size="sm" 
                             className="text-red-500 h-8 px-2 text-xs"
                             onClick={() => removeItemFromCart(cartItem.id)}
                             disabled={cartItems.length <= 1} 
                         >
                             Remove
                         </Button>
                         <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => handleQtyChange(cartItem.id, cartItem.qty - 1, cartItem.availability)}
                                className="h-8 w-8"
                                disabled={cartItem.qty <= 1}
                            >
                                -
                            </Button>
                            <Input 
                                type="number" 
                                min="1" 
                                max={cartItem.availability}
                                value={cartItem.qty}
                                onChange={(e) => handleQtyChange(cartItem.id, parseInt(e.target.value) || 1, cartItem.availability)}
                                className="text-center font-bold h-8 w-16"
                            />
                            <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => handleQtyChange(cartItem.id, cartItem.qty + 1, cartItem.availability)}
                                className="h-8 w-8"
                                disabled={cartItem.availability !== undefined && cartItem.qty >= cartItem.availability}
                            >
                                +
                            </Button>
                         </div>
                    </div>
                </div>
             )})}

             {allItems.length > 0 && (
                <div className="mt-2">
                    {!isAddingMore ? (
                        <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => setIsAddingMore(true)}>
                            + Add Item
                        </Button>
                    ) : (
                        <div className="border rounded-lg p-3 space-y-2 animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-semibold">Select Item</span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsAddingMore(false)}>✕</Button>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {allItems.filter(i => !cart[i.id] && (i.availability === undefined || i.availability > 0)).map(i => (
                                    <div key={i.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded cursor-pointer border" onClick={() => addItemToCart(i)}>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{i.name}</span>
                                            <span className="text-[10px] text-gray-500">Available: {i.availability !== undefined ? `${i.availability} unit` : 'Unlimited'}</span>
                                        </div>
                                        <span className="text-xs font-bold text-brand">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(i.price)}
                                        </span>
                                    </div>
                                ))}
                                {allItems.filter(i => !cart[i.id] && (i.availability === undefined || i.availability > 0)).length === 0 && (
                                    <p className="text-xs text-gray-400 text-center py-2">No more items available</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
             )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment">Payment Method</Label>
            <select
              id="payment"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {['Virtual Accounts', 'Cards', 'E-Wallets', 'QR Code', 'Direct Debit', 'Retail', 'PayLater'].map(group => (
                <optgroup key={group} label={group}>
                  {PAYMENT_METHODS.filter(m => m.group === group).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo">Kode Promo</Label>
            <div className="flex gap-2">
              <Input 
                id="promo"
                placeholder="Masukkan kode promo"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="flex-1"
              />
              <Button 
                type="button"
                variant="outline"
                onClick={handleApplyPromo}
                disabled={promoApplying || cartItems.length === 0}
              >
                {promoApplying ? 'Checking...' : 'Apply'}
              </Button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600 text-sm">Subtotal</span>
              <span className="font-medium">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(subtotal)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600 text-sm">Admin Fee</span>
              <span className="font-medium text-brand">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(adminFee)}
              </span>
            </div>
            {promoDiscount > 0 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 text-sm">Promo Discount</span>
                <span className="font-medium text-red-500">
                  -{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(promoDiscount)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-lg font-black text-brand-dark pt-2 border-t border-gray-200">
              <span>Total Payment</span>
              <span>
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalPrice)}
              </span>
            </div>
          </div>

          <div className="flex items-start space-x-2 pt-2 px-1">
            <Checkbox 
              id="terms" 
              checked={agreedToTerms} 
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5" 
            />
            <div className="text-sm leading-snug text-gray-600">
              <label htmlFor="terms" className="cursor-pointer">
                I agree to the{' '}
              </label>
              <TermsAndConditionsDialog>
                <button type="button" className="text-brand font-semibold hover:underline focus:outline-none">
                  Terms & Conditions
                </button>
              </TermsAndConditionsDialog>
              <label htmlFor="terms" className="cursor-pointer">
                {' '}and Refund Policy. I understand that tickets are non-refundable.
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-brand-dark hover:bg-brand text-white font-bold"
            onClick={handleBooking}
            disabled={loading || fetchingAvailability || isCartInvalid || !agreedToTerms}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Pay Now'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
