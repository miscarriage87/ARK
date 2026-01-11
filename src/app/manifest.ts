import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'ARK - Digital Tear-off Calendar',
        short_name: 'ARK',
        description: 'Deine tägliche Dosis Weisheit.',
        display: 'standalone',
        background_color: '#0a0a0c', // Matches --background
        theme_color: '#0a0a0c',
        icons: [
            {
                src: '/web-app-manifest-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/web-app-manifest-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
