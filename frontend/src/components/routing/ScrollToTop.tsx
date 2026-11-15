import { useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Keep every route transition anchored at the top of the new page. */
export function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previousRestoration
    }
  }, [])

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    // Dashboard and Telegram layouts own their scrolling in an inner main
    // element, so resetting only window.scrollY is not enough after a route
    // transition.
    document.querySelectorAll<HTMLElement>('.dashboard-content, main.overflow-y-auto').forEach((container) => {
      container.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      container.scrollTop = 0
      container.scrollLeft = 0
    })
  }, [pathname, search])

  return null
}
