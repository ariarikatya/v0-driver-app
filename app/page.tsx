"use client"

import { CardContent } from "@/components/ui/card"

import { CardTitle } from "@/components/ui/card"

import { CardHeader } from "@/components/ui/card"

import { useState, useEffect, useRef } from "react" // Added useRef
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Clock, QrCode, Users, Minus, Plus, Wallet, LogOut, ArrowLeftRight, Undo2, X } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import { RegisterForm } from "@/components/register-form"
import { translations, type Language } from "@/lib/translations"
import { CashQRDialog } from "@/components/cash-qr-dialog"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { formatCurrency, formatDateTime, generateTripId } from "@/lib/utils"
import { QueueQRScanner } from "@/components/queue-qr-scanner"
import { logFSMEvent } from "@/lib/fsm-types"
import { GeoTrackerIndicator } from "@/components/geo-tracker-indicator"

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
  passengerCount?: number // Added for return handler
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
  qrError?: boolean // Changed to boolean to match update logic
  showQRButtons?: boolean // Added this property
  qrData?: {
    // Added this property
    sum: number
    recipient: string
    created_at: string
  }
  ticketCount: number // Added for reverting seat occupancy
  orderNumber: number // Added for display in queue section
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
  const [userStatus, setUserStatus] = useState<"pending" | "approved" | "confirmed">("pending") // Changed to include confirmed
  const [language, setLanguage] = useState<Language>("ru")
  const t = translations[language]
  const { toast } = useToast()

  const [tripStatus, setTripStatus] = useState<TripStatus>(STATE.PREP_IDLE)
  const [tripId, setTripId] = useState<string>("")
  const [selectedTrip, setSelectedTrip] = useState("")
  const [isDirectionReversed, setIsDirectionReversed] = useState(false)
  const [isRouteDropdownDisabled, setIsRouteDropdownDisabled] = useState(false)

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
      passengerCount: 1, // Added
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
      passengerCount: 1, // Added
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
      passengerCount: 1, // Added
    },
  ])

  const [queuePassengers, setQueuePassengers] = useState<QueuePassenger[]>([
    { id: 1, name: "Петр С.", queuePosition: 1, isFirst: true, count: 1, ticketCount: 1, orderNumber: 1 },
    { id: 2, name: "Анна М.", queuePosition: 2, isFirst: false, count: 2, ticketCount: 2, orderNumber: 2 },
    { id: 3, name: "Игорь Л.", queuePosition: 3, isFirst: false, count: 1, ticketCount: 1, orderNumber: 3 },
    { id: 4, name: "Ольга К.", queuePosition: 4, isFirst: false, count: 3, ticketCount: 3, orderNumber: 4 },
    { id: 5, name: "Сергей Д.", queuePosition: 5, isFirst: false, count: 1, ticketCount: 1, orderNumber: 5 },
  ])

  const [manualOccupied, setManualOccupied] = useState(0)
  const [tempBookingId, setTempBookingId] = useState<number | null>(null)
  const [scanningForQueue, setScanningForQueue] = useState(false)
  const [highlightedBookingId, setHighlightedBookingId] = useState<number | null>(null)
  const [currentQueueScanId, setCurrentQueueScanId] = useState<number | null>(null)
  const [highlightedPassengerId, setHighlightedPassengerId] = useState<number | null>(null) // Added for queue passengers

  const [isScanningLocked, setIsScanningLocked] = useState(false)
  const [areSeatsLocked, setAreSeatsLocked] = useState(true) // Seats start locked
  const [isGeoTrackerActive, setIsGeoTrackerActive] = useState(false)

  const scanInProgressRef = useRef(false)

  useEffect(() => {
    const savedAuthState = localStorage.getItem("driverAuthenticated")
    if (savedAuthState === "true") {
      setIsAuthenticated(true)
    }
    const savedUserStatus = localStorage.getItem("userStatus")
    if (savedUserStatus) {
      setUserStatus(savedUserStatus as "pending" | "approved" | "confirmed")
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
  if (userStatus !== "confirmed") {
    console.log("[v0] ui:blocked", { action: "startPrep", reason: "accountUnconfirmed" })
    toast({
      title: t.error,
      description: language === "ru" ? "Аккаунт не подтвержден" : "Account not confirmed",
      variant: "destructive",
    })
    return
  }
  if (tripStatus !== STATE.PREP_IDLE) {
    console.error("[v0] Illegal transition: clickStartPrep from", tripStatus)
    return
  }
  // Геотрекер НЕ включаем в PREP_TIMER, включим позже
  setAreSeatsLocked(false)
  const newTripId = generateTripId()
  setTripId(newTripId)
  setTripStatus(STATE.PREP_TIMER)
  setPrepareTimer(600)
}
const clickCancelPrep = () => {
  if (tripStatus !== STATE.PREP_TIMER) {
    console.error("[v0] Illegal transition: clickCancelPrep from", tripStatus)
    return
  }
  setIsGeoTrackerActive(false)
  setAreSeatsLocked(true)
  setPrepareTimer(600)
  setTripId("")
  setTripStatus(STATE.PREP_IDLE)
  
  toast({
    title: language === "ru" ? "Отменено" : "Cancelled",
    description: language === "ru" ? "Подготовка рейса отменена" : "Trip preparation cancelled",
  })
}
  const clickStartBoarding = () => {
  if (tripStatus !== STATE.PREP_TIMER) {
    console.error("[v0] Illegal transition: clickStartBoarding from", tripStatus)
    return
  }
  setIsGeoTrackerActive(true) // 🟢 ВКЛЮЧАЕМ при переходе в BOARDING
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
    // Трекер уже включен в PREP_TIMER, здесь ничего не делаем.
    setTripStatus(STATE.IN_ROUTE)
  }

  const clickFinish = () => {
    if (tripStatus !== STATE.IN_ROUTE) {
      console.error("[v0] Illegal transition: clickFinish from", tripStatus)
      return
    }
    setIsGeoTrackerActive(false) // 🔴 ВЫКЛЮЧАЕМ при "Завершить рейс"
    setAreSeatsLocked(true)
    setPrepareTimer(600)
    setTripId("")
    setIsDirectionReversed(false)
    setTripStatus(STATE.PREP_IDLE)
    setSelectedTrip("")
  }

  const getTripButtonText = () => {
    if (tripStatus === STATE.PREP_IDLE) return t.prepareTrip // "Подготовка рейса"
    if (tripStatus === STATE.PREP_TIMER) {
      return `${t.prepareTrip}  ${formatTimer(prepareTimer)}` // "Подготовка рейса 10:00"
    }
    if (tripStatus === STATE.BOARDING) return t.startBoarding // "Начать посадку"
    if (tripStatus === STATE.ROUTE_READY) return t.startTrip // "Начать рейс"
    if (tripStatus === STATE.IN_ROUTE) return t.finishTrip // "Завершить рейс"
    return ""
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

  const handleOpenBookingScanner = (bookingId: number) => {
    if (areSeatsLocked) {
      // Check if seats are locked
      console.log("[v0] ui:blocked", { action: "openBookingScanner", reason: "seatsLocked" })
      toast({
        title: t.error,
        description: language === "ru" ? "Сначала начните подготовку рейса" : "Start trip preparation first",
        variant: "destructive",
      })
      return
    }

    if (isScanningLocked) {
      console.log("[v0] ui:blocked", { action: "openBookingScanner", reason: "scanningInProgress" })
      return
    }

    if (userStatus !== "confirmed") {
      console.log("[v0] ui:blocked", { action: "openBookingScanner", reason: "accountUnconfirmed" })
      toast({
        title: t.error,
        description: language === "ru" ? "Аккаунт не подтвержден" : "Account not confirmed",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] scan:start", { bookingId, timestamp: new Date().toISOString() }) // Changed log message
    setIsScanningLocked(true)
    setTempBookingId(bookingId)
    setScanningForQueue(false)
    setCurrentQueueScanId(null)
    setShowCashQRDialog(true)
    setTimeout(() => setIsScanningLocked(false), 300)
  }

  const handleReturnBooking = (bookingId: number) => {
    console.log("[v0] return:clicked", { bookingId, timestamp: new Date().toISOString() })

    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking) {
      console.log("[v0] return:error", { bookingId, reason: "booking_not_found" })
      return
    }

    setBookings(
      bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              showQRButtons: false,
              qrData: undefined,
              accepted: false,
              scanned: false, // Added: reset scanned status
            }
          : b,
      ),
    )

    const seatCountToRevert = booking.passengerCount || 1
    setManualOccupied((prev) => Math.max(0, prev - seatCountToRevert))

    console.log("[v0] return:success", {
      bookingId,
      seatCountReverted: seatCountToRevert,
      timestamp: new Date().toISOString(),
    })

    toast({
      title: language === "ru" ? "Возврат" : "Return",
      description: language === "ru" ? "Операция отменена" : "Operation canceled",
    })
  }

  const handleReturnQueuePassenger = (passengerId: number) => {
    console.log("[v0] return:clicked", { passengerId, timestamp: new Date().toISOString() })

    const passenger = queuePassengers.find((p) => p.id === passengerId)
    if (!passenger) {
      console.log("[v0] return:error", { passengerId, reason: "passenger_not_found" })
      return
    }

    setQueuePassengers(
      queuePassengers.map((p) =>
        p.id === passengerId
          ? {
              ...p,
              showQRButtons: false,
              qrData: undefined,
              scanned: false, // Added: reset scanned status
              qrError: undefined, // Added: reset qrError
            }
          : p,
      ),
    )

    const seatCountToRevert = passenger.ticketCount || 1
    setManualOccupied((prev) => Math.max(0, prev - seatCountToRevert))

    console.log("[v0] return:success", {
      passengerId,
      seatCountReverted: seatCountToRevert,
      timestamp: new Date().toISOString(),
    })

    toast({
      title: language === "ru" ? "Возврат" : "Return",
      description: language === "ru" ? "Операция отменена" : "Operation canceled",
    })
  }

  const handleAcceptBooking = (bookingId: number) => {
    console.log("[v0] accept:clicked", {
      bookingId,
      amount: bookings.find((b) => b.id === bookingId)?.amount,
      timestamp: new Date().toISOString(),
    })
    handleOpenBookingScanner(bookingId)
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

  const handleRevertPassengerQR = (passengerId: number) => {
    console.log("[v0] Reverting passenger QR:", passengerId)
    const passenger = queuePassengers.find((p) => p.id === passengerId)
    if (!passenger) return

    // Revert seat occupancy
    const seatsToFree = passenger.ticketCount
    setSeats((prevSeats) => {
      const occupiedSeats = prevSeats.filter((s) => s.status === "occupied" && s.passengerName === passenger.name)
      const seatsToUpdate = occupiedSeats.slice(0, seatsToFree)
      return prevSeats.map((seat) =>
        seatsToUpdate.find((s) => s.id === seat.id)
          ? {
              ...seat,
              status: "free" as const,
              passengerName: undefined,
              fromStop: undefined,
              toStop: undefined,
              paymentMethod: undefined,
              amountPaid: undefined,
            }
          : seat,
      )
    })

    // Reset passenger state
    setQueuePassengers(
      queuePassengers.map((p) => (p.id === passengerId ? { ...p, showQRButtons: false, qrData: undefined } : p)),
    )
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
          b.id === tempBookingId
            ? {
                ...b,
                showQRButtons: true,
                qrData: mockQRData,
                qrError: undefined,
                scanned: true, // Added: mark as scanned
              }
            : b,
        ),
      )

      setTimeout(() => {
        setShowCashQRDialog(false)
        setIsScanningLocked(false)
      }, 1500)
    } else if (scanningForQueue || currentQueueScanId !== null) {
      const passenger = queuePassengers.find((p) => p.id === currentQueueScanId)
      if (!passenger) return

      console.log("[v0] scan:result", {
        passengerId: currentQueueScanId,
        match: true,
        timestamp: new Date().toISOString(),
      })

      const mockQRData = {
        sum: passenger.ticketCount * 320,
        recipient: language === "ru" ? "Водитель Иванов И.И." : "Driver Ivanov I.",
        created_at: formatDateTime(new Date(Date.now() - Math.floor(Math.random() * 3600000))),
      }

      setQueuePassengers(
        queuePassengers.map((p) =>
          p.id === currentQueueScanId
            ? {
                ...p,
                showQRButtons: true,
                qrData: mockQRData,
                qrError: undefined,
                scanned: true, // Added: mark as scanned
              }
            : p,
        ),
      )

      setTimeout(() => {
        setShowCashQRDialog(false)
        setIsScanningLocked(false)
      }, 1500)
    }
  }

  const handleInvalidQR = () => {
    console.log("[v0] scan:error", {
      bookingId: tempBookingId || currentQueueScanId,
      error: "Invalid QR",
      timestamp: new Date().toISOString(),
    })
    // Added feedback for invalid QR
    toast({
      title: t.scanError,
      description: t.invalidQR,
      variant: "destructive",
    })
  }

  const handleQRNotFoundForBooking = () => {
    console.log("[v0] qr:not_found_clicked", {
      bookingId: tempBookingId || currentQueueScanId,
      timestamp: new Date().toISOString(),
    })

    if (tempBookingId !== null && tempBookingId !== undefined) {
      setBookings(
        bookings.map((b) =>
          b.id === tempBookingId
            ? {
                ...b,
                qrError: language === "ru" ? "QR не найден" : "QR not found", // Added error message
                showRejectButton: true,
              }
            : b,
        ),
      )
    } else if (currentQueueScanId !== null) {
      setQueuePassengers(
        queuePassengers.map((p) =>
          p.id === currentQueueScanId
            ? {
                ...p,
                qrError: language === "ru" ? "QR не найден" : "QR not found", // Added error message
                showRejectButton: true,
              }
            : p,
        ),
      )
    }

    setShowCashQRDialog(false)
    setIsScanningLocked(false)
  }

  // Added accept/reject for queue passengers after QR scan
  const handleAcceptQueueQR = (passengerId: number) => {
    const passenger = queuePassengers.find((p) => p.id === passengerId)
    if (!passenger || !passenger.qrData) return

    console.log("[v0] accept:clicked", {
      passengerId: passengerId,
      count: passenger.ticketCount,
      timestamp: new Date().toISOString(),
    })

    const passengerCount = passenger.ticketCount || 1
    setManualOccupied((prev) => prev + passengerCount)

    // Find available seats and mark them as occupied
    let seatsToOccupy = passengerCount
    const updatedSeats = [...seats]

    for (let i = 0; i < updatedSeats.length && seatsToOccupy > 0; i++) {
      if (updatedSeats[i].status === "free") {
        updatedSeats[i] = {
          ...updatedSeats[i],
          status: "occupied",
          passengerName: passenger.name,
          paymentMethod: "qr",
          fromStop: stops.findIndex((s) => s.id === 0), // Assuming start stop for queue passengers
          toStop: stops.length - 1, // Assuming end stop for queue passengers
        }
        seatsToOccupy--
      }
    }

    setSeats(updatedSeats)
    setQueuePassengers(queuePassengers.filter((p) => p.id !== passengerId))
    setQrScannedData(null) // Clear scanned data

    toast({
      title: language === "ru" ? "Пассажир принят" : "Passenger accepted",
      description: `${passenger.name}`,
    })
  }

  // Added reject for queue passengers after QR scan
  const handleRejectQueueQR = (passengerId: number) => {
    console.log("[v0] reject:clicked", {
      passengerId: passengerId,
      timestamp: new Date().toISOString(),
    })

    setQueuePassengers(queuePassengers.filter((p) => p.id !== passengerId))
    setQrScannedData(null)

    toast({
      title: language === "ru" ? "Пассажир отклонён" : "Passenger rejected",
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
    setUserStatus("pending") // Reset to default
    setTripStatus(STATE.PREP_IDLE)
    setTripId("")
    setSelectedTrip("")
    setAreSeatsLocked(true) // Lock seats on logout
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

  const handleSelectRoute = (tripNumber: string) => {
    if (userStatus !== "confirmed") {
      console.log("[v0] ui:blocked", { action: "selectRoute", reason: "accountUnconfirmed" })
      toast({
        title: t.error,
        description: language === "ru" ? "Аккаунт не подтвержден" : "Account not confirmed",
        variant: "destructive",
      })
      return
    }

    setSelectedTrip(tripNumber)
    const selectedRouteData = tripRoutes[tripNumber as keyof typeof tripRoutes] // Use tripRoutes directly
    if (selectedRouteData) {
      setStops(selectedRouteData.stops)
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
useEffect(() => {
  // Блокируем дропдаун с момента начала таймера до завершения рейса
  setIsRouteDropdownDisabled(tripStatus !== STATE.PREP_IDLE)
}, [tripStatus])
  const handleScanQueueQR = () => {
    if (areSeatsLocked) {
      console.log("[v0] ui:blocked", {
        action: "openQueueScanner",
        reason: "seatsLocked",
      })
      return
    }

    // Check if scan is already in progress to prevent duplicate events
    if (scanInProgressRef.current) {
      console.log("[v0] ui:blocked", {
        action: "openQueueScanner",
        reason: "scanAlreadyInProgress",
      })
      return
    }

    // Find the next unscanned passenger without error
    const nextPassenger = queuePassengers.find((p) => !p.scanned && !p.qrError)
    if (!nextPassenger) {
      toast({
        title: language === "ru" ? "Нет пассажиров для сканирования" : "No passengers to scan",
        description: language === "ru" ? "Все пассажиры в очереди обработаны" : "All passengers in queue processed",
      })
      return
    }

    setCurrentQueueScanId(nextPassenger.id)
    scanInProgressRef.current = true
    setIsScanningLocked(true)

    console.log("[v0] scan:start", {
      passengerId: nextPassenger.id,
      timestamp: new Date().toISOString(),
    })

    setShowCashQRDialog(true)
  }

  const handleQueuePassengerScan = (qrResult: {
    match: boolean
    ticketId?: string
    sum?: number
    recipient?: string
    created_at?: string
  }) => {
    if (!currentQueueScanId) {
      setIsScanningLocked(false)
      scanInProgressRef.current = false
      return
    }

    const passengerIndex = queuePassengers.findIndex((p) => p.id === currentQueueScanId)
    if (passengerIndex === -1) {
      setIsScanningLocked(false)
      scanInProgressRef.current = false
      return
    }

    const updatedPassengers = [...queuePassengers]
    const passenger = updatedPassengers[passengerIndex]

    if (qrResult.match) {
      console.log("[v0] scan:result", {
        passengerId: currentQueueScanId,
        match: true,
        ticketId: qrResult.ticketId,
        timestamp: new Date().toISOString(),
      })

      updatedPassengers[passengerIndex] = {
        ...passenger,
        scanned: true,
        qrError: false,
        qrData: {
          amount: qrResult.sum || 0,
          recipient: qrResult.recipient || "",
          createdAt: qrResult.created_at || "",
        },
      }
      setQueuePassengers(updatedPassengers)

      setQrScannedData({
        amount: qrResult.sum || 0,
        recipient: qrResult.recipient || "",
        createdAt: qrResult.created_at || "",
        scannedPassengerId: currentQueueScanId,
      })
    } else {
      console.log("[v0] scan:error", {
        passengerId: currentQueueScanId,
        error: "QR не найден",
        timestamp: new Date().toISOString(),
      })

      updatedPassengers[passengerIndex] = {
        ...passenger,
        qrError: true,
        scanned: false,
      }
      setQueuePassengers(updatedPassengers)

      toast({
        title: language === "ru" ? "QR не найден" : "QR not found",
        description: language === "ru" ? "Неверный или недействительный QR-код" : "Invalid or expired QR code",
        variant: "destructive",
      })

      console.log("[v0] qr:not_found_clicked", {
        passengerId: currentQueueScanId,
        timestamp: new Date().toISOString(),
      })
    }

    // Reset scan state to allow next scan
    setCurrentQueueScanId(null)
    setIsScanningLocked(false)
    scanInProgressRef.current = false
  }

  const handleOpenPassengerScanner = (passengerId: number) => {
    if (areSeatsLocked) {
      // Check if seats are locked
      console.log("[v0] ui:blocked", { action: "openPassengerScanner", reason: "seatsLocked" })
      toast({
        title: t.error,
        description: language === "ru" ? "Сначала начните подготовку рейса" : "Start trip preparation first",
        variant: "destructive",
      })
      return
    }

    if (isScanningLocked) {
      console.log("[v0] ui:blocked", { action: "openPassengerScanner", reason: "scanningInProgress" })
      return
    }

    if (userStatus !== "confirmed") {
      console.log("[v0] ui:blocked", { action: "openPassengerScanner", reason: "accountUnconfirmed" })
      toast({
        title: t.error,
        description: language === "ru" ? "Аккаунт не подтвержден" : "Account not confirmed",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] scan:start", { passengerId, timestamp: new Date().toISOString() })
    setIsScanningLocked(true)
    setCurrentQueueScanId(passengerId)
    setScanningForQueue(true)
    setTempBookingId(null)
    setShowCashQRDialog(true)

    setTimeout(() => setIsScanningLocked(false), 300)
  }

  if (!isAuthenticated) {
    if (showRegister) {
      return (
        <RegisterForm
          onRegister={() => {
            // Mock: new users are pending by default
            setUserStatus("pending")
            setShowRegister(false)
            setIsAuthenticated(true)
            localStorage.setItem("driverAuthenticated", "true")
            localStorage.setItem("userStatus", "pending")
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
          setUserStatus("confirmed")
          localStorage.setItem("userStatus", "confirmed")
        }}
        onRegister={() => setShowRegister(true)}
        language={language}
        onLanguageChange={handleLanguageChange}
      />
    )
  }

  if (isAuthenticated && userStatus !== "confirmed") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-md space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{language === "ru" ? "Аккаунт не подтвержден" : "Account Not Confirmed"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {language === "ru"
                  ? "Ваш аккаунт ожидает подтверждения администратором. Пожалуйста, попробуйте позже."
                  : "Your account is awaiting admin confirmation. Please try again later."}
              </p>
              <Button
                onClick={() => {
                  // Refresh account status (mock)
                  toast({
                    title: language === "ru" ? "Обновлено" : "Refreshed",
                    description: language === "ru" ? "Статус аккаунта обновлен" : "Account status refreshed",
                  })
                }}
                className="w-full"
              >
                {language === "ru" ? "Обновить статус" : "Refresh Status"}
              </Button>
              <Button
                onClick={() => {
                  setIsAuthenticated(false)
                  localStorage.removeItem("driverAuthenticated")
                  localStorage.removeItem("userStatus")
                }}
                variant="outline"
                className="w-full"
              >
                {language === "ru" ? "Выйти" : "Logout"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
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

  const isPanelsDisabled = areSeatsLocked || userStatus !== "confirmed"

  const canStartTrip = selectedTrip !== "" && tripStatus === STATE.PREP_IDLE && userStatus === "confirmed"

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="bg-card border-b border-border px-4 py-4 sticky top-0 z-10 shadow-sm rounded-lg mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Select value={selectedTrip} onValueChange={handleSelectRoute} disabled={userStatus !== "confirmed"}>
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

            {selectedTrip && tripStatus === STATE.PREP_IDLE && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleToggleDirection}
                disabled={userStatus !== "confirmed"}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={tripStatus !== STATE.PREP_IDLE ? "default" : "secondary"} className="text-2xl px-3 py-1">
              {getTripStatusEmoji()}
            </Badge>
            <Link href="/balance">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                disabled={userStatus !== "confirmed"}
                onClick={(e) => {
                  if (userStatus !== "confirmed") {
                    e.preventDefault()
                    console.log("[v0] ui:blocked", { action: "navigateToBalance", reason: "accountUnconfirmed" })
                    toast({
                      title: t.error,
                      description: language === "ru" ? "Аккаунт не подтвержден" : "Account not confirmed",
                      variant: "destructive",
                    })
                  }
                }}
              >
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

        {userStatus === "pending" ? (
          <Card className="p-6 border-2 border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10">
            <div className="flex items-start gap-4">
              <div className="text-4xl">⏳</div>
              <div className="flex-1 space-y-3">
                <h3 className="font-semibold text-lg">
                  {language === "ru"
                    ? "Ожидание подтверждения администратора"
                    : language === "fr"
                      ? "En attente de confirmation de l'administrateur"
                      : language === "ar"
                        ? "في انتظار تأكيد المسؤول"
                        : "Awaiting Admin Confirmation"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === "ru"
                    ? "Вы зарегистрированы, ждите подтверждения ваших данных администратором. Обычно это занимает 1 рабочий день."
                    : language === "fr"
                      ? "Vous êtes enregistré, veuillez attendre la confirmation de vos données par l'administrateur. Cela prend généralement 1 jour ouvrable."
                      : language === "ar"
                        ? "أنت مسجل، يرجى انتظار تأكيد بياناتك من قبل المسؤول. عادة ما يستغرق ذلك يوم عمل واحد."
                        : "You are registered, please wait for confirmation of your data by the administrator. This usually takes 1 business day."}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Mock status refresh
                    toast({
                      title: language === "ru" ? "Статус проверен" : "Status checked",
                      description: language === "ru" ? "Ожидание подтверждения" : "Awaiting confirmation",
                    })
                  }}
                >
                  🔄 {language === "ru" ? "Обновить статус" : "Refresh Status"}
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Рендеринг кнопки "Завершить рейс" (только в IN_ROUTE) */}
{tripStatus === STATE.IN_ROUTE && (
  <div className="flex items-center gap-2 w-full">
    <Button
      onClick={() => {
        if (userStatus !== "confirmed") {
          console.log("[v0] ui:blocked", { action: "finishTrip", reason: "accountUnconfirmed" })
          toast({
            title: t.error,
            description: language === "ru" ? "Аккаунт не подтвержден" : "Account not confirmed",
            variant: "destructive",
          })
          return
        }
        clickFinish()
      }}
      className="flex-1"
      size="lg"
      variant="destructive"
    >
      {t.finishTrip}
    </Button>

    <GeoTrackerIndicator isActive={isGeoTrackerActive} language={language} />
  </div>
)}

{/* Рендеринг кнопок "Подготовка/Посадка/Начать рейс" (во всех остальных статусах) */}
{tripStatus !== STATE.IN_ROUTE && (
  <div className="flex items-center gap-2 w-full">
    <Button
      onClick={() => {
        if (userStatus !== "confirmed") {
          console.log("[v0] ui:blocked", { action: "tripStatusButton", reason: "accountUnconfirmed" })
          toast({
            title: t.error,
            description: language === "ru" ? "Аккаунт не подтвержден" : "Account not confirmed",
            variant: "destructive",
          })
          return
        }

        if (tripStatus === STATE.PREP_IDLE && canStartTrip) {
          clickStartPrep()
        } else if (tripStatus === STATE.PREP_TIMER) {
          clickStartBoarding()
        } else if (tripStatus === STATE.BOARDING) {
          clickReadyForRoute()
        } else if (tripStatus === STATE.ROUTE_READY) {
          clickStartRoute()
        }
      }}
      disabled={tripStatus === STATE.PREP_IDLE && !canStartTrip}
      className="flex-1"
      size="lg"
    >
      {getTripButtonText()}
    </Button>

    {/* Кнопка отмены только в PREP_TIMER */}
    {tripStatus === STATE.PREP_TIMER && (
      <Button
        variant="outline"
        size="lg"
        onClick={clickCancelPrep}
        className="whitespace-nowrap"
      >
        {language === "ru" ? "Отмена" : "Cancel"}
      </Button>
    )}

    {/* Индикатор геотрекера только в BOARDING и ROUTE_READY */}
    {(tripStatus === STATE.BOARDING || tripStatus === STATE.ROUTE_READY) && (
      <GeoTrackerIndicator isActive={isGeoTrackerActive} language={language} />
    )}
  </div>
)}
          </>
        )}
      </div>

      <div className="px-2 pt-4 space-y-6">
        {selectedTrip && (
          <Card className={`p-4 border-2 border-border ${isPanelsDisabled ? "opacity-50 pointer-events-none" : ""}`}>
            <h2 className="text-lg font-bold text-foreground mb-4">{t.seats}</h2>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-2 sm:p-4 rounded-lg bg-secondary min-w-0">
  <div className="flex items-center justify-center gap-0.5 mb-2 min-w-0">
    <Button
      size="icon"
      variant="outline"
      className="h-6 w-6 sm:h-7 sm:w-7 bg-transparent shrink-0 p-0"
      onClick={() => setManualOccupied(Math.max(0, manualOccupied - 1))}
      disabled={manualOccupied === 0 || isPanelsDisabled}
    >
      <Minus className="h-3 w-3" />
    </Button>
    <div className="text-xl sm:text-2xl font-bold text-primary w-6 text-center shrink-0">
      {occupiedCount}
    </div>
    <Button
      size="icon"
      variant="outline"
      className="h-6 w-6 sm:h-7 sm:w-7 bg-transparent shrink-0 p-0"
      onClick={() => setManualOccupied(Math.min(6, manualOccupied + 1))}
      disabled={manualOccupied === 6 || isPanelsDisabled}
    >
      <Plus className="h-3 w-3" />
    </Button>
  </div>
  <div className="text-[10px] sm:text-xs text-muted-foreground">{t.occupied}</div>
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
        )}
        {selectedTrip && tripStatus !== STATE.IN_ROUTE && (
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

            <QueueQRScanner
              passengers={queuePassengers}
              onUpdate={setQueuePassengers}
              onAccept={(passengerId) => {
                const passenger = queuePassengers.find((p) => p.id === passengerId)
                if (!passenger) return

                const seatCountToAdd = passenger.ticketCount || 1
                setManualOccupied((prev) => prev + seatCountToAdd)

                setQueuePassengers(queuePassengers.filter((p) => p.id !== passengerId))

                logFSMEvent("accept:success", {
                  passengerId,
                  seatsAdded: seatCountToAdd,
                })

                toast({
                  title: language === "ru" ? "Пассажир принят" : "Passenger accepted",
                  description: passenger.name,
                })
              }}
              onReject={(passengerId) => {
                const passenger = queuePassengers.find((p) => p.id === passengerId)
                setQueuePassengers(queuePassengers.filter((p) => p.id !== passengerId))

                logFSMEvent("reject:success", { passengerId })

                toast({
                  title: language === "ru" ? "Пассажир отклонён" : "Passenger rejected",
                  description: passenger?.name,
                  variant: "destructive",
                })
              }}
              onReturn={(passengerId) => {
                const passenger = queuePassengers.find((p) => p.id === passengerId)
                if (!passenger) return

                const seatCountToRevert = passenger.ticketCount || 1

                setQueuePassengers(
                  queuePassengers.map((p) =>
                    p.id === passengerId
                      ? {
                          ...p,
                          showQRButtons: false,
                          qrData: undefined,
                          scanned: false,
                          qrError: false,
                        }
                      : p,
                  ),
                )

                if (passenger.scanned) {
                  setManualOccupied((prev) => Math.max(0, prev - seatCountToRevert))
                }

                logFSMEvent("return:success", {
                  passengerId,
                  seatsReverted: seatCountToRevert,
                })

                toast({
                  title: language === "ru" ? "Возврат" : "Return",
                  description: language === "ru" ? "Операция отменена" : "Operation canceled",
                })
              }}
              disabled={isPanelsDisabled}
              language={language}
              t={t}
            />
          </Card>
        )}

        {selectedTrip && (
          <Card className={`p-4 border-2 border-border ${isPanelsDisabled ? "opacity-50 pointer-events-none" : ""}`}>
            <h2 className="text-lg font-bold text-foreground mb-4">{t.stops}</h2>
            <div className="space-y-1">
              {stops.slice(1, -1).map((stop, index) => {
                const stopBookings = bookings.filter((b) => b.fromStopIndex === stop.id)
                const visibleBookings = stopBookings

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
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => handleRejectQRNotFoundBooking(booking.id)}
                                        className="flex-1 h-9 text-sm font-semibold"
                                        variant="destructive"
                                        size="sm"
                                        disabled={isPanelsDisabled}
                                      >
                                        {t.reject}
                                      </Button>
                                      <Button
                                        onClick={() => handleReturnBooking(booking.id)}
                                        className="h-9 w-9"
                                        variant="outline"
                                        size="icon"
                                        title={language === "ru" ? "Вернуть" : "Return"}
                                        disabled={isPanelsDisabled}
                                      >
                                        <Undo2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {!booking.qrError && booking.showQRButtons && booking.qrData && (
                                  <div>
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => handleAcceptBookingQR(booking.id)}
                                        className="flex-1 h-9 text-sm font-semibold"
                                        variant="default"
                                        size="sm"
                                        disabled={isPanelsDisabled}
                                      >
                                        {t.accept}
                                      </Button>
                                      <Button
                                        onClick={() => handleRejectBookingQR(booking.id)}
                                        className="flex-1 h-9 text-sm font-semibold"
                                        variant="destructive"
                                        size="sm"
                                        disabled={isPanelsDisabled}
                                      >
                                        {t.reject}
                                      </Button>
                                      <Button
                                        onClick={() => handleReturnBooking(booking.id)}
                                        className="h-9 w-9"
                                        variant="outline"
                                        size="icon"
                                        title={language === "ru" ? "Вернуть" : "Return"}
                                        disabled={isPanelsDisabled}
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
                                    disabled={isPanelsDisabled}
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
        )}
      </div>

      <CashQRDialog
        open={showCashQRDialog}
        onOpenChange={(isOpen) => {
          setShowCashQRDialog(isOpen)
          if (!isOpen) {
            // Ensure scanning is unlocked and states are reset when dialog closes
            setIsScanningLocked(false)
            setScanningForQueue(false)
            setCurrentQueueScanId(null)
            setTempBookingId(null)
            setQrScannedData(null)
            // Ensure the scanInProgressRef is reset when dialog closes
            scanInProgressRef.current = false
          }
        }}
        driverName={language === "ru" ? "Водитель Иванов И.И." : "Driver Ivanov I."}
        amount={currentCashAmount}
        currency="RUB"
        onConfirm={handleConfirmQR}
        onInvalid={handleInvalidQR}
        language={language}
        showNotFoundButton={tempBookingId !== null || currentQueueScanId !== null}
        onQRNotFound={handleQRNotFoundForBooking}
        onQueuePassengerScan={handleQueuePassengerScan} // Added handler for queue passenger scans
      />
    </div>
  )
}
