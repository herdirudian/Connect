import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Star, Search, Download, Phone, QrCode } from 'lucide-react';
import AddPointsButton from '@/components/admin/AddPointsButton';
import { Input } from '@/components/ui/input';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const users = await prisma.user.findMany({
    where: {
      role: 'MEMBER',
      ...(q ? {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { referralCode: { contains: q } },
          { phoneNumber: { contains: q } }
        ]
      } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      referredBy: {
        select: { name: true }
      },
      _count: {
        select: { referrals: true }
      }
    }
  });

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manajemen Member</h2>
          <p className="text-gray-500">Lihat dan kelola data member aplikasi.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <a href="/api/admin/users/export" target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </a>
            <form className="flex gap-2 flex-1 md:flex-none">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input 
                        name="q" 
                        defaultValue={q} 
                        placeholder="Cari nama, email, kode..." 
                        className="pl-9 w-full md:w-[250px]" 
                    />
                </div>
                <Button type="submit">Cari</Button>
            </form>
        </div>
      </div>

      <Card className="border-none shadow-md">
        <CardContent className="p-0">
            <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="[&_tr]:border-b bg-gray-50">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-2 sm:px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider whitespace-nowrap">Member Details</th>
                            <th className="h-12 px-2 sm:px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider whitespace-nowrap">Referral</th>
                            <th className="h-12 px-2 sm:px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider whitespace-nowrap">Role</th>
                            <th className="h-12 px-2 sm:px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider whitespace-nowrap">Tier Status</th>
                            <th className="h-12 px-2 sm:px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider whitespace-nowrap">Points</th>
                            <th className="h-12 px-2 sm:px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider whitespace-nowrap">Bergabung</th>
                            <th className="h-12 px-2 sm:px-6 align-middle font-bold text-gray-500 uppercase text-xs tracking-wider text-right whitespace-nowrap">Action</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0 bg-white">
                        {users.map((user) => (
                            <tr key={user.id} className="border-b transition-colors hover:bg-gray-50">
                                <td className="p-2 sm:p-6 align-middle font-medium whitespace-nowrap">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center text-brand border border-brand-100 shrink-0">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                            {user.phoneNumber && (
                                                <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <Phone size={10} /> {user.phoneNumber}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-2 sm:p-6 align-middle whitespace-nowrap">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <QrCode size={14} />
                                            <span className="font-mono text-xs font-bold bg-gray-100 px-2 py-1 rounded" title="Referral Code">{user.referralCode}</span>
                                        </div>
                                        <div className="space-y-1">
                                            {user.referredBy && (
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <span className="text-gray-400">Invited by:</span>
                                                    <span className="font-medium text-gray-700 truncate max-w-[100px]" title={user.referredBy.name}>{user.referredBy.name}</span>
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-500">
                                                Total Referrals: <span className="font-bold text-brand">{user._count?.referrals || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-2 sm:p-6 align-middle whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 
                                        user.role === 'STAFF' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-2 sm:p-6 align-middle whitespace-nowrap">
                                     <div className={`flex items-center gap-1.5 font-bold text-xs uppercase px-3 py-1 rounded-lg w-fit ${
                                         user.tier === 'LODGE_GUARDIAN' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                         user.tier === 'NATURE_LOVER' ? 'bg-green-50 text-green-700 border border-green-200' :
                                         'bg-gray-50 text-gray-600 border border-gray-200'
                                     }`}>
                                        <Star className="h-3.5 w-3.5" fill={user.tier === 'LODGE_GUARDIAN' ? 'currentColor' : 'none'} /> 
                                        {user.tier.replace('_', ' ')}
                                     </div>
                                </td>
                                <td className="p-2 sm:p-6 align-middle whitespace-nowrap">
                                    <div className="font-mono font-black text-brand text-lg">
                                        {user.points.toLocaleString()}
                                    </div>
                                </td>
                                <td className="p-2 sm:p-6 align-middle text-gray-500 text-sm font-medium whitespace-nowrap">
                                    {new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="p-2 sm:p-6 align-middle text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2">
                                        <AddPointsButton userId={user.id} userName={user.name} />
                                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-brand">
                                            Edit
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
