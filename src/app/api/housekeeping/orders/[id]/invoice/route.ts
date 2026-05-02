import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jsPDF from 'jspdf';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await prisma.housekeepingOrder.findUnique({
      where: { id },
      include: {
        items: { include: { item: true } }
      }
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const w = doc.internal.pageSize.getWidth();
    const line = (y: number) => doc.line(margin, y, w - margin, y);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text('INVOICE - HOUSEKEEPING ORDER', margin, 60);
    doc.setFontSize(10);
    doc.text(`Order: ${order.id}`, margin, 80);
    doc.text(`Tanggal: ${new Date(order.createdAt).toLocaleString('id-ID')}`, margin, 95);
    line(110);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('DATA PEMESAN', margin, 130);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    const guest = `${order.guestName || '-'} (${order.guestPhone || '-'})`;
    doc.text(`Nama: ${guest}`, margin, 150);
    doc.text(`Kamar: ${order.roomNumber || '-'}`, margin, 165);
    line(185);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('DETAIL PESANAN', margin, 205);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text('No.', margin, 225);
    doc.text('Item', margin + 40, 225);
    doc.text('Qty', w - 200, 225);
    doc.text('Harga', w - 140, 225);
    doc.text('Subtotal', w - 80, 225);

    let y = 245;
    let subtotal = 0;
    for (let i = 0; i < order.items.length; i++) {
      const it = order.items[i];
      const name = it.item?.name || 'Item';
      const qty = it.quantity || 1;
      const price = it.price || 0;
      const sub = qty * price;
      subtotal += sub;
      doc.text(String(i + 1), margin, y);
      doc.text(String(name), margin + 40, y);
      doc.text(String(qty), w - 200, y);
      doc.text(new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price), w - 140, y);
      doc.text(new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(sub), w - 80, y);
      y += 18;
      if (it.requestNote) {
        doc.setFontSize(9);
        doc.text(`Catatan: ${String(it.requestNote).slice(0, 80)}`, margin + 40, y);
        doc.setFontSize(10);
        y += 14;
      }
    }
    line(y + 4);
    const adminFee = Math.max(0, (order.totalAmount || 0) - subtotal);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal', w - 140 - doc.getTextWidth('Subtotal'), y + 20);
    doc.text(new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(subtotal), w - 80, y + 20);
    doc.text('Admin Fee', w - 140 - doc.getTextWidth('Admin Fee'), y + 36);
    doc.text(new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(adminFee), w - 80, y + 36);
    doc.setFont('helvetica', 'bold');
    const totalText = `TOTAL: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(order.totalAmount || 0)}`;
    doc.text(totalText, w - 80 - doc.getTextWidth(totalText), y + 60);

    const buf = Buffer.from(doc.output('arraybuffer') as ArrayBuffer);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-housekeeping-${order.id}.pdf"`
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to generate invoice' }, { status: 500 });
  }
}
