import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useConfig } from '../context/ConfigContext'
import { ModeBadge } from '../components/ModeBadge'
import { Alert, AlertDescription } from '@renderer/components/ui/alert'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel
} from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Separator } from '@renderer/components/ui/separator'
import { Spinner } from '@renderer/components/ui/spinner'

const DEMO_ACCOUNTS = [
  { username: 'operator', password: 'operator123', role: 'Operator' },
  { username: 'supervisor', password: 'supervisor123', role: 'Supervisor' },
  { username: 'teknisi', password: 'teknisi123', role: 'Teknisi' }
]

export function LoginScreen(): React.JSX.Element {
  const { session, login, error, endReason, clearEndReason } = useAuth()
  const { config } = useConfig()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const usernameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  if (session) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    clearEndReason()
    const result = await login(username.trim(), password)
    setSubmitting(false)
    if (result.ok) {
      setPassword('')
      navigate('/', { replace: true })
    }
  }

  const fillAccount = (accountUsername: string, accountPassword: string): void => {
    setUsername(accountUsername)
    setPassword(accountPassword)
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-primary px-6 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-background shadow-2xl md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
          <div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-background text-lg font-bold text-primary">
              P
            </div>
            <h1 className="mt-6 text-2xl font-semibold">POS Parkir</h1>
            <p className="mt-2 text-sm text-primary-foreground/60">
              Aplikasi loket untuk menampilkan tagihan, menerima pembayaran, dan membuka palang
              pintu.
            </p>
            <p className="mt-4 rounded-lg bg-primary-foreground/10 px-3 py-2 text-xs text-primary-foreground/70">
              Frontend berjalan dengan data contoh lokal. Belum terhubung ke Site Server.
            </p>
          </div>
          <dl className="flex flex-col gap-2 text-sm text-primary-foreground/60">
            <div className="flex justify-between gap-4">
              <dt>Loket</dt>
              <dd className="text-primary-foreground">{config?.laneName ?? '-'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Gerbang</dt>
              <dd className="text-primary-foreground">{config?.gateName ?? '-'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Mode</dt>
              <dd className="text-primary-foreground">
                {config?.operationalMode === 'manless' ? 'Manless' : 'Operator'}
              </dd>
            </div>
          </dl>
        </div>

        <Card className="rounded-none border-0 shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Masuk</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Gunakan akun yang terdaftar.</p>
              </div>
              <ModeBadge />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {endReason && (
              <Alert>
                <AlertDescription>{endReason}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={(event) => void handleSubmit(event)}>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="username">Nama pengguna</FieldLabel>
                  <Input
                    id="username"
                    ref={usernameRef}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    placeholder="cth. operator"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Kata sandi"
                    required
                  />
                </Field>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting && <Spinner />}
                  {submitting ? 'Memproses...' : 'Masuk'}
                </Button>
              </FieldGroup>
            </form>

            <Separator />

            <div className="flex flex-col gap-2">
              <FieldDescription>Akun contoh</FieldDescription>
              <div className="flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <Badge
                    key={account.username}
                    variant="outline"
                    className="h-auto cursor-pointer px-2.5 py-1"
                    render={
                      <button
                        type="button"
                        onClick={() => fillAccount(account.username, account.password)}
                      />
                    }
                  >
                    {account.role}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
