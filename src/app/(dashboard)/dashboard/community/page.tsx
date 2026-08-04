'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Image as ImageIcon, ArrowRight, Heart, MessageCircle, Share2, MapPin } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'groups' | 'events' | 'gallery'>('groups');
  const [groups, setGroups] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [groupsRes, galleryRes, eventsRes] = await Promise.all([
          fetch('/api/community/groups'),
          fetch('/api/community/gallery'),
          fetch('/api/events')
        ]);
        if (groupsRes.ok) setGroups(await groupsRes.json());
        if (galleryRes.ok) setGallery(await galleryRes.json());
        if (eventsRes.ok) {
          const allEvents = await eventsRes.json();
          // filter events that are not in the past for "upcoming"
          const now = new Date();
          setEvents(allEvents.filter((e: any) => new Date(e.eventDate) >= now).slice(0, 4));
        }
      } catch (error) {
        console.error('Error fetching community data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 rounded-full border border-brand-100 mb-3">
            <Users className="h-4 w-4 text-brand" />
            <span className="text-xs font-bold tracking-widest uppercase text-brand-dark">The Lodge Family</span>
          </div>
          <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Komunitas Member</h2>
          <p className="text-gray-500 font-medium mt-1">Terhubung dengan sesama pecinta alam dan bagikan momen petualangan Anda.</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-2 bg-gray-100 p-1.5 rounded-2xl w-full max-w-md">
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'groups' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
          }`}
        >
          <Users className="h-4 w-4" /> Groups
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'events' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
          }`}
        >
          <Calendar className="h-4 w-4" /> Events
        </button>
        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'gallery' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
          }`}
        >
          <ImageIcon className="h-4 w-4" /> Gallery
        </button>
      </div>

      {/* Content Area */}
      <div className="mt-8">
        
        {/* GROUPS TAB */}
        {activeTab === 'groups' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {loading ? <div className="p-8 text-center">Loading...</div> : groups.map((group) => (
              <Card key={group.id} className="border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
                <div className="h-40 bg-gray-100 relative overflow-hidden">
                  <img src={group.imageUrl} alt={group.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/30">
                      <Users className="h-3 w-3" /> {group._count?.members || 0} Member
                    </span>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-black text-gray-900 mb-2 leading-tight tracking-tight">{group.name}</h3>
                  <p className="text-sm text-gray-500 font-medium mb-6 line-clamp-2">{group.description}</p>
                  <Button className="w-full bg-brand-50 text-brand hover:bg-brand hover:text-white font-bold uppercase tracking-wider shadow-none transition-colors">
                    Join Group
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === 'events' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">Upcoming Gatherings</h3>
              <Link href="/dashboard/calendar">
                <Button variant="ghost" className="text-brand hover:text-brand-dark text-sm font-bold uppercase tracking-wider">
                  View Calendar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loading ? <div className="p-8 text-center">Loading...</div> : events.map((event) => (
                <Card key={event.id} className="border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row overflow-hidden group">
                  <div className="w-full sm:w-48 h-48 sm:h-auto relative overflow-hidden shrink-0">
                    <img src={event.imageUrl || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1000&auto=format&fit=crop'} alt={event.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <CardContent className="p-6 flex flex-col justify-between w-full">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-tight">{event.name}</h4>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-xs font-medium text-gray-500">
                          <Calendar className="w-4 h-4 mr-2 text-brand" /> {format(parseISO(event.eventDate), 'dd MMMM yyyy', { locale: idLocale })} • {format(parseISO(event.eventDate), 'HH:mm', { locale: idLocale })} WIB
                        </div>
                        <div className="flex items-center text-xs font-medium text-gray-500">
                          <MapPin className="w-4 h-4 mr-2 text-brand" /> {event.category}
                        </div>
                        <div className="flex items-center text-xs font-medium text-gray-500">
                          <Users className="w-4 h-4 mr-2 text-brand" /> Quota: {event.eventSoldQuota}/{event.eventMaxQuota}
                        </div>
                      </div>
                    </div>
                    <Link href={`/dashboard/tickets?eventId=${event.id}`}>
                      <Button className="w-full bg-gray-900 text-white hover:bg-brand font-bold uppercase tracking-wider text-xs shadow-none">
                        RSVP Now
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* GALLERY TAB */}
        {activeTab === 'gallery' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">Event Photos & Moments</h3>
              <Button variant="outline" className="border-brand text-brand hover:bg-brand hover:text-white text-xs font-bold uppercase tracking-wider">
                Upload Photo
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {loading ? <div className="col-span-full p-8 text-center">Loading...</div> : gallery.map((item) => (
                <div key={item.id} className="relative group rounded-2xl overflow-hidden aspect-square bg-gray-100 cursor-pointer shadow-sm">
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <p className="text-white font-bold text-sm line-clamp-1 mb-2">{item.title}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center text-white/90 text-xs font-medium hover:text-brand-100 transition-colors">
                        <Heart className="w-4 h-4 mr-1.5" /> {item.likes}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
