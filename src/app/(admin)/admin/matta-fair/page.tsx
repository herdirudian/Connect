'use client';

import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Download, 
  Users, 
  CheckCircle2, 
  Clock,
  Filter
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MattaFairRegistration {
  id: string;
  fullName: string;
  whatsapp: string;
  email: string;
  city: string;
  voucherCode: string;
  isUsed: boolean;
  usedAt: string | null;
  createdAt: string;
}

export default function MattaFairAdminPage() {
  const [data, setData] = useState<MattaFairRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'USED' | 'AVAILABLE'>('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/matta-fair');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch registrations',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.whatsapp.includes(searchQuery) ||
      item.voucherCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'ALL' || 
      (filterStatus === 'USED' && item.isUsed) || 
      (filterStatus === 'AVAILABLE' && !item.isUsed);

    return matchesSearch && matchesStatus;
  });

  const handleExport = () => {
    // Basic CSV export
    const headers = ['Full Name', 'WhatsApp', 'Email', 'City', 'Voucher Code', 'Status', 'Claimed At', 'Redeemed At'];
    const rows = filteredData.map(item => [
      item.fullName,
      item.whatsapp,
      item.email,
      item.city,
      item.voucherCode,
      item.isUsed ? 'REDEEMED' : 'AVAILABLE',
      new Date(item.createdAt).toLocaleString(),
      item.usedAt ? new Date(item.usedAt).toLocaleString() : '-'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `matta-fair-registrations-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Matta Fair Rewards</h2>
          <p className="text-gray-500 font-medium">Manage and monitor MATTA Fair e-voucher registrations.</p>
        </div>
        <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-900/10">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-none shadow-md bg-brand text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-brand-100">Total Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black">{data.length}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-emerald-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-emerald-100">Redeemed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black">{data.filter(i => i.isUsed).length}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white text-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-400">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black">{data.filter(i => !i.isUsed).length}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white text-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-400">Redemption Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black">
              {data.length > 0 ? Math.round((data.filter(i => i.isUsed).length / data.length) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input 
                placeholder="Search by name, email, or code..." 
                className="pl-10 h-11 border-gray-200 focus:ring-brand focus:border-brand rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
              <Button 
                variant={filterStatus === 'ALL' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setFilterStatus('ALL')}
                className={filterStatus === 'ALL' ? 'bg-white shadow-sm font-bold' : ''}
              >
                All
              </Button>
              <Button 
                variant={filterStatus === 'AVAILABLE' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setFilterStatus('AVAILABLE')}
                className={filterStatus === 'AVAILABLE' ? 'bg-white shadow-sm font-bold' : ''}
              >
                Available
              </Button>
              <Button 
                variant={filterStatus === 'USED' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setFilterStatus('USED')}
                className={filterStatus === 'USED' ? 'bg-white shadow-sm font-bold' : ''}
              >
                Used
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-bold text-gray-700">Visitor</TableHead>
                  <TableHead className="font-bold text-gray-700">Contact</TableHead>
                  <TableHead className="font-bold text-gray-700">City</TableHead>
                  <TableHead className="font-bold text-gray-700">Code</TableHead>
                  <TableHead className="font-bold text-gray-700">Status</TableHead>
                  <TableHead className="font-bold text-gray-700">Registered At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-gray-400 font-medium">Loading data...</TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-gray-400 font-medium">No registrations found</TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand font-bold text-xs uppercase">
                            {item.fullName.charAt(0)}
                          </div>
                          <span className="font-bold text-gray-900">{item.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-gray-900">{item.email}</p>
                          <p className="text-xs text-gray-500">{item.whatsapp}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 font-medium">{item.city}</TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono font-bold text-gray-700">
                          {item.voucherCode}
                        </code>
                      </TableCell>
                      <TableCell>
                        {item.isUsed ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-full w-fit">
                            <CheckCircle2 size={12} /> REDEEMED
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-brand-dark font-bold text-xs bg-brand-50 px-2 py-1 rounded-full w-fit">
                            <Clock size={12} /> AVAILABLE
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 font-medium">
                        {new Date(item.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}