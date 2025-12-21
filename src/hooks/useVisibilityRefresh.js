import { useEffect, useRef } from 'react'

/**
 * Hook that calls a refresh callback when the app becomes visible again.
 * Useful for refetching data after the user switches back to the app.
 * 
 * @param {Function} onRefresh - Callback to run when app becomes visible
 * @param {boolean} enabled - Whether the hook is active (default: true)
 */
export function useVisibilityRefresh(onRefresh, enabled = true) {
    const lastRefreshRef = useRef(Date.now())

    useEffect(() => {
        if (!enabled) return

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Debounce: only refresh if >2 seconds since last refresh
                const now = Date.now()
                if (now - lastRefreshRef.current > 2000) {
                    lastRefreshRef.current = now
                    console.log('App became visible - triggering data refresh')
                    onRefresh?.()
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [onRefresh, enabled])
}
