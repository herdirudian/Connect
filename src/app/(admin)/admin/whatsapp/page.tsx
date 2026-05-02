'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type FormState = {
  enabled: boolean;
  url: string;
  method: string;
  apiKey: string;
  numberKey: string;
  headersJson: string;
  bodyTemplateJson: string;
  restaurantTo: string;
  housekeepingTo: string;
  timeoutMs: string;
};

export default function AdminWhatsappSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testMessage, setTestMessage] = useState('Tes notifikasi WhatsApp dari Admin Portal.');
  const [lastTestResult, setLastTestResult] = useState<string>('');
  const [resending, setResending] = useState(false);
  const [resendFoodOrderId, setResendFoodOrderId] = useState('');
  const [resendHkOrderId, setResendHkOrderId] = useState('');
  const [lastResendResult, setLastResendResult] = useState<string>('');
  const [form, setForm] = useState<FormState>({
    enabled: false,
    url: '',
    method: 'POST',
    apiKey: '',
    numberKey: 'ALL',
    headersJson: JSON.stringify({ 'Content-Type': 'application/json' }),
    bodyTemplateJson: JSON.stringify({ api_key: '{{apiKey}}', number_key: '{{numberKey}}', phone_no: '{{to}}', message: '{{message}}' }),
    restaurantTo: '',
    housekeepingTo: '',
    timeoutMs: '8000',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp-settings');
      if (!res.ok) throw new Error('Gagal memuat pengaturan');
      const data = await res.json();
      setForm({
        enabled: String(data.enabled || '').toLowerCase() === 'true' || String(data.enabled || '') === '1',
        url: data.url || '',
        method: data.method || 'POST',
        apiKey: data.apiKey || '',
        numberKey: data.numberKey || 'ALL',
        headersJson: data.headersJson || '',
        bodyTemplateJson: data.bodyTemplateJson || '',
        restaurantTo: data.restaurantTo || '',
        housekeepingTo: data.housekeepingTo || '',
        timeoutMs: String(data.timeoutMs || '8000'),
      });
      const firstResto = String(data.restaurantTo || '').split(/[,;\n\r\t ]+/g).map((s: string) => s.trim()).filter(Boolean)[0];
      if (firstResto && !testTo) setTestTo(firstResto);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Gagal memuat pengaturan', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/whatsapp-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: form.enabled ? 'true' : 'false',
          url: form.url,
          method: form.method,
          apiKey: form.apiKey,
          numberKey: form.numberKey,
          headersJson: form.headersJson,
          bodyTemplateJson: form.bodyTemplateJson,
          restaurantTo: form.restaurantTo,
          housekeepingTo: form.housekeepingTo,
          timeoutMs: form.timeoutMs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan');
      toast({ title: 'Tersimpan', description: 'Pengaturan WhatsApp berhasil disimpan.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Gagal menyimpan pengaturan', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    try {
      const res = await fetch('/api/admin/whatsapp-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo, message: testMessage }),
      });
      const data = await res.json();
      const printable = data.responseJson ? JSON.stringify(data.responseJson, null, 2) : (data.responseText || '');
      if (printable) setLastTestResult(printable);
      if (!res.ok) throw new Error(data.error || data.message || 'Gagal mengirim test WhatsApp');
      toast({ title: 'Berhasil', description: 'Request test sukses. Cek hasil response di bawah.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Gagal mengirim test WhatsApp', variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  }

  async function resendPaid() {
    setResending(true);
    try {
      const res = await fetch('/api/admin/whatsapp-settings/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodOrderId: resendFoodOrderId || null,
          hkOrderId: resendHkOrderId || null,
        }),
      });
      const data = await res.json();
      setLastResendResult(JSON.stringify(data, null, 2));
      if (!res.ok) throw new Error(data.error || data.message || 'Gagal resend notifikasi');
      toast({ title: 'Berhasil', description: 'Resend notifikasi diproses. Cek response di bawah.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Gagal resend notifikasi', variant: 'destructive' });
    } finally {
      setResending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">WhatsApp Notifications</h2>
        <p className="text-muted-foreground">
          Konfigurasi endpoint, API key, dan target nomor untuk notifikasi order Room Service.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((s) => ({ ...s, enabled: e.target.checked }))}
            />
            <div className="text-sm font-medium">Aktifkan notifikasi WhatsApp</div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">Endpoint URL</div>
              <Input value={form.url} onChange={(e) => setForm((s) => ({ ...s, url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">HTTP Method</div>
              <Input value={form.method} onChange={(e) => setForm((s) => ({ ...s, method: e.target.value.toUpperCase() }))} placeholder="POST" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">API Key / Token</div>
              <Input type="password" value={form.apiKey} onChange={(e) => setForm((s) => ({ ...s, apiKey: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Number Key (Watzap)</div>
              <Input value={form.numberKey} onChange={(e) => setForm((s) => ({ ...s, numberKey: e.target.value }))} placeholder="ALL / xxxx" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">Timeout (ms)</div>
              <Input value={form.timeoutMs} onChange={(e) => setForm((s) => ({ ...s, timeoutMs: e.target.value }))} placeholder="8000" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">Nomor WhatsApp Team Restoran</div>
              <Input
                value={form.restaurantTo}
                onChange={(e) => setForm((s) => ({ ...s, restaurantTo: e.target.value }))}
                placeholder="62812xxxx, 62813xxxx"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Nomor WhatsApp Team Housekeeping</div>
              <Input
                value={form.housekeepingTo}
                onChange={(e) => setForm((s) => ({ ...s, housekeepingTo: e.target.value }))}
                placeholder="62812xxxx, 62813xxxx"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Headers (JSON)</div>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm font-mono min-h-[100px]"
              value={form.headersJson}
              onChange={(e) => setForm((s) => ({ ...s, headersJson: e.target.value }))}
              placeholder='{"Content-Type":"application/json"}'
            />
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Body Template (JSON)</div>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm font-mono min-h-[120px]"
              value={form.bodyTemplateJson}
              onChange={(e) => setForm((s) => ({ ...s, bodyTemplateJson: e.target.value }))}
              placeholder='{"api_key":"{{apiKey}}","number_key":"{{numberKey}}","phone_no":"{{to}}","message":"{{message}}"}'
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={fetchSettings} disabled={saving}>
              Reload
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Kirim WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">Nomor Tujuan (format 62xxxx)</div>
              <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="62812xxxx" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Pesan</div>
              <Input value={testMessage} onChange={(e) => setTestMessage(e.target.value)} placeholder="Pesan test..." />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={sendTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kirim Test'}
            </Button>
          </div>
          {lastTestResult && (
            <div className="space-y-1">
              <div className="text-sm font-medium">Response Provider</div>
              <pre className="w-full overflow-auto rounded-md border bg-gray-50 p-3 text-xs">{lastTestResult}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resend Notifikasi Order Paid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">Food Order ID (opsional)</div>
              <Input value={resendFoodOrderId} onChange={(e) => setResendFoodOrderId(e.target.value)} placeholder="uuid atau 8 char awal" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Housekeeping Order ID (opsional)</div>
              <Input value={resendHkOrderId} onChange={(e) => setResendHkOrderId(e.target.value)} placeholder="uuid atau 8 char awal" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={resendPaid} disabled={resending}>
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resend'}
            </Button>
          </div>
          {lastResendResult && (
            <div className="space-y-1">
              <div className="text-sm font-medium">Response Resend</div>
              <pre className="w-full overflow-auto rounded-md border bg-gray-50 p-3 text-xs">{lastResendResult}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
