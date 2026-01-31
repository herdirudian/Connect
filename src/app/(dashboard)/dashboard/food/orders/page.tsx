'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ordersRes, reservationsRes] = await Promise.all([
          fetch('/api/food/orders'),
          fetch('/api/food/reservations')
        ]);
        
        if (ordersRes.ok) setOrders(await ordersRes.json());
        if (reservationsRes.ok) setReservations(await reservationsRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brand" /></div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight mb-4">Table Reservations</h2>
        {reservations.length === 0 ? (
          <p className="text-gray-500">No reservations found.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reservations.map(res => (
              <Card key={res.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{res.restaurant.name}</CardTitle>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      res.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 
                      res.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                    }`}>{res.status}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-gray-600 font-medium">
                    <Calendar size={16} />
                    <span>{format(new Date(res.date), 'PPP')} at {res.time}</span>
                  </div>
                  <p className="text-sm mt-2 text-gray-500">{res.pax} People • {res.notes || 'No notes'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight mb-4">Food Orders</h2>
        {orders.length === 0 ? (
          <p className="text-gray-500">No food orders found.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {orders.map(order => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{order.restaurant.name}</CardTitle>
                    <span className="font-mono font-bold text-brand">Rp {order.totalAmount.toLocaleString()}</span>
                  </div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold w-fit mt-1 ${
                      order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>{order.status}</span>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600 divide-y">
                    {order.items.map((item: any) => (
                      <li key={item.id} className="flex justify-between pt-2 first:pt-0">
                        <span>{item.quantity}x {item.menuItem.name}</span>
                        <span>Rp {(item.price * item.quantity).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-400 mt-4 text-right">{format(new Date(order.createdAt), 'PP p')}</p>
                  
                  {order.status === 'COMPLETED' && (
                    <div className="mt-4 flex justify-end">
                      {order.review ? (
                        <div className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100">
                          <Star className="h-4 w-4 fill-current" />
                          <span>{order.review.rating}/5</span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-brand text-brand hover:bg-brand-50"
                          onClick={() => setReviewDialog({ 
                            open: true, 
                            foodOrderId: order.id, 
                            restaurantId: order.restaurantId 
                          })}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Write Review
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ReviewDialog 
        open={reviewDialog.open} 
        onOpenChange={(open) => setReviewDialog(prev => ({ ...prev, open }))}
        foodOrderId={reviewDialog.foodOrderId}
        restaurantId={reviewDialog.restaurantId}
        onSuccess={() => {
          setReviewDialog({ open: false });
          fetchData();
        }}
      />
    </div>
  );
}
