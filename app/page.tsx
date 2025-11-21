"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  PlayCircle,
  StopCircle,
  User,
  Clock,
  QrCode,
  Users,
  Minus,
  Plus,
  Wallet,
  LogOut,
  ArrowLeftRight,
  Undo2,
  X,
} from "lucide-react"
import { LoginForm } from "@/components/login-form"
import { RegisterForm } from "@/components/register-form"
import { translations, type Language } from "@/lib/translations"
import { CashQRDialog } from "@/components/cash-qr-dialog"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { formatCurrency, formatDateTime, generateTripId } from "@/lib/utils"

const STATE = {
  PREP_IDLE: "PREP_IDLE",
  PREP_TIMER: "PREP_TIMER",
  BOARDING: "BOARDING",
  ROUTE_READY: "ROUTE_READY",
  IN_ROUTE: "IN_ROUTE",
} as const

type TripStatus = (typeof STATE)[keyof typeof STATE]

interface Seat {
  id: number
  status: "free" | "occupied"
  passengerName?: string
  fromStop?: number
  toStop?: number
  paymentMethod?: "cash" | "qr"
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
  scanned?: boolean
  qrError?: string
  count: number
  showQRButtons?: boolean
  qrData?: {
    sum: number
    recipient: string
    created_at: string
  }
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
  count: number
  qrError?: string
}

const tripRoutes = {
  "247": {
    start: "Центр",
    end: "Вокзал",
    stops: [
      { id: 0, name: "Центр", time: "14:00" },
      { id: 1, name: "ул. Ленина", time: "14:15" },
      { id: 2, name: "ТЦ Галерея", time: "14:45" },
      { id: 3, name: "Вокзал", time: "15:15" },
    ],
  },
  "248": {
    start: "Аэропорт",
    end: "Университет",
    stops: [
      { id: 0, name: "Аэропорт", time: "10:00" },
      { id: 1, name: "пл. Революции", time: "10:20" },
      { id: 2, name: "пр. Победы", time: "10:40" },
      { id: 3, name: "Университет", time: "11:00" },
    ],
  },
  "249": {
    start: "Рынок",
    end: "Больница",
    stops: [
      { id: 0, name: "Рынок", time: "08:00" },
      { id: 1, name: "ул. Мира", time: "08:20" },
      { id: 2, name: "Парк", time: "08:40" },
      { id: 3, name: "Больница", time: "09:00" },
    ],
  },
}

export default function DriverDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [userStatus, setUserStatus] = useState<"pending" | "approved">("approved")
  const [language, setLanguage] = useState<Language>("ru")
  const t = translations[language]
  const { toast } = useToast()

  const [tripStatus, setTripStatus] = useState<TripStatus>(STATE.PREP_IDLE)
  const [tripId, setTripId] = useState<string>("")
  const [selectedTrip, setSelectedTrip] = useState("")
  const [isDirectionReversed, setIsDirectionReversed] = useState(false)

  const [prepareTimer, setPrepareTimer] = useState<number>(600)

  const [balance, setBalance] = useState(12450)
  const [showCashQRDialog, setShowCashQRDialog] = useState(false)
  const [currentCashAmount, setCurrentCashAmount] = useState(0)
  const [qrScannedData, setQrScannedData] = useState<{
    amount: number
    recipient: string
    createdAt: string
    scannedPassengerId?: number
  } | null>(null)

  const [stops, setStops] = useState<RouteStop[]>(tripRoutes["247"].stops)

  const [seats, setSeats] = useState<Seat[]>([
    {
      id: 1,
      status: "occupied",
      passengerName: "Иван П.",
      fromStop: 0,
      toStop: 3,
      paymentMethod: "qr",
      amountPaid: 450,
    },
    {
      id: 2,
      status: "occupied",
      passengerName: "Мария С.",
      fromStop: 0,
      toStop: 2,
      paymentMethod: "cash",
      amountPaid: 280,
    },
    { id: 3, status: "free" },
    { id: 4, status: "free" },
    {
      id: 5,
      status: "occupied",
      passengerName: "Алексей К.",
      fromStop: 0,
      toStop: 3,
      paymentMethod: "qr",
      amountPaid: 380,
    },
    { id: 6, status: "free" },
  ])

  const [bookings, setBookings] = useState<Booking[]>([
    {
      id: 1,
      passengerName: "Ольга В.",
      pickupTime: "14:15",
      pickupLocation: tripRoutes["247"].stops[1].name,
      fromStopIndex: 1,
      toStopIndex: 3,
      amount: 320,
      count: 1,
    },
    {
      id: 2,
      passengerName: "Дмитрий Н.",
      pickupTime: "14:15",
      pickupLocation: tripRoutes["247"].stops[1].name,
      fromStopIndex: 1,
      toStopIndex: 3,
      amount: 320,
      count: 2,
    },
    {
      id: 3,
      passengerName: "Елена Т.",
      pickupTime: "14:45",
      pickupLocation: tripRoutes["247"].stops[2].name,
      fromStopIndex: 2,
      toStopIndex: 3,
      amount: 180,
      count: 1,
    },
  ])

  const [queuePassengers, setQueuePassengers] = useState<QueuePassenger[]>([
    { id: 1, name: "Петр С.", queuePosition: 1, isFirst: true, count: 1 },
    { id: 2, name: "Анна М.", queuePosition: 2, isFirst: false, count: 2 },
    { id: 3, name: "Игорь Л.", queuePosition: 3, isFirst: false, count: 1 },
    { id: 4, name: "Ольга К.", queuePosition: 4, isFirst: false, count: 3 },
    { id: 5, name: "Сергей Д.", queuePosition: 5, isFirst: false, count: 1 },
  ])

  const [manualOccupied, setManualOccupied] = useState(0)
  const [tempBookingId, setTempBookingId] = useState<number | null>(null)
  const [scanningForQueue, setScanningForQueue] = useState(false)
  const [highlightedBookingId, setHighlightedBookingId] = useState<number | null>(null)
  const [currentQueueScanId, setCurrentQueueScanId] = useState<number | null>(null)

  useEffect(() => {
    const savedAuthState = localStorage.getItem("driverAuthenticated")
    if (savedAuthState === "true") {
      setIsAuthenticated(true)
    }
    const savedUserStatus = localStorage.getItem("userStatus")
    if (savedUserStatus) {
      setUserStatus(savedUserStatus as "pending" | "approved")
    }
  }, [])

  useEffect(() => {
    if (tripStatus === STATE.PREP_TIMER) {
      const interval = setInterval(() => {
        setPrepareTimer((prev) => prev - 1)
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [tripStatus])

  const cycleLanguage = () => {
    const languages: Language[] = ["ru", "en", "fr", "ar"]
    const currentIndex = languages.indexOf(language)
    const nextIndex = (currentIndex + 1) % languages.length
    setLanguage(languages[nextIndex])
  }

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
  }

  const clickStartPrep = () => {
    if (tripStatus !== STATE.PREP_IDLE) {
      console.error("[v0] Illegal transition: clickStartPrep from", tripStatus)
      return
    }
    const newTripId = generateTripId()
    setTripId(newTripId)
    setTripStatus(STATE.PREP_TIMER)
    setPrepareTimer(600)
  }

  const clickStartBoarding = () => {
    if (tripStatus !== STATE.PREP_TIMER) {
      console.error("[v0] Illegal transition: clickStartBoarding from", tripStatus)
      return
    }
    setTripStatus(STATE.BOARDING)
  }

  const clickReadyForRoute = () => {
    if (tripStatus !== STATE.BOARDING) {
      console.error("[v0] Illegal transition: clickReadyForRoute from", tripStatus)
      return
    }
    setTripStatus(STATE.ROUTE_READY)
  }

  const clickStartRoute = () => {
    if (tripStatus !== STATE.ROUTE_READY) {
      console.error("[v0] Illegal transition: clickStartRoute from", tripStatus)
      return
    }
    setTripStatus(STATE.IN_ROUTE)
  }

  const clickFinish = () => {
    if (tripStatus !== STATE.IN_ROUTE) {
      console.error("[v0] Illegal transition: clickFinish from", tripStatus)
      return
    }
    // Cleanup
    setPrepareTimer(600)
    setTripId("")
    setIsDirectionReversed(false)
    setTripStatus(STATE.PREP_IDLE)
  }

  const getTripButtonText = () => {
    if (tripStatus === STATE.PREP_IDLE) return t.prepareTrip // "Подготовка рейса"
    if (tripStatus === STATE.PREP_TIMER) {
      return `${t.prepareTrip}  ${formatTimer(prepareTimer)}` // "Подготовка рейса 10:00"
    }
    if (tripStatus === STATE.BOARDING) return t.startBoarding // "Начать посадку"
    if (tripStatus === STATE.ROUTE_READY) return t.startTrip // "Начать рейс"
    return "" // IN_ROUTE shows separate finish button
  }

  const getTripStatusEmoji = () => {
    if (tripStatus === STATE.IN_ROUTE) return "🚌"
    if (tripStatus === STATE.ROUTE_READY) return "🚦"
    if (tripStatus === STATE.BOARDING) return "👥"
    if (tripStatus === STATE.PREP_TIMER) return "⏱️"
    return "⏸️"
  }

  const formatTimer = (seconds: number) => {
    const isNegative = seconds < 0
    const absSeconds = Math.abs(seconds)
    const mins = Math.floor(absSeconds / 60)
    const secs = absSeconds % 60
    const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    return isNegative ? `-${timeStr}` : timeStr
  }

  const handleTripButton = () => {
    if (tripStatus === STATE.PREP_IDLE) {
      clickStartPrep()
    } else if (tripStatus === STATE.PREP_TIMER) {
      clickStartBoarding()
    } else if (tripStatus === STATE.BOARDING) {
      clickReadyForRoute()
    } else if (tripStatus === STATE.ROUTE_READY) {
      clickStartRoute()
    }
  }

  const handleAcceptBooking = (bookingId: number) => {
    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking) return

    if (booking.accepted && !booking.showQRButtons) {
      console.log("[v0] Opening QR scanner for booking:", bookingId)
      const mockAmount = booking.amount
      setCurrentCashAmount(mockAmount)
      setTempBookingId(bookingId)
      setScanningForQueue(false)
      setCurrentQueueScanId(null)
      setShowCashQRDialog(true)
    } else {
      setBookings(bookings.map((b) => (b.id === bookingId ? { ...b, accepted: true, qrError: undefined } : b)))

      toast({
        title: language === "ru" ? "Успешно" : language === "fr" ? "Succès" : language === "ar" ? "نجاح" : "Success",
        description:
          language === "ru" ? "Бронь принята. Теперь можно сканировать QR." : "Booking accepted. Now scan QR.",
      })
    }
  }

  const handleAcceptBookingQR = (bookingId: number) => {
    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking || !booking.qrData) return

    console.log("[v0] accept:clicked", {
      bookingId: bookingId,
      amount: booking.amount,
      timestamp: new Date().toISOString(),
    })

    const bookingCount = booking.count || 1
    // Find available seats and mark them as occupied
    let seatsToOccupy = bookingCount
    const updatedSeats = [...seats]

    for (let i = 0; i < updatedSeats.length && seatsToOccupy > 0; i++) {
      if (updatedSeats[i].status === "free") {
        updatedSeats[i] = {
          ...updatedSeats[i],
          status: "occupied",
          passengerName: booking.passengerName,
          fromStop: booking.fromStopIndex,
          toStop: booking.toStopIndex,
          paymentMethod: "qr",
          amountPaid: booking.amount / bookingCount,
        }
        seatsToOccupy--
      }
    }

    setSeats(updatedSeats)
    setBookings(bookings.filter((b) => b.id !== bookingId))
    setBalance(balance + booking.amount)

    toast({
      title: language === "ru" ? "Бронь принята" : "Booking accepted",
      description: `${booking.passengerName} - ${formatCurrency(booking.amount)} RUB`,
    })
  }

  const handleRejectBookingQR = (bookingId: number) => {
    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking) return

    console.log("[v0] reject:clicked", {
      bookingId: bookingId,
      reason: "driver_rejected_valid_qr",
      timestamp: new Date().toISOString(),
    })

    setBookings(bookings.filter((b) => b.id !== bookingId))

    toast({
      title: language === "ru" ? "Бронь отклонена" : "Booking rejected",
      description: booking.passengerName,
      variant: "destructive",
    })
  }

  const handleRevertBookingQR = (bookingId: number) => {
    console.log("[v0] Reverting booking QR:", bookingId)
    setBookings(bookings.map((b) => (b.id === bookingId ? { ...b, showQRButtons: false, qrData: undefined } : b)))
  }

  const handleConfirmQR = () => {
    if (tempBookingId !== null && tempBookingId !== undefined) {
      const booking = bookings.find((b) => b.id === tempBookingId)
      if (!booking) return

      console.log("[v0] scan:result", {
        bookingId: tempBookingId,
        stopId: booking.fromStopIndex,
        match: true,
        timestamp: new Date().toISOString(),
      })

      const mockQRData = {
        sum: booking.amount,
        recipient: language === "ru" ? "Водитель Иванов И.И." : "Driver Ivanov I.",
        created_at: formatDateTime(new Date(Date.now() - Math.floor(Math.random() * 3600000))),
      }

      setBookings(
        bookings.map((b) =>
          b.id === booking.id
            ? {
                ...b,
                showQRButtons: true,
                qrData: mockQRData,
                qrError: undefined,
              }
            : b,
        ),
      )

      toast({
        title: language === "ru" ? "QR отсканирован" : "QR scanned",
        description: language === "ru" ? "Нажмите Принять или Отклонить" : "Press Accept or Reject",
      })

      setTempBookingId(null)
      setHighlightedBookingId(null)
    } else if (scanningForQueue || currentQueueScanId !== null) {
      const passenger = queuePassengers.find((p) => p.id === currentQueueScanId)
      if (!passenger) return

      console.log("[v0] scan:result", {
        passengerId: currentQueueScanId,
        match: true,
        timestamp: new Date().toISOString(),
      })

      setQueuePassengers(queuePassengers.map((p) => (p.id === currentQueueScanId ? { ...p, scanned: true } : p)))

      const mockRecipient = language === "ru" ? "Водитель Иванов И.И." : "Driver Ivanov I."
      const mockCreatedAt = formatDateTime(new Date(Date.now() - Math.floor(Math.random() * 3600000)))
      const mockAmount = currentCashAmount

      setQrScannedData({
        amount: mockAmount,
        recipient: mockRecipient,
        createdAt: mockCreatedAt,
        scannedPassengerId: currentQueueScanId,
      })

      toast({
        title: language === "ru" ? "QR отсканирован" : "QR scanned",
        description: `${passenger.name}`,
      })

      setCurrentQueueScanId(null)
      setScanningForQueue(false)
    }
  }

  const handleInvalidQR = () => {
    if (tempBookingId !== null && tempBookingId !== undefined) {
      console.log("[v0] scan:result", {
        bookingId: tempBookingId,
        match: false,
        reason: "QR mismatch",
        timestamp: new Date().toISOString(),
      })
    } else if (scanningForQueue || currentQueueScanId !== null) {
      console.log("[v0] scan:result", {
        passengerId: currentQueueScanId,
        match: false,
        reason: "QR mismatch",
        timestamp: new Date().toISOString(),
      })
    }
  }

  const handleQRNotFoundForBooking = () => {
    if (tempBookingId === null && currentQueueScanId === null) return

    if (tempBookingId !== null) {
      console.log("[v0] qr:not_found_clicked", { bookingId: tempBookingId, timestamp: new Date().toISOString() })
      const mismatchType = language === "ru" ? "QR не найден" : "QR not found"

      const currentBooking = bookings.find((b) => b.id === tempBookingId)
      if (!currentBooking) return

      setBookings(
        bookings.map((b) =>
          b.id === tempBookingId
            ? {
                ...b,
                qrError: mismatchType,
                showQRButtons: false,
              }
            : b,
        ),
      )

      // Find next available booking at same stop but don't auto-scan
      const stopBookings = bookings.filter(
        (b) => b.fromStopIndex === currentBooking.fromStopIndex && b.id !== tempBookingId && !b.accepted && !b.qrError,
      )

      if (stopBookings.length > 0) {
        const nextBooking = stopBookings[0]
        setHighlightedBookingId(nextBooking.id)
        console.log("[v0] Highlighting next booking:", nextBooking.id)

        toast({
          title: language === "ru" ? "QR не найден" : "QR not found",
          description:
            language === "ru"
              ? `Следующая бронь: ${nextBooking.passengerName}`
              : `Next booking: ${nextBooking.passengerName}`,
          variant: "destructive",
        })
      } else {
        toast({
          title: language === "ru" ? "QR не найден" : "QR not found",
          description: language === "ru" ? "Нет других бронирований" : "No other bookings",
          variant: "destructive",
        })
      }

      // Close modal and clear temp state
      setShowCashQRDialog(false)
      setTempBookingId(null)
    } else if (currentQueueScanId !== null) {
      console.log("[v0] qr:not_found_clicked", { passengerId: currentQueueScanId, timestamp: new Date().toISOString() })

      const currentPassenger = queuePassengers.find((p) => p.id === currentQueueScanId)
      if (!currentPassenger) return

      setQueuePassengers(
        queuePassengers.map((p) =>
          p.id === currentQueueScanId
            ? {
                ...p,
                qrError: language === "ru" ? "QR не найден" : "QR not found",
              }
            : p,
        ),
      )

      toast({
        title: language === "ru" ? "QR не найден" : "QR not found",
        description: `${currentPassenger.name}`,
        variant: "destructive",
      })

      // Close modal and clear temp state
      setShowCashQRDialog(false)
      setCurrentQueueScanId(null)
      setScanningForQueue(false)
    }
  }

  const handleScanQueueQR = () => {
    console.log("[v0] Opening QR scanner for queue")

    const firstUnscannedPassenger = queuePassengers.find((p) => !p.scanned && !(p as any).qrError)
    if (!firstUnscannedPassenger) {
      toast({
        title: language === "ru" ? "Очередь пуста" : "Queue empty",
        description: language === "ru" ? "Все пассажиры обработаны" : "All processed",
      })
      return
    }

    const mockAmount = 300 + Math.floor(Math.random() * 200)
    setCurrentCashAmount(mockAmount)
    setCurrentQueueScanId(firstUnscannedPassenger.id)
    setScanningForQueue(true)
    setTempBookingId(null)
    setShowCashQRDialog(true)
  }

  const handleAcceptQueueQR = (passengerId: number) => {
    const passenger = queuePassengers.find((p) => p.id === passengerId)
    if (!passenger) return

    console.log("[v0] accept:clicked", {
      passengerId: passengerId,
      count: passenger.count,
      timestamp: new Date().toISOString(),
    })

    const passengerCount = passenger.count || 1
    let seatsToOccupy = passengerCount
    const updatedSeats = [...seats]

    for (let i = 0; i < updatedSeats.length && seatsToOccupy > 0; i++) {
      if (updatedSeats[i].status === "free") {
        updatedSeats[i] = {
          ...updatedSeats[i],
          status: "occupied",
          passengerName: passenger.name,
          paymentMethod: "qr",
        }
        seatsToOccupy--
      }
    }

    setSeats(updatedSeats)
    setQueuePassengers(queuePassengers.filter((p) => p.id !== passengerId))
    setQrScannedData(null)

    toast({
      title: language === "ru" ? "Пассажир принят" : "Passenger accepted",
      description: `${passenger.name}`,
    })
  }

  const handleRejectQueueQR = (passengerId: number) => {
    const passenger = queuePassengers.find((p) => p.id === passengerId)
    if (!passenger) return

    console.log("[v0] reject:clicked", {
      passengerId: passengerId,
      reason: "driver_rejected_valid_qr",
      timestamp: new Date().toISOString(),
    })

    setQueuePassengers(queuePassengers.filter((p) => p.id !== passengerId))
    setQrScannedData(null)

    toast({
      title: language === "ru" ? "Пассажир отклонён" : "Passenger rejected",
      description: passenger.name,
      variant: "destructive",
    })
  }

  const handleQRScanError = () => {
    toast({
      title: t.scanError,
      description: t.invalidQR,
      variant: "destructive",
    })
  }

  const handleLogout = () => {
    localStorage.removeItem("driverAuthenticated")
    localStorage.removeItem("userStatus")
    setIsAuthenticated(false)
    setUserStatus("approved") // Reset to default
    setTripStatus(STATE.PREP_IDLE)
    setTripId("")
  }

  const handleToggleDirection = () => {
    setIsDirectionReversed(!isDirectionReversed)
    setStops([...stops].reverse())
  }

  const handleRejectQRNotFoundBooking = (bookingId: number) => {
    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking) return

    console.log("[v0] reject:clicked", {
      bookingId: bookingId,
      reason: "qr_not_found",
      timestamp: new Date().toISOString(),
    })

    const currentBooking = bookings.find((b) => b.id === bookingId)
    if (currentBooking) {
      const stopBookings = bookings.filter(
        (b) => b.fromStopIndex === currentBooking.fromStopIndex && b.id !== bookingId && !b.accepted && !b.qrError,
      )

      if (stopBookings.length > 0 && highlightedBookingId) {
        const nextBooking = stopBookings.find((b) => b.id === highlightedBookingId)
        if (nextBooking) {
          console.log("[v0] Opening scanner for highlighted booking:", nextBooking.id)

          // Remove rejected booking
          setBookings(bookings.filter((b) => b.id !== bookingId))

          // Open scanner for highlighted booking
          setTimeout(() => {
            setTempBookingId(nextBooking.id)
            setScanningForQueue(false)
            setCurrentQueueScanId(null)
            setShowCashQRDialog(true)
          }, 300)

          return
        }
      }
    }

    // If no highlighted booking, just remove the rejected one
    setBookings(bookings.filter((b) => b.id !== bookingId))
    setHighlightedBookingId(null)

    toast({
      title: language === "ru" ? "Бронь отклонена" : "Booking rejected",
      description: booking.passengerName,
      variant: "destructive",
    })
  }

  const handleRejectQueuePassenger = (passengerId: number) => {
    const passenger = queuePassengers.find((p) => p.id === passengerId)
    if (!passenger) return

    console.log("[v0] Rejecting queue passenger with QR error:", passengerId)

    // Find next unprocessed passenger
    const nextPassenger = queuePassengers.find((p) => p.id !== passengerId && !p.scanned && !(p as any).qrError)

    // Remove rejected passenger
    setQueuePassengers(queuePassengers.filter((p) => p.id !== passengerId))

    if (nextPassenger) {
      console.log("[v0] Opening scanner for next queue passenger:", nextPassenger.id)

      toast({
        title: language === "ru" ? "Пассажир отклонён" : "Passenger rejected",
        description: language === "ru" ? `Следующий: ${nextPassenger.name}` : `Next: ${nextPassenger.name}`,
      })

      // Open scanner for next passenger
      setTimeout(() => {
        setCurrentQueueScanId(nextPassenger.id)
        setScanningForQueue(true)
        setTempBookingId(null)
        setShowCashQRDialog(true)
      }, 300)
    } else {
      toast({
        title: language === "ru" ? "Пассажир отклонён" : "Passenger rejected",
        description: passenger.name,
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (!selectedTrip) return
    const currentRoute = tripRoutes[selectedTrip as keyof typeof tripRoutes]
    if (currentRoute) {
      setStops(isDirectionReversed ? [...currentRoute.stops].reverse() : currentRoute.stops)
    }
  }, [selectedTrip, isDirectionReversed])

  useEffect(() => {
    const actualOccupied = seats.filter((s) => s.status === "occupied").length
    setManualOccupied(actualOccupied)
  }, [seats])

  if (!isAuthenticated) {
    if (showRegister) {
      return (
        <RegisterForm
          onRegister={() => {
            const isTestUser = false // Mock: new users are pending by default
            setUserStatus(isTestUser ? "approved" : "pending")
            setShowRegister(false)
            setIsAuthenticated(true)
            localStorage.setItem("driverAuthenticated", "true")
            localStorage.setItem("userStatus", isTestUser ? "approved" : "pending")
          }}
          onBackToLogin={() => setShowRegister(false)}
          language={language}
        />
      )
    }

    return (
      <LoginForm
        onLogin={() => {
          setIsAuthenticated(true)
          localStorage.setItem("driverAuthenticated", "true")
          // Test account is always approved
          setUserStatus("approved")
          localStorage.setItem("userStatus", "approved")
        }}
        onRegister={() => setShowRegister(true)}
        language={language}
        onLanguageChange={handleLanguageChange}
      />
    )
  }

  const occupiedCount = manualOccupied
  const acceptedBookingsCount = bookings.filter((b) => b.accepted).reduce((sum, b) => sum + (b.count || 1), 0)
  const freeCount = 6 - occupiedCount - acceptedBookingsCount
  const pendingBookingsCount = bookings.filter((b) => !b.accepted).reduce((sum, b) => sum + (b.count || 1), 0)

  const getRouteDisplayName = () => {
    if (!selectedTrip) return t.selectTrip
    const route = tripRoutes[selectedTrip as keyof typeof tripRoutes]
    if (isDirectionReversed) {
      return `${route.end} → ${route.start}`
    }
    return `${route.start} → ${route.end}`
  }

  const renderPassengerIcons = (count: number) => {
    const iconCount = Math.min(count, 3)
    return Array(iconCount)
      .fill(0)
      .map((_, i) => <User key={i} className="h-4 w-4" />)
  }

  const isRouteDropdownDisabled = tripStatus !== STATE.PREP_IDLE
  const showToggleDirection = tripStatus === STATE.PREP_IDLE && selectedTrip

  const isPanelsDisabled = tripStatus !== STATE.PREP_IDLE && !selectedTrip
  const showMainButton = selectedTrip || tripStatus === STATE.PREP_IDLE

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="bg-card border-b border-border px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Select
              value={selectedTrip}
              onValueChange={(value) => {
                setSelectedTrip(value)
                setIsDirectionReversed(false)
              }}
              disabled={isRouteDropdownDisabled}
            >
              <SelectTrigger
                className={`${isRouteDropdownDisabled || (selectedTrip && tripStatus === STATE.PREP_IDLE) ? "w-auto min-w-40 max-w-full" : "w-auto min-w-48 max-w-full"} h-auto min-h-10 ${
                  isRouteDropdownDisabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <SelectValue placeholder={t.selectTrip}>
                  <span className="whitespace-normal leading-tight break-words">
                    {selectedTrip && getRouteDisplayName()}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="247">
                  {tripRoutes["247"].start} → {tripRoutes["247"].end}
                </SelectItem>
                <SelectItem value="248">
                  {tripRoutes["248"].start} → {tripRoutes["248"].end}
                </SelectItem>
                <SelectItem value="249">
                  {tripRoutes["249"].start} → {tripRoutes["249"].end}
                </SelectItem>
              </SelectContent>
            </Select>

            {showToggleDirection && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleToggleDirection}
                className="h-10 w-10 flex-shrink-0 bg-transparent"
                title={language === "ru" ? "Изменить направление" : "Toggle direction"}
              >
                <ArrowLeftRight className="h-5 w-5" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={tripStatus !== STATE.PREP_IDLE ? "default" : "secondary"} className="text-2xl px-3 py-1">
              {getTripStatusEmoji()}
            </Badge>
            <Link href="/balance">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Wallet className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {tripId && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground">
              {t.tripId}: {tripId}
            </p>
          </div>
        )}

        {userStatus === "approved" && showMainButton && tripStatus !== STATE.IN_ROUTE && (
          <Button
            onClick={handleTripButton}
            size="lg"
            className="w-full h-14 text-lg font-semibold"
            variant="default"
            disabled={!selectedTrip}
          >
            {tripStatus === STATE.PREP_IDLE && <PlayCircle className="mr-2 h-6 w-6" />}
            {getTripButtonText()}
          </Button>
        )}

        {userStatus === "approved" && tripStatus === STATE.IN_ROUTE && (
          <Button onClick={clickFinish} size="lg" className="w-full h-14 text-lg font-semibold" variant="destructive">
            <StopCircle className="mr-2 h-6 w-6" />
            {t.finishTrip}
          </Button>
        )}
      </div>

      <div className="px-4 pt-6 space-y-6">
        {userStatus === "pending" && (
          <Card className="p-6 border-2 border-orange-500/50 bg-orange-50 dark:bg-orange-900/20">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary" className="text-2xl px-3 py-1">
                ⏳
              </Badge>
              <div className="flex-1">
                <p className="text-sm text-foreground leading-relaxed">{t.awaitingApproval}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent"
              onClick={() => {
                // Mock refresh - in real app would check server
                toast({
                  title: language === "ru" ? "Статус проверен" : "Status checked",
                  description: language === "ru" ? "Ожидание подтверждения" : "Awaiting approval",
                })
              }}
            >
              {t.refreshStatus}
            </Button>
          </Card>
        )}

        <Card className="p-4 border-2 border-border">
          <h2 className="text-lg font-bold text-foreground mb-4">{t.seats}</h2>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-4 rounded-lg bg-secondary">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 bg-transparent"
                  onClick={() => setManualOccupied(Math.max(0, manualOccupied - 1))}
                  disabled={manualOccupied === 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="text-2xl font-bold text-primary">{occupiedCount}</div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 bg-transparent"
                  onClick={() => setManualOccupied(Math.min(6, manualOccupied + 1))}
                  disabled={manualOccupied === 6}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">{t.occupied}</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary">
              <div className="text-2xl font-bold text-blue-600">
                {acceptedBookingsCount}:{pendingBookingsCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{t.bookingsShort}</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary">
              <div className="text-2xl font-bold text-accent">{freeCount}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.free}</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary">
              <div className="text-2xl font-bold text-foreground">6</div>
              <div className="text-xs text-muted-foreground mt-1">{t.total}</div>
            </div>
          </div>
        </Card>

        {userStatus === "approved" && tripStatus !== STATE.IN_ROUTE && (
          <Card className={`p-4 border-2 border-border ${isPanelsDisabled ? "opacity-50 pointer-events-none" : ""}`}>
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
                    (passenger as any).qrError
                      ? "bg-red-100 border-red-500 dark:bg-red-900/30 dark:border-red-600"
                      : passenger.scanned
                        ? "bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-600"
                        : passenger.isFirst
                          ? "bg-primary/10 border-primary"
                          : "bg-secondary border-border"
                  }`}
                >
                  {(passenger as any).qrError && (
                    <Button
                      onClick={() => handleRejectQueuePassenger(passenger.id)}
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 p-0 mb-1"
                      title={t.reject}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                  {!(passenger as any).qrError && (
                    <div className="flex items-center gap-0.5 mb-1">{renderPassengerIcons(passenger.count)}</div>
                  )}
                  <span className="text-xs font-bold">
                    {passenger.queuePosition} • {passenger.count}
                  </span>
                </div>
              ))}
              {queuePassengers.length >= 5 && (
                <div
                  key={queuePassengers[4].id}
                  className={`h-20 flex flex-col items-center justify-center p-2 rounded-md border-2 border-dashed ${
                    (queuePassengers[4] as any).qrError
                      ? "bg-red-100 border-red-500 dark:bg-red-900/30 dark:border-red-600"
                      : queuePassengers[4].scanned
                        ? "bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-600"
                        : "bg-secondary border-border"
                  }`}
                >
                  {(queuePassengers[4] as any).qrError && (
                    <Button
                      onClick={() => handleRejectQueuePassenger(queuePassengers[4].id)}
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 p-0 mb-1"
                      title={t.reject}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                  {!(queuePassengers[4] as any).qrError && (
                    <div className="flex items-center gap-0.5 mb-1">
                      {renderPassengerIcons(queuePassengers[4].count)}
                    </div>
                  )}
                  <span className="text-xs font-bold">
                    {queuePassengers[4].queuePosition} • {queuePassengers[4].count}
                  </span>
                </div>
              )}
            </div>

            {qrScannedData && (
              <div>
                <div className="mb-3 p-3 rounded-lg bg-secondary border border-border">
                  <p className="text-sm font-semibold text-foreground">
                    {t.sumLabel}: {formatCurrency(qrScannedData.amount)} RUB
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAcceptQueueQR(qrScannedData.scannedPassengerId!)}
                    className="flex-1 h-12"
                    variant="default"
                  >
                    {t.accept}
                  </Button>
                  <Button
                    onClick={() => handleRejectQueueQR(qrScannedData.scannedPassengerId!)}
                    className="flex-1 h-12"
                    variant="destructive"
                  >
                    {t.reject}
                  </Button>
                  <Button
                    onClick={() => setQrScannedData(null)}
                    className="h-12 w-12"
                    variant="outline"
                    size="icon"
                    title={language === "ru" ? "Вернуть" : "Revert"}
                  >
                    <Undo2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {!qrScannedData && (
              <Button onClick={handleScanQueueQR} className="w-full h-12" variant="default">
                <QrCode className="mr-2 h-5 w-5" />
                {t.scanQR}
              </Button>
            )}
          </Card>
        )}

        <Card className={`p-4 border-2 border-border ${isPanelsDisabled ? "opacity-50 pointer-events-none" : ""}`}>
          <h2 className="text-lg font-bold text-foreground mb-4">{t.stops}</h2>
          <div className="space-y-1">
            {stops.slice(1, -1).map((stop, index) => {
              const stopBookings = bookings.filter((b) => b.fromStopIndex === stop.id)
              const visibleBookings = stopBookings.filter((b) => !b.qrData || b.showQRButtons)

              return (
                <div key={stop.id}>
                  <div className="flex items-start gap-3 py-2">
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-semibold text-muted-foreground">{stop.time}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-base text-foreground">{stop.name}</h3>
                        </div>
                      </div>

                      {visibleBookings.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {visibleBookings.map((booking) => (
                            <div
                              key={booking.id}
                              className={`p-3 rounded-lg bg-secondary border ${
                                highlightedBookingId === booking.id
                                  ? "border-green-500 ring-2 ring-green-500/50 bg-green-50 dark:bg-green-900/20"
                                  : booking.qrError
                                    ? "border-red-500"
                                    : "border-border"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                  {booking.qrError && <X className="h-4 w-4 text-red-500" />}
                                  {booking.passengerName}
                                </h4>
                                <span className="text-xs text-muted-foreground font-semibold">
                                  {booking.count} {t.bookings}
                                </span>
                              </div>

                              {booking.qrError && (
                                <div className="space-y-2">
                                  <div className="p-2 rounded bg-destructive/10 border border-destructive/20">
                                    <p className="text-xs text-destructive">{booking.qrError}</p>
                                  </div>
                                  <Button
                                    onClick={() => handleRejectQRNotFoundBooking(booking.id)}
                                    className="w-full h-9 text-sm font-semibold"
                                    variant="destructive"
                                    size="sm"
                                  >
                                    {t.reject}
                                  </Button>
                                </div>
                              )}

                              {!booking.qrError && booking.showQRButtons && booking.qrData && (
                                <div>
                                  <div className="mb-3 p-2 rounded bg-secondary border border-border">
                                    <p className="text-xs font-semibold text-foreground">
                                      {t.sumLabel}: {formatCurrency(booking.qrData.sum)} RUB
                                    </p>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleAcceptBookingQR(booking.id)}
                                      className="flex-1 h-9 text-sm font-semibold"
                                      variant="default"
                                      size="sm"
                                    >
                                      {t.accept}
                                    </Button>
                                    <Button
                                      onClick={() => handleRejectBookingQR(booking.id)}
                                      className="flex-1 h-9 text-sm font-semibold"
                                      variant="destructive"
                                      size="sm"
                                    >
                                      {t.reject}
                                    </Button>
                                    <Button
                                      onClick={() => handleRevertBookingQR(booking.id)}
                                      className="h-9 w-9 text-sm font-semibold"
                                      variant="outline"
                                      size="icon"
                                      title={language === "ru" ? "Вернуть" : "Revert"}
                                    >
                                      <Undo2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {!booking.qrError && !booking.showQRButtons && (
                                <Button
                                  onClick={() => handleAcceptBooking(booking.id)}
                                  className="w-full h-9 text-sm font-semibold"
                                  variant={booking.accepted ? "outline" : "default"}
                                  size="sm"
                                >
                                  {booking.accepted ? (
                                    <>
                                      <QrCode className="mr-2 h-4 w-4" />
                                      {t.scanQR}
                                    </>
                                  ) : (
                                    t.acceptBooking
                                  )}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {index < stops.slice(1, -1).length - 1 && (
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
        driverName={language === "ru" ? "Водитель Иванов И.И." : "Driver Ivanov I."}
        amount={currentCashAmount}
        currency="RUB"
        onConfirm={handleConfirmQR}
        onInvalid={handleInvalidQR}
        language={language}
        showNotFoundButton={tempBookingId !== null || currentQueueScanId !== null}
        onQRNotFound={handleQRNotFoundForBooking}
      />
    </div>
  )
}
