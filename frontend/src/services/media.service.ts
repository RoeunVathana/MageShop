import { api } from '@/lib/api'

export interface UploadMediaResponse {
  key: string
  url: string
  cloud_url: string
  original_name: string
  mime_type: string
  size: number
  disk: string
}

export const mediaService = {
  /**
   * Upload an image, video, or file directly to free S3 cloud storage
   */
  async uploadMedia(file: File, folder: string = 'banners'): Promise<UploadMediaResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    const res = await api.post<{ success: boolean; data: UploadMediaResponse; message: string }>(
      '/admin/media/upload',
      formData,
      // Let Axios/browser set the multipart boundary. Setting this header
      // manually can produce a request without the boundary, so Laravel sees
      // no uploaded file and rejects the upload.
    )

    return res.data
  },

  /**
   * Resolve an image or video URL to an absolute URL if it is a relative API media route
   */
  resolveMediaUrl(url: string | null | undefined): string {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
      return url
    }
    // If it's a relative backend media route, prefix with backend host
    if (url.startsWith('/api/v1/')) {
      const isRailway = typeof window !== 'undefined' && window.location.hostname.includes('railway.app')
      const backendRoot = isRailway
        ? 'https://mageshop-production.up.railway.app'
        : (import.meta.env.VITE_API_BASE_URL || 'https://api.tyushop.blog/api/v1').replace(/\/api\/v1\/?$/, '')
      return `${backendRoot}${url}`
    }
    return url
  },
}
