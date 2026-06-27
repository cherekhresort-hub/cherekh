import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getCanonicalLocation } from '../utils/urlNormalization'

/** Canonicalize trailing slashes and strip Facebook/Google click IDs from the URL bar. */
export const UrlNormalization = () => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const canonical = getCanonicalLocation(location.pathname, location.search)
    if (
      canonical.pathname !== location.pathname ||
      canonical.search !== location.search
    ) {
      navigate(
        {
          pathname: canonical.pathname,
          search: canonical.search,
          hash: location.hash,
        },
        { replace: true }
      )
    }
  }, [location.pathname, location.search, location.hash, navigate])

  return null
}
