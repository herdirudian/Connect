'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash, Crown, Star, Shield, Edit, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminTiersPage() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [error, setError] = useState('');

  useEffect(() => {
    fetchTiers();
  }, []);

  async function fetchTiers() {
    try {
      setError('');
      const res = await fetch('/api/tiers');
      if (res.ok) {
        const data = await res.json();
        setTiers(data);
      } else {
        throw new Error('Failed to fetch tiers');
      }
    } catch (error) {
      console.error('Error fetching tiers:', error);
      setError('Gagal memuat data tier. Pastikan server sudah direstart setelah update database.');
      toast({ title: 'Error', description: 'Failed to load tiers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (tier: any) => {
    // Clone deeply to avoid mutation issues with arrays
    setEditingTier(JSON.parse(JSON.stringify(tier)));
  };

  const handleSave = async () => {
    if (!editingTier) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTier)
      });

      if (res.ok) {
        toast({ title: 'Success', description: 'Tier updated successfully' });
        fetchTiers();
        setEditingTier(null);
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update tier', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addBenefit = () => {
    if (editingTier) {
      setEditingTier({
        ...editingTier,
        benefits: [...editingTier.benefits, '']
      });
    }
  };

  const removeBenefit = (index: number) => {
    if (editingTier) {
      const newBenefits = [...editingTier.benefits];
      newBenefits.splice(index, 1);
      setEditingTier({ ...editingTier, benefits: newBenefits });
    }
  };

  const updateBenefit = (index: number, value: string) => {
    if (editingTier) {
      const newBenefits = [...editingTier.benefits];
      newBenefits[index] = value;
      setEditingTier({ ...editingTier, benefits: newBenefits });
    }
  };

  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'Crown': return <Crown className="h-6 w-6" />;
      case 'Shield': return <Shield className="h-6 w-6" />;
      case 'Star': return <Star className="h-6 w-6" />;
      default: return <Star className="h-6 w-6" />;
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Membership Tiers</h2>
          <p className="text-gray-500">Configure tier names, points, and benefits.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {error ? (
          <div className="col-span-3 p-8 text-center border-2 border-dashed border-red-200 rounded-xl bg-red-50">
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <Button onClick={fetchTiers} variant="outline" className="border-red-200 hover:bg-red-100 text-red-700">
              Coba Lagi
            </Button>
          </div>
        ) : tiers.length === 0 ? (
          <div className="col-span-3 p-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-500">Belum ada data tier. Sistem akan membuat default secara otomatis.</p>
          </div>
        ) : (
          tiers.map((tier) => (
          <Card key={tier.id} className="relative group overflow-hidden border-2 hover:border-brand/50 transition-all">
            <div className={`h-2 w-full ${tier.color}`}></div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className={`w-12 h-12 rounded-xl ${tier.color} text-white flex items-center justify-center mb-4 shadow-lg`}>
                   {getIcon(tier.icon)}
                </div>
                <Button variant="outline" size="sm" onClick={() => handleEdit(tier)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
              <CardTitle className="text-xl font-black uppercase">{tier.name}</CardTitle>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                {tier.minPoints.toLocaleString()} Points
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {tier.benefits.map((b: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600 flex gap-2">
                    <span className="text-green-500 font-bold">✓</span> {b}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
        )}
      </div>

      {/* Edit Modal Overlay */}
      {editingTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-black uppercase">Edit Tier: {editingTier.tier}</h3>
              <Button variant="ghost" size="icon" onClick={() => setEditingTier(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input 
                  value={editingTier.name} 
                  onChange={(e) => setEditingTier({...editingTier, name: e.target.value})} 
                />
              </div>

              <div className="space-y-2">
                <Label>Minimum Points</Label>
                <Input 
                  type="number"
                  value={editingTier.minPoints} 
                  onChange={(e) => setEditingTier({...editingTier, minPoints: parseInt(e.target.value) || 0})} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Color Class (Tailwind)</Label>
                    <Input 
                      value={editingTier.color} 
                      onChange={(e) => setEditingTier({...editingTier, color: e.target.value})} 
                    />
                 </div>
                 <div className="space-y-2">
                    <Label>Icon Name</Label>
                    <Input 
                      value={editingTier.icon} 
                      onChange={(e) => setEditingTier({...editingTier, icon: e.target.value})} 
                      placeholder="Star, Shield, Crown"
                    />
                 </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Benefits</Label>
                  <Button variant="ghost" size="sm" onClick={addBenefit} className="text-brand h-8">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {editingTier.benefits.map((benefit: string, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <Input 
                        value={benefit} 
                        onChange={(e) => updateBenefit(idx, e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeBenefit(idx)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white z-10">
              <Button variant="outline" onClick={() => setEditingTier(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-brand text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
