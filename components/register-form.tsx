'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, Upload, X } from 'lucide-react'
import type { Language } from '@/lib/translations'
import { translations } from '@/lib/translations'

interface RegisterFormProps {
  onRegister: () => void
  onBackToLogin: () => void
  language: Language
}

export function RegisterForm({ onRegister, onBackToLogin, language }: RegisterFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity] = useState('')
  const [carNumber, setCarNumber] = useState('')
  const [documents, setDocuments] = useState<File[]>([])
  const t = translations[language]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mock registration
    if (email && password && city && carNumber) {
      alert(language === 'ru' ? 'Регистрация успешна!' : 'Registration successful!')
      onRegister()
    } else {
      alert(language === 'ru' ? 'Заполните все поля' : 'Fill all fields')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments([...documents, ...Array.from(e.target.files)])
    }
  }

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t.registration}</h1>
          <p className="text-sm text-muted-foreground">{t.createAccount}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
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

          <div className="space-y-2">
            <Label htmlFor="city">{t.city}</Label>
            <Input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={language === 'ru' ? 'Москва' : 'Moscow'}
              required
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="carNumber">{t.carNumber}</Label>
            <Input
              id="carNumber"
              type="text"
              value={carNumber}
              onChange={(e) => setCarNumber(e.target.value)}
              placeholder={language === 'ru' ? 'А123БВ777' : 'A123BC777'}
              required
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="documents">{t.documents}</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  {language === 'ru' ? 'Загрузите документы' : 'Upload documents'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'ru' ? 'Паспорт, права, лицензия' : 'Passport, license, permits'}
                </p>
                <Input
                  id="documents"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('documents')?.click()}
                >
                  {language === 'ru' ? 'Выбрать файлы' : 'Choose files'}
                </Button>
              </div>
              
              {documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  {documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded">
                      <span className="text-sm truncate flex-1">{doc.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeDocument(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-base font-semibold">
            {t.register}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Button
            type="button"
            variant="link"
            onClick={onBackToLogin}
            className="text-sm"
          >
            {language === 'ru' ? 'Уже есть аккаунт? Войти' : 'Already have an account? Sign in'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
