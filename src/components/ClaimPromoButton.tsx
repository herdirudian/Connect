'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { claimPromo } from '@/app/actions/promo'
import QRCode from 'qrcode'
import { X } from 'lucide-react'

type Props = {
  promoId: string
  promoTitle: string
  userId: string | null
  initiallyClaimed?: boolean
  claimId?: string
  uniqueCode?: string
}

export default function ClaimPromoButton({ promoId, promoTitle, userId, initiallyClaimed = false, claimId, uniqueCode }: Props) {
  const [claimed, setClaimed] = useState(initiallyClaimed)
  const [currentClaimId, setCurrentClaimId] = useState<string | undefined>(claimId)
  const [currentUniqueCode, setCurrentUniqueCode] = useState<string | undefined>(uniqueCode)
  const [loading, setLoading] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const { toast } = useToast()

  const handleClaim = async () => {
    setLoading(true)
    const res = await claimPromo(promoId)
    if (res.success) {
      setClaimed(true)
      if (res.data?.id) setCurrentClaimId(res.data.id)
      if (res.data?.uniqueCode) setCurrentUniqueCode(res.data.uniqueCode)
      toast({ title: 'Berhasil', description: 'Promo berhasil di-claim. Email voucher telah dikirim.' })
    } else {
      toast({ title: 'Gagal', description: res.error || 'Tidak bisa claim promo', variant: 'destructive' })
    }
    setLoading(false)
  }

  const handleShowQr = async () => {
    if (!userId) {
      toast({ title: 'Gagal', description: 'Silakan login untuk melihat QR', variant: 'destructive' })
      return
    }
    if (!currentClaimId && !currentUniqueCode) {
       toast({ title: 'Gagal', description: 'ID Claim tidak ditemukan', variant: 'destructive' })
       return
    }
    try {
      setQrLoading(true)
      const payload = currentUniqueCode || `PROMO:${currentClaimId}`
      const url = await QRCode.toDataURL(payload)
      setQrUrl(url)
      setShowModal(true)
    } catch (error) {
      toast({ title: 'Gagal', description: 'Tidak bisa generate QR', variant: 'destructive' })
    } finally {
      setQrLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setQrUrl(null)
  }

  if (claimed) {
    return (
      <>
        <div className="flex gap-2">
          <Button onClick={handleShowQr} disabled={qrLoading || !userId} className="bg-brand text-white hover:bg-brand-dark font-bold">
            {qrLoading ? 'Loading QR...' : 'Show QR'}
          </Button>
          <Button disabled variant="secondary" className="font-bold">
            Claimed
          </Button>
        </div>
        {showModal && qrUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="text-center space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight mb-1">Redeem Partner Promo</h3>
                  <p className="text-gray-500 text-sm font-medium">Tunjukkan QR ini ke partner untuk redeem</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border-2 border-brand-100 shadow-inner inline-block">
                  <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Promo</p>
                  <p className="font-bold text-gray-900">{promoTitle}</p>
                  <div className="h-px bg-gray-200 my-3"></div>
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Promo Code</p>
                  <p className="font-mono text-lg font-bold text-brand tracking-widest">
                    {currentUniqueCode || currentClaimId?.substring(0, 8).toUpperCase()}
                  </p>
                </div>
                <p className="text-xs text-gray-400 font-medium">One-time use per member untuk promo ini.</p>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <Button onClick={handleClaim} disabled={loading} className="bg-brand text-white hover:bg-brand-dark font-bold">
      {loading ? 'Claiming...' : 'Claim'}
    </Button>
  )
}
