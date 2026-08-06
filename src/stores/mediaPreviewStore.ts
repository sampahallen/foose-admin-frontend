import { create } from 'zustand'

export type MediaPreview = {
  alt: string
  src: string
}

type MediaPreviewState = {
  preview: MediaPreview | null
  closePreview: () => void
  openPreview: (preview: MediaPreview) => void
}

export const useMediaPreviewStore = create<MediaPreviewState>((set) => ({
  preview: null,
  closePreview: () => set({ preview: null }),
  openPreview: (preview) => set({ preview }),
}))
