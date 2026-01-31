import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, Search, History } from 'lucide-react';
import RedeemReceiptButton from '@/components/RedeemReceiptButton';
import ExportButton from '@/components/admin/ExportButton';

export default async function TransactionsPage() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Riwayat Transaksi Global</h2>
          <p className="text-gray-500">Pantau pergerakan poin dan aktivitas member.</p>
        </div>
        <div className="flex gap-2">
          <ExportButton endpoint="/api/admin/transactions/export" filename="transactions-report.csv" />
          <Button>
            <Search className="mr-2 h-4 w-4" /> Filter Transaksi
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md">
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm text-left">
              <thead className="[&_tr]:border-b bg-gray-50">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider">
                    Member
                  </th>
                  <th className="h-12 px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider">
                    Tipe
                  </th>
                  <th className="h-12 px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider">
                    Deskripsi
                  </th>
                  <th className="h-12 px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider">
                    Source
                  </th>
                  <th className="h-12 px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider">
                    Jumlah Poin
                  </th>
                  <th className="h-12 px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider">
                    Bukti
                  </th>
                  <th className="h-12 px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider text-right">
                    Tanggal
                  </th>
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
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          tx.type === 'EARN'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {tx.type === 'EARN' ? (
                          <ArrowDownLeft className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-6 align-middle">
                      <span className="font-medium text-gray-700">{tx.description}</span>
                    </td>
                    <td className="p-6 align-middle">
                      <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-600">
                        {tx.source || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="p-6 align-middle">
                      <div
                        className={`font-mono font-black text-lg ${
                          tx.type === 'EARN' ? 'text-green-600' : 'text-orange-600'
                        }`}
                      >
                        {tx.type === 'EARN' ? '+' : '-'}
                        {tx.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="p-6 align-middle">
                      {tx.type === 'REDEEM' && tx.source?.startsWith('REWARD:') ? (
                        <RedeemReceiptButton
                          transactionId={tx.id}
                          description={tx.description || ''}
                          amount={tx.amount}
                          createdAt={tx.createdAt.toISOString()}
                          userName={tx.user.name}
                          userEmail={tx.user.email}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-6 align-middle text-right text-gray-500 text-sm font-medium">
                      {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-400">
                      <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Belum ada transaksi tercatat</p>
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
