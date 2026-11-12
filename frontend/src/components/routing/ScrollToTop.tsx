import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Keep every route transition anchored at the top of the new page. */
export function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, search])

  return null
}
