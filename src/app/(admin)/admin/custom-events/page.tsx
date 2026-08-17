'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Trash2, 
  Download, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  Users,
  Search,
  Ticket,
  CheckCircle2,
  XCircle,
  X,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

interface CustomEvent {
  id: string;
  eventName: string;
  eventDate: string;
  participantName: string;
  pax: number;
  email: string;
  phoneNumber: string;
  voucherCode: string;
  status: string;
  usedAt: string | null;
  createdAt: string;
}

export default function AdminCustomEventsPage() {
  const [events, setEvents] = useState<CustomEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    eventName: '',
    eventDate: '',
    participantName: '',
    pax: 1,
    email: '',
    phoneNumber: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/admin/custom-events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch events', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/custom-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast({ title: 'Success', description: 'Custom event created successfully' });
        setIsModalOpen(false);
        setFormData({
          eventName: '',
          eventDate: '',
          participantName: '',
          pax: 1,
          email: '',
          phoneNumber: ''
        });
        fetchEvents();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to create event', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create event', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await fetch(`/api/admin/custom-events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Deleted', description: 'Event has been removed' });
        fetchEvents();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete event', variant: 'destructive' });
    }
  };

  const downloadVoucher = async (event: CustomEvent) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      // Colors
      const brandColor = '#1a4332'; // The Lodge Green
      const accentColor = '#eab308'; // Yellow

      // Background
      doc.setFillColor(brandColor);
      doc.rect(0, 0, 148, 40, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('E-VOUCHER EVENT', 74, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text('THE LODGE MARIBAYA EXPERIENCE', 74, 30, { align: 'center' });

      // Event Info Section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(event.eventName.toUpperCase(), 74, 55, { align: 'center' });

      doc.setDrawColor(230, 230, 230);
      doc.line(20, 60, 128, 60);

      // Details
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('NAMA PESERTA', 25, 75);
      doc.text('TANGGAL EVENT', 25, 85);
      doc.text('JUMLAH PAX', 25, 95);
      doc.text('KODE VOUCHER', 25, 105);

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(event.participantName, 65, 75);
      doc.text(format(new Date(event.eventDate), 'dd MMMM yyyy'), 65, 85);
      doc.text(`${event.pax} Orang`, 65, 95);
      doc.setTextColor(brandColor);
      doc.text(event.voucherCode, 65, 105);

      // QR Code
      const qrDataUrl = await QRCode.toDataURL(event.voucherCode, { margin: 1, width: 200 });
      doc.addImage(qrDataUrl, 'PNG', 49, 115, 50, 50);

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Tunjukkan E-Voucher ini kepada petugas loket untuk discan.', 74, 175, { align: 'center' });
      doc.text('Valid hanya pada tanggal yang tertera.', 74, 180, { align: 'center' });
      
      doc.setFontSize(7);
      doc.text(`Generated at: ${new Date().toLocaleString()}`, 74, 200, { align: 'center' });

      doc.save(`Voucher-${event.eventName}-${event.participantName}.pdf`);
      
      toast({ title: 'Downloaded', description: 'PDF Voucher has been generated' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
    }
  };

  const filteredEvents = events.filter(e => 
    e.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.voucherCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Custom Events</h2>
          <p className="text-gray-500 font-medium">Manage custom event vouchers and participants</p>
        </div>
        <Button className="bg-brand hover:bg-brand-dark rounded-xl font-bold h-12 px-6 shadow-lg shadow-brand/20" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} className="mr-2" /> Create Custom Voucher
        </Button>
      </div>

      <Card className="border-none shadow-xl overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input 
                placeholder="Search by event, name, or code..." 
                className="pl-10 h-12 bg-white border-gray-200 rounded-2xl text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50">
                <tr>
                  <th className="px-6 py-4">Event & Date</th>
                  <th className="px-6 py-4">Participant</th>
                  <th className="px-6 py-4">Voucher Info</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Loader2 className="animate-spin" size={24} />
                        <span className="font-bold uppercase tracking-widest text-xs">Loading Events...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-medium italic">
                      No custom events found.
                    </td>
                  </tr>
                ) : filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand flex items-center justify-center shrink-0">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-none mb-1">{event.eventName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{format(new Date(event.eventDate), 'dd MMM yyyy')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-700 font-bold">
                          <User size={14} className="text-gray-400" />
                          {event.participantName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Mail size={12} className="text-gray-400" />
                          {event.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Phone size={12} className="text-gray-400" />
                          {event.phoneNumber}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Ticket size={14} className="text-brand" />
                          <span className="font-mono font-bold text-brand tracking-wider">{event.voucherCode}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Users size={12} className="text-gray-400" />
                          {event.pax} Pax
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {event.status === 'USED' ? (
                        <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase tracking-wider bg-green-50 px-2.5 py-1 rounded-full w-fit">
                          <CheckCircle2 size={12} />
                          Redeemed
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-brand font-bold text-[10px] uppercase tracking-wider bg-brand-50 px-2.5 py-1 rounded-full w-fit">
                          <Ticket size={12} />
                          Active
                        </div>
                      )}
                      {event.usedAt && (
                        <p className="text-[9px] text-gray-400 mt-1 ml-1">{format(new Date(event.usedAt), 'dd/MM HH:mm')}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 w-9 rounded-lg border-gray-200 text-brand hover:text-brand-dark hover:bg-brand-50"
                          onClick={() => downloadVoucher(event)}
                          title="Download PDF"
                        >
                          <Download size={16} />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 w-9 rounded-lg border-gray-200 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(event.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
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

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg rounded-[32px] overflow-hidden border-none shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="bg-brand-dark text-white p-8 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-2xl font-black uppercase tracking-tight italic">Create Event Voucher</CardTitle>
                <p className="text-brand-100 text-xs font-bold uppercase tracking-widest mt-1">Add new participant manually</p>
              </div>
              <Button variant="ghost" className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </Button>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Event Name</label>
                  <Input 
                    required
                    placeholder="e.g., Corporate Gathering PT. ABC"
                    value={formData.eventName}
                    onChange={e => setFormData({...formData, eventName: e.target.value})}
                    className="rounded-2xl bg-gray-50 border-transparent h-12 text-sm font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Event Date</label>
                    <Input 
                      required
                      type="date"
                      value={formData.eventDate}
                      onChange={e => setFormData({...formData, eventDate: e.target.value})}
                      className="rounded-2xl bg-gray-50 border-transparent h-12 text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Jumlah Pax</label>
                    <Input 
                      required
                      type="number"
                      min="1"
                      value={formData.pax}
                      onChange={e => setFormData({...formData, pax: parseInt(e.target.value)})}
                      className="rounded-2xl bg-gray-50 border-transparent h-12 text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Participant Name</label>
                  <Input 
                    required
                    placeholder="Nama Lengkap Penanggung Jawab"
                    value={formData.participantName}
                    onChange={e => setFormData({...formData, participantName: e.target.value})}
                    className="rounded-2xl bg-gray-50 border-transparent h-12 text-sm font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                    <Input 
                      required
                      type="email"
                      placeholder="tamu@email.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="rounded-2xl bg-gray-50 border-transparent h-12 text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <Input 
                      required
                      placeholder="08123456xxx"
                      value={formData.phoneNumber}
                      onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                      className="rounded-2xl bg-gray-50 border-transparent h-12 text-sm font-bold"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-brand hover:bg-brand-dark text-white rounded-2xl h-14 font-black uppercase tracking-widest mt-4 shadow-xl shadow-brand/20 transition-all hover:scale-[1.02]"
                  disabled={submitting}
                >
                  {submitting ? (
                    <><Loader2 className="animate-spin mr-2" size={20} /> Creating...</>
                  ) : (
                    'Generate Voucher'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
