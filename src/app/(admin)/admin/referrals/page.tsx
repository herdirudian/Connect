'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Gift, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminReferralSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    referrerPoints: 50,
    refereePoints: 20
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/admin/referral-settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/referral-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        toast({ title: 'Success', description: 'Referral settings updated successfully' });
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Referral Settings</h1>
           <p className="text-gray-500">Configure rewards for the referral program.</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand" />
              Referrer Reward
            </CardTitle>
            <CardDescription>
              Reward given to the existing member who invites a friend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="referrerPoints">Points Amount</Label>
              <div className="relative">
                <Input 
                  id="referrerPoints" 
                  type="number" 
                  value={settings.referrerPoints}
                  onChange={(e) => setSettings({...settings, referrerPoints: parseInt(e.target.value) || 0})}
                  className="pl-10"
                />
                <div className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">PTS</div>
              </div>
              <p className="text-xs text-gray-500">
                Points will be added to the referrer's account immediately after the new user verifies their email.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-brand" />
              Referee Reward
            </CardTitle>
            <CardDescription>
              Reward given to the new member who registers using a code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refereePoints">Points Amount</Label>
              <div className="relative">
                <Input 
                  id="refereePoints" 
                  type="number" 
                  value={settings.refereePoints}
                  onChange={(e) => setSettings({...settings, refereePoints: parseInt(e.target.value) || 0})}
                  className="pl-10"
                />
                <div className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">PTS</div>
              </div>
              <p className="text-xs text-gray-500">
                Points will be added to the new user's account immediately after they verify their email.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-brand hover:bg-brand-dark min-w-[150px] w-full sm:w-auto">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
