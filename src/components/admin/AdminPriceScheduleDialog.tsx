'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Schedule = {
  id: string;
  validFrom: string;
  validUntil: string;
  price: number;
};

export default function AdminPriceScheduleDialog({
  attractionId,
  attractionName,
  open,
  onOpenChange,
}: {
  attractionId: string;
  attractionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ validFrom: '', validUntil: '', price: '' });
  const [previewDate, setPreviewDate] = useState('');
  const [effectivePrice, setEffectivePrice] = useState<number | null>(null);
  const [csvText, setCsvText] = useState('');

  useEffect(() => {
    if (open) loadSchedules();
  }, [open]);

  async function loadSchedules() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/attractions/${attractionId}/prices`);
      const data = await res.json();
      setSchedules(data.schedules || []);
      setBasePrice(data.basePrice || 0);
      setEffectivePrice(data.effectivePrice ?? null);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault();
    try {
      const normalize = (s: string) => {
        const t = s.trim();
        if (!t) return '';
        // Support YYYY-MM-DD and MM/DD/YYYY or DD/MM/YYYY
        if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
        const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) {
          // Assume MM/DD/YYYY, convert to YYYY-MM-DD
          const mm = m[1];
          const dd = m[2];
          const yyyy = m[3];
          return `${yyyy}-${mm}-${dd}`;
        }
        const m2 = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m2) {
          const dd = m2[1];
          const mm = m2[2];
          const yyyy = m2[3];
          return `${yyyy}-${mm}-${dd}`;
        }
        return t;
      };
      const vf = normalize(form.validFrom);
      const vu = normalize(form.validUntil);
      if (!vf || !vu || !form.price) return;
      const res = await fetch(`/api/admin/attractions/${attractionId}/prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validFrom: vf,
          validUntil: vu,
          price: parseFloat(form.price),
        }),
      });
      if (res.ok) {
        setForm({ validFrom: '', validUntil: '', price: '' });
        loadSchedules();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to create schedule');
      }
    } catch (e) {}
  }

  async function updateSchedule(s: Schedule, patch: Partial<Schedule>) {
    try {
      const res = await fetch(`/api/admin/attractions/${attractionId}/prices`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: s.id,
          validFrom: patch.validFrom ?? undefined,
          validUntil: patch.validUntil ?? undefined,
          price: patch.price ?? undefined,
        }),
      });
      if (res.ok) loadSchedules();
    } catch (e) {}
  }

  async function deleteSchedule(id: string) {
    if (!confirm('Hapus jadwal harga ini?')) return;
    try {
      const res = await fetch(`/api/admin/attractions/${attractionId}/prices`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: id }),
      });
      if (res.ok) loadSchedules();
    } catch (e) {}
  }

  async function preview() {
    if (!previewDate) return;
    try {
      const normalize = (s: string) => {
        const t = s.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
        const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) return `${m[3]}-${m[1]}-${m[2]}`;
        return t;
      };
      const d = normalize(previewDate);
      const res = await fetch(`/api/admin/attractions/${attractionId}/prices?date=${d}`);
      const data = await res.json();
      setEffectivePrice(data.effectivePrice ?? null);
    } catch (e) {}
  }

  async function importCsv() {
    if (!csvText.trim()) return;
    try {
      const res = await fetch(`/api/admin/attractions/${attractionId}/prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importCsv: true, csv: csvText }),
      });
      if (res.ok) {
        setCsvText('');
        loadSchedules();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to import CSV');
      }
    } catch (e) {}
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pricing Schedule — {attractionName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-600">
              Base Price: <span className="font-bold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(basePrice)}</span>
            </p>
          </div>

          <form onSubmit={createSchedule} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Valid From</label>
              <Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Valid Until</label>
              <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Price (IDR)</label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="50000" required />
            </div>
            <Button type="submit" className="bg-brand text-white">Add Schedule</Button>
          </form>

          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">Valid From</th>
                  <th className="px-3 py-2 text-left">Valid Until</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-2">
                      <Input type="date" defaultValue={s.validFrom.substring(0,10)} onBlur={(e) => updateSchedule(s, { validFrom: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="date" defaultValue={s.validUntil.substring(0,10)} onBlur={(e) => updateSchedule(s, { validUntil: e.target.value })} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input type="number" defaultValue={s.price} onBlur={(e) => updateSchedule(s, { price: parseFloat(e.target.value) })} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="destructive" size="sm" onClick={() => deleteSchedule(s.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
                {schedules.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-500">No schedules</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase text-gray-500">Preview price for date</label>
              <Input type="date" value={previewDate} onChange={(e) => setPreviewDate(e.target.value)} />
            </div>
            <Button onClick={preview} className="bg-gray-900 text-white">Preview</Button>
          </div>
          {previewDate && (
            <div className="text-sm text-gray-700">
              Effective Price on {previewDate}: <span className="font-bold">
                {effectivePrice !== null ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(effectivePrice) : '-'}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500">Import CSV (validFrom,validUntil,price per line)</label>
            <textarea 
              className="w-full border rounded-md p-2 h-32"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`2026-03-01,2026-03-31,50000\n2026-04-01,2026-04-30,70000`}
            />
            <Button onClick={importCsv} variant="outline">Import CSV</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
