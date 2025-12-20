import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
    let response = NextResponse.next()

    // Check for User ID cookie
    const userId = request.cookies.get('ark_user_id')?.value

    if (!userId) {
        // Generate new ID if missing
        const newId = crypto.randomUUID()

        // We need to set the cookie on the response
        response.cookies.set('ark_user_id', newId, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365, // 1 year
            sameSite: 'strict'
        })

        // Also set header for downstream
        response.headers.set('x-user-id', newId)
    } else {
        response.headers.set('x-user-id', userId)
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|manifest|favicon.ico).*)',
    ],
}
