"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Wallet, QrCode, ChevronDown, Undo2 } from "lucide-react"
import Link from "next/link"
import { translations, type Language } from "@/lib/translations"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CashQRDialog } from "@/components/cash-qr-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

interface Transaction {
  id: number
  type: "booking" | "boarding" | "client" | "income"
  amount: number
  passengerName: string
  timestamp: Date
  paymentMethod: "cash" | "qr"
  description?: string
  expanded?: boolean
}

type PeriodFilter = "today" | "yesterday" | "week" | "month"
type PaymentFilter = "qr" | "cash"

interface SettlementPerson {
  id: number
  name: string
  amount: number
  type: "driver" | "dispatcher"
}

interface QRScanData {
  sum: number
  recipient: string
  created_at: string
}

export default function BalancePage() {
  const [language, setLanguage] = useState<Language>("ru")
  const t = translations[language]
  const { toast } = useToast()
  const router = useRouter()

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("today")
  const [paymentFilters, setPaymentFilters] = useState<PaymentFilter[]>(["qr", "cash"])
  const [balance, setBalance] = useState<number>(12450)
  const [activeTab, setActiveTab] = useState<"operations" | "settlements">("operations")

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
  ])

  const available = balance

  const [showRecalcPanel, setShowRecalcPanel] = useState(false)
  const [recalcThroughDispatcher, setRecalcThroughDispatcher] = useState(false)
  const [selectedDispatcher, setSelectedDispatcher] = useState("")
  
  // Сразу показываем список водителей
  const [recalcResults] = useState<SettlementPerson[]>([
    { id: 1, name: "Водитель Иванов", amount: 1500, type: "driver" },
    { id: 2, name: "Водитель Смирнов", amount: 2300, type: "driver" },
  ])
  
  const [showCashQRDialog, setShowCashQRDialog] = useState(false)
  const [currentSettlementPerson, setCurrentSettlementPerson] = useState<SettlementPerson | null>(null)
  const [settlementAction, setSettlementAction] = useState<"debit" | "credit" | null>(null)
  
  // Для операций - добавляем состояние для отсканированных QR
  const [scannedQRData, setScannedQRData] = useState<QRScanData | null>(null)
  const [showQRResult, setShowQRResult] = useState(false)

  const getTransactionTypeLabel = (type: string) => {
    if (type === "booking") return t.booking
    if (type === "boarding") return t.boarding
    if (type === "income") return t.income
    return t.client
  }

  const getPaymentMethodLabel = (method: "cash" | "qr") => {
    if (method === "qr") return t.qr
    return language === "ru" ? "ЛС" : "LS"
  }

  const toggleTransactionExpanded = (id: number) => {
    setTransactions(transactions.map((t) => (t.id === id ? { ...t, expanded: !t.expanded } : t)))
  }

  const togglePaymentFilter = (filter: PaymentFilter | "all") => {
    if (filter === "all") {
      setPaymentFilters(["qr", "cash"])
    } else {
      setPaymentFilters((prev) => {
        if (prev.includes(filter)) {
          const newFilters = prev.filter((f) => f !== filter)
          return newFilters.length === 0 ? ["qr", "cash"] : newFilters
        } else {
          return [...prev, filter]
        }
      })
    }
  }

  const filteredTransactions = transactions.filter((t) => {
    const matchesPayment = paymentFilters.length === 2 || paymentFilters.includes(t.paymentMethod)
    return matchesPayment
  })

  const handleDebit = (person: SettlementPerson) => {
    console.log("[v0] Debit operation:", person.id)
    setCurrentSettlementPerson(person)
    setSettlementAction("debit")
    setShowCashQRDialog(true)
  }

  const handleCredit = (person: SettlementPerson) => {
    console.log("[v0] Credit operation:", person.id)
    setCurrentSettlementPerson(person)
    setSettlementAction("credit")
    setShowCashQRDialog(true)
  }

  const handleQRConfirm = () => {
    if (activeTab === "operations") {
      // Для операций - показываем результат сканирования
      const mockQRData: QRScanData = {
        sum: 450,
        recipient: language === "ru" ? "Водитель Иванов И.И." : "Driver Ivanov I.",
        created_at: formatDateTime(new Date()),
      }
      setScannedQRData(mockQRData)
      setShowQRResult(true)
      setShowCashQRDialog(false)
    } else {
      // Для взаиморасчетов
      if (!currentSettlementPerson || !settlementAction) return

      toast({
        title: language === "ru" 
          ? (settlementAction === "debit" ? "Списание" : "Зачисление")
          : (settlementAction === "debit" ? "Debit" : "Credit"),
        description: language === "ru" 
          ? `${formatCurrency(currentSettlementPerson.amount)} RUB`
          : `${formatCurrency(currentSettlementPerson.amount)} RUB`,
      })

      setShowCashQRDialog(false)
      setCurrentSettlementPerson(null)
      setSettlementAction(null)
    }
  }

  const handleAcceptQR = () => {
    if (!scannedQRData) return
    
    toast({
      title: language === "ru" ? "Операция принята" : "Operation accepted",
      description: `${formatCurrency(scannedQRData.sum)} RUB`,
    })
    
    setShowQRResult(false)
    setScannedQRData(null)
  }

  const handleRejectQR = () => {
    toast({
      title: language === "ru" ? "Операция отклонена" : "Operation rejected",
      variant: "destructive",
    })
    
    setShowQRResult(false)
    setScannedQRData(null)
  }

  const handleReturnQR = () => {
    setShowQRResult(false)
    setScannedQRData(null)
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
          <div className="text-4xl font-bold text-foreground mb-4">{formatCurrency(balance)} RUB</div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3 rounded-lg bg-background/50">
              <div className="text-xs text-muted-foreground mb-1">{t.reserved}</div>
              <div className="text-lg font-semibold text-orange-600">{formatCurrency(0)} RUB</div>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <div className="text-xs text-muted-foreground mb-1">{t.available}</div>
              <div className="text-lg font-semibold text-green-600">{formatCurrency(available)} RUB</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-background/50">
              <div className="text-xs text-muted-foreground mb-1">{t.dailyIncome}</div>
              <div className="text-base font-semibold text-blue-600">{formatCurrency(3250)} RUB</div>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <div className="text-xs text-muted-foreground mb-1">{t.weeklyIncome}</div>
              <div className="text-base font-semibold text-purple-600">{formatCurrency(18700)} RUB</div>
            </div>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "operations" | "settlements")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="operations">
              {language === "ru" ? "Операции" : "Operations"}
            </TabsTrigger>
            <TabsTrigger value="settlements">
              {language === "ru" ? "Взаиморасчеты" : "Settlements"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="space-y-4 mt-4">
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-[120px] justify-between bg-transparent">
                    <span className="text-sm">
                      {paymentFilters.length === 2
                        ? language === "ru" ? "Все" : "All"
                        : paymentFilters.length === 1
                          ? paymentFilters[0] === "qr" ? t.qr : language === "ru" ? "ЛС" : "LS"
                          : language === "ru" ? "Все" : "All"}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[120px]">
                  <DropdownMenuCheckboxItem
                    checked={paymentFilters.length === 2}
                    onCheckedChange={() => togglePaymentFilter("all")}
                  >
                    {language === "ru" ? "Все" : "All"}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={paymentFilters.includes("qr")}
                    onCheckedChange={() => togglePaymentFilter("qr")}
                  >
                    {t.qr}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={paymentFilters.includes("cash")}
                    onCheckedChange={() => togglePaymentFilter("cash")}
                  >
                    {language === "ru" ? "ЛС" : "LS"}
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* QR Result Display */}
            {showQRResult && scannedQRData && (
              <Card className="p-4 border-2 border-green-500 bg-green-50 dark:bg-green-900/20">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{t.sumLabel}:</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(scannedQRData.sum)} RUB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t.recipientInfo}:</span>
                    <span className="text-sm font-semibold">{scannedQRData.recipient}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t.qrCreatedAt}:</span>
                    <span className="text-sm font-semibold">{scannedQRData.created_at}</span>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleAcceptQR}
                      className="flex-1"
                      variant="default"
                    >
                      {t.accept}
                    </Button>
                    <Button
                      onClick={handleRejectQR}
                      className="flex-1"
                      variant="destructive"
                    >
                      {t.reject}
                    </Button>
                    <Button
                      onClick={handleReturnQR}
                      className="h-10 w-10"
                      variant="outline"
                      size="icon"
                      title={language === "ru" ? "Вернуть" : "Return"}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <Button onClick={() => setShowCashQRDialog(true)} className="w-full h-14 text-base font-semibold" variant="default">
              <QrCode className="mr-2 h-5 w-5" />
              {t.scanQR}
            </Button>

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
                          <span className="font-bold text-green-600">{formatCurrency(transaction.amount)} RUB</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t.currentTime}:</span>
                          <span className="font-semibold">{formatDateTime(transaction.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settlements" className="space-y-4 mt-4">
            <Card className="p-4 border-2 border-border">
              <Button onClick={() => setShowRecalcPanel(!showRecalcPanel)} variant="outline" className="w-full mb-3 bg-transparent">
                {language === "ru" ? "Перерасчет" : "Recalculation"}
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showRecalcPanel ? "rotate-180" : ""}`} />
              </Button>

              {showRecalcPanel && (
                <div className="space-y-3">
                  {recalcResults.map((result) => (
                    <div key={result.id} className="p-2 border rounded-lg bg-secondary">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">{result.name}</span>
                        <span className="text-sm font-bold">{formatCurrency(result.amount)} RUB</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          id={`dispatcher-${result.id}`}
                          checked={recalcThroughDispatcher}
                          onCheckedChange={(checked) => {
                            setRecalcThroughDispatcher(checked as boolean)
                            if (checked) {
                              setSelectedDispatcher("")
                            }
                          }}
                        />
                        <label htmlFor={`dispatcher-${result.id}`} className="text-sm">
                          {language === "ru" ? "Через диспетчера" : "Through dispatcher"}
                        </label>
                      </div>

                      {recalcThroughDispatcher && (
                        <Select value={selectedDispatcher} onValueChange={setSelectedDispatcher}>
                          <SelectTrigger className="w-full mb-2">
                            <SelectValue placeholder={language === "ru" ? "Выберите диспетчера" : "Select dispatcher"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dispatcher1">
                              {language === "ru" ? "Диспетчер Петров" : "Dispatcher Petrov"}
                            </SelectItem>
                            <SelectItem value="dispatcher2">
                              {language === "ru" ? "Диспетчер Сидоров" : "Dispatcher Sidorov"}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDebit(result)}
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                        >
                          {language === "ru" ? "Списать" : "Debit"}
                        </Button>
                        <Button
                          onClick={() => handleCredit(result)}
                          size="sm"
                          variant="default"
                          className="flex-1"
                        >
                          {language === "ru" ? "Принять" : "Accept"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CashQRDialog
        open={showCashQRDialog}
        onOpenChange={setShowCashQRDialog}
        driverName={language === "ru" ? "Водитель Иванов И.И." : "Driver Ivanov I."}
        amount={currentSettlementPerson?.amount || 0}
        currency="RUB"
        onConfirm={handleQRConfirm}
        onInvalid={() => {}}
        language={language}
        showNotFoundButton={false}
      />
    </div>
  )
}
