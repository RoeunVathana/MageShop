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

const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'ico', 'avif',
  'mp4', 'webm', 'mov', 'pdf', 'doc', 'docx', 'xlsx', 'csv',
])

const getFileExtension = (fileName: string): string => {
  const parts = fileName.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

export const mediaService = {
  /**
   * Upload an image, video, or file directly to free S3 cloud storage
   */
  async uploadMedia(file: File, folder: string = 'banners'): Promise<UploadMediaResponse> {
    const extension = getFileExtension(file.name)
    if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
      throw new Error(`Unsupported file type .${extension || '(none)'}. Use JPG, PNG, WebP, GIF, SVG, ICO, or AVIF.`)
    }

    if (file.size > 100 * 1024 * 1024) {
      throw new Error(`File "${file.name}" is larger than the 100 MB upload limit.`)
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    const res = await api.post<{ success: boolean; data: UploadMediaResponse; message: string }>(
      '/admin/media/upload',
      formData,
      {
        // Explicitly remove the JSON default from apiClient. The browser must
        // set multipart/form-data together with its boundary for FormData.
        headers: {
          'Content-Type': undefined,
          Accept: 'application/json',
        },
      },
    )

    if (!res?.data?.url) {
      throw new Error('The upload completed without a media URL from the API.')
    }

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
