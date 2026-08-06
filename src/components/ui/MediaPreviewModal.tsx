import { useEffect } from 'react'
import { useMediaPreviewStore } from '../../stores/mediaPreviewStore'
import { Icon } from '../icons/Icon'

export function MediaPreviewModal() {
  const closePreview = useMediaPreviewStore((state) => state.closePreview)
  const preview = useMediaPreviewStore((state) => state.preview)

  useEffect(() => {
    if (!preview) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closePreview()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closePreview, preview])

  if (!preview) return null

  return (
    <div
      aria-label={preview.alt}
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4"
      onClick={closePreview}
      role="dialog"
    >
      <button
        aria-label="Close preview"
        className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        onClick={(event) => {
          event.stopPropagation()
          closePreview()
        }}
        type="button"
      >
        <Icon name="x" />
      </button>
      <div className="flex max-h-[90dvh] max-w-[94vw] items-center justify-center" onClick={(event) => event.stopPropagation()}>
        <img alt={preview.alt} className="max-h-[90dvh] max-w-[94vw] rounded-xl bg-white object-contain shadow-2xl" src={preview.src} />
      </div>
    </div>
  )
}
