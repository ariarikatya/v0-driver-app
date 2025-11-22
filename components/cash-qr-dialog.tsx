'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QrCode, User, Clock, Shield } from 'lucide-react'

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
  const qrCreatedAt = new Date().toLocaleString(
    language === 'ru' ? 'ru-RU' : language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-SA' : 'en-US'
  )

  const t = {
    ru: {
      qrCode: 'QR-код для оплаты',
      recipientInfo: 'Кому зачислить',
      qrCreatedAt: 'Когда создан QR',
      scanQR: 'Отсканируйте QR-код для посадки',
      protectedAmount: 'Сумма',
      confirm: 'Подтвердить сканирование',
      cancel: 'Отмена',
    },
    en: {
      qrCode: 'QR Code for Payment',
      recipientInfo: 'Recipient',
      qrCreatedAt: 'QR Created At',
      scanQR: 'Scan QR Code to board',
      protectedAmount: 'Amount',
      confirm: 'Confirm Scan',
      cancel: 'Cancel',
    },
    fr: {
      qrCode: 'QR code de paiement',
      recipientInfo: 'Bénéficiaire',
      qrCreatedAt: 'QR créé le',
      scanQR: 'Scanner le QR code pour embarquer',
      protectedAmount: 'Montant',
      confirm: 'Confirmer le scan',
      cancel: 'Annuler',
    },
    ar: {
      qrCode: 'رمز QR للدفع',
      recipientInfo: 'المستلم',
      qrCreatedAt: 'تم إنشاء QR في',
      scanQR: 'مسح رمز QR للصعود',
      protectedAmount: 'المبلغ',
      confirm: 'تأكيد المسح',
      cancel: 'إلغاء',
    },
  }[language]

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t.qrCode}
          </DialogTitle>
          <DialogDescription>{t.scanQR}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4 bg-secondary">
            <div className="flex items-center justify-center bg-white p-8 rounded-lg mb-4">
              <div className="w-48 h-48 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                <QrCode className="h-32 w-32 text-primary" />
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-2 rounded bg-background">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">{t.protectedAmount}:</span>
                </div>
                <Badge variant="default" className="text-base font-bold">
                  {amount.toFixed(2)} {currency}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-background">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{t.recipientInfo}:</span>
                </div>
                <span className="font-semibold text-foreground text-right">{driverName}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-background">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{t.qrCreatedAt}:</span>
                </div>
                <span className="font-semibold text-foreground text-xs">{qrCreatedAt}</span>
              </div>
            </div>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t.cancel}
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              {t.confirm}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
