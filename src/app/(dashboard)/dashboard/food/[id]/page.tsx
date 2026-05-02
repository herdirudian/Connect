'use client';

import { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Minus, ShoppingCart, Star, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ReviewList } from '@/components/reviews/review-list';

export default function RestaurantDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/restaurants/${id}`)
      .then(res => res.json())
      .then(data => {
        setRestaurant(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const updateCart = (itemId: string, delta: number) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const cartTotal = restaurant?.menuItems?.reduce((total: number, item: any) => {
    return total + (item.price * (cart[item.id] || 0));
  }, 0) || 0;

  const handleCheckout = async () => {
    if (cartTotal === 0) return;
    const itemsToCheck = Object.entries(cart).map(([menuItemId, quantity]) => {
      const item = restaurant?.menuItems?.find((i: any) => i.id === menuItemId);
      const minQty = Math.max(1, Number(item?.minOrderQty) || 1);
      return { name: item?.name || 'Item', quantity, minQty };
    });
    const invalid = itemsToCheck.find(i => i.quantity > 0 && i.quantity < i.minQty);
    if (invalid) {
      toast({ title: "Minimal order item belum terpenuhi", description: `${invalid.name}: minimal ${invalid.minQty}`, variant: "destructive" });
      return;
    }
    setOrdering(true);
    
    const items = Object.entries(cart).map(([menuItemId, quantity]) => {
        const item = restaurant.menuItems.find((i: any) => i.id === menuItemId);
        return { menuItemId, quantity, price: item.price };
    });

    try {
        const res = await fetch('/api/food/orders', {
            method: 'POST',
            body: JSON.stringify({
                restaurantId: id,
                items,
                totalAmount: cartTotal
            })
        });
        
        const data = await res.json();

        if (res.ok) {
            toast({ title: "Order Placed", description: "Redirecting to payment..." });
            setCart({});
            
            if (data.paymentUrl) {
                window.location.href = data.paymentUrl;
            } else {
                router.push('/dashboard/food/orders');
            }
        } else {
            throw new Error(data.error || 'Failed to place order');
        }
    } catch (e) {
        toast({ title: "Error", description: "Failed to place order", variant: "destructive" });
    } finally {
        setOrdering(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brand" /></div>;
  if (!restaurant || restaurant.error) return <div className="p-8 text-center text-gray-500">Restaurant not found</div>;

  return (
    <div className="space-y-6 pb-24">
      <div className="relative h-64 rounded-xl overflow-hidden bg-gray-100 shadow-md">
         {restaurant.imageUrl ? (
            <Image src={restaurant.imageUrl} alt={restaurant.name} fill className="object-cover" />
         ) : <div className="flex items-center justify-center h-full text-gray-400">No Image</div>}
         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6">
            <div className="text-white">
                <h1 className="text-3xl font-black uppercase tracking-tight">{restaurant.name}</h1>
                <p className="text-white/80 font-medium">{restaurant.type} • {restaurant.status}</p>
                <p className="text-white/60 text-sm mt-1 max-w-xl mb-3">{restaurant.description}</p>
                
                {restaurant.menuUrl && (
                   <a 
                     href={restaurant.menuUrl} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="inline-flex items-center text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors border border-white/30"
                   >
                       <ExternalLink size={12} className="mr-1.5" /> View Official Menu (PDF/Link)
                   </a>
                )}
            </div>
         </div>
      </div>

      <div>
          <h2 className="text-xl font-bold text-brand-dark mb-4 uppercase tracking-wide">Menu</h2>
          {(!restaurant.menuItems || restaurant.menuItems.length === 0) ? (
              <p className="text-gray-500 italic">No menu items available.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {restaurant.menuItems.map((item: any) => (
                    <Card key={item.id} className="flex flex-col hover:shadow-md transition-shadow">
                        <div className="relative h-40 bg-gray-50 rounded-t-xl overflow-hidden">
                            {item.imageUrl ? (
                                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-300">
                                    <Utensils size={32} />
                                </div>
                            )}
                        </div>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
                                <div className="text-right">
                                    {item.originalPrice && item.originalPrice > item.price && (
                                        <div className="flex justify-end items-center gap-2 mb-1">
                                             <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                                                {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}%
                                             </span>
                                             <p className="text-xs text-gray-400 line-through">Rp {item.originalPrice.toLocaleString()}</p>
                                        </div>
                                    )}
                                    <p className="text-brand font-bold whitespace-nowrap">Rp {item.price.toLocaleString()}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-between pt-0">
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{item.description}</p>
                            
                            <div className="flex items-center justify-end gap-3 mt-auto">
                                {!restaurant.allowOrders ? (
                                    <Button className="w-full h-9 text-sm opacity-50 cursor-not-allowed" variant="secondary" disabled>Ordering Disabled</Button>
                                ) : cart[item.id] ? (
                                    <>
                                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateCart(item.id, -1)}><Minus size={14} /></Button>
                                        <span className="font-bold w-6 text-center text-sm">{cart[item.id]}</span>
                                        <Button size="icon" variant="primary" className="h-8 w-8" onClick={() => updateCart(item.id, 1)}><Plus size={14} /></Button>
                                    </>
                                ) : (
                                    <Button className="w-full h-9 text-sm" variant="outline" onClick={() => updateCart(item.id, 1)}>Add to Order</Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
          )}
      </div>

      <div className="pt-6 border-t border-gray-100">
        <ReviewList restaurantId={id} />
      </div>

      {Object.keys(cart).length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40 animate-in slide-in-from-bottom-4">
              <div className="bg-brand-dark text-white p-4 rounded-xl shadow-2xl flex justify-between items-center ring-1 ring-white/10 backdrop-blur-md bg-opacity-95">
                  <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg">
                          <ShoppingCart size={20} />
                      </div>
                      <div>
                          <p className="text-xs text-white/70 font-bold uppercase tracking-wider">{Object.values(cart).reduce((a, b) => a + b, 0)} Items</p>
                          <p className="font-bold text-lg">Rp {cartTotal.toLocaleString()}</p>
                      </div>
                  </div>
                  <Button onClick={handleCheckout} disabled={ordering} className="bg-white text-brand-dark hover:bg-gray-100 font-bold px-6">
                      {ordering ? <Loader2 className="animate-spin" /> : 'Checkout'}
                  </Button>
              </div>
          </div>
      )}
    </div>
  );
}

function Utensils(props: any) {
    return (
        <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        >
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </svg>
    )
}
