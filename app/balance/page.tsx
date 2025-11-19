'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Wallet, QrCode, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { translations, type Language } from '@/lib/translations'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Transaction {
  id: number
  type: 'booking' | 'boarding' | 'client'
  amount: number
  passengerName: string
  timestamp: Date
  paymentMethod: 'cash' | 'qr'
  expanded?: boolean
}

export default function BalancePage() {
  const [language, setLanguage] = useState<Language>('ru')
  const t = translations[language]
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const savedAuthState = localStorage.getItem('driverAuthenticated')
    if (savedAuthState !== 'true') {
      router.push('/')
    }
  }, [router])

  const [balance] = useState({
    current: 12450,
    reserved: 1200,
    dailyIncome: 3250,
    weeklyIncome: 18700,
    currency: 'RUB'
  })

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 1,
      type: 'booking',
      amount: 450,
      passengerName: 'Иван П.',
      timestamp: new Date(),
      paymentMethod: 'qr'
    },
    {
      id: 2,
      type: 'boarding',
      amount: 900,
      passengerName: 'Ольга В.',
      timestamp: new Date(Date.now() - 3600000),
      paymentMethod: 'qr'
    },
    {
      id: 3,
      type: 'client',
      amount: 900,
      passengerName: 'Мария С.',
      timestamp: new Date(Date.now() - 7200000),
      paymentMethod: 'cash'
    },
    {
      id: 4,
      type: 'booking',
      amount: 320,
      passengerName: 'Дмитрий Н.',
      timestamp: new Date(Date.now() - 10800000),
      paymentMethod: 'qr'
    },
  ])

  const available = balance.current - balance.reserved

  const cycleLanguage = () => {
    const languages: Language[] = ['ru', 'en', 'fr', 'ar']
    const currentIndex = languages.indexOf(language)
    const nextIndex = (currentIndex + 1) % languages.length
    setLanguage(languages[nextIndex])
  }

  const getTransactionTypeLabel = (type: string) => {
    if (type === 'booking') return t.booking
    if (type === 'boarding') return t.boarding
    return t.client
  }

  const getPaymentMethodLabel = (method: 'cash' | 'qr') => {
    if (method === 'qr') return t.qr
    return language === 'ru' ? 'ЛС' : language === 'en' ? 'LS' : language === 'fr' ? 'LS' : 'ЛС'
  }

  const toggleTransactionExpanded = (id: number) => {
    setTransactions(transactions.map(t => 
      t.id === id ? { ...t, expanded: !t.expanded } : t
    ))
  }

  const [expandedSettlement, setExpandedSettlement] = useState<number | null>(null)
  const [showCreateOperationDialog, setShowCreateOperationDialog] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null)

  const toggleSettlement = (id: number) => {
    setExpandedSettlement(expandedSettlement === id ? null : id)
  }

  const handleCreateOperation = (transactionId: number) => {
    setSelectedTransactionId(transactionId)
    setShowCreateOperationDialog(true)
  }

  const confirmCreateOperation = () => {
    toast({
      title: language === 'ru' ? 'Операция создана' : language === 'fr' ? 'Opération créée' : language === 'ar' ? 'تم إنشاء العملية' : 'Operation created',
      description: language === 'ru' ? 'Новая операция добавлена в историю' : language === 'fr' ? 'Nouvelle opération ajoutée' : language === 'ar' ? 'تمت إضافة عملية جديدة' : 'New operation added to history',
    })
    setShowCreateOperationDialog(false)
    setSelectedTransactionId(null)
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground flex-1">{t.driverBalance}</h1>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-6">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">{t.currentBalance}</span>
          </div>
          <div className="text-4xl font-bold text-foreground mb-4">
            {formatCurrency(balance.current)} {balance.currency}
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3 rounded-lg bg-background/50">
              <div className="text-xs text-muted-foreground mb-1">{t.reserved}</div>
              <div className="text-lg font-semibold text-orange-600">
                {formatCurrency(balance.reserved)} {balance.currency}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <div className="text-xs text-muted-foreground mb-1">{t.available}</div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(available)} {balance.currency}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-background/50">
              <div className="text-xs text-muted-foreground mb-1">{t.dailyIncome}</div>
              <div className="text-base font-semibold text-blue-600">
                {formatCurrency(balance.dailyIncome)} {balance.currency}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <div className="text-xs text-muted-foreground mb-1">{t.weeklyIncome}</div>
              <div className="text-base font-semibold text-purple-600">
                {formatCurrency(balance.weeklyIncome)} {balance.currency}
              </div>
            </div>
          </div>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">{t.transactionHistory}</h2>
            <Badge variant="secondary">{transactions.length} {t.operations}</Badge>
          </div>

          <div className="space-y-3">
            {transactions.map((transaction) => (
              <Card 
                key={transaction.id} 
                className="p-4 cursor-pointer hover:bg-accent/5 transition-colors"
                onClick={() => toggleTransactionExpanded(transaction.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                      {transaction.paymentMethod === 'qr' ? (
                        <QrCode className="h-5 w-5 text-green-600" />
                      ) : (
                        <Wallet className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">
                        {getTransactionTypeLabel(transaction.type)} {formatDateTime(transaction.timestamp)} +{formatCurrency(transaction.amount)} {getPaymentMethodLabel(transaction.paymentMethod)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {transaction.passengerName}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${
                    transaction.expanded ? 'rotate-180' : ''
                  }`} />
                </div>

                {transaction.expanded && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t.passengerInfo}:</span>
                        <span className="font-semibold">{transaction.passengerName}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t.paymentAmount}:</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(transaction.amount)} {balance.currency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t.currentTime}:</span>
                        <span className="font-semibold">{formatDateTime(transaction.timestamp)}</span>
                      </div>
                      
                      {(transaction.type === 'client' || transaction.id % 2 === 0) && (
                        <div className="pt-3 space-y-2">
                          <Button 
                            variant="outline" 
                            className="w-full" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSettlement(transaction.id)
                            }}
                          >
                            {t.settlement}
                            <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${
                              expandedSettlement === transaction.id ? 'rotate-180' : ''
                            }`} />
                          </Button>
                          
                          {expandedSettlement === transaction.id && (
                            <div className="p-3 rounded-lg bg-accent/10 border border-border">
                              <p className="text-xs text-muted-foreground mb-2">
                                {language === 'ru' 
                                  ? 'Создать операцию взаиморасчёта' 
                                  : language === 'fr'
                                  ? 'Créer une opération de règlement'
                                  : language === 'ar'
                                  ? 'إنشاء عملية تسوية'
                                  : 'Create settlement operation'}
                              </p>
                              <Button 
                                variant="secondary" 
                                className="w-full" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCreateOperation(transaction.id)
                                }}
                              >
                                {t.createOperation}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={showCreateOperationDialog} onOpenChange={setShowCreateOperationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'ru' 
                ? 'Создание операции взаиморасчёта' 
                : language === 'fr'
                ? 'Création d\'une opération de règlement'
                : language === 'ar'
                ? 'إنشاء عملية تسوية'
                : 'Create Settlement Operation'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ru' 
                ? 'Подтвердите создание новой операции взаиморасчёта' 
                : language === 'fr'
                ? 'Confirmez la création d\'une nouvelle opération de règlement'
                : language === 'ar'
                ? 'قم بتأكيد إنشاء عملية تسوية جديدة'
                : 'Confirm creating a new settlement operation'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowCreateOperationDialog(false)}
            >
              {t.cancel}
            </Button>
            <Button 
              className="flex-1"
              onClick={confirmCreateOperation}
            >
              {t.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
