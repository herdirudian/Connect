'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Utensils, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReservationDialog } from '@/components/ReservationDialog';

interface Restaurant {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  imageUrl?: string;
  menuUrl?: string;
  active: boolean;
  allowReservations?: boolean;
  allowOrders?: boolean;
}

export default function FoodPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchRestaurants();
  }, []);

  async function fetchRestaurants() {
    try {
      const res = await fetch('/api/restaurants');
      const data = await res.json();
      setRestaurants(data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleReserve = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsReservationOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Food & Beverage</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mt-1">Delicious dining options for the whole family.</p>
        </div>
        <Button variant="primary" className="w-full md:w-auto" onClick={() => router.push('/dashboard/food/orders')}>My Orders</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {restaurants.filter(r => r.active).map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
            <div className="h-48 bg-brand-50 relative flex items-center justify-center overflow-hidden">
               {item.imageUrl ? (
                 <Image src={item.imageUrl} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
               ) : (
                 <Utensils className="h-12 w-12 text-brand-light" />
               )}
            </div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{item.name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{item.type}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  item.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {item.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4 text-sm line-clamp-3">{item.description}</p>
              
              {item.menuUrl && (
                 <a 
                   href={item.menuUrl} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="block mb-3"
                 >
                    <Button variant="secondary" className="w-full h-8 text-xs bg-brand-50 text-brand-dark hover:bg-brand-100 border border-brand-100">
                        <ExternalLink className="mr-2 h-3 w-3" /> View Official Menu (PDF/Link)
                    </Button>
                 </a>
              )}

              <div className="flex gap-2">
                <Button 
                    className="flex-1" 
                    variant="outline" 
                    disabled={item.status === 'Closed'}
                    onClick={() => router.push(`/dashboard/food/${item.id}`)}
                >
                  Order Food
                </Button>
                <Button 
                    className="flex-1 whitespace-nowrap text-xs sm:text-sm px-2" 
                    variant="primary" 
                    disabled={item.status === 'Closed' || !item.allowReservations}
                    onClick={() => handleReserve(item)}
                >
                  {item.allowReservations ? 'Reserve Table' : 'Reservations Closed'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ReservationDialog 
        restaurant={selectedRestaurant} 
        open={isReservationOpen} 
        onOpenChange={setIsReservationOpen} 
      />
    </div>
  );
}
