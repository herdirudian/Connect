'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, ArrowRight, Users, Ticket } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  parseISO,
  isToday,
  isBefore,
  startOfDay
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  description: string;
  price: number;
  eventPromoPrice?: number;
  eventDate: string;
  eventMaxQuota: number;
  eventSoldQuota: number;
  imageUrl?: string;
  category: string;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Calendar logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      
      // Get events for this day
      const dayEvents = events.filter(e => isSameDay(parseISO(e.eventDate), cloneDay));
      
      const isSelected = selectedDate && isSameDay(day, selectedDate);
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isPast = isBefore(day, startOfDay(new Date()));
      const isCurrentToday = isToday(day);

      days.push(
        <div 
          key={day.toString()} 
          onClick={() => setSelectedDate(cloneDay)}
          className={`
            min-h-[100px] p-2 border-b border-r border-gray-100 relative cursor-pointer transition-all
            ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : 'bg-white text-gray-900'}
            ${isSelected ? 'ring-2 ring-brand ring-inset bg-brand-50/20' : 'hover:bg-gray-50'}
            ${isCurrentToday ? 'font-bold' : ''}
          `}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`
              inline-flex items-center justify-center w-7 h-7 rounded-full text-sm
              ${isCurrentToday ? 'bg-brand text-white' : ''}
              ${isSelected && !isCurrentToday ? 'bg-brand-100 text-brand-dark' : ''}
            `}>
              {formattedDate}
            </span>
            {dayEvents.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
            )}
          </div>
          
          <div className="space-y-1 mt-2 overflow-y-auto max-h-[60px] no-scrollbar">
            {dayEvents.map(event => (
              <div 
                key={event.id} 
                className={`
                  text-[10px] px-1.5 py-1 rounded truncate font-bold
                  ${isPast ? 'bg-gray-100 text-gray-500' : 'bg-brand-50 text-brand-dark border border-brand-100'}
                `}
              >
                {event.name}
              </div>
            ))}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  // Get events for selected day
  const selectedDayEvents = selectedDate 
    ? events.filter(e => isSameDay(parseISO(e.eventDate), selectedDate))
    : [];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 rounded-full border border-brand-100 mb-3">
            <CalendarIcon className="h-4 w-4 text-brand" />
            <span className="text-xs font-bold tracking-widest uppercase text-brand-dark">Activities & Wellness</span>
          </div>
          <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Calendar of Events</h2>
          <p className="text-gray-500 font-medium mt-1">Jelajahi dan ikuti berbagai aktivitas seru setiap harinya.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Calendar View */}
        <div className="flex-1">
          <Card className="border-gray-100 shadow-sm overflow-hidden bg-white">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-2xl font-black uppercase text-gray-900 tracking-tight">
                {format(currentDate, 'MMMM yyyy', { locale: idLocale })}
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={prevMonth} className="rounded-full bg-white hover:bg-brand-50 hover:text-brand border-gray-200">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth} className="rounded-full bg-white hover:bg-brand-50 hover:text-brand border-gray-200">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 bg-gray-100 border-b border-gray-200">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
                <div key={day} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="bg-white">
              {rows}
            </div>
          </Card>
        </div>

        {/* Sidebar - Selected Day Details */}
        <div className="w-full lg:w-[400px]">
          <div className="sticky top-24">
            <div className="mb-6 flex items-end gap-3">
              <div className="text-5xl font-black text-brand-dark leading-none">
                {selectedDate ? format(selectedDate, 'dd') : '--'}
              </div>
              <div className="pb-1">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                  {selectedDate ? format(selectedDate, 'EEEE', { locale: idLocale }) : 'Hari'}
                </div>
                <div className="text-lg font-bold text-gray-900 uppercase tracking-tight">
                  {selectedDate ? format(selectedDate, 'MMMM yyyy', { locale: idLocale }) : 'Bulan Tahun'}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500 font-medium">Memuat jadwal...</p>
              </div>
            ) : selectedDayEvents.length > 0 ? (
              <div className="space-y-4">
                {selectedDayEvents.map(event => {
                  const isSoldOut = event.eventSoldQuota >= event.eventMaxQuota;
                  const isPast = isBefore(parseISO(event.eventDate), new Date());
                  const displayPrice = event.eventPromoPrice || event.price;

                  return (
                    <Card key={event.id} className="border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                      {event.imageUrl && (
                        <div className="h-32 w-full bg-gray-100 relative overflow-hidden">
                          <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent"></div>
                          <div className="absolute bottom-3 left-3">
                            <span className="bg-brand text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                              {event.category}
                            </span>
                          </div>
                        </div>
                      )}
                      <CardContent className="p-5">
                        <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2 leading-tight">
                          {event.name}
                        </h4>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-xs font-medium text-gray-500">
                            <Clock className="w-3.5 h-3.5 mr-2 text-brand" />
                            {format(parseISO(event.eventDate), 'HH:mm', { locale: idLocale })} WIB
                          </div>
                          <div className="flex items-center text-xs font-medium text-gray-500">
                            <Users className="w-3.5 h-3.5 mr-2 text-brand" />
                            Quota: {event.eventSoldQuota}/{event.eventMaxQuota} Orang
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Harga Tiket</p>
                            <p className="text-lg font-black text-brand-dark">
                              {displayPrice === 0 ? 'FREE' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(displayPrice)}
                            </p>
                          </div>
                          
                          <Link href={`/dashboard/tickets?eventId=${event.id}`}>
                            <Button 
                              disabled={isSoldOut || isPast}
                              className={`rounded-xl shadow-none font-bold uppercase tracking-wider text-xs px-6 ${
                                isPast ? 'bg-gray-200 text-gray-500' :
                                isSoldOut ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-brand hover:bg-brand-dark text-white'
                              }`}
                            >
                              {isPast ? 'Selesai' : isSoldOut ? 'Penuh' : 'Daftar'}
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center h-48">
                <Ticket className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-gray-500 font-bold uppercase tracking-wide text-sm">Tidak ada aktivitas</p>
                <p className="text-xs text-gray-400 mt-1">Coba pilih tanggal lain</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
