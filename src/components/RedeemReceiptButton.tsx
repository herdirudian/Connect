'use client';

import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import jsPDF from 'jspdf';

type RedeemReceiptProps = {
  transactionId: string;
  description: string;
  amount: number;
  createdAt: string;
  userName: string;
  userEmail: string;
};

export default function RedeemReceiptButton({
  transactionId,
  description,
  amount,
  createdAt,
  userName,
  userEmail,
}: RedeemReceiptProps) {
  const handleClick = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const brandColor = '#0f4d39';

    // Helper to load image
    const loadImage = (src: string): Promise<string> => {
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
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve('');
          }
        };
        img.onerror = () => resolve('');
      });
    };

    // Load logo
    const logoData = await loadImage('/logotlm.png');

    // Header Background
    // doc.setFillColor(brandColor);
    // doc.rect(0, 0, pageWidth, 40, 'F');

    // Add Logo if available
    if (logoData) {
      // Aspect ratio calc if needed, or fixed size. 
      // Assuming landscape logo, let's fit it in 20mm height
      doc.addImage(logoData, 'PNG', 15, 10, 30, 20); // x, y, w, h
    }

    // Header Title
    doc.setTextColor(brandColor); // Set to brand color instead of white
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('BUKTI REDEEM', pageWidth - 20, 20, { align: 'right' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('The Lodge Connect Member', pageWidth - 20, 28, { align: 'right' });

    // Reset Text Color
    doc.setTextColor(60, 60, 60);
    
    // Transaction Details Section
    let yPos = 60;
    const leftColX = 20;
    const rightColX = 80;
    const lineHeight = 10;

    // Helper for rows
    const addRow = (label: string, value: string, isBold = false) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(label, leftColX, yPos);
      
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      // Handle multiline for long text (like description)
      const splitValue = doc.splitTextToSize(value, pageWidth - rightColX - 20);
      doc.text(splitValue, rightColX, yPos);
      
      yPos += (lineHeight * splitValue.length);
    };

    addRow('ID Transaksi', transactionId);
    
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
    
    yPos += 5; // Spacer
    
    addRow('Member', userName, true);
    addRow('Email', userEmail);
    
    yPos += 5; // Spacer

    // Reward Details Box
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.line(20, yPos - 5, pageWidth - 20, yPos - 5);
    
    yPos += 5;
    
    addRow('Reward', description, true);
    addRow('Poin Digunakan', `${amount.toLocaleString('id-ID')} PTS`, true);

    // Footer
    const footerY = 280;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Dokumen ini digenerate otomatis oleh sistem Family The Lodge.', pageWidth / 2, footerY, { align: 'center' });
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

