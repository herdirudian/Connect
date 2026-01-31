'use server';

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, Utensils, Tent, LayoutDashboard, Gift, Users, History, ScanLine } from 'lucide-react';
import { getMonthlyRevenue } from '@/lib/analytics';
import { RevenueChart } from '@/components/admin/RevenueChart';

export default async function AdminHomePage() {
  let attractionsCount = 0;
  let restaurantsCount = 0;
  let accommodationsCount = 0;
  let ticketsCount = 0;
  let rewardsCount = 0;
  let usersCount = 0;
  let transactionsCount = 0;
  let revenueData: { month: string; revenue: number }[] = [];

  try {
    [attractionsCount, restaurantsCount, accommodationsCount, ticketsCount, rewardsCount, usersCount, transactionsCount, revenueData] = await Promise.all([
      prisma.attraction.count(),
      prisma.restaurant.count(),
      prisma.accommodation.count(),
      prisma.ticket.count(),
      prisma.reward.count(),
      prisma.user.count(),
      prisma.transaction.count(),
      getMonthlyRevenue(),
    ]);
  } catch {
    attractionsCount = 0;
    restaurantsCount = 0;
    accommodationsCount = 0;
    ticketsCount = 0;
    rewardsCount = 0;
    usersCount = 0;
    transactionsCount = 0;
    revenueData = [];
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Admin Overview</h2>
          <p className="text-muted-foreground">Kelola tiket, wahana, dan penginapan.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-brand hover:text-brand-dark">
          <span className="inline-flex items-center gap-2">
            <LayoutDashboard size={16} /> Kembali ke Dashboard User
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <RevenueChart data={revenueData} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-brand" />
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">Total Transaksi: {transactionsCount}</p>
            <Link href="/admin/transactions" className="text-brand hover:text-brand-dark text-sm">Lihat Riwayat</Link>
          </CardContent>
        </Card>

        <Card className="bg-brand-50 border-brand-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-700">
              <ScanLine className="h-5 w-5" />
              Gatekeeper
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-brand-600/80 mb-3 font-medium">Validasi tiket & voucher member.</p>
            <Link href="/admin/validate" className="inline-flex items-center justify-center px-4 py-2 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand-dark transition-colors w-full">
               Buka Scanner
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">Total Member: {usersCount}</p>
            <Link href="/admin/users" className="text-brand hover:text-brand-dark text-sm">Kelola Member</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-brand" />
              Tickets & Wahana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">Total item: {attractionsCount} | Tickets: {ticketsCount}</p>
            <Link href="/admin/attractions" className="text-brand hover:text-brand-dark text-sm">Kelola Attractions</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-brand" />
              Food & Beverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">Total item: {restaurantsCount}</p>
            <Link href="/admin/food" className="text-brand hover:text-brand-dark text-sm">Kelola Food</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tent className="h-5 w-5 text-brand" />
              Staycation & Penginapan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">Total item: {accommodationsCount}</p>
            <Link href="/admin/stay" className="text-brand hover:text-brand-dark text-sm">Kelola Penginapan</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-brand" />
              Benefit & Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">Total item: {rewardsCount}</p>
            <Link href="/admin/rewards" className="text-brand hover:text-brand-dark text-sm">Kelola Rewards</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
