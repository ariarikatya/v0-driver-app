'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayCircle, StopCircle, User, Clock, CheckCircle2, MapPin, CreditCard, Banknote, Languages, QrCode, Users, ChevronRight, Minus, Plus, Wallet } from 'lucide-react'
import { LoginForm } from '@/components/login-form'
import { translations, type Language } from '@/lib/translations'
import { apiClient, type AccountBalance } from '@/lib/api-client'
import { CashQRDialog } from '@/components/cash-qr-dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'

type TripStatus = 'inactive' | 'boarding' | 'active'

interface Seat {
  id: number
  status: 'free' | 'occupied'
  passengerName?: string
  fromStop?: number
  toStop?: number
  paymentMethod?: 'cash' | 'card'
  amountPaid?: number
}

interface Booking {
  id: number
  passengerName: string
  pickupTime: string
  pickupLocation: string
  fromStopIndex: number
  toStopIndex: number
  amount: number
  accepted?: boolean
}

interface RouteStop {
  id: number
  name: string
  time: string
}

interface QueuePassenger {
  id: number
  name: string
  queuePosition: number
  isFirst: boolean
  scanned?: boolean
}

const tripRoutes = {
  '247': {
    start: 'Центр',
    end: 'Вокзал',
    stops: [
      { id: 0, name: 'Центр', time: '14:00' },
      { id: 1, name: 'ул. Ленина', time: '14:15' },
      { id: 2, name: 'ТЦ Галерея', time: '14:45' },
      { id: 3, name: 'Вокзал', time: '15:15' },
    ]
  },
  '248': {
    start: 'Аэропорт',
    end: 'Университет',
    stops: [
      { id: 0, name: 'Аэропорт', time: '10:00' },
      { id: 1, name: 'пл. Революции', time: '10:20' },
      { id: 2, name: 'пр. Победы', time: '10:40' },
      { id: 3, name: 'Университет', time: '11:00' },
    ]
  },
  '249': {
    start: 'Рынок',
    end: 'Больница',
    stops: [
      { id: 0, name: 'Рынок', time: '08:00' },
      { id: 1, name: 'ул. Мира', time: '08:20' },
      { id: 2, name: 'Парк', time: '08:40' },
      { id: 3, name: 'Больница', time: '09:00' },
    ]
  },
}

export default function DriverDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [language, setLanguage] = useState<Language>('ru')
  const t = translations[language]
  const { toast } = useToast()

  const [tripStatus, setTripStatus] = useState<TripStatus>('inactive')
  const [selectedTrip, setSelectedTrip] = useState('247')
  
  const [balance, setBalance] = useState<AccountBalance | null>(null)
  const [showCashQRDialog, setShowCashQRDialog] = useState(false)
  const [currentCashAmount, setCurrentCashAmount] = useState(0)
  const [qrScannedData, setQrScannedData] = useState<{
    amount: number
    recipient: string
    createdAt: string
    scannedPassengerId?: number
  } | null>(null)
  
  const [stops, setStops] = useState<RouteStop[]>(tripRoutes['247'].stops)

  const [seats, setSeats] = useState<Seat[]>([
    { id: 1, status: 'occupied', passengerName: language === 'ru' ? 'Иван П.' : 'Ivan P.', fromStop: 0, toStop: 3, paymentMethod: 'card', amountPaid: 450.00 },
    { id: 2, status: 'occupied', passengerName: language === 'ru' ? 'Мария С.' : 'Maria S.', fromStop: 0, toStop: 2, paymentMethod: 'cash', amountPaid: 280.00 },
    { id: 3, status: 'free' },
    { id: 4, status: 'free' },
    { id: 5, status: 'occupied', passengerName: language === 'ru' ? 'Алексей К.' : 'Alexey K.', fromStop: 0, toStop: 3, paymentMethod: 'card', amountPaid: 380.00 },
    { id: 6, status: 'free' },
  ])

  const [bookings, setBookings] = useState<Booking[]>([
    { id: 1, passengerName: language === 'ru' ? 'Ольга В.' : 'Olga V.', pickupTime: '14:15', pickupLocation: stops[1].name, fromStopIndex: 1, toStopIndex: 3, amount: 320 },
    { id: 2, passengerName: language === 'ru' ? 'Дмитрий Н.' : 'Dmitry N.', pickupTime: '14:15', pickupLocation: stops[1].name, fromStopIndex: 1, toStopIndex: 3, amount: 320 },
    { id: 3, passengerName: language === 'ru' ? 'Елена Т.' : 'Elena T.', pickupTime: '14:45', pickupLocation: stops[2].name, fromStopIndex: 2, toStopIndex: 3, amount: 180 },
  ])

  const [queuePassengers, setQueuePassengers] = useState<QueuePassenger[]>([
    { id: 1, name: language === 'ru' ? 'Петр С.' : 'Peter S.', queuePosition: 1, isFirst: true },
    { id: 2, name: language === 'ru' ? 'Анна М.' : 'Anna M.', queuePosition: 2, isFirst: false },
    { id: 3, name: language === 'ru' ? 'Игорь Л.' : 'Igor L.', queuePosition: 3, isFirst: false },
    { id: 4, name: language === 'ru' ? 'Ольга К.' : 'Olga K.', queuePosition: 4, isFirst: false },
    { id: 5, name: language === 'ru' ? 'Сергей Д.' : 'Sergey D.', queuePosition: 5, isFirst: false },
  ])

  const [manualOccupied, setManualOccupied] = useState(0)

  const cycleLanguage = () => {
    const languages: Language[] = ['ru', 'en', 'fr', 'ar']
    const currentIndex = languages.indexOf(language)
    const nextIndex = (currentIndex + 1) % languages.length
    setLanguage(languages[nextIndex])
  }

  const handleTripButton = () => {
    if (tripStatus === 'inactive') {
      setTripStatus('boarding')
    } else if (tripStatus === 'boarding') {
      setTripStatus('active')
    } else {
      setTripStatus('inactive')
    }
  }

  const getTripButtonText = () => {
    if (tripStatus === 'inactive') return t.startBoarding
    if (tripStatus === 'boarding') return t.startTrip
    return t.endTrip
  }

  const handleAcceptBooking = (bookingId: number) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (!booking) return

    const availableSeat = seats.find(seat => seat.status === 'free')
    if (!availableSeat) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: t.noSeatsAvailable,
        variant: 'destructive'
      })
      return
    }

    setSeats(seats.map(seat => 
      seat.id === availableSeat.id 
        ? { 
            ...seat, 
            status: 'occupied', 
            passengerName: booking.passengerName,
            fromStop: booking.fromStopIndex,
            toStop: booking.toStopIndex,
            paymentMethod: 'card',
            amountPaid: booking.amount
          }
        : seat
    ))

    if (balance) {
      setBalance({
        ...balance,
        balance: balance.balance + booking.amount,
      })
      
      toast({
        title: language === 'ru' ? 'Баланс обновлен' : language === 'fr' ? 'Solde mis à jour' : language === 'ar' ? 'تم تحديث الرصيد' : 'Balance updated',
        description: `+${booking.amount.toFixed(2)} ${balance.currency}`,
      })
    }

    setBookings(bookings.map(b => 
      b.id === bookingId ? { ...b, accepted: true } : b
    ))
    
    toast({
      title: language === 'ru' ? 'Успешно' : language === 'fr' ? 'Succès' : language === 'ar' ? 'نجاح' : 'Success',
      description: t.acceptBooking,
    })
  }

  const handleScanQR = () => {
    const unscannedPassengers = queuePassengers.filter(p => !p.scanned)
    if (unscannedPassengers.length === 0) {
      toast({
        title: language === 'ru' ? 'Очередь пуста' : language === 'fr' ? 'File vide' : language === 'ar' ? 'الطابور فارغ' : 'Queue empty',
        description: language === 'ru' ? 'Все пассажиры отсканированы' : language === 'fr' ? 'Tous scannés' : language === 'ar' ? 'تم مسح الجميع' : 'All scanned',
      })
      return
    }

    const randomIndex = Math.floor(Math.random() * unscannedPassengers.length)
    const scannedPassenger = unscannedPassengers[randomIndex]

    const mockAmount = 300 + Math.floor(Math.random() * 200)
    const mockRecipient = language === 'ru' ? 'Водитель Иванов И.И.' : language === 'fr' ? 'Chauffeur Ivanov' : language === 'ar' ? 'السائق إيفانوف' : 'Driver Ivanov I.'
    const mockCreatedAt = new Date(Date.now() - Math.floor(Math.random() * 3600000)).toLocaleString(
      language === 'ru' ? 'ru-RU' : language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-SA' : 'en-US'
    )

    setQueuePassengers(queuePassengers.map(p => 
      p.id === scannedPassenger.id ? { ...p, scanned: true } : p
    ))

    setQrScannedData({
      amount: mockAmount,
      recipient: mockRecipient,
      createdAt: mockCreatedAt
    })

    if (balance) {
      setBalance({
        ...balance,
        balance: balance.balance + mockAmount,
      })
    }

    toast({
      title: language === 'ru' ? 'QR отсканирован' : language === 'fr' ? 'QR scanné' : language === 'ar' ? 'تم مسح QR' : 'QR scanned',
      description: `${scannedPassenger.name} - ${mockAmount} ${balance?.currency || 'RUB'}`,
    })
  }

  const handleOpenCashQR = () => {
    const mockAmount = 300 + Math.floor(Math.random() * 200)
    setCurrentCashAmount(mockAmount)
    setShowCashQRDialog(true)
  }

  const handleConfirmQR = () => {
    const unscannedPassengers = queuePassengers.filter(p => !p.scanned)
    if (unscannedPassengers.length === 0) {
      toast({
        title: language === 'ru' ? 'Очередь пуста' : language === 'fr' ? 'File vide' : language === 'ar' ? 'الطابور فارغ' : 'Queue empty',
        description: language === 'ru' ? 'Все пассажиры отсканированы' : language === 'fr' ? 'Tous scannés' : language === 'ar' ? 'تم مسح الجميع' : 'All scanned',
      })
      return
    }

    const randomIndex = Math.floor(Math.random() * unscannedPassengers.length)
    const scannedPassenger = unscannedPassengers[randomIndex]

    const mockRecipient = language === 'ru' ? 'Водитель Иванов И.И.' : language === 'fr' ? 'Chauffeur Ivanov' : language === 'ar' ? 'السائق إيفانوف' : 'Driver Ivanov I.'
    const mockCreatedAt = new Date(Date.now() - Math.floor(Math.random() * 3600000)).toLocaleString(
      language === 'ru' ? 'ru-RU' : language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-SA' : 'en-US'
    )

    setQueuePassengers(queuePassengers.map(p => 
      p.id === scannedPassenger.id ? { ...p, scanned: true } : p
    ))

    setQrScannedData({
      amount: currentCashAmount,
      recipient: mockRecipient,
      createdAt: mockCreatedAt,
      scannedPassengerId: scannedPassenger.id
    })

    if (balance) {
      setBalance({
        ...balance,
        balance: balance.balance + currentCashAmount,
      })
    }

    toast({
      title: language === 'ru' ? 'QR отсканирован' : language === 'fr' ? 'QR scanné' : language === 'ar' ? 'تم مسح QR' : 'QR scanned',
      description: `${scannedPassenger.name} - ${currentCashAmount} ${balance?.currency || 'RUB'}`,
    })
  }

  useEffect(() => {
    const currentRoute = tripRoutes[selectedTrip as keyof typeof tripRoutes]
    if (currentRoute) {
      setStops(currentRoute.stops)
    }
  }, [selectedTrip])

  useEffect(() => {
    const currentRoute = tripRoutes[selectedTrip as keyof typeof tripRoutes]
    if (currentRoute) {
      setStops(currentRoute.stops)
    }
  }, [language, selectedTrip])

  useEffect(() => {
    const actualOccupied = seats.filter(s => s.status === 'occupied').length
    setManualOccupied(actualOccupied)
  }, [seats])

  if (!isAuthenticated) {
    return <LoginForm onLogin={() => setIsAuthenticated(true)} language={language} />
  }

  const occupiedCount = manualOccupied
  const freeCount = 6 - occupiedCount

  const currentRoute = tripRoutes[selectedTrip as keyof typeof tripRoutes]

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="bg-card border-b border-border px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <Select value={selectedTrip} onValueChange={setSelectedTrip}>
              <SelectTrigger className="w-48 h-10">
                <SelectValue placeholder={t.selectTrip} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="247">{t.tripNumber}247</SelectItem>
                <SelectItem value="248">{t.tripNumber}248</SelectItem>
                <SelectItem value="249">{t.tripNumber}249</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              {currentRoute.start} → {currentRoute.end}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/balance">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
              >
                <Wallet className="h-5 w-5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={cycleLanguage}
              className="h-9 w-9"
            >
              <Languages className="h-5 w-5" />
            </Button>
            <Badge 
              variant={tripStatus !== 'inactive' ? "default" : "secondary"}
              className="text-sm px-3 py-1"
            >
              {tripStatus !== 'inactive' ? `● ${t.active}` : `○ ${t.inactive}`}
            </Badge>
          </div>
        </div>

        <Button
          onClick={handleTripButton}
          size="lg"
          className="w-full h-14 text-lg font-semibold"
          variant={tripStatus === 'active' ? "destructive" : "default"}
        >
          {tripStatus === 'inactive' && <PlayCircle className="mr-2 h-6 w-6" />}
          {tripStatus === 'active' && <StopCircle className="mr-2 h-6 w-6" />}
          {getTripButtonText()}
        </Button>
      </div>

      <div className="px-4 pt-6 space-y-6">
        <Card className="p-4 border-2 border-border">
          <h2 className="text-lg font-bold text-foreground mb-4">{t.occupancy}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-secondary">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => setManualOccupied(Math.max(0, manualOccupied - 1))}
                  disabled={manualOccupied === 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="text-3xl font-bold text-primary">{occupiedCount}</div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => setManualOccupied(Math.min(6, manualOccupied + 1))}
                  disabled={manualOccupied === 6}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">{t.occupied}</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary">
              <div className="text-3xl font-bold text-accent">{freeCount}</div>
              <div className="text-sm text-muted-foreground mt-1">{t.free}</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary">
              <div className="text-3xl font-bold text-foreground">6</div>
              <div className="text-sm text-muted-foreground mt-1">{t.total}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">{t.queue}</h2>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {queuePassengers.length}
            </Badge>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-4">
            {queuePassengers.slice(0, 4).map((passenger) => (
              <div
                key={passenger.id}
                className={`h-20 flex flex-col items-center justify-center p-2 rounded-md border-2 ${
                  passenger.scanned 
                    ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-600' 
                    : passenger.isFirst 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-secondary border-border'
                }`}
              >
                <User className="h-6 w-6 mb-1" />
                <span className="text-xs font-bold">{passenger.queuePosition}</span>
              </div>
            ))}
            {queuePassengers.length >= 5 && (
              <div
                key={queuePassengers[4].id}
                className={`h-20 flex flex-col items-center justify-center p-2 rounded-md border-2 border-dashed ${
                  queuePassengers[4].scanned 
                    ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-600' 
                    : 'bg-secondary border-border'
                }`}
              >
                <User className="h-6 w-6 mb-1" />
                <span className="text-xs font-bold">{queuePassengers[4].queuePosition}</span>
              </div>
            )}
          </div>

          {qrScannedData && (
            <Card className="p-3 mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t.paymentAmount}:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {qrScannedData.amount} {balance?.currency || 'RUB'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t.recipientInfo}:</span>
                  <span className="font-semibold">{qrScannedData.recipient}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t.qrCreatedAt}:</span>
                  <span className="font-semibold text-xs">{qrScannedData.createdAt}</span>
                </div>
              </div>
            </Card>
          )}

          <Button
            onClick={handleOpenCashQR}
            className="w-full h-12"
            variant="default"
          >
            <Banknote className="mr-2 h-5 w-5" />
            {t.acceptCash}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center mt-3 leading-relaxed">
            {language === 'ru' 
              ? 'Первый в очереди садится сразу, остальным нужно подтверждение' 
              : language === 'fr'
              ? 'Le premier monte directement, les autres nécessitent confirmation'
              : language === 'ar'
              ? 'الأول يصعد مباشرة، الآخرون يحتاجون تأكيد'
              : 'First boards directly, others need confirmation'}
          </p>
        </Card>

        <Card className="p-4 border-2 border-border">
          <h2 className="text-lg font-bold text-foreground mb-4">{t.routeStops}</h2>
          <div className="space-y-1">
            {stops.map((stop, index) => {
              const stopBookings = bookings.filter(b => b.fromStopIndex === index && !b.accepted)
              const totalBookingsAtStop = bookings.filter(b => b.fromStopIndex === index).length
              
              if (totalBookingsAtStop === 0) {
                return null
              }

              return (
                <div key={stop.id}>
                  <div className="flex items-start gap-3 py-2">
                    <div className="w-4 h-4 rounded-full bg-primary flex-shrink-0 border-2 border-background shadow-sm mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-base text-foreground">{stop.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{stop.time}</span>
                          </div>
                        </div>
                        <Badge variant="default" className="ml-2">
                          {totalBookingsAtStop} {t.bookingsAtStop}
                        </Badge>
                      </div>

                      {stopBookings.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {stopBookings.map((booking) => (
                            <div key={booking.id} className="p-3 rounded-lg bg-secondary border border-border">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm text-foreground mb-1">
                                    {booking.passengerName}
                                  </h4>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {stops[booking.fromStopIndex].name} → {stops[booking.toStopIndex].name}
                                  </div>
                                </div>
                              </div>

                              <Button
                                onClick={() => handleAcceptBooking(booking.id)}
                                className="w-full h-9 text-sm font-semibold"
                                variant="default"
                                size="sm"
                              >
                                {t.acceptBooking}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {index < stops.length - 1 && (
                    <div className="ml-2">
                      <div className="w-px h-8 bg-border" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <CashQRDialog
        open={showCashQRDialog}
        onOpenChange={setShowCashQRDialog}
        driverName={language === 'ru' ? 'Водитель Иванов И.И.' : language === 'fr' ? 'Chauffeur Ivanov' : language === 'ar' ? 'السائق إيفانوف' : 'Driver Ivanov I.'}
        amount={currentCashAmount}
        currency={balance?.currency || 'RUB'}
        onConfirm={handleConfirmQR}
        language={language}
      />
    </div>
  )
}
