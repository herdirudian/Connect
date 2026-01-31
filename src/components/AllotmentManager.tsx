'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
import { Loader2, ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface AllotmentManagerProps {
  accommodationId: string;
  accommodationName: string;
  baseStock: number;
  onClose: () => void;
}

interface Allotment {
  id: string;
  date: string;
  quota: number;
  price?: number;
}

interface AllotmentData {
  quota: number;
  price?: number;
}

export default function AllotmentManager({ accommodationId, accommodationName, baseStock, onClose }: AllotmentManagerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [allotments, setAllotments] = useState<Record<string, AllotmentData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modifiedDates, setModifiedDates] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchAllotments();
  }, [currentMonth, accommodationId]);

  async function fetchAllotments() {
    setLoading(true);
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const res = await fetch(`/api/accommodations/${accommodationId}/allotment?startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
      
      if (!res.ok) throw new Error('Failed to fetch allotments');
      
      const data = await res.json();
      
      if (!Array.isArray(data)) {
        console.error('API response is not an array:', data);
        throw new Error('Invalid data format received');
      }

      const allotmentMap: Record<string, AllotmentData> = {};
      data.forEach(item => {
        if (item && item.date) {
           try {
             const dateKey = new Date(item.date).toISOString().split('T')[0];
             allotmentMap[dateKey] = {
               quota: item.quota,
               price: item.price
             };
           } catch (e) {
             console.error('Invalid date in allotment item:', item);
           }
        }
      });
      setAllotments(allotmentMap);
      setModifiedDates(new Set());
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load allotments",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleQuotaChange = (dateStr: string, value: string) => {
    // Allow empty string to mean "Delete Override" (revert to base stock)
    if (value === '') {
        setAllotments(prev => ({ 
            ...prev, 
            [dateStr]: { 
              ...prev[dateStr], 
              quota: -1 // Signal to delete
            } 
          }));
        setModifiedDates(prev => new Set(prev).add(dateStr));
        return;
    }

    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 0) return;

    setAllotments(prev => ({ 
      ...prev, 
      [dateStr]: { 
        ...prev[dateStr], 
        quota: numValue 
      } 
    }));
    setModifiedDates(prev => new Set(prev).add(dateStr));
  };

  const handlePriceChange = (dateStr: string, value: string) => {
    // Allow empty string to clear override
    const numValue = value === '' ? undefined : parseFloat(value);
    
    setAllotments(prev => ({ 
      ...prev, 
      [dateStr]: { 
        quota: prev[dateStr]?.quota ?? baseStock,
        price: numValue
      } 
    }));
    setModifiedDates(prev => new Set(prev).add(dateStr));
  };

  const saveChanges = async () => {
    if (modifiedDates.size === 0) return;
    
    setSaving(true);
    try {
      const updates = Array.from(modifiedDates).map(dateStr => ({
        date: dateStr,
        quota: allotments[dateStr]?.quota ?? baseStock,
        price: allotments[dateStr]?.price
      }));

      const res = await fetch(`/api/accommodations/${accommodationId}/allotment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to save');

      toast({
        title: "Success",
        description: "Allotments updated successfully",
      });
      setModifiedDates(new Set());
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save changes",
      });
    } finally {
      setSaving(false);
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Manage Allotment</h2>
            <p className="text-sm text-gray-500">{accommodationName} - Default Stock: {baseStock}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 flex items-center justify-between bg-gray-50">
          <Button variant="outline" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4 mr-2" /> Prev
          </Button>
          <span className="font-semibold text-lg">{format(currentMonth, 'MMMM yyyy')}</span>
          <Button variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            Next <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-bold text-gray-500 py-2 hidden lg:block">
                  {day}
                </div>
              ))}
              
              {/* Add empty cells for start of month alignment if needed */}
              {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="hidden lg:block" />
              ))}

              {days.map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const allotment = allotments[dateStr];
                
                // If -1, it means we want to delete/revert, so show empty string
                // If undefined, it means no override, so show baseStock
                // If defined and >= 0, show the value
                const displayQuota = allotment?.quota === -1 ? '' : (allotment?.quota ?? baseStock);
                
                const price = allotment?.price;
                const isModified = modifiedDates.has(dateStr);
                const isPast = isBefore(date, startOfDay(new Date()));

                return (
                  <div key={dateStr} className={`border rounded-lg p-2 ${isModified ? 'bg-blue-50 border-blue-200' : 'bg-white'} ${isPast ? 'opacity-50' : ''}`}>
                    <div className="text-sm font-medium mb-1 flex justify-between">
                      <span>{format(date, 'd')}</span>
                      <span className="text-xs text-gray-400 lg:hidden">{format(date, 'EEE')}</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500 w-8">Stock</span>
                            <Input
                                type="number"
                                min="0"
                                value={displayQuota}
                                placeholder={baseStock.toString()}
                                onChange={(e) => handleQuotaChange(dateStr, e.target.value)}
                                className={`h-6 text-center text-xs px-1 ${isModified ? 'border-blue-500 font-bold' : ''}`}
                                disabled={isPast && false}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500 w-8">Price</span>
                            <Input
                                type="number"
                                min="0"
                                placeholder="Default"
                                value={price ?? ''}
                                onChange={(e) => handlePriceChange(dateStr, e.target.value)}
                                className={`h-6 text-center text-xs px-1 ${isModified ? 'border-blue-500 font-bold' : ''}`}
                                disabled={isPast && false}
                            />
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={saveChanges} disabled={modifiedDates.size === 0 || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
