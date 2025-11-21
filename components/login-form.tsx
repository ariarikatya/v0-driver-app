"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { LogIn, Languages, Eye, EyeOff } from "lucide-react"
import type { Language } from "@/lib/translations"
import { translations } from "@/lib/translations"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface LoginFormProps {
  onLogin: () => void
  onRegister: () => void
  language: Language
  onLanguageChange: (lang: Language) => void
}

export function LoginForm({ onLogin, onRegister, language, onLanguageChange }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const t = translations[language]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Проверка тестовых данных
    if (email === "driver@test.com" && password === "driver123") {
      onLogin()
    } else {
      alert(language === "ru" ? "Неверные данные для входа" : "Invalid credentials")
    }
  }

  const fillTestAccount = () => {
    setEmail("driver@test.com")
    setPassword("driver123")
  }

  const languageOptions = [
    { code: "fr" as Language, name: "Français", flag: "🇫🇷" },
    { code: "ar" as Language, name: "العربية", flag: "🇸🇦" },
    { code: "en" as Language, name: "English", flag: "🇬🇧" },
    { code: "ru" as Language, name: "Русский", flag: "🇷🇺" },
  ]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex justify-end mb-2">
          <Select value={language} onValueChange={(value) => onLanguageChange(value as Language)}>
            <SelectTrigger className="w-[180px] border-2 border-primary/20">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  <span>{languageOptions.find((l) => l.code === language)?.flag}</span>
                  <span>{languageOptions.find((l) => l.code === language)?.name}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <div className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t.login}</h1>
          <p className="text-sm text-muted-foreground">{t.tripNumber}247</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={language === "ru" ? "your@email.com" : "your@email.com"}
              required
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t.password}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-12 w-12"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-base font-semibold">
            {t.signIn}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Button type="button" variant="link" onClick={onRegister} className="text-sm">
            {language === "ru"
              ? "Нет аккаунта? Зарегистрироваться"
              : language === "fr"
                ? "Pas de compte ? S'inscrire"
                : language === "ar"
                  ? "لا يوجد حساب؟ سجل"
                  : "No account? Register"}
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{t.testAccount}</span>
            <Badge variant="secondary">Demo</Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-1 mb-3">
            <p>Email: driver@test.com</p>
            <p>Password: driver123</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={fillTestAccount} className="w-full bg-transparent">
            {language === "ru" ? "Заполнить" : "Fill"}
          </Button>
        </div>
      </Card>
    </div>
  )
}
