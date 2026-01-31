'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Clock, Utensils, Calendar, Download } from 'lucide-react';

export default function AdminFoodOrdersPage() {
    const [activeTab, setActiveTab] = useState<'orders' | 'reservations'>('orders');
    const [orders, setOrders] = useState<any[]>([]);
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    async function fetchData() {
        setLoading(true);
        try {
            if (activeTab === 'orders') {
                const res = await fetch('/api/admin/food/orders');
                const data = await res.json();
                if (Array.isArray(data)) setOrders(data);
            } else {
                const res = await fetch('/api/admin/food/reservations');
                const data = await res.json();
                if (Array.isArray(data)) setReservations(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function updateStatus(type: 'order' | 'reservation', id: string, status: string) {
        if (!confirm(`Change status to ${status}?`)) return;
        try {
            const endpoint = type === 'order' ? '/api/admin/food/orders' : '/api/admin/food/reservations';
            const res = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            if (res.ok) fetchData();
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Food Orders & Reservations</h2>
                    <p className="text-muted-foreground">Manage restaurant orders and table bookings.</p>
                </div>
                {activeTab === 'orders' && (
                    <Button onClick={() => window.open('/api/admin/food/orders/export', '_blank')} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                )}
            </div>

            <div className="flex space-x-2 border-b border-gray-200">
                <button
                    className={`pb-2 px-4 font-medium text-sm transition-colors ${activeTab === 'orders' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('orders')}
                >
                    <div className="flex items-center gap-2">
                        <Utensils size={16} />
                        Food Orders
                    </div>
                </button>
                <button
                    className={`pb-2 px-4 font-medium text-sm transition-colors ${activeTab === 'reservations' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('reservations')}
                >
                    <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        Reservations
                    </div>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin h-8 w-8 text-brand" />
                </div>
            ) : (
                <div className="space-y-4">
                    {activeTab === 'orders' ? (
                        orders.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">No orders found.</div>
                        ) : (
                            orders.map((order) => (
                                <Card key={order.id} className="overflow-hidden">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-bold text-lg">Order #{order.id.slice(0, 8)}</span>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">User: {order.user.name} ({order.user.email})</p>
                                                <p className="text-sm text-gray-600">Restaurant: {order.restaurant.name}</p>
                                                <p className="text-sm text-gray-500 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                                                
                                                <div className="mt-4">
                                                    <p className="font-semibold text-sm mb-1">Items:</p>
                                                    <ul className="text-sm space-y-1">
                                                        {order.items.map((item: any) => (
                                                            <li key={item.id} className="flex justify-between w-64">
                                                                <span>{item.quantity}x {item.menuItem.name}</span>
                                                                <span className="text-gray-500">Rp {(item.price * item.quantity).toLocaleString()}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <p className="font-bold mt-2">Total: Rp {order.totalAmount.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col gap-2 min-w-[150px]">
                                                {order.status === 'PENDING' && (
                                                    <>
                                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus('order', order.id, 'COMPLETED')}>
                                                            <CheckCircle size={16} className="mr-2" /> Mark Completed
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => updateStatus('order', order.id, 'CANCELLED')}>
                                                            <XCircle size={16} className="mr-2" /> Cancel Order
                                                        </Button>
                                                    </>
                                                )}
                                                {order.status !== 'PENDING' && (
                                                     <div className="text-center text-sm text-gray-500 italic">No actions available</div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )
                    ) : (
                        reservations.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">No reservations found.</div>
                        ) : (
                            reservations.map((res) => (
                                <Card key={res.id}>
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-bold text-lg">
                                                        {new Date(res.date).toLocaleDateString()} - {res.time}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                        res.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                                        res.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {res.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">User: {res.user.name} ({res.user.email})</p>
                                                <p className="text-sm text-gray-600">Restaurant: {res.restaurant.name}</p>
                                                <p className="text-sm font-medium mt-1">Pax: {res.pax} people</p>
                                                {res.notes && <p className="text-sm text-gray-500 italic mt-1">Note: {res.notes}</p>}
                                            </div>
                                            
                                            <div className="flex flex-col gap-2 min-w-[150px]">
                                                {res.status === 'PENDING' && (
                                                    <>
                                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus('reservation', res.id, 'CONFIRMED')}>
                                                            <CheckCircle size={16} className="mr-2" /> Confirm
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => updateStatus('reservation', res.id, 'CANCELLED')}>
                                                            <XCircle size={16} className="mr-2" /> Cancel
                                                        </Button>
                                                    </>
                                                )}
                                                {res.status === 'CONFIRMED' && (
                                                    <Button size="sm" variant="outline" onClick={() => updateStatus('reservation', res.id, 'COMPLETED')}>
                                                        <CheckCircle size={16} className="mr-2" /> Mark Arrived
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )
                    )}
                </div>
            )}
        </div>
    );
}
