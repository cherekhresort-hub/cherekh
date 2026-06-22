import { Link, useLocation } from 'react-router-dom'
import { FaChevronRight, FaHome } from 'react-icons/fa'

interface BreadcrumbItem {
  label: string
  path: string
}

const Breadcrumbs = () => {
  const location = useLocation()
  
  // Don't show breadcrumbs on homepage
  if (location.pathname === '/') return null

  const pathnames = location.pathname.split('/').filter((x) => x)
  
  const breadcrumbMap: Record<string, string> = {
    'rooms': 'Rooms & Suites',
    'conference-room': 'Conference Room',
    'dining': 'Dining',
    'experiences': 'Experiences',
    'contact': 'Contact',
    'about': 'About Us',
    'booking': 'Book Now',
    'admin': 'Admin',
    'blog': 'Blog',
    'privacy-policy': 'Privacy Policy',
    'terms': 'Terms & Conditions',
    'cancellation-policy': 'Cancellation Policy',
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', path: '/' },
  ]

  let currentPath = ''
  pathnames.forEach((pathname) => {
    currentPath += `/${pathname}`
    const label = breadcrumbMap[pathname] || pathname.charAt(0).toUpperCase() + pathname.slice(1).replace(/-/g, ' ')
    breadcrumbs.push({ label, path: currentPath })
  })

  return (
    <nav aria-label="Breadcrumb" className="bg-resort-bg px-4 pt-3 pb-2 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <ol className="flex items-center space-x-2 text-sm" itemScope itemType="https://schema.org/BreadcrumbList">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1
            return (
              <li key={crumb.path} className="flex items-center" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                {index === 0 ? (
                  <Link
                    to={crumb.path}
                    className="flex items-center text-resort-heading hover:text-resort-cta transition-colors"
                    itemProp="item"
                    aria-label="Home"
                  >
                    <FaHome className="w-4 h-4" />
                    <span className="sr-only" itemProp="name">{crumb.label}</span>
                  </Link>
                ) : isLast ? (
                  <span className="text-resort-heading font-medium" itemProp="name" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="text-resort-heading/70 hover:text-resort-heading transition-colors"
                    itemProp="item"
                  >
                    <span itemProp="name">{crumb.label}</span>
                  </Link>
                )}
                {!isLast && (
                  <FaChevronRight className="w-3 h-3 mx-2 text-resort-heading/50" aria-hidden="true" />
                )}
                <meta itemProp="position" content={String(index + 1)} />
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}

export default Breadcrumbs

