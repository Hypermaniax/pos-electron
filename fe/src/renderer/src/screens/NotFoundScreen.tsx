import type React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'

export function NotFoundScreen(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-park-base p-4 text-center">
      <p className="font-mono text-6xl font-bold text-park-muted">404</p>
      <h1 className="font-heading text-xl font-bold text-park-main">Halaman Tidak Ditemukan</h1>
      <p className="text-sm text-park-muted">Halaman yang Anda cari tidak tersedia.</p>
      <Link to="/">
        <Button className="bg-park-cta font-mono text-sm font-bold text-black hover:bg-orange-500">
          Kembali ke Beranda
        </Button>
      </Link>
    </div>
  )
}
