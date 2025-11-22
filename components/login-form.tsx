'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { LogIn } from 'lucide-react'
import type { Language } from '@/lib/translations'
import { translations } from '@/lib/translations'

interface LoginFormProps {
  onLogin: () => void
  language: Language
}

export function LoginForm({ onLogin, language }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const t = translations[language]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Проверка тестовых данных
    if (email === 'driver@test.com' && password === 'driver123') {
      onLogin()
    } else {
      alert(language === 'ru' ? 'Неверные данные для входа' : 'Invalid credentials')
    }
  }

  const fillTestAccount = () => {
    setEmail('driver@test.com')
    setPassword('driver123')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
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
              placeholder={language === 'ru' ? 'your@email.com' : 'your@email.com'}
              required
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t.password}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="h-12"
            />
          </div>

          <Button type="submit" className="w-full h-12 text-base font-semibold">
            {t.signIn}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{t.testAccount}</span>
            <Badge variant="secondary">Demo</Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-1 mb-3">
            <p>Email: driver@test.com</p>
            <p>Password: driver123</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fillTestAccount}
            className="w-full"
          >
            {language === 'ru' ? 'Заполнить' : 'Fill'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
