import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { buildRouteSchema } from '../utils/routeSchema'

const SCHEMA_ID = 'route-schema-jsonld'

const injectSchema = (data: Record<string, unknown>) => {
  const existing = document.getElementById(SCHEMA_ID)
  if (existing) existing.remove()
  document.getElementById('prerender-route-schema')?.remove()

  const script = document.createElement('script')
  script.id = SCHEMA_ID
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

const RouteSchema = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    injectSchema(buildRouteSchema(pathname))
  }, [pathname])

  return null
}

export default RouteSchema
