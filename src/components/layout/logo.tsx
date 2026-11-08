import Image from 'next/image'
import { mediaSrc } from '@/lib/media'

/** The logo uploaded in the dashboard, or the hang tag mark shared with the favicon. */
export function Logo({ src }: { src?: string | null }) {
  if (src) {
    return <Image src={mediaSrc(src)} alt="" width={20} height={20} className="size-5 object-contain" />
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.6 2H20a2 2 0 0 1 2 2v9.4a2 2 0 0 1-.6 1.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12.6a2 2 0 0 1 0-2.8l7.2-7.2a2 2 0 0 1 1.4-.6ZM17 5a2 2 0 1 0 0 4a2 2 0 1 0 0-4Z"
      />
    </svg>
  )
}
