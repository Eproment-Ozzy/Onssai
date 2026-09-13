import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OnSsAI',
    short_name: 'OnSsAI',
    description: 'Uretim ve tedarik takip platformu',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
  }
}
