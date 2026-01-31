'use client'

import { useState } from 'react'
import { createPromo, togglePromoStatus, deletePromo, togglePromoClaimable, updatePromo } from '@/app/actions/promo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Eye, EyeOff, Plus, Calendar, Tag, Pencil, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Promo {
  id: string
  title: string
  description: string
  imageUrl: string | null
  validUntil: Date | null
  active: boolean
  claimable: boolean
  isPartner: boolean
  showButton: boolean
  createdAt: Date
}

export default function PromoClient({ initialPromos }: { initialPromos: Promo[] }) {
  const [promos, setPromos] = useState<Promo[]>(initialPromos)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [claimable, setClaimable] = useState(false)
  const [isPartner, setIsPartner] = useState(true)
  const [showButton, setShowButton] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const uploadData = new FormData();
    uploadData.append('file', file);
    
    setUploading(true);
    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: uploadData,
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Upload failed');
        }
        
        const data = await res.json();
        setImageUrl(data.url);
        toast({ title: 'Success', description: 'Image uploaded successfully' });
    } catch (error) {
        console.error('Error uploading file:', error);
        toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to upload file', variant: 'destructive' });
    } finally {
        setUploading(false);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (editingId) {
        const result = await updatePromo(editingId, {
            title,
            description,
            imageUrl: imageUrl || undefined,
            validUntil: validUntil || undefined,
            claimable,
            isPartner,
            showButton,
        })

        if (result.success && result.data) {
            setPromos(promos.map(p => p.id === editingId ? result.data : p))
            handleCancelEdit()
            toast({ title: 'Success', description: 'Promo updated successfully' })
        } else {
            toast({ title: 'Error', description: result.error || 'Failed to update promo', variant: 'destructive' })
        }
    } else {
        const result = await createPromo({
            title,
            description,
            imageUrl: imageUrl || undefined,
            validUntil: validUntil || undefined,
            claimable,
            isPartner,
            showButton,
        })

        if (result.success && result.data) {
            setPromos([result.data, ...promos])
            handleCancelEdit()
            toast({ title: 'Success', description: 'Promo created successfully' })
        } else {
            toast({ title: 'Error', description: result.error || 'Failed to create promo', variant: 'destructive' })
        }
    }
    setIsLoading(false)
  }

  const handleEdit = (promo: Promo) => {
      setEditingId(promo.id)
      setTitle(promo.title)
      setDescription(promo.description)
      setImageUrl(promo.imageUrl || '')
      setValidUntil(promo.validUntil ? new Date(promo.validUntil).toISOString().split('T')[0] : '')
      setClaimable(promo.claimable)
      setIsPartner(promo.isPartner)
      setShowButton(promo.showButton)
      window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
      setEditingId(null)
      setTitle('')
      setDescription('')
      setImageUrl('')
      setValidUntil('')
      setClaimable(false)
      setIsPartner(true)
      setShowButton(true)
  }

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const result = await togglePromoStatus(id, !currentStatus)
    if (result.success) {
      setPromos(promos.map(p => p.id === id ? { ...p, active: !currentStatus } : p))
      toast({ title: 'Success', description: `Promo ${!currentStatus ? 'activated' : 'deactivated'}` })
    } else {
      toast({ title: 'Error', description: 'Failed to update promo status', variant: 'destructive' })
    }
  }

  const handleToggleClaimable = async (id: string, current: boolean) => {
    const result = await togglePromoClaimable(id, !current)
    if (result.success) {
      setPromos(promos.map(p => p.id === id ? { ...p, claimable: !current } : p))
      toast({ title: 'Success', description: `Claim ${!current ? 'enabled' : 'disabled'}` })
    } else {
      toast({ title: 'Error', description: 'Failed to update claim setting', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo?')) return

    const result = await deletePromo(id)
    if (result.success) {
      setPromos(promos.filter(p => p.id !== id))
      toast({ title: 'Success', description: 'Promo deleted successfully' })
    } else {
      toast({ title: 'Error', description: 'Failed to delete promo', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Partner Promo' : 'Add New Partner Promo'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 20% Off at Starbucks"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Valid Until</label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                required
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Promo details..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Image</label>
              <div className="flex gap-2">
                <Input 
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... or upload image"
                />
                <div className="relative">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <label 
                    htmlFor="file-upload" 
                    className={`flex items-center justify-center h-10 px-4 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {uploading ? '...' : 'Upload'}
                  </label>
                </div>
              </div>
              {imageUrl && (
                <div className="mt-2 relative h-32 w-full rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                    <img src={imageUrl} alt="Preview" className="h-full w-full object-contain" />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="claimable" 
                  checked={claimable} 
                  onChange={(e) => setClaimable(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                />
                <label htmlFor="claimable" className="text-sm font-medium text-gray-700">Allow members to claim</label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="isPartner" 
                  checked={isPartner} 
                  onChange={(e) => setIsPartner(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                />
                <label htmlFor="isPartner" className="text-sm font-medium text-gray-700">Show in Partner Promos page</label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="showButton" 
                  checked={showButton} 
                  onChange={(e) => setShowButton(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                />
                <label htmlFor="showButton" className="text-sm font-medium text-gray-700">Show 'View Details' Button</label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isLoading || uploading}>
                {isLoading ? (editingId ? 'Updating...' : 'Creating...') : (
                  <>
                    {editingId ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    {editingId ? 'Update Promo' : 'Create Promo'}
                  </>
                )}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {promos.map((promo) => (
          <Card key={promo.id} className={!promo.active ? 'opacity-60' : ''}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg line-clamp-1">{promo.title}</h3>
                    {!promo.isPartner && (
                      <span className="text-[10px] font-bold text-white bg-gray-500 px-1.5 py-0.5 rounded">INTERNAL</span>
                    )}
                  </div>
                  {promo.claimable && (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand bg-brand-50 px-2 py-0.5 rounded">
                      <Tag className="h-3 w-3" /> Claimable
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleClaimable(promo.id, promo.claimable)}
                    title={promo.claimable ? 'Disable Claim' : 'Enable Claim'}
                  >
                    <Tag className={`h-4 w-4 ${promo.claimable ? 'text-brand' : 'text-gray-400'}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggle(promo.id, promo.active)}
                    title={promo.active ? 'Deactivate' : 'Activate'}
                  >
                    {promo.active ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(promo)}
                    title="Edit Promo"
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(promo.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {promo.imageUrl && (
                <div className="relative w-full h-32 mb-4 rounded-md overflow-hidden bg-gray-100">
                  <img src={promo.imageUrl} alt={promo.title} className="object-cover w-full h-full" />
                </div>
              )}

              <p className="text-sm text-gray-600 mb-4 line-clamp-3">{promo.description}</p>
              
              {promo.validUntil && (
                <div className="flex items-center text-xs text-gray-500 mt-auto">
                  <Calendar className="mr-1 h-3 w-3" />
                  Valid until: {new Date(promo.validUntil).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
