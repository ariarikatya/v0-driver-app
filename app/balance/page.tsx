'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, CreditCard, Banknote, Languages } from 'lucide-react'
import Link from 'next/link'
import { translations, type Language } from '@/lib/translations'

interface Transaction {
  id: number
  type: 'deposit' | 'withdraw' | 'booking'
  amount: number
  description: string
  timestamp: string
  paymentMethod?: 'cash' | 'card'
}

export default function BalancePage() {
  const [language, setLanguage] = useState<Language>('ru')
  const t = translations[language]

  const [balance] = useState({
    current: 12450.50,
    reserved: 1200.00,
    currency: 'RUB'
  })

  const [transactions] = useState<Transaction[]>([
    {
      id: 1,
      type: 'booking',
      amount: 450.00,
      description: 'Иван П. - Центр → Вокзал',
      timestamp: new Date().toLocaleString('ru-RU'),
      paymentMethod: 'card'
    },
    {
      id: 2,
      type: 'booking',
      amount: 320.00,
      description: 'Ольга В. - ул. Ленина → Вокзал',
      timestamp: new Date(Date.now() - 3600000).toLocaleString('ru-RU'),
      paymentMethod: 'card'
    },
    {
      id: 3,
      type: 'withdraw',
      amount: -500.00,
      description: 'Вывод средств',
      timestamp: new Date(Date.now() - 7200000).toLocaleString('ru-RU'),
    },
    {
      id: 4,
      type: 'booking',
      amount: 280.00,
      description: 'Мария С. - Центр → ТЦ Галерея',
      timestamp: new Date(Date.now() - 10800000).toLocaleString('ru-RU'),
      paymentMethod: 'cash'
    },
    {
      id: 5,
      type: 'deposit',
      amount: 1000.00,
      description: 'Пополнение баланса',
      timestamp: new Date(Date.now() - 14400000).toLocaleString('ru-RU'),
    },
  ])

  const available = balance.current - balance.reserved

  const cycleLanguage = () => {
    const languages: Language[] = ['ru', 'en', 'fr', 'ar']
    const currentIndex = languages.indexOf(language)
    const nextIndex = (currentIndex + 1) % languages.length
    setLanguage(languages[nextIndex])
  }

  const getTransactionDescription = (transaction: Transaction) => {
    if (transaction.type === 'withdraw') return t.withdrawFunds
    if (transaction.type === 'deposit') return t.depositFunds
    return transaction.description
  }

  const getPaymentMethodLabel = (method?: 'cash' | 'card') => {
    if (!method) return ''
    return method === 'card' ? t.card : t.cash
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="bg-card border-b border-border px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground flex-1">{t.driverBalance}</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={cycleLanguage}
            className="gap-2"
          >
            <Languages className="h-4 w-4" />
            {language.toUpperCase()}
          </Button>
        </div>

        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">{t.currentBalance}</span>
          </div>
          <div className="text-4xl font-bold text-foreground mb-4">
            {balance.current.toFixed(2)} {balance.currency}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-background/50">
              <div className="text-xs text-muted-foreground mb-1">{t.reserved}</div>
              <div className="text-lg font-semibold text-orange-600">
                {balance.reserved.toFixed(2)} {balance.currency}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <div className="text-xs text-muted-foreground mb-1">{t.available}</div>
              <div className="text-lg font-semibold text-green-600">
                {available.toFixed(2)} {balance.currency}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">{t.transactionHistory}</h2>
          <Badge variant="secondary">{transactions.length} {t.operations}</Badge>
        </div>

        <div className="space-y-3">
          {transactions.map((transaction) => (
            <Card key={transaction.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    transaction.type === 'deposit' || transaction.type === 'booking'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {transaction.type === 'deposit' && <TrendingUp className="h-5 w-5 text-green-600" />}
                    {transaction.type === 'withdraw' && <TrendingDown className="h-5 w-5 text-red-600" />}
                    {transaction.type === 'booking' && transaction.paymentMethod === 'card' && (
                      <CreditCard className="h-5 w-5 text-green-600" />
                    )}
                    {transaction.type === 'booking' && transaction.paymentMethod === 'cash' && (
                      <Banknote className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground mb-1">
                      {getTransactionDescription(transaction)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {transaction.timestamp}
                    </div>
                    {transaction.paymentMethod && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {getPaymentMethodLabel(transaction.paymentMethod)}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className={`text-lg font-bold ${
                  transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} {balance.currency}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
