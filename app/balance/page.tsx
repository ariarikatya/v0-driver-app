"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Wallet, QrCode, ChevronDown, Undo2, X } from "lucide-react"
import Link from "next/link"
import { translations, type Language } from "@/lib/translations"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CashQRDialog } from "@/components/cash-qr-dialog"

interface Transaction {
  id: number
  type: "booking" | "boarding" | "client"
  amount: number
  passengerName: string
  timestamp: Date
  paymentMethod: "cash" | "qr"
  expanded?: boolean
}

type PeriodFilter = "today" | "yesterday" | "week" | "month"
type PaymentFilter = "qr" | "cash"

export default function BalancePage() {
  const [language, setLanguage] = useState<Language>("ru")
  const t = translations[language]
  const { toast } = useToast()
  const router = useRouter()

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("today")
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter | "all">("all")

  const [showCashReceiveDialog, setShowCashReceiveDialog] = useState(false)
  const [cashQRState, setCashQRState] = useState<{
    scanning: boolean
    amount: number
    showAcceptButton: boolean
    qrError?: string
    redCross?: boolean
    showReject?: boolean
    bookingId?: string
  }>({
    scanning: false,
    amount: 0,
    showAcceptButton: false,
  })

  const [balance, setBalance] = useState({
    current: 12450,
    reserved: 1200,
    dailyIncome: 3250,
    weeklyIncome: 18700,
    currency: "RUB",
  })

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 1,
      type: "booking",
      amount: 450,
      passengerName: "Иван П.",
      timestamp: new Date(),
      paymentMethod: "qr",
    },
    {
      id: 2,
      type: "boarding",
      amount: 900,
      passengerName: "Ольга В.",
      timestamp: new Date(Date.now() - 3600000),
      paymentMethod: "qr",
    },
    {
      id: 3,
      type: "client",
      amount: 900,
      passengerName: "Мария С.",
      timestamp: new Date(Date.now() - 7200000),
      paymentMethod: "cash",
    },
    {
      id: 4,
      type: "booking",
      amount: 320,
      passengerName: "Дмитрий Н.",
      timestamp: new Date(Date.now() - 10800000),
      paymentMethod: "qr",
    },
  ])

  const available = balance.current - balance.reserved

  const cycleLanguage = () => {
    const languages: Language[] = ["ru", "en", "fr", "ar"]
    const currentIndex = languages.indexOf(language)
    const nextIndex = (currentIndex + 1) % languages.length
    setLanguage(languages[nextIndex])
  }

  const getTransactionTypeLabel = (type: string) => {
    if (type === "booking") return t.booking
    if (type === "boarding") return t.boarding
    return t.client
  }

  const getPaymentMethodLabel = (method: "cash" | "qr") => {
    if (method === "qr") return t.qr
    return language === "ru" ? "ЛС" : language === "en" ? "LS" : language === "fr" ? "LS" : "ЛС"
  }

  const toggleTransactionExpanded = (id: number) => {
    setTransactions(transactions.map((t) => (t.id === id ? { ...t, expanded: !t.expanded } : t)))
  }

  const togglePaymentFilter = (filter: PaymentFilter) => {
    if (paymentFilter === filter) {
      setPaymentFilter("all")
    } else {
      setPaymentFilter(filter)
    }
  }

  const filteredTransactions = transactions.filter((t) => {
    const matchesPeriod = true
    const matchesPayment = paymentFilter === "all" || t.paymentMethod === paymentFilter
    return matchesPeriod && matchesPayment
  })

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
      title:
        language === "ru"
          ? "Операция создана"
          : language === "fr"
            ? "Opération créée"
            : language === "ar"
              ? "تم إنشاء العملية"
              : "Operation created",
      description:
        language === "ru"
          ? "Новая операция добавлена в историю"
          : language === "fr"
            ? "Nouvelle opération ajoutée"
            : language === "ar"
              ? "تمت إضافة عملية جديدة"
              : "New operation added to history",
    })
    setShowCreateOperationDialog(false)
    setSelectedTransactionId(null)
  }

  const handleScanCashQR = () => {
    console.log("[v0] Opening QR scanner for cash receive")
    const mockAmount = 500 + Math.floor(Math.random() * 1500)
    setCashQRState({
      scanning: true,
      amount: mockAmount,
      showAcceptButton: false,
    })
    setShowCashReceiveDialog(true)
  }

  const handleCashQRScanned = () => {
    const amount = cashQRState.amount
    console.log("[v0] Cash QR scanned successfully, amount:", amount, { match: true })

    // Set accept button IMMEDIATELY
    setCashQRState({
      scanning: false,
      amount: amount,
      showAcceptButton: true,
    })

    // Close modal asynchronously after 1.5s
    setTimeout(() => {
      setShowCashReceiveDialog(false)
    }, 1500)
  }

  const handleInvalidCashQR = () => {
    console.log("[v0] Cash QR scan invalid", { match: false, reason: "Invalid QR" })
    // Keep modal open to show "QR не найден" button
  }

  const handleCashQRNotFound = () => {
    console.log("[v0] QR not found button clicked")
    console.log({ bookingId: "cash_" + Date.now(), match: false, reason: "qr_not_found" })

    setCashQRState({
      scanning: false,
      amount: cashQRState.amount,
      showAcceptButton: false,
      qrError: language === "ru" ? "QR не найден" : "QR not found",
      redCross: true,
      showReject: true,
      bookingId: "cash_" + Date.now(),
    })

    // Close the modal
    setShowCashReceiveDialog(false)

    toast({
      title: language === "ru" ? "QR не найден" : "QR not found",
      description: language === "ru" ? "Помечено красным крестом" : "Marked with red cross",
      variant: "destructive",
    })
  }

  const handleRejectCashQR = () => {
    console.log("[v0] Rejecting cash QR operation:", { bookingId: cashQRState.bookingId, action: "reject" })

    // Reset state and optionally open scanner for next booking
    setCashQRState({
      scanning: false,
      amount: 0,
      showAcceptButton: false,
    })

    toast({
      title: language === "ru" ? "Операция отклонена" : "Operation rejected",
    })

    // Note: In a real app, you might open scanner for next booking here
    // For now, just reset state
  }

  const handleConfirmCashReceive = () => {
    const amount = cashQRState.amount
    console.log("[v0] Confirming cash receive operation:", amount)

    setBalance({
      ...balance,
      current: balance.current + amount,
    })

    const newTransaction: Transaction = {
      id: transactions.length + 1,
      type: "client",
      amount: amount,
      passengerName: language === "ru" ? "Клиент (наличные)" : "Client (cash)",
      timestamp: new Date(),
      paymentMethod: "cash",
    }
    setTransactions([newTransaction, ...transactions])

    toast({
      title: language === "ru" ? "Операция выполнена" : "Operation completed",
      description:
        language === "ru"
          ? `Получено наличными: ${formatCurrency(amount)} RUB`
          : `Cash received: ${formatCurrency(amount)} RUB`,
    })

    setCashQRState({
      scanning: false,
      amount: 0,
      showAcceptButton: false,
    })
  }

  const handleRevertCashReceive = () => {
    console.log("[v0] Reverting cash receive operation")
    setCashQRState({
      scanning: false,
      amount: 0,
      showAcceptButton: false,
    })

    toast({
      title: language === "ru" ? "Отменено" : "Cancelled",
    })
  }

  useEffect(() => {
    const savedAuthState = localStorage.getItem("driverAuthenticated")
    if (savedAuthState !== "true") {
      router.push("/")
    }
  }, [router])

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

        {!cashQRState.showAcceptButton && !cashQRState.showReject ? (
          <Button onClick={handleScanCashQR} className="w-full h-14 text-base font-semibold" variant="default">
            <QrCode className="mr-2 h-5 w-5" />
            {t.scanQR}
          </Button>
        ) : cashQRState.showAcceptButton ? (
          <div className="flex gap-3">
            <Button
              onClick={handleConfirmCashReceive}
              className="flex-1 h-14 text-base font-semibold"
              variant="default"
            >
              {t.accept}
            </Button>
            <Button
              onClick={handleRevertCashReceive}
              className="h-14 w-14 text-base font-semibold bg-transparent"
              variant="outline"
              size="icon"
              title={language === "ru" ? "Вернуть" : "Revert"}
            >
              <Undo2 className="h-5 w-5" />
            </Button>
          </div>
        ) : cashQRState.showReject ? (
          <Card className="p-4 border-2 border-destructive/50">
            <div className="flex items-center gap-3 mb-3">
              <X className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-destructive">
                  {language === "ru" ? "QR не найден" : "QR not found"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {language === "ru"
                    ? `Сумма: ${formatCurrency(cashQRState.amount)} ${balance.currency}`
                    : `Amount: ${formatCurrency(cashQRState.amount)} ${balance.currency}`}
                </div>
              </div>
            </div>
            <Button onClick={handleRejectCashQR} className="w-full" variant="destructive">
              {t.reject}
            </Button>
          </Card>
        ) : null}

        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t.today} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t.today}</SelectItem>
                <SelectItem value="yesterday">{t.yesterday}</SelectItem>
                <SelectItem value="week">{t.week}</SelectItem>
                <SelectItem value="month">{t.month}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as PaymentFilter | "all")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={language === "ru" ? "Все" : "All"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === "ru" ? "Все" : "All"}</SelectItem>
                <SelectItem value="qr">{t.qr}</SelectItem>
                <SelectItem value="cash">{language === "ru" ? "ЛС" : "LS"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <Card
                key={transaction.id}
                className="p-4 cursor-pointer hover:bg-accent/5 transition-colors"
                onClick={() => toggleTransactionExpanded(transaction.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                      {transaction.paymentMethod === "qr" ? (
                        <QrCode className="h-5 w-5 text-green-600" />
                      ) : (
                        <Wallet className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">
                        {getTransactionTypeLabel(transaction.type)} {formatDateTime(transaction.timestamp)} +
                        {formatCurrency(transaction.amount)} {getPaymentMethodLabel(transaction.paymentMethod)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{transaction.passengerName}</div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      transaction.expanded ? "rotate-180" : ""
                    }`}
                  />
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

                      {(transaction.type === "client" || transaction.id % 2 === 0) && (
                        <div className="pt-3 space-y-2">
                          <Button
                            variant="outline"
                            className="w-full bg-transparent"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSettlement(transaction.id)
                            }}
                          >
                            {t.settlement}
                            <ChevronDown
                              className={`ml-2 h-4 w-4 transition-transform ${
                                expandedSettlement === transaction.id ? "rotate-180" : ""
                              }`}
                            />
                          </Button>

                          {expandedSettlement === transaction.id && (
                            <div className="p-3 rounded-lg bg-accent/10 border border-border">
                              <p className="text-xs text-muted-foreground mb-2">
                                {language === "ru"
                                  ? "Создать операцию взаиморасчёта"
                                  : language === "fr"
                                    ? "Créer une opération de règlement"
                                    : language === "ar"
                                      ? "إنشاء عملية تسوية"
                                      : "Create settlement operation"}
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

      <CashQRDialog
        open={showCashReceiveDialog}
        onOpenChange={setShowCashReceiveDialog}
        driverName={language === "ru" ? "Водитель Иванов И.И." : "Driver Ivanov I."}
        amount={cashQRState.amount}
        currency="RUB"
        onConfirm={handleCashQRScanned}
        onInvalid={handleInvalidCashQR}
        language={language}
        showNotFoundButton={cashQRState.scanning}
        onQRNotFound={handleCashQRNotFound}
      />
    </div>
  )
}
