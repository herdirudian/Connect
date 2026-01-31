'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Restaurant {
    id: string;
    name: string;
}

interface ReservationDialogProps {
    restaurant: Restaurant | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ReservationDialog({ restaurant, open, onOpenChange }: ReservationDialogProps) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [pax, setPax] = useState(2);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    if (!open || !restaurant) return null;

    async function handleReserve() {
        if (!date || !time) {
            toast({ title: "Required", description: "Please select date and time", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/restaurants/${restaurant.id}/reserve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, time, pax, notes })
            });
            
            if (!res.ok) throw new Error('Failed to reserve');
            
            toast({ title: "Success", description: "Table reserved successfully!" });
            onOpenChange(false);
        } catch (e) {
            toast({ title: "Error", description: "Could not create reservation", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-xl font-bold text-brand-dark">Reserve at {restaurant.name}</h2>
                    <button onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                
                <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                </div>
                
                <div className="space-y-2">
                    <Label>Time</Label>
                    <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
                </div>
                
                <div className="space-y-2">
                    <Label>Pax (People)</Label>
                    <Input type="number" min="1" value={pax} onChange={e => setPax(parseInt(e.target.value))} />
                </div>

                <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special requests, allergies..." />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleReserve} disabled={loading} className="bg-brand hover:bg-brand-dark">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Reservation
                    </Button>
                </div>
            </div>
        </div>
    );
}
