'use client';

import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import jsPDF from 'jspdf';

type RedeemReceiptProps = {
  transactionId: string;
  description: string;
  amount: number;
  originalSubtotal?: number;
  adminFee?: number;
  discount?: number;
  promoCode?: string;
  createdAt: string;
  userName: string;
  userEmail: string;
  items?: Array<{ name: string; qty: number; price: number }>;
};

export default function RedeemReceiptButton({
  transactionId,
  description,
  amount,
  originalSubtotal,
  adminFee,
  discount,
  promoCode,
  createdAt,
  userName,
  userEmail,
  items,
}: RedeemReceiptProps) {
  const handleClick = async () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const brandColor = '#1b5e20';
    const margin = 40;
    const line = (y: number) => doc.line(margin, y, pageWidth - margin, y);

    // Helper to load image
    const loadImage = (src: string): Promise<{ data: string; w: number; h: number }> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve({ data: canvas.toDataURL('image/png'), w: img.width, h: img.height });
          } else {
            resolve({ data: '', w: 0, h: 0 });
          }
        };
        img.onerror = () => resolve({ data: '', w: 0, h: 0 });
      });
    };

    // Load logo (optional)
    const logo = await loadImage('/logotlm.png');

    // Header
    if (logo && logo.data) {
      const targetH = 36;
      const ratio = logo.w && logo.h ? logo.w / logo.h : 2.5;
      const targetW = targetH * ratio;
      doc.addImage(logo.data, 'PNG', margin, 18, targetW, targetH);
    }

    doc.setTextColor(brandColor);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE - THE LODGE MARIBAYA', pageWidth - margin, 40, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('E‑Voucher Redemption Receipt', pageWidth - margin, 56, { align: 'right' });
    line(70);

    // Details
    let yPos = 100;
    const leftColX = margin;
    const rightColX = margin + 120;
    const lineHeight = 14;

    // Helper for rows
    const addRow = (label: string, value: string, isBold = false) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(label, leftColX, yPos);
      
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      const splitValue = doc.splitTextToSize(value, pageWidth - rightColX - margin);
      doc.text(splitValue, rightColX, yPos);
      
      yPos += (lineHeight * splitValue.length);
    };

    addRow('Nomor', transactionId);
    
    const date = new Date(createdAt);
    const dateStr = date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    addRow('Tanggal', dateStr);
    yPos += 6;
    addRow('Nama', userName, true);
    addRow('Email', userEmail);
    yPos += 10;

    // Product Section
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('DETAIL PRODUK', margin, yPos);
    yPos += 18;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    addRow('Deskripsi', description, true);
    yPos += 6;

    // Purchase table (per-item)
    const formatCurrency = (n: number) =>
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.max(0, n || 0));

    line(yPos); yPos += 16;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('No.', margin, yPos);
    doc.text('Deskripsi', margin + 40, yPos);
    doc.text('Qty', pageWidth - 220, yPos);
    doc.text('Subtotal', pageWidth - 120, yPos, { align: 'right' });
    yPos += 12;

    doc.setFont('helvetica', 'normal');
    const list = (Array.isArray(items) && items.length > 0)
      ? items
      : [{ name: description, qty: 1, price: amount }];

    let total = 0;
    list.forEach((it, idx) => {
      const subtotal = (it.qty || 1) * (it.price || 0);
      total += subtotal;
      doc.text(String(idx + 1), margin, yPos);
      doc.text(doc.splitTextToSize(it.name || '-', pageWidth - margin - 250), margin + 40, yPos);
      doc.text(String(it.qty || 1), pageWidth - 220, yPos);
      doc.text(formatCurrency(subtotal), pageWidth - 120, yPos, { align: 'right' });
      yPos += 12;
    });
    const subtotalValue = Number.isFinite(originalSubtotal as any) ? Number(originalSubtotal) : total;
    const adminFeeValue = Number.isFinite(adminFee as any) ? Number(adminFee) : 0;
    const discountValue = Number.isFinite(discount as any) ? Number(discount) : 0;
    const subtotalAfterDiscountNoFee = Math.max(0, subtotalValue - discountValue);
    const computedTotal = Math.max(0, subtotalValue + adminFeeValue - discountValue);
    const totalPayment = amount && amount > 0 ? amount : computedTotal;

    line(yPos); yPos += 16;
    const rightX = pageWidth - margin;

    const valueColWidth = 130;
    const labelRightX = rightX - valueColWidth;
    const labelX = rightX - 340;
    const labelMaxWidth = Math.max(120, labelRightX - labelX);
    const lineH = 12;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');

    const addBreakdownRow = (label: string, value: string) => {
      const lines = doc.splitTextToSize(label, labelMaxWidth);
      doc.text(lines, labelX, yPos);
      const valueY = yPos + lineH * (lines.length - 1);
      doc.text(value, rightX, valueY, { align: 'right' });
      yPos += lineH * lines.length;
    };

    addBreakdownRow('Sub Total Sebelum Diskon', formatCurrency(subtotalValue));

    const discountLabel = promoCode && discountValue > 0 ? `Diskon (${promoCode})` : 'Diskon';
    addBreakdownRow(discountLabel, discountValue > 0 ? `-${formatCurrency(discountValue)}` : formatCurrency(0));

    addBreakdownRow('Sub Total Setelah Diskon Tanpa Admin Fee', formatCurrency(subtotalAfterDiscountNoFee));
    addBreakdownRow('Admin Fee', formatCurrency(adminFeeValue));
    addBreakdownRow('Sub Total Keseluruhan setelah diskon dan admin fee', formatCurrency(computedTotal));

    line(yPos); yPos += 18;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const totalText = `JUMLAH PEMBAYARAN: ${formatCurrency(totalPayment)}`;
    doc.text(totalText, rightX, yPos, { align: 'right' });
    yPos += 30;

    // Watermark "REDEEMED" (placed low to avoid obstructing content)
    doc.setTextColor(225, 225, 225);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(48);
    doc.text('REDEEMED', pageWidth / 2, pageHeight - 120, { align: 'center', angle: 18 });
    doc.setTextColor(0, 0, 0);

    // Footer
    const footerY = pageHeight - 40;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Dokumen ini digenerate otomatis oleh sistem The Lodge Maribaya.', pageWidth / 2, footerY, { align: 'center' });
    doc.text('© The Lodge Maribaya', pageWidth / 2, footerY + 5, { align: 'center' });

    // Output as Blob URL to avoid blank page issues
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <FileText className="h-4 w-4 mr-1" />
      PDF
    </Button>
  );
}
