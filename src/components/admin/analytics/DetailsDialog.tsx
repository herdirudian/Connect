
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DetailsDialogProps {
  title: string;
  fetchAction: (startDate?: string, endDate?: string) => void;
  data: any[];
  type: 'revenue' | 'bookings' | 'food';
  children: React.ReactNode;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function getDetailContent(item: any) {
    try {
        const details = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
        if (!details || !details.items || details.items.length === 0) {
            return item.type || 'N/A';
        }
        return details.items.map((i: any) => `${i.name} (x${i.qty})`).join(', ');
    } catch (e) {
        return 'Invalid detail format';
    }
}

export function DetailsDialog({ title, fetchAction, data, type, children }: DetailsDialogProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleFilter = () => {
    fetchAction(startDate, endDate);
  }

  return (
    <Dialog onOpenChange={(open) => !open && fetchAction()}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 items-center">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            <Button onClick={handleFilter}>Filter</Button>
        </div>
        <ScrollArea className="h-[60vh]">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Detail</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {data.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell>{new Date(item.createdAt).toLocaleString('id-ID')}</TableCell>
                        <TableCell>{item.user?.name || 'N/A'}</TableCell>
                        <TableCell>{getDetailContent(item)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalAmount || item.amount)}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
