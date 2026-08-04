'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Ticket, Percent, Tent, Trees, Compass, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function BenefitsPage() {
  const benefits = [
    {
      id: 'free-entrance',
      title: 'Free Entrance 3x',
      description: 'Nikmati akses masuk gratis ke kawasan The Lodge Maribaya sebanyak 3 kali dalam setahun.',
      icon: Ticket,
      color: 'bg-green-50 text-green-600',
      href: '/dashboard/tickets'
    },
    {
      id: 'discount-pines',
      title: 'Diskon 10% The Pines',
      description: 'Dapatkan potongan harga eksklusif 10% untuk pemesanan makanan dan minuman di The Pines Cafe.',
      icon: Percent,
      color: 'bg-orange-50 text-orange-600',
      href: '/dashboard/food'
    },
    {
      id: 'room-rate',
      title: 'Room Member Rate',
      description: 'Harga spesial khusus member untuk menginap di semua jenis akomodasi (Glamping, Village, dll).',
      icon: Tent,
      color: 'bg-blue-50 text-blue-600',
      href: '/dashboard/stay'
    },
    {
      id: 'wahana-benefit',
      title: 'Wahana Benefit',
      description: 'Jalur khusus (Fast Track) dan promo spesial untuk berbagai wahana petualangan kami.',
      icon: Compass,
      color: 'bg-purple-50 text-purple-600',
      href: '/dashboard/tickets'
    },
    {
      id: 'tree-adoption',
      title: 'Tree Adoption',
      description: 'Program adopsi pohon sebagai bentuk kontribusi Anda terhadap pelestarian alam dan lingkungan.',
      icon: Trees,
      color: 'bg-brand-50 text-brand',
      href: '/dashboard/rewards'
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 rounded-full border border-brand-100 mb-3">
            <ShieldCheck className="h-4 w-4 text-brand" />
            <span className="text-xs font-bold tracking-widest uppercase text-brand-dark">Member Privilege</span>
          </div>
          <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Keuntungan Member</h2>
          <p className="text-gray-500 font-medium mt-1">Jelajahi semua keuntungan eksklusif yang kami siapkan khusus untuk Anda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {benefits.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <Link href={benefit.href} key={benefit.id} className="group h-full">
              <Card className="h-full border border-gray-100 shadow-sm bg-white hover:shadow-xl hover:border-brand-300 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-16 bg-gray-50 rounded-full -mr-8 -mt-8 blur-2xl opacity-50 group-hover:bg-brand-50 transition-colors"></div>
                <CardContent className="p-8 relative z-10 flex flex-col h-full">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-transform duration-300 group-hover:scale-110 ${benefit.color}`}>
                    <Icon className="h-8 w-8" strokeWidth={2} />
                  </div>
                  
                  <h3 className="text-xl font-black text-gray-900 mb-3 tracking-tight group-hover:text-brand transition-colors">
                    {benefit.title}
                  </h3>
                  
                  <p className="text-gray-500 font-medium leading-relaxed mb-6 flex-1">
                    {benefit.description}
                  </p>
                  
                  <div className="mt-auto flex items-center text-sm font-bold text-brand uppercase tracking-wider group-hover:text-brand-dark transition-colors">
                    Gunakan Sekarang
                    <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-brand to-brand-dark rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden mt-12">
        <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-2">Tingkatkan Level Anda</h3>
            <p className="text-brand-100 font-medium max-w-lg">Kumpulkan lebih banyak poin untuk mencapai tier membership yang lebih tinggi dan dapatkan keuntungan yang lebih spektakuler.</p>
          </div>
          <Link href="/dashboard/membership">
            <button className="bg-white text-brand-dark hover:bg-gray-50 font-bold uppercase tracking-widest px-8 py-4 rounded-xl shadow-lg transition-colors whitespace-nowrap">
              Lihat Level Saya
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
