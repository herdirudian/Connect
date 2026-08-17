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
  Loader2,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Edit2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

interface CustomEventGroup {
  id: string;
  name: string;
  description: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  logos: string | null;
  createdAt: string;
  _count?: {
    events: number;
  };
  events?: CustomEvent[];
}

interface CustomEvent {
  id: string;
  groupId: string | null;
  eventName?: string | null;
  eventDate?: string | null;
  participantName: string;
  pax: number;
  email: string;
  phoneNumber: string;
  voucherCode: string;
  logos?: string | null;
  status: string;
  usedAt: string | null;
  createdAt: string;
  group?: CustomEventGroup;
}

export default function AdminCustomEventsPage() {
  const [groups, setGroups] = useState<CustomEventGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CustomEventGroup | null>(null);
  const [viewMode, setViewMode] = useState<'GROUPS' | 'PARTICIPANTS'>('GROUPS');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    logos: [] as string[]
  });

  const [participantFormData, setParticipantFormData] = useState({
    participantName: '',
    pax: 1,
    email: '',
    phoneNumber: ''
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const openEditGroup = (e: React.MouseEvent, group: CustomEventGroup) => {
    e.stopPropagation();
    setEditingGroupId(group.id);
    setGroupFormData({
      name: group.name,
      description: group.description || '',
      eventDate: format(new Date(group.eventDate), 'yyyy-MM-dd'),
      startTime: group.startTime || '',
      endTime: group.endTime || '',
      logos: group.logos ? JSON.parse(group.logos) : []
    });
    setIsGroupModalOpen(true);
  };

  const openEditParticipant = (participant: CustomEvent) => {
    setEditingParticipantId(participant.id);
    setParticipantFormData({
      participantName: participant.participantName,
      pax: participant.pax,
      email: participant.email,
      phoneNumber: participant.phoneNumber
    });
    setIsParticipantModalOpen(true);
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/custom-event-groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch event groups', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetails = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/custom-event-groups/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedGroup(data);
        setViewMode('PARTICIPANTS');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch group details', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        return data.url;
      });

      const urls = await Promise.all(uploadPromises);
      setGroupFormData(prev => ({
        ...prev,
        logos: [...prev.logos, ...urls]
      }));
      toast({ title: 'Success', description: `${urls.length} logo(s) uploaded` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload logos', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = (index: number) => {
    setGroupFormData(prev => ({
      ...prev,
      logos: prev.logos.filter((_, i) => i !== index)
    }));
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingGroupId 
        ? `/api/admin/custom-event-groups/${editingGroupId}`
        : '/api/admin/custom-event-groups';
      
      const res = await fetch(url, {
        method: editingGroupId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupFormData)
      });

      if (res.ok) {
        toast({ title: 'Success', description: `Event Group ${editingGroupId ? 'updated' : 'created'} successfully` });
        setIsGroupModalOpen(false);
        setEditingGroupId(null);
        setGroupFormData({ name: '', description: '', eventDate: '', startTime: '', endTime: '', logos: [] });
        fetchGroups();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to save group', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save group', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleParticipantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup && !editingParticipantId) return;
    setSubmitting(true);
    try {
      const url = editingParticipantId
        ? `/api/admin/custom-events/${editingParticipantId}`
        : '/api/admin/custom-events';

      const res = await fetch(url, {
        method: editingParticipantId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...participantFormData,
          groupId: selectedGroup?.id
        })
      });

      if (res.ok) {
        toast({ title: 'Success', description: `Participant ${editingParticipantId ? 'updated' : 'added'} successfully` });
        setIsParticipantModalOpen(false);
        setEditingParticipantId(null);
        setParticipantFormData({ participantName: '', pax: 1, email: '', phoneNumber: '' });
        if (selectedGroup) fetchGroupDetails(selectedGroup.id);
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to save participant', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save participant', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group? All vouchers inside will also be deleted.')) return;
    try {
      const res = await fetch(`/api/admin/custom-event-groups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Deleted', description: 'Group has been removed' });
        fetchGroups();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete group', variant: 'destructive' });
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    if (!confirm('Are you sure you want to delete this participant?')) return;
    try {
      const res = await fetch(`/api/admin/custom-events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Deleted', description: 'Participant has been removed' });
        if (selectedGroup) fetchGroupDetails(selectedGroup.id);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete participant', variant: 'destructive' });
    }
  };

  const downloadVoucher = async (event: CustomEvent) => {
    try {
      // Use group info if available, fallback to event info
      const eventName = selectedGroup?.name || event.eventName || 'Event Voucher';
      const eventDate = selectedGroup?.eventDate || event.eventDate || new Date().toISOString();
      const startTime = selectedGroup?.startTime || '';
      const endTime = selectedGroup?.endTime || '';
      const description = selectedGroup?.description || '';
      const logos = selectedGroup?.logos || event.logos || null;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();

      // Colors
      const brandColor = '#1a4332'; // The Lodge Green
      const accentColor = '#eab308'; // Yellow
      const lightGray = '#f8fafc';
      const darkGray = '#334155';
      const slate400 = '#94a3b8';
      const slate500 = '#64748b';

      // Helper for images with dimensions
      const getImageData = async (url: string): Promise<{ base64: string, width: number, height: number }> => {
        const response = await fetch(url);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ base64, width: img.width, height: img.height });
          img.onerror = reject;
          img.src = base64;
        });
      };

      // Background
      doc.setFillColor(lightGray);
      doc.rect(0, 0, width, height, 'F');

      // Top Banner (Reduced height)
      doc.setFillColor(brandColor);
      doc.rect(0, 0, width, 30, 'F');

      // Decorative Line
      doc.setFillColor(accentColor);
      doc.rect(0, 28, width, 2, 'F');

      // Title (Centered in smaller banner)
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('E-VOUCHER EVENT', width / 2, 18, { align: 'center' });
      
      let currentY = 38;

      // Event Logos Row - Fixed Proportions
      if (logos) {
        try {
          const logoUrls = JSON.parse(logos) as string[];
          if (logoUrls.length > 0) {
            const maxLogoWidth = 25;
            const maxLogoHeight = 15;
            const logoGap = 10;
            
            // First pass: calculate total width to center
            const logoData = await Promise.all(logoUrls.map(url => getImageData(url)));
            const logoSpecs = logoData.map(data => {
              const ratio = data.width / data.height;
              let w = maxLogoWidth;
              let h = w / ratio;
              if (h > maxLogoHeight) {
                h = maxLogoHeight;
                w = h * ratio;
              }
              return { ...data, drawW: w, drawH: h };
            });

            const totalWidth = logoSpecs.reduce((sum, spec) => sum + spec.drawW, 0) + (logoSpecs.length - 1) * logoGap;
            let startX = (width - totalWidth) / 2;

            for (const spec of logoSpecs) {
              // Center vertically within maxLogoHeight
              const yPos = currentY + (maxLogoHeight - spec.drawH) / 2;
              doc.addImage(spec.base64, 'PNG', startX, yPos, spec.drawW, spec.drawH, undefined, 'FAST');
              startX += spec.drawW + logoGap;
            }
            currentY += maxLogoHeight + 8;
          }
        } catch (e) {
          console.error('Error adding logos to PDF:', e);
          currentY += 5;
        }
      }

      // Card Container
      const cardX = 12;
      const cardWidth = width - (cardX * 2);
      const cardPadding = 10;
      
      // Calculate dynamic height for description
      const descText = description || '';
      const splitDesc = doc.splitTextToSize(descText, cardWidth - (cardPadding * 2));
      const descHeight = descText ? (splitDesc.length * 4) + 6 : 0;
      
      // Calculate card height dynamically
      // Title(18) + Details(35) + Description(descHeight) + QR(40) + Footer(20) + Bottom Padding(10)
      const cardHeight = 18 + 35 + descHeight + 40 + 20 + 5;

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 6, 6, 'F');
      
      // Card Border
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.2);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 6, 6, 'D');

      // Event Name Title
      doc.setTextColor(brandColor);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(eventName.toUpperCase(), width / 2, currentY + 12, { align: 'center' });

      // Divider
      doc.setDrawColor(241, 245, 249);
      doc.line(cardX + cardPadding, currentY + 18, width - cardX - cardPadding, currentY + 18);

      // Details Section
      let currentDetailY = currentY + 26;
      const labelX = cardX + cardPadding;
      const valueX = cardX + 45;

      doc.setFontSize(8);
      doc.setTextColor(slate400);
      doc.setFont('helvetica', 'bold');
      
      // Row 1: Nama Peserta
      doc.text('NAMA PESERTA', labelX, currentDetailY);
      doc.setTextColor(darkGray);
      doc.text(event.participantName, valueX, currentDetailY);
      
      // Row 2: Tanggal Event
      currentDetailY += 7;
      doc.setTextColor(slate400);
      doc.text('TANGGAL EVENT', labelX, currentDetailY);
      doc.setTextColor(darkGray);
      doc.text(format(new Date(eventDate), 'dd MMMM yyyy'), valueX, currentDetailY);

      // Row 3: Jam Acara (Optional)
      if (startTime && endTime) {
        currentDetailY += 7;
        doc.setTextColor(slate400);
        doc.text('JAM ACARA', labelX, currentDetailY);
        doc.setTextColor(darkGray);
        doc.text(`${startTime} - ${endTime} WIB`, valueX, currentDetailY);
      }

      // Row 4: Jumlah Pax
      currentDetailY += 7;
      doc.setTextColor(slate400);
      doc.text('JUMLAH PAX', labelX, currentDetailY);
      doc.setTextColor(darkGray);
      doc.text(`${event.pax} Orang`, valueX, currentDetailY);

      // Row 5: Kode Voucher
      currentDetailY += 7;
      doc.setTextColor(slate400);
      doc.text('KODE VOUCHER', labelX, currentDetailY);
      doc.setTextColor(accentColor);
      doc.setFontSize(10.5);
      doc.text(event.voucherCode, valueX, currentDetailY);

      // Description if exists
      if (descText) {
        currentDetailY += 10;
        doc.setTextColor(slate400);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('DESKRIPSI EVENT:', labelX, currentDetailY);
        doc.setTextColor(slate500);
        doc.setFont('helvetica', 'normal');
        doc.text(splitDesc, labelX, currentDetailY + 4);
        currentDetailY += descHeight;
      } else {
        currentDetailY += 5;
      }

      // QR Code Area - Positioned inside card
      const qrSize = 34; 
      const qrY = currentDetailY + 2;
      const qrDataUrl = await QRCode.toDataURL(event.voucherCode, { 
        margin: 1, 
        width: 200,
        color: {
          dark: brandColor,
          light: '#ffffff'
        }
      });
      doc.addImage(qrDataUrl, 'PNG', (width - qrSize) / 2, qrY, qrSize, qrSize);

      // Footer Section - INSIDE CARD
      const footerStartY = qrY + qrSize + 6;
      
      doc.setTextColor(slate500);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Scan QR Code ini di pintu masuk / outlet terkait.', width / 2, footerStartY, { align: 'center' });

      doc.setTextColor(slate400);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('SYARAT & KETENTUAN', width / 2, footerStartY + 6, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Voucher ini bersifat personal dan hanya valid pada tanggal yang tertera.', width / 2, footerStartY + 10, { align: 'center' });
      
      // Removed: "Pihak manajemen berhak membatalkan voucher jika ditemukan indikasi kecurangan."

      // Bottom Branding Strip
      doc.setFillColor(brandColor);
      doc.rect(0, height - 3, width, 3, 'F');

      doc.save(`Voucher-${eventName}-${event.participantName}.pdf`);
      
      toast({ title: 'Success', description: 'Voucher downloaded successfully' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
    }
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredParticipants = selectedGroup?.events?.filter(e => 
    e.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.voucherCode.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          {viewMode === 'PARTICIPANTS' && (
            <Button 
              variant="ghost" 
              className="rounded-full h-10 w-10 p-0 hover:bg-gray-100"
              onClick={() => {
                setViewMode('GROUPS');
                setSelectedGroup(null);
              }}
            >
              <ChevronLeft size={24} />
            </Button>
          )}
          <div>
            <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tight flex items-center gap-2">
              {viewMode === 'GROUPS' ? (
                <>Custom Events <LayoutGrid size={24} className="text-gray-300" /></>
              ) : (
                selectedGroup?.name
              )}
            </h2>
            <p className="text-gray-500 font-medium">
              {viewMode === 'GROUPS' ? 'Manage event groups and grouping vouchers' : `Manage participants for ${selectedGroup?.name}`}
            </p>
          </div>
        </div>
        
        {viewMode === 'GROUPS' ? (
          <Button className="bg-brand hover:bg-brand-dark rounded-xl font-bold h-12 px-6 shadow-lg shadow-brand/20" onClick={() => setIsGroupModalOpen(true)}>
            <Plus size={20} className="mr-2" /> Create Event Group
          </Button>
        ) : (
          <Button className="bg-brand hover:bg-brand-dark rounded-xl font-bold h-12 px-6 shadow-lg shadow-brand/20" onClick={() => setIsParticipantModalOpen(true)}>
            <Plus size={20} className="mr-2" /> Add Participant
          </Button>
        )}
      </div>

      <Card className="border-none shadow-xl overflow-hidden rounded-[32px]">
        <CardContent className="p-0">
          <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input 
                placeholder={viewMode === 'GROUPS' ? "Search by group name..." : "Search by name or code..."}
                className="pl-10 h-12 bg-white border-gray-200 rounded-2xl text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {viewMode === 'GROUPS' ? (
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50">
                  <tr>
                    <th className="px-6 py-4">Event Name & Date</th>
                    <th className="px-6 py-4">Logos</th>
                    <th className="px-6 py-4">Participants</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={5} className="px-6 py-20 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" /></td></tr>
                  ) : filteredGroups.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">No event groups found.</td></tr>
                  ) : filteredGroups.map((group) => (
                    <tr key={group.id} className="group hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => fetchGroupDetails(group.id)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-none mb-1">{group.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{format(new Date(group.eventDate), 'dd MMM yyyy')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex -space-x-2">
                          {group.logos ? JSON.parse(group.logos).slice(0, 3).map((url: string, i: number) => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-white overflow-hidden shadow-sm">
                              <img src={url} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                          )) : <span className="text-gray-300 italic text-xs">No logos</span>}
                          {group.logos && JSON.parse(group.logos).length > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-500 shadow-sm">
                              +{JSON.parse(group.logos).length - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-brand font-bold">
                          <Users size={16} />
                          <span>{group._count?.events || 0} Participants</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs font-medium">
                        {format(new Date(group.createdAt), 'dd/MM/yy')}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-gray-200 text-brand hover:bg-brand-50" onClick={() => fetchGroupDetails(group.id)}>
                            <ChevronRight size={16} />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-gray-200 text-amber-600 hover:bg-amber-50" onClick={(e) => openEditGroup(e, group)}>
                            <Edit2 size={16} />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-gray-200 text-red-500 hover:bg-red-50" onClick={() => handleDeleteGroup(group.id)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50">
                  <tr>
                    <th className="px-6 py-4">Participant</th>
                    <th className="px-6 py-4">Voucher Info</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredParticipants.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-20 text-center text-gray-400 italic">No participants found in this group.</td></tr>
                  ) : filteredParticipants.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-bold text-gray-900">{event.participantName}</p>
                          <div className="flex flex-col text-xs text-gray-500 gap-0.5">
                            <span className="flex items-center gap-1"><Mail size={10} /> {event.email}</span>
                            <span className="flex items-center gap-1"><Phone size={10} /> {event.phoneNumber}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-brand font-mono font-bold tracking-wider">
                            <Ticket size={14} /> {event.voucherCode}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase">
                            <Users size={12} /> {event.pax} Pax
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {event.status === 'USED' ? (
                          <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase tracking-wider bg-green-50 px-2.5 py-1 rounded-full w-fit">
                            <CheckCircle2 size={12} /> Redeemed
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-brand font-bold text-[10px] uppercase tracking-wider bg-brand-50 px-2.5 py-1 rounded-full w-fit">
                            <Ticket size={12} /> Active
                          </div>
                        )}
                        {event.usedAt && <p className="text-[9px] text-gray-400 mt-1 ml-1">{format(new Date(event.usedAt), 'dd/MM HH:mm')}</p>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-gray-200 text-brand hover:bg-brand-50" onClick={() => downloadVoucher(event)}>
                            <Download size={16} />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-gray-200 text-amber-600 hover:bg-amber-50" onClick={() => openEditParticipant(event)}>
                            <Edit2 size={16} />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-gray-200 text-red-500 hover:bg-red-50" onClick={() => handleDeleteParticipant(event.id)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CREATE GROUP MODAL */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg rounded-[32px] overflow-hidden border-none shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="bg-brand-dark text-white p-8 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-2xl font-black uppercase tracking-tight italic">{editingGroupId ? 'Edit Event Group' : 'Create Event Group'}</CardTitle>
                <p className="text-brand-100 text-xs font-bold uppercase tracking-widest mt-1">{editingGroupId ? 'Update group details' : 'Group vouchers by event'}</p>
              </div>
              <Button variant="ghost" className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0" onClick={() => {
                setIsGroupModalOpen(false);
                setEditingGroupId(null);
                setGroupFormData({ name: '', description: '', eventDate: '', startTime: '', endTime: '', logos: [] });
              }}>
                <X size={24} />
              </Button>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleGroupSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Group / Event Name</label>
                  <Input 
                    required
                    placeholder="e.g., Corporate Gathering PT. ABC"
                    value={groupFormData.name}
                    onChange={e => setGroupFormData({...groupFormData, name: e.target.value})}
                    className="rounded-2xl bg-gray-50 border-transparent h-12 text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Event Description (Optional)</label>
                  <textarea 
                    placeholder="Detail acara, lokasi spesifik, atau instruksi tambahan..."
                    value={groupFormData.description}
                    onChange={e => setGroupFormData({...groupFormData, description: e.target.value})}
                    className="w-full rounded-2xl bg-gray-50 border-transparent p-4 text-sm font-bold min-h-[100px] focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
                    <Input 
                      required
                      type="date"
                      value={groupFormData.eventDate}
                      onChange={e => setGroupFormData({...groupFormData, eventDate: e.target.value})}
                      className="rounded-2xl bg-gray-50 border-transparent h-12 text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Time</label>
                    <Input 
                      type="time"
                      value={groupFormData.startTime}
                      onChange={e => setGroupFormData({...groupFormData, startTime: e.target.value})}
                      className="rounded-2xl bg-gray-50 border-transparent h-12 text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Time</label>
                    <Input 
                      type="time"
                      value={groupFormData.endTime}
                      onChange={e => setGroupFormData({...groupFormData, endTime: e.target.value})}
                      className="rounded-2xl bg-gray-50 border-transparent h-12 text-sm font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Event Logos (Common for all vouchers)</label>
                  <div className="flex flex-wrap gap-3">
                    {groupFormData.logos.map((url, idx) => (
                      <div key={idx} className="relative group w-20 h-20 rounded-2xl overflow-hidden border-2 border-brand-50 bg-white">
                        <img src={url} alt="Logo" className="w-full h-full object-contain p-2" />
                        <button type="button" onClick={() => removeLogo(idx)} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 hover:border-brand hover:bg-brand-50 flex flex-col items-center justify-center cursor-pointer transition-all text-gray-400 hover:text-brand">
                      {uploading ? <Loader2 size={20} className="animate-spin" /> : <><Plus size={20} /><span className="text-[8px] font-bold uppercase mt-1">Upload</span></>}
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-brand hover:bg-brand-dark text-white rounded-2xl h-14 font-black uppercase tracking-widest mt-4 shadow-xl shadow-brand/20 transition-all hover:scale-[1.02]" disabled={submitting || uploading}>
                  {submitting ? 'Saving...' : (editingGroupId ? 'Update Group' : 'Create Group')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ADD/EDIT PARTICIPANT MODAL */}
      {isParticipantModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg rounded-[32px] overflow-hidden border-none shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="bg-brand-dark text-white p-8 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-2xl font-black uppercase tracking-tight italic">{editingParticipantId ? 'Edit Participant' : 'Add Participant'}</CardTitle>
                <p className="text-brand-100 text-xs font-bold uppercase tracking-widest mt-1">To: {selectedGroup?.name}</p>
              </div>
              <Button variant="ghost" className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0" onClick={() => {
                setIsParticipantModalOpen(false);
                setEditingParticipantId(null);
                setParticipantFormData({ participantName: '', pax: 1, email: '', phoneNumber: '' });
              }}>
                <X size={24} />
              </Button>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleParticipantSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Participant Name</label>
                  <Input 
                    required
                    placeholder="Nama Lengkap Penanggung Jawab"
                    value={participantFormData.participantName}
                    onChange={e => setParticipantFormData({...participantFormData, participantName: e.target.value})}
                    className="rounded-2xl bg-gray-50 border-transparent h-12 text-sm font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Jumlah Pax</label>
                    <Input required type="number" min="1" value={participantFormData.pax} onChange={e => setParticipantFormData({...participantFormData, pax: parseInt(e.target.value)})} className="rounded-2xl bg-gray-50 border-transparent h-12 text-sm font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <Input required placeholder="08123456xxx" value={participantFormData.phoneNumber} onChange={e => setParticipantFormData({...participantFormData, phoneNumber: e.target.value})} className="rounded-2xl bg-gray-50 border-transparent h-12 text-sm font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                  <Input required type="email" placeholder="tamu@email.com" value={participantFormData.email} onChange={e => setParticipantFormData({...participantFormData, email: e.target.value})} className="rounded-2xl bg-gray-50 border-transparent h-12 text-sm font-bold" />
                </div>
                <Button type="submit" className="w-full bg-brand hover:bg-brand-dark text-white rounded-2xl h-14 font-black uppercase tracking-widest mt-4 shadow-xl shadow-brand/20 transition-all hover:scale-[1.02]" disabled={submitting}>
                  {submitting ? 'Saving...' : (editingParticipantId ? 'Update Participant' : 'Generate Voucher')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
