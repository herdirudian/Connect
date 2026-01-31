import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Search, History, Gift } from 'lucide-react';
import Link from 'next/link';
import RedeemReceiptButton from '@/components/RedeemReceiptButton';

export const dynamic = 'force-dynamic';

export default async function RedeemHistoryPage() {
  const transactions = await prisma.transaction.findMany({
    where: {
      type: 'REDEEM',
      source: {
        startsWith: 'REWARD:'
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Link href="/admin/rewards">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
             </Link>
             <h2 className="text-2xl font-bold text-gray-800">Riwayat Redeem Reward</h2>
          </div>
          <p className="text-gray-500 ml-10">Daftar penukaran poin member dengan voucher/reward.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
        </div>
      </div>

      <Card className="border-none shadow-md">
        <CardContent className="p-0">
            <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="[&_tr]:border-b bg-gray-50">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider">Member</th>
                            <th className="h-12 px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider">Reward</th>
                            <th className="h-12 px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider">Poin</th>
                            <th className="h-12 px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider">Tanggal</th>
                            <th className="h-12 px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider text-center">Bukti</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0 bg-white">
                        {transactions.map((tx) => (
                            <tr key={tx.id} className="border-b transition-colors hover:bg-gray-50">
                                <td className="p-6 align-middle font-medium">
                                    <div>
                                        <div className="font-bold text-gray-900">{tx.user.name}</div>
                                        <div className="text-xs text-gray-500">{tx.user.email}</div>
                                    </div>
                                </td>
                                <td className="p-6 align-middle">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-brand-50 rounded-lg text-brand">
                                            <Gift className="h-4 w-4" />
                                        </div>
                                        <span className="font-medium text-gray-700">{tx.description?.replace('Redeem ', '') || 'Reward'}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 font-mono mt-1">{tx.source?.split(':')[1]}</div>
                                </td>
                                <td className="p-6 align-middle">
                                    <div className="font-mono font-black text-lg text-orange-600">
                                        -{tx.amount.toLocaleString()}
                                    </div>
                                </td>
                                <td className="p-6 align-middle text-gray-500 text-sm font-medium">
                                    {new Date(tx.createdAt).toLocaleDateString('id-ID', { 
                                        day: 'numeric', 
                                        month: 'short', 
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </td>
                                <td className="p-6 align-middle text-center">
                                    <RedeemReceiptButton 
                                        transactionId={tx.id}
                                        description={tx.description || ''}
                                        amount={tx.amount}
                                        createdAt={tx.createdAt.toISOString()}
                                        userName={tx.user.name}
                                        userEmail={tx.user.email}
                                    />
                                </td>
                            </tr>
                        ))}
                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-gray-400">
                                    <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p>Belum ada riwayat redeem</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
