'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { QrCode, CheckCircle2, XCircle } from 'lucide-react'

interface CashQRDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  driverName: string
  amount: number
  currency: string
  onConfirm: () => void
  language: 'ru' | 'en' | 'fr' | 'ar'
}

export function CashQRDialog({
  open,
  onOpenChange,
  driverName,
  amount,
  currency,
  onConfirm,
  language,
}: CashQRDialogProps) {
  const [scanStatus, setScanStatus] = useState<'scanning' | 'success' | 'error'>('scanning')
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null)

  const t = {
    ru: {
      scanning: 'Сканирование...',
      success: 'Успешно!',
      error: 'Ошибка сканирования',
    },
    en: {
      scanning: 'Scanning...',
      success: 'Success!',
      error: 'Scan error',
    },
    fr: {
      scanning: 'Scan en cours...',
      success: 'Succès!',
      error: 'Erreur de scan',
    },
    ar: {
      scanning: 'جاري المسح...',
      success: 'نجح!',
      error: 'خطأ في المسح',
    },
  }[language]

  useEffect(() => {
    if (open) {
      setScanStatus('scanning')
      
      // Simulate scan delay
      const scanTimer = setTimeout(() => {
        // Mock validation: 70% success rate
        const isValid = Math.random() > 0.3
        setScanStatus(isValid ? 'success' : 'error')
        
        if (isValid) {
          // Auto-close after success
          const closeTimer = setTimeout(() => {
            onConfirm()
            onOpenChange(false)
          }, 1500)
          setAutoCloseTimer(closeTimer)
        } else {
          // Auto-close after error
          const closeTimer = setTimeout(() => {
            onOpenChange(false)
          }, 2000)
          setAutoCloseTimer(closeTimer)
        }
      }, 800)
      
      return () => {
        clearTimeout(scanTimer)
        if (autoCloseTimer) clearTimeout(autoCloseTimer)
      }
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-4">
          <div className="p-4 bg-secondary rounded-lg">
            <div className="flex items-center justify-center bg-white dark:bg-gray-900 p-8 rounded-lg border-4 border-primary/20">
              <div className="w-48 h-48 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center relative">
                {scanStatus === 'scanning' && (
                  <QrCode className="h-32 w-32 text-primary animate-pulse" />
                )}
                {scanStatus === 'success' && (
                  <CheckCircle2 className="h-32 w-32 text-green-500" />
                )}
                {scanStatus === 'error' && (
                  <XCircle className="h-32 w-32 text-red-500" />
                )}
                
                {/* Corner frames */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary" />
              </div>
            </div>
          </div>

          {scanStatus === 'error' && (
            <p className="text-center text-sm text-destructive font-medium">
              {t.error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
