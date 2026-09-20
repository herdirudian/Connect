'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type FormState = {
  // Gateway 1: Staff Order Alerts (OpenWA / Watzap)
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

  // Gateway 2: Customer Ticketing (Meta Cloud API)
  metaEnabled: boolean;
  metaUrl: string;
  metaMethod: string;
  metaApiKey: string;
  metaHeadersJson: string;
};

export default function AdminWhatsappSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testGateway, setTestGateway] = useState<'STAFF' | 'META'>('STAFF');
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

    metaEnabled: true,
    metaUrl: '',
    metaMethod: 'POST',
    metaApiKey: 'lodge_wa_api_key_2026',
    metaHeadersJson: JSON.stringify({ 'Content-Type': 'application/json', Authorization: 'Bearer {{apiKey}}' }, null, 2),
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

        metaEnabled: String(data.metaEnabled || '').toLowerCase() === 'true' || String(data.metaEnabled || '') === '1',
        metaUrl: data.metaUrl || '',
        metaMethod: data.metaMethod || 'POST',
        metaApiKey: data.metaApiKey || 'lodge_wa_api_key_2026',
        metaHeadersJson: data.metaHeadersJson || JSON.stringify({ 'Content-Type': 'application/json', Authorization: 'Bearer {{apiKey}}' }, null, 2),
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

          metaEnabled: form.metaEnabled ? 'true' : 'false',
          metaUrl: form.metaUrl,
          metaMethod: form.metaMethod,
          metaApiKey: form.metaApiKey,
          metaHeadersJson: form.metaHeadersJson,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan');
      toast({ title: 'Tersimpan', description: 'Pengaturan 2 Gateway WhatsApp berhasil disimpan secara terpisah.' });
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
        body: JSON.stringify({ to: testTo, message: testMessage, gateway: testGateway }),
      });
      const data = await res.json();
      const printable = data.responseJson ? JSON.stringify(data.responseJson, null, 2) : (data.responseText || '');
      if (printable) setLastTestResult(printable);
      if (!res.ok) throw new Error(data.error || data.message || 'Gagal mengirim test WhatsApp');
      toast({ title: 'Berhasil', description: `Request test via Gateway ${testGateway} sukses. Cek response.` });
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
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">WhatsApp Gateway Notifications</h2>
        <p className="text-muted-foreground">
          Konfigurasi terpisah untuk Notifikasi Order Staf Internal (OpenWA/Watzap) dan Pembelian Tiket Tamu (Meta Cloud API).
        </p>
      </div>

      {/* SETTING 1: NOTIFIKASI ORDER STAF */}
      <Card className="border-emerald-200 bg-emerald-50/10">
        <CardHeader className="pb-3 border-b border-emerald-100 bg-emerald-50/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                <span>🍽️ Setting 1: Notifikasi Staf (Online Dine In & Room Service)</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Khusus mengirim notifikasi pesanan ke grup/nomor tim Restoran & Housekeeping (Menggunakan OpenWA / Watzap Provider).
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
              OpenWA / Watzap
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="staffEnabled"
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              checked={form.enabled}
              onChange={(e) => setForm((s) => ({ ...s, enabled: e.target.checked }))}
            />
            <label htmlFor="staffEnabled" className="text-sm font-medium text-gray-900 cursor-pointer">
              Aktifkan Notifikasi WhatsApp Tim Staf Internal
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">Endpoint URL</div>
              <Input
                value={form.url}
                onChange={(e) => setForm((s) => ({ ...s, url: e.target.value }))}
                placeholder="https://api.thelodgegroup.id/api/sessions/.../messages/send-text"
              />
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
                placeholder="120363411906248771@g.us atau 62812xxxx"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Nomor WhatsApp Team Housekeeping</div>
              <Input
                value={form.housekeepingTo}
                onChange={(e) => setForm((s) => ({ ...s, housekeepingTo: e.target.value }))}
                placeholder="120363411906248771@g.us atau 62812xxxx"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Headers (JSON)</div>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm font-mono min-h-[90px]"
              value={form.headersJson}
              onChange={(e) => setForm((s) => ({ ...s, headersJson: e.target.value }))}
              placeholder='{"Content-Type":"application/json"}'
            />
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Body Template (JSON)</div>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm font-mono min-h-[100px]"
              value={form.bodyTemplateJson}
              onChange={(e) => setForm((s) => ({ ...s, bodyTemplateJson: e.target.value }))}
              placeholder='{"api_key":"{{apiKey}}","number_key":"{{numberKey}}","phone_no":"{{to}}","message":"{{message}}"}'
            />
          </div>
        </CardContent>
      </Card>

      {/* SETTING 2: WA API PEMBELIAN TIKET PELANGGAN */}
      <Card className="border-blue-200 bg-blue-50/10">
        <CardHeader className="pb-3 border-b border-blue-100 bg-blue-50/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-blue-950 flex items-center gap-2">
                <span>🎟️ Setting 2: WA API Pembelian Tiket & E-Voucher (Customer)</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Khusus mengirim E-Voucher, QR Code, dan percakapan tiket langsung ke nomor WhatsApp Pelanggan (Meta Cloud API Resmi).
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
              Meta Cloud API Resmi
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="metaEnabled"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={form.metaEnabled}
                onChange={(e) => setForm((s) => ({ ...s, metaEnabled: e.target.checked }))}
              />
              <label htmlFor="metaEnabled" className="text-sm font-medium text-gray-900 cursor-pointer">
                Aktifkan WhatsApp Meta API untuk Pelanggan/Tiket
              </label>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs bg-white border-blue-200 text-blue-700 hover:bg-blue-50 font-medium"
              onClick={() => {
                setForm((s) => ({
                  ...s,
                  metaApiKey: s.metaApiKey || 'lodge_wa_api_key_2026',
                  metaHeadersJson: JSON.stringify({ 'Content-Type': 'application/json', Authorization: 'Bearer {{apiKey}}' }, null, 2),
                }));
                toast({ title: 'Preset Meta API Terpasang', description: 'Header & Token default terpasang.' });
              }}
            >
              ⚡ Set Preset Meta API
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">Endpoint URL Meta API</div>
              <Input
                value={form.metaUrl}
                onChange={(e) => setForm((s) => ({ ...s, metaUrl: e.target.value }))}
                placeholder="https://domain-anda.com/api/whatsapp/send"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">HTTP Method</div>
              <Input value={form.metaMethod} onChange={(e) => setForm((s) => ({ ...s, metaMethod: e.target.value.toUpperCase() }))} placeholder="POST" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">API Key / Token Meta</div>
              <Input type="password" value={form.metaApiKey} onChange={(e) => setForm((s) => ({ ...s, metaApiKey: e.target.value }))} placeholder="lodge_wa_api_key_2026" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Timeout (ms)</div>
              <Input value={form.timeoutMs} onChange={(e) => setForm((s) => ({ ...s, timeoutMs: e.target.value }))} placeholder="8000" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Headers (JSON)</div>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm font-mono min-h-[90px]"
              value={form.metaHeadersJson}
              onChange={(e) => setForm((s) => ({ ...s, metaHeadersJson: e.target.value }))}
              placeholder='{"Content-Type":"application/json","Authorization":"Bearer {{apiKey}}"}'
            />
          </div>
        </CardContent>
      </Card>

      {/* ACTION BUTTON SIMPAN KEDUA SETTING */}
      <div className="flex justify-end gap-3 bg-white p-4 rounded-xl border shadow-2xs">
        <Button variant="outline" onClick={fetchSettings} disabled={saving}>
          Reload Pengaturan
        </Button>
        <Button onClick={save} disabled={saving} className="bg-brand hover:bg-brand-dark text-white font-bold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan 2 Setting WhatsApp'}
        </Button>
      </div>

      {/* CARD TEST KIRIM */}
      <Card>
        <CardHeader>
          <CardTitle>Test Kirim WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Pilih Gateway untuk Testing:</div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="testGateway"
                  checked={testGateway === 'STAFF'}
                  onChange={() => setTestGateway('STAFF')}
                />
                Setting 1: Staf Order (OpenWA)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="testGateway"
                  checked={testGateway === 'META'}
                  onChange={() => setTestGateway('META')}
                />
                Setting 2: Tiket Pelanggan (Meta Cloud API)
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">Nomor Tujuan / ID Grup</div>
              <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="62812xxxx atau 12036...@g.us" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Pesan Test</div>
              <Input value={testMessage} onChange={(e) => setTestMessage(e.target.value)} placeholder="Pesan test..." />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={sendTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Kirim Test (${testGateway})`}
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

      {/* CARD RESEND */}
      <Card>
        <CardHeader>
          <CardTitle>Resend Notifikasi Order Paid Staf</CardTitle>
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
