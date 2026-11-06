import { CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CartLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <CloudOff aria-hidden="true" className="size-10 text-muted-foreground" />
      <p className="font-medium">Keranjang gagal dimuat</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Barang Anda tetap tersimpan. Periksa koneksi, lalu coba lagi.
      </p>
      <Button variant="outline" onClick={onRetry}>
        Coba Lagi
      </Button>
    </div>
  )
}
