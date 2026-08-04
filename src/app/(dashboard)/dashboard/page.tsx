'use client';

import { useEffect, useState } from 'react';
import MemberCard from '@/components/MemberCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { Ticket, Gift, CreditCard, ArrowRight, TrendingUp, TicketPercent, Clock, Camera, Star, MapPin, ShoppingCart, Calendar, User, Users, Tent, Handshake, Utensils, Sun, Cloud, CloudRain, CloudLightning, Snowflake, Copy, Check, QrCode, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PromoBanner } from '@/components/PromoBanner';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    activeTickets: 0,
    availableRewards: 0,
    transactionCount: 0,
    recentTransactions: [] as any[],
    upcomingEvents: [] as any[],
    myImpact: {
      friendsInvited: 0,
      totalVisits: 0,
      totalSpending: 0,
      treesPlanted: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<Array<{ id: string; name: string; description: string; cost: number; imageUrl?: string }>>([]);
  const [specialBirthdayReward, setSpecialBirthdayReward] = useState<any>(null);
  const [weather, setWeather] = useState<{
    temp: number;
    condition: string;
    description: string;
    city: string;
    location?: string;
    isRealData: boolean;
  } | null>(null);
  const [referralSettings, setReferralSettings] = useState({
    referrerPoints: 50,
    refereePoints: 20
  });

  const checkIsBirthdayPeriod = (dobString: string | null) => {
    if (!dobString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dob = new Date(dobString);
    const currentYear = today.getFullYear();
    
    const birthdayThisYear = new Date(currentYear, dob.getMonth(), dob.getDate());
    const diffTime = birthdayThisYear.getTime() - today.getTime();
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
       const birthdayNextYear = new Date(currentYear + 1, dob.getMonth(), dob.getDate());
       const diffTimeNext = birthdayNextYear.getTime() - today.getTime();
       diffDays = Math.ceil(diffTimeNext / (1000 * 60 * 60 * 24));
    }
    
    return diffDays >= 0 && diffDays <= 3;
  };

  async function fetchData() {
    try {
      const [userRes, statsRes, rewardsRes, weatherRes, referralRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/dashboard/stats', { cache: 'no-store' }),
        fetch('/api/rewards', { cache: 'no-store' }),
        fetch('/api/weather'),
        fetch('/api/settings/referral', { cache: 'no-store' })
      ]);
      if (!userRes.ok) throw new Error('Unauthorized');
      const userData = await userRes.json();
      setUser(userData.user);
      
      const isBirthdayPeriod = checkIsBirthdayPeriod(userData.user.dateOfBirth);

      if (referralRes.ok) {
        const referralData = await referralRes.json();
        setReferralSettings(referralData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (rewardsRes.ok) {
        const rewardsData = await rewardsRes.json();
        // Filter active rewards only
        let activeRewards = rewardsData.filter((r: any) => r.active);
        
        // Find birthday reward for Special Card
        const bReward = activeRewards.find((r: any) => r.type === 'BIRTHDAY');
        if (bReward && isBirthdayPeriod) {
             setSpecialBirthdayReward(bReward);
        } else {
             setSpecialBirthdayReward(null);
        }
        
        // Filter out BIRTHDAY type if not birthday period
        activeRewards = activeRewards.filter((r: any) => {
             if (r.type === 'BIRTHDAY') return isBirthdayPeriod;
             return true;
        });

        setRewards(activeRewards.slice(0, 6));
      }
      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        setWeather(weatherData);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      if (err instanceof Error && err.message === 'Unauthorized') {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  }

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'Clear':
      case 'Cerah': 
        return (
          <div className="relative h-10 w-10 flex items-center justify-center">
            <Sun className="absolute inset-0 h-full w-full text-yellow-300 weather-icon-sun-rays" />
            <div className="absolute h-4 w-4 rounded-full bg-yellow-100 weather-icon-sun-core blur-[2px]"></div>
          </div>
        );
      case 'Clouds':
      case 'Berawan':
      case 'Fog':
      case 'Kabut':
        return (
          <div className="relative h-10 w-10">
             <Cloud className="absolute top-0 right-0 h-8 w-8 text-white weather-cloud z-10" fill="currentColor" fillOpacity={0.8} />
             <Cloud className="absolute bottom-0 left-0 h-6 w-6 text-brand-100 weather-cloud delay-500 opacity-60" fill="currentColor" />
          </div>
        );
      case 'Rain': 
      case 'Hujan':
      case 'Drizzle':
      case 'Gerimis': 
        return (
           <div className="relative h-10 w-10">
             <CloudRain className="absolute inset-0 h-full w-full text-white z-10 weather-cloud" />
             <div className="absolute bottom-0 left-2 flex gap-1.5 z-0">
                <div className="w-1 h-2 bg-blue-300 rounded-full weather-rain-drop"></div>
                <div className="w-1 h-2 bg-blue-300 rounded-full weather-rain-drop delay-100"></div>
                <div className="w-1 h-2 bg-blue-300 rounded-full weather-rain-drop delay-300"></div>
             </div>
           </div>
        );
      case 'Thunderstorm': 
      case 'Badai':
        return (
           <div className="relative h-10 w-10">
             <CloudLightning className="absolute inset-0 h-full w-full text-gray-100 z-10 weather-cloud" />
             <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-full h-full bg-yellow-400/40 rounded-full blur-xl weather-lightning"></div>
             </div>
           </div>
        );
      case 'Snow':
      case 'Salju': 
        return (
           <div className="relative h-10 w-10">
             <Cloud className="absolute inset-0 h-full w-full text-white z-10 weather-cloud" />
             <div className="absolute bottom-1 left-2 flex gap-1 z-20">
                <div className="text-[10px] text-white weather-snow-flake">❄</div>
                <div className="text-[10px] text-white weather-snow-flake delay-200">❄</div>
                <div className="text-[10px] text-white weather-snow-flake delay-500">❄</div>
             </div>
           </div>
        );
      default: return <Cloud className="h-10 w-10 text-white animate-pulse" />;
    }
  };

  useEffect(() => {
    fetchData();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const getDaysUntilBirthday = () => {
    if (!user || !user.dateOfBirth) return -1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dob = new Date(user.dateOfBirth);
    const currentYear = today.getFullYear();
    
    // Create birthday date for this year
    const birthdayThisYear = new Date(currentYear, dob.getMonth(), dob.getDate());
    
    // Calculate difference in milliseconds
    const diffTime = birthdayThisYear.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If birthday has passed this year, we return a large number (or handle next year if needed, but for this feature we only care if it's coming up)
    // Actually, if diffDays is negative, it means it passed. 
    // Special case: If today is Dec 30 and birthday is Jan 1, we need to check next year?
    // User said "H-3 pada saat mau ulang tahun". 
    // If today is Dec 30 2023, Birthday Jan 2.
    // birthdayThisYear (Jan 2 2023) -> Passed.
    // birthdayNextYear (Jan 2 2024).
    // Let's check next year if this year passed.
    
    if (diffDays < 0) {
       const birthdayNextYear = new Date(currentYear + 1, dob.getMonth(), dob.getDate());
       const diffTimeNext = birthdayNextYear.getTime() - today.getTime();
       return Math.ceil(diffTimeNext / (1000 * 60 * 60 * 24));
    }
    
    return diffDays;
  };

  const daysUntilBirthday = getDaysUntilBirthday();
  const isBirthdayPeriod = daysUntilBirthday >= 0 && daysUntilBirthday <= 3;

  const birthdayReward = specialBirthdayReward;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'selamat pagi';
    if (hour < 15) return 'selamat siang';
    if (hour < 18) return 'selamat sore';
    return 'selamat malam';
  };

  const handleClaimBirthday = async () => {
    if (!birthdayReward) return;
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: birthdayReward.id })
      });
      if (res.ok) {
        alert('Birthday reward claimed! Check your vouchers.');
        window.location.href = '/dashboard/vouchers';
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to claim reward');
      }
    } catch (error) {
      console.error('Error claiming birthday reward:', error);
    }
  };

  if (loading) return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
        <p className="text-gray-500 font-medium animate-pulse">Loading dashboard...</p>
      </div>
    </div>
  );
  if (!user) return null;

  return (
    <div className="space-y-8 pb-12">
      {/* Greeting Section */}
      <div className="pt-2 pb-2">
        <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight capitalize">
           👋 Halo {getGreeting()}, {user?.name}
        </h2>
      </div>

      {/* Promo Slide Banner */}
      <PromoBanner />

      {/* Weather Banner */}
      <Card className="bg-gradient-to-r from-brand to-brand-dark text-white border-none shadow-lg shadow-brand/20 overflow-hidden relative">
         <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
         <CardContent className="p-6 md:p-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl shadow-inner shrink-0">
                    {weather ? getWeatherIcon(weather.condition) : <Tent className="h-8 w-8 text-white" />}
                </div>
                <div>
                    <p className="text-brand-100 text-xs font-bold uppercase tracking-wider mb-1">
                        {weather ? weather.city : 'Lembang, Bandung'}
                    </p>
                    <h4 className="text-2xl md:text-3xl font-black tracking-tight">
                        {weather?.location || 'The Lodge Maribaya'}
                    </h4>
                </div>
            </div>
            
            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
                <div className="text-left md:text-right">
                    <p className="font-bold text-lg leading-none mb-1">{weather ? weather.condition : 'Cloudy'}</p>
                    <p className="text-sm text-brand-100 capitalize font-medium">{weather ? weather.description : 'Perfect for camping'}</p>
                </div>
                <div className="text-5xl md:text-6xl font-black tracking-tighter">
                    {weather ? weather.temp : 24}°
                </div>
            </div>
         </CardContent>
      </Card>

      {/* Hero / Welcome Section */}
      <div className="relative rounded-3xl overflow-hidden bg-white p-8 md:p-12 mb-10 shadow-sm border border-gray-100">
         <div className="absolute top-0 right-0 p-32 bg-gray-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
         <div className="absolute bottom-0 left-0 p-24 bg-gray-50 rounded-full -ml-12 -mb-12 blur-3xl opacity-30"></div>
         
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 rounded-full border border-brand-100">
                 <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
                 <span className="text-xs font-bold tracking-widest uppercase text-brand-dark">Member Dashboard</span>
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-none text-brand-dark mb-2">
                   Ready for your <br/>Next Adventure?
                </h1>
                <p className="text-gray-500 max-w-lg text-lg font-medium">
                   Collect points, unlock exclusive rewards, and level up your journey with The Lodge Connect.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                 <Link href="/dashboard/tickets" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto bg-brand-dark hover:bg-brand text-white font-bold uppercase tracking-widest rounded-xl px-8 py-4 sm:py-6 shadow-lg shadow-brand/20">
                       Buy Tickets
                    </Button>
                 </Link>
                 <Link href="/dashboard/rewards" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto border-2 border-gray-200 hover:border-brand hover:text-white font-bold uppercase tracking-widest rounded-xl px-8 py-4 sm:py-6 bg-transparent">
                       Redeem
                    </Button>
                 </Link>
            </div>
            </div>
            <div className="w-full md:w-[420px] shadow-2xl shadow-brand/20 rounded-2xl transform transition-transform duration-500 overflow-hidden">
               <MemberCard user={user} />
            </div>
         </div>
      </div>

      {/* Quick Actions Section */}
      <div className="grid grid-cols-2 gap-3 md:gap-6 mb-12">
        <Link href="/dashboard/tickets" className="group">
          <Card className="border border-gray-100 shadow-sm bg-white hover:shadow-md hover:border-brand-300 transition-all duration-300 h-full">
            <CardContent className="p-4 md:p-6 flex flex-col items-center justify-center text-center h-full gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300 flex items-center justify-center">
                <Compass className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm md:text-base">Book Activity</h4>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/rewards" className="group">
          <Card className="border border-gray-100 shadow-sm bg-white hover:shadow-md hover:border-brand-300 transition-all duration-300 h-full">
            <CardContent className="p-4 md:p-6 flex flex-col items-center justify-center text-center h-full gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300 flex items-center justify-center">
                <Gift className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm md:text-base">Claim Benefit</h4>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* My Journey / My Impact Section */}
      <div className="space-y-6 mb-12">
        <div className="flex items-center justify-between">
           <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">My Journey</h3>
           <div className="hidden md:block h-px flex-1 bg-gray-200 ml-6"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Member Since */}
          <Card className="border border-gray-100 shadow-sm bg-white hover:-translate-y-1 transition-transform duration-300">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-4 shadow-inner">
                <Calendar className="h-6 w-6" />
              </div>
              <h4 className="text-3xl font-black text-gray-900 mb-1">{new Date(user.createdAt).getFullYear()}</h4>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Member Sejak</p>
            </CardContent>
          </Card>

          {/* Card 2: Total Visits */}
          <Card className="border border-gray-100 shadow-sm bg-white hover:-translate-y-1 transition-transform duration-300">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-brand-50 text-brand flex items-center justify-center mb-4 shadow-inner">
                <MapPin className="h-6 w-6" />
              </div>
              <h4 className="text-3xl font-black text-gray-900 mb-1">{stats.myImpact?.totalVisits || 0}</h4>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Kali Berkunjung</p>
            </CardContent>
          </Card>

          {/* Card 3: Total Spending */}
          <Card className="border border-gray-100 shadow-sm bg-white hover:-translate-y-1 transition-transform duration-300">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-4 shadow-inner">
                <CreditCard className="h-6 w-6" />
              </div>
              <h4 className="text-lg md:text-xl font-black text-gray-900 mb-1">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.myImpact?.totalSpending || 0)}
              </h4>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Total Spending</p>
            </CardContent>
          </Card>

          {/* Card 4: Friends Invited */}
          <Card className="border border-gray-100 shadow-sm bg-white hover:-translate-y-1 transition-transform duration-300">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-4 shadow-inner">
                <Users className="h-6 w-6" />
              </div>
              <h4 className="text-3xl font-black text-gray-900 mb-1">{stats.myImpact?.friendsInvited || 0}</h4>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Teman Diajak</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming Events Section */}
      <div className="space-y-6 mb-12">
        <div className="flex items-center justify-between">
           <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Upcoming Events</h3>
           <Link href="/dashboard/calendar">
              <Button variant="ghost" className="font-bold text-brand hover:text-brand-dark hover:bg-brand-50 uppercase tracking-wider text-xs">
                See All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
           </Link>
        </div>

        {stats.upcomingEvents && stats.upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.upcomingEvents.map((event: any) => (
              <Card key={event.id} className="border border-gray-100 shadow-md bg-white hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group">
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  {event.imageUrl ? (
                    <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brand-50 text-brand">
                      <Tent className="h-12 w-12 opacity-50" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-brand shadow-sm flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(event.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <CardContent className="p-5 flex-1 flex flex-col">
                  <h4 className="font-black text-lg text-gray-900 mb-2 line-clamp-1">{event.name}</h4>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">{event.description}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Ticket Price</p>
                      <p className="font-black text-brand text-lg">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(event.eventPromoPrice || event.price)}
                      </p>
                    </div>
                    <Link href={`/dashboard/tickets?eventId=${event.id}`}>
                      <Button className="bg-brand text-white hover:bg-brand-dark rounded-xl shadow-md px-6">
                        Join
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
            <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-3">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-bold text-gray-900">No Upcoming Events</h4>
            <p className="text-sm text-gray-500 mt-1">Check back soon for new wellness and adventure activities!</p>
          </div>
        )}
      </div>

      {/* Steps Section - Replaces Stats */}
      <div className="space-y-6 mb-12">
        <div className="flex items-center justify-between">
           <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">How to use your benefits</h3>
           <div className="hidden md:block h-px flex-1 bg-gray-200 ml-6"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <Card className="border border-gray-100 shadow-md bg-white relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
             <div className="absolute top-0 right-0 text-[120px] font-black text-gray-100 leading-none -mt-8 -mr-8 select-none z-0 group-hover:text-brand-50 transition-colors">1</div>
             <CardContent className="p-8 relative z-10 h-full flex flex-col">
                <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center mb-6 shadow-brand/30 shadow-lg">
                   <Ticket className="h-7 w-7" strokeWidth={2.5} />
                </div>
                <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Collect Points</h4>
                <p className="text-gray-500 font-medium mb-6 flex-1">
                   Earn points from every ticket purchase, food order, and staycation booking.
                </p>
                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                   <p className="text-xs text-gray-400 uppercase font-bold mb-1">Current Activity</p>
                   <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-brand-dark">{stats.activeTickets}</span>
                      <span className="text-sm font-bold text-gray-500 mb-1">Active Tickets</span>
                   </div>
                </div>
                <Link href="/dashboard/tickets">
                   <Button className="w-full bg-gray-900 text-white hover:bg-brand font-bold uppercase tracking-wider h-12 rounded-xl shadow-none">
                      Start Adventure
                   </Button>
                </Link>
             </CardContent>
          </Card>

          {/* Step 2 */}
          <Card className="border border-gray-100 shadow-md bg-white relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
             <div className="absolute top-0 right-0 text-[120px] font-black text-gray-100 leading-none -mt-8 -mr-8 select-none z-0 group-hover:text-brand-50 transition-colors">2</div>
             <CardContent className="p-8 relative z-10 h-full flex flex-col">
                <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center mb-6 shadow-brand/30 shadow-lg">
                   <Gift className="h-7 w-7" strokeWidth={2.5} />
                </div>
                <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Get Rewards</h4>
                <p className="text-gray-500 font-medium mb-6 flex-1">
                   Exchange your collected points for exclusive vouchers and special gifts.
                </p>
                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                   <p className="text-xs text-gray-400 uppercase font-bold mb-1">Available for you</p>
                   <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-brand-dark">{stats.availableRewards}</span>
                      <span className="text-sm font-bold text-gray-500 mb-1">Rewards</span>
                   </div>
                </div>
                <Link href="/dashboard/rewards">
                   <Button className="w-full bg-white border-2 border-gray-200 text-gray-900 hover:bg-brand hover:border-brand hover:text-white font-bold uppercase tracking-wider h-12 rounded-xl shadow-none">
                      Redeem Points
                   </Button>
                </Link>
             </CardContent>
          </Card>

          {/* Step 3 */}
          <Card className="border border-gray-100 shadow-md bg-white relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
             <div className="absolute top-0 right-0 text-[120px] font-black text-gray-100 leading-none -mt-8 -mr-8 select-none z-0 group-hover:text-brand-50 transition-colors">3</div>
             <CardContent className="p-8 relative z-10 h-full flex flex-col">
                <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center mb-6 shadow-brand/30 shadow-lg">
                   <TrendingUp className="h-7 w-7" strokeWidth={2.5} />
                </div>
                <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Level Up</h4>
                <p className="text-gray-500 font-medium mb-6 flex-1">
                   Reach higher tiers to unlock VIP benefits and exclusive discounts.
                </p>
                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                   <p className="text-xs text-gray-400 uppercase font-bold mb-1">Current Status</p>
                   <div className="flex items-end gap-2">
                      <span className="text-lg font-black text-brand-dark uppercase">{user.tier || 'MEMBER'}</span>
                      <span className="text-xs font-bold text-gray-500 mb-1.5">TIER</span>
                   </div>
                </div>
                <Link href="/dashboard/benefits">
                   <Button className="w-full bg-white border-2 border-gray-200 text-gray-900 hover:bg-brand hover:border-brand hover:text-white font-bold uppercase tracking-wider h-12 rounded-xl shadow-none">
                      View Benefits
                   </Button>
                </Link>
             </CardContent>
          </Card>
        </div>
      </div>



      {/* Your Member Benefits Section */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-10">
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Your Member Benefits</h3>
           <Link href="/dashboard/benefits">
             <Button variant="ghost" className="text-sm font-bold text-brand hover:text-brand-dark flex items-center gap-1 uppercase">
                View All <ArrowRight className="h-4 w-4" />
             </Button>
           </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {/* Card 1 */}
           <Link href="/dashboard/vouchers">
             <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg hover:shadow-brand/10 transition-all cursor-pointer border border-gray-100 hover:border-brand/50 group h-full">
                <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-brand mb-4 shadow-sm group-hover:bg-brand group-hover:text-white transition-colors">
                   <Ticket className="h-7 w-7" strokeWidth={2} />
                </div>
                <h4 className="font-bold text-gray-900 mb-1 text-lg group-hover:text-brand transition-colors">My Voucher</h4>
                <p className="text-sm text-gray-500 font-medium">View your active vouchers</p>
             </div>
           </Link>
           
           {/* Card 2 */}
           <Link href="/dashboard/tickets">
              <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg hover:shadow-brand/10 transition-all cursor-pointer border border-gray-100 hover:border-brand/50 group h-full">
                 <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-brand mb-4 shadow-sm group-hover:bg-brand group-hover:text-white transition-colors">
                    <TicketPercent className="h-7 w-7" strokeWidth={2} />
                 </div>
                 <h4 className="font-bold text-gray-900 mb-1 text-lg group-hover:text-brand transition-colors">Discount Tickets</h4>
                 <p className="text-sm text-gray-500 font-medium">Special price for entry</p>
              </div>
           </Link>
           
           {/* Card 3 - Staycation */}
           <Link href="/dashboard/stay">
             <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg hover:shadow-brand/10 transition-all cursor-pointer border border-gray-100 hover:border-brand/50 group h-full">
                <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-brand mb-4 shadow-sm group-hover:bg-brand group-hover:text-white transition-colors">
                   <Tent className="h-7 w-7" strokeWidth={2} />
                </div>
                <h4 className="font-bold text-gray-900 mb-1 text-lg group-hover:text-brand transition-colors">Staycation</h4>
                <p className="text-sm text-gray-500 font-medium">Best rates for nature stay</p>
             </div>
           </Link>
           
           {/* Card 4 - Food */}
           <Link href="/dashboard/food">
             <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg hover:shadow-brand/10 transition-all cursor-pointer border border-gray-100 hover:border-brand/50 group h-full">
                <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-brand mb-4 shadow-sm group-hover:bg-brand group-hover:text-white transition-colors">
                   <Utensils className="h-7 w-7" strokeWidth={2} />
                </div>
                <h4 className="font-bold text-gray-900 mb-1 text-lg group-hover:text-brand transition-colors">Food & Beverage</h4>
                <p className="text-sm text-gray-500 font-medium">Delicious dining options</p>
             </div>
           </Link>
           
           {/* Card 5 - Birthday Perks (Only visible on H-3 to Birthday) */}
           {isBirthdayPeriod && birthdayReward && (
             <div 
                onClick={async () => {
                  if ((birthdayReward as any).claimed) {
                    window.location.href = '/dashboard/vouchers';
                  } else {
                    await handleClaimBirthday();
                  }
                }}
                className={`bg-white rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg transition-all cursor-pointer border-2 group animate-in zoom-in duration-500 ${
                  (birthdayReward as any).claimed 
                    ? 'border-gray-100 opacity-80' 
                    : 'border-brand/20 hover:border-brand hover:shadow-brand/10'
                }`}
             >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-sm transition-colors relative ${
                  (birthdayReward as any).claimed ? 'bg-gray-100 text-gray-400' : 'bg-brand-50 text-brand group-hover:bg-brand group-hover:text-white'
                }`}>
                   <Gift className={`h-7 w-7 ${(birthdayReward as any).claimed ? '' : 'animate-bounce'}`} strokeWidth={2} />
                   {!(birthdayReward as any).claimed && (
                     <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                   )}
                </div>
                <h4 className="font-bold text-gray-900 mb-1 text-lg group-hover:text-brand transition-colors">
                  {(birthdayReward as any).claimed ? 'Reward Claimed!' : (daysUntilBirthday === 0 ? 'Happy Birthday!' : 'Birthday Coming Up!')}
                </h4>
                <p className="text-sm text-gray-500 font-medium mb-3">
                  {(birthdayReward as any).claimed ? 'Enjoy your free entry' : 'Claim your Free Entry Ticket'}
                </p>
                <Button size="sm" variant={(birthdayReward as any).claimed ? "outline" : "primary"} className={`w-full rounded-full font-bold uppercase tracking-wide text-xs ${
                  (birthdayReward as any).claimed ? 'border-gray-200 text-gray-500' : 'bg-brand text-white hover:bg-brand-dark'
                }`}>
                  {(birthdayReward as any).claimed ? 'View Voucher' : 'Claim Now'}
                </Button>
             </div>
           )}
           
           {/* Card 6 */}
           <Link href="/dashboard/promos">
             <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg hover:shadow-brand/10 transition-all cursor-pointer border border-gray-100 hover:border-brand/50 group h-full">
                <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-brand mb-4 shadow-sm group-hover:bg-brand group-hover:text-white transition-colors">
                   <Handshake className="h-7 w-7" strokeWidth={2} />
                </div>
                <h4 className="font-bold text-gray-900 mb-1 text-lg group-hover:text-brand transition-colors">Partner Promos</h4>
                <p className="text-sm text-gray-500 font-medium">Deals from our partners</p>
             </div>
           </Link>
        </div>
      </div>

      {/* Referral Program Section */}
      {user?.referralCode && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-32 bg-brand-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
               <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Referral Program</h3>
                  <p className="text-gray-500 font-medium mt-1">Invite friends and earn extra points!</p>
               </div>
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-bold border border-yellow-100">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  <span>Get {referralSettings.referrerPoints} Points per friend</span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Your Code */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-brand-200 transition-colors">
                <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" /> Your Referral Code
                </h4>
                <div 
                  className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-between group cursor-pointer hover:border-brand transition-all shadow-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(user.referralCode);
                    // Could add toast here
                    alert('Referral code copied!');
                  }}
                >
                  <code className="text-2xl font-black text-gray-800 tracking-wider font-mono">{user.referralCode}</code>
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
                     <Copy className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 font-medium mt-3 text-center">Tap to copy code</p>
              </div>

              {/* Share Link */}
              <div className="bg-brand-50/50 rounded-2xl p-6 border border-brand-100">
                <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-brand" /> Share Your Link
                </h4>
                <div className="space-y-3">
                   <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 overflow-hidden">
                      <div className="flex-1 overflow-hidden">
                         <p className="text-xs text-gray-500 truncate font-mono">
                           {typeof window !== 'undefined' ? window.location.origin : 'https://familythelodge.com'}/register?ref={user.referralCode}
                         </p>
                      </div>
                      <Button 
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 text-gray-500"
                        onClick={() => {
                           const link = `${window.location.origin}/register?ref=${user.referralCode}`;
                           navigator.clipboard.writeText(link);
                           alert('Referral link copied!');
                        }}
                      >
                         <Copy className="h-4 w-4" />
                      </Button>
                   </div>
                   <Button 
                     className="w-full bg-brand text-white hover:bg-brand-dark font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-brand/20"
                     onClick={() => {
                        const link = `${window.location.origin}/register?ref=${user.referralCode}`;
                        const text = `Join me at The Lodge Maribaya and get ${referralSettings.refereePoints} free points! Use my code: ${user.referralCode}`;
                        if (navigator.share) {
                           navigator.share({
                              title: 'Join The Lodge Family',
                              text: text,
                              url: link,
                           }).catch(console.error);
                        } else {
                           navigator.clipboard.writeText(`${text}\n${link}`);
                           alert('Message copied to clipboard!');
                        }
                     }}
                   >
                     Share to Friends
                   </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Section */}
      <div className="mb-12">
        <div className="w-full">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Recent Activity</h3>
              <Link href="/dashboard/history">
                <Button variant="ghost" className="text-sm font-bold text-brand hover:text-brand-dark flex items-center gap-1">
                   View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
           </div>
           
           <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardContent className="p-0">
                 {stats.recentTransactions && stats.recentTransactions.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                       {stats.recentTransactions.map((tx: any) => (
                          <div key={tx.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                             <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                   tx.type === 'EARN' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                }`}>
                                   {tx.type === 'EARN' ? <TrendingUp className="h-6 w-6" /> : <ShoppingCart className="h-6 w-6" />}
                                </div>
                                <div>
                                   <p className="font-bold text-gray-900">{tx.description}</p>
                                   <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5">
                                      {new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                   </p>
                                </div>
                             </div>
                             <div className={`text-right font-black ${
                                tx.type === 'EARN' ? 'text-green-600' : 'text-orange-600'
                             }`}>
                                {tx.type === 'EARN' ? '+' : '-'}{tx.amount} PTS
                             </div>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                       <Clock className="h-12 w-12 mb-4 opacity-20" />
                       <p className="font-medium">No recent activity</p>
                    </div>
                 )}
              </CardContent>
           </Card>
        </div>
      </div>



      {/* Benefit & Reward Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Member Benefits</h3>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mt-1">Exclusive perks for your next adventure</p>
          </div>
          <Link href="/dashboard/rewards">
            <Button variant="ghost" className="font-bold text-brand hover:text-brand-dark hover:bg-brand-50 uppercase tracking-wider text-xs">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {rewards.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4">
              <Gift className="h-8 w-8 text-gray-300" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">No Rewards Available Yet</h4>
            <p className="text-gray-500 mt-1">Check back later for exciting offers!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rewards.map((item) => (
              <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 border-none shadow-md overflow-hidden flex flex-col h-full">
                <div className="h-32 bg-gray-100 relative overflow-hidden">
                   {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                   ) : (
                      <div className="absolute inset-0 bg-brand/5 group-hover:bg-brand/10 transition-colors flex items-center justify-center">
                         <Gift className="h-10 w-10 text-brand/20" />
                      </div>
                   )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg font-bold text-gray-900 line-clamp-1">{item.name}</CardTitle>
                    <span className={`px-3 py-1 rounded-full text-xs font-black whitespace-nowrap ${
                        item.cost === 0 ? 'bg-green-100 text-green-700' : 'bg-brand-50 text-brand'
                    }`}>
                      {item.cost === 0 ? 'FREE' : `${item.cost} PTS`}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <p className="text-gray-500 text-sm line-clamp-2 mb-4">{item.description}</p>
                  <Link href="/dashboard/rewards" className="w-full">
                    <Button className="w-full bg-white border-2 border-brand text-brand hover:bg-brand hover:text-white font-bold rounded-xl transition-all shadow-none">
                        Redeem
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
