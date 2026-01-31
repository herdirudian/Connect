'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusCircle, X, Loader2 } from 'lucide-react'
import { addPoints } from '@/app/actions/user'
import { useToast } from '@/hooks/use-toast'

export default function AddPointsButton({ userId, userName }: { userId: string, userName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleOpen = () => setIsOpen(true)
  const handleClose = () => {
    setIsOpen(false)
    setAmount('')
    setDescription('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await addPoints(userId, parseInt(amount), description)

    if (result.success) {
      toast({
        title: "Berhasil",
        description: `Berhasil menambahkan ${amount} poin untuk ${userName}`,
      })
      handleClose()
    } else {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: result.error || "Gagal menambahkan poin",
      })
    }
    setIsLoading(false)
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="text-brand hover:text-brand hover:bg-brand-50" onClick={handleOpen}>
        <PlusCircle className="h-4 w-4 mr-1" />
        Poin
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-lg font-bold mb-4">Tambah Poin Member</h3>
            <p className="text-sm text-gray-500 mb-6">
              Menambahkan poin manual untuk <span className="font-semibold text-gray-900">{userName}</span>.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah Poin</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Contoh: 100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="1"
                  className="text-lg font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Keterangan (Opsional)</Label>
                <Input
                  id="description"
                  placeholder="Contoh: Bonus Event, Kompensasi"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-brand hover:bg-brand-dark">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Proses...
                    </>
                  ) : (
                    'Simpan'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
