import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { RouteFallback } from './components/RouteFallback'

// Public marketing pages — loaded on demand
const Home = lazy(() => import('./pages/Home'))
const Rooms = lazy(() => import('./pages/Rooms'))
const RoomDetails = lazy(() => import('./pages/RoomDetails'))
const ConferenceRoom = lazy(() => import('./pages/ConferenceRoom'))
const ConferenceRoomBooking = lazy(() => import('./pages/ConferenceRoomBooking'))
const ConferenceThankYou = lazy(() => import('./pages/ConferenceThankYou'))
const Dining = lazy(() => import('./pages/Dining'))
const Experiences = lazy(() => import('./pages/Experiences'))
const BestResortThanchi = lazy(() => import('./pages/BestResortThanchi'))
const FamilyResortBandarban = lazy(() => import('./pages/FamilyResortBandarban'))
const CoupleResortBandarban = lazy(() => import('./pages/CoupleResortBandarban'))
const ConferenceResortBandarban = lazy(() => import('./pages/ConferenceResortBandarban'))
const Contact = lazy(() => import('./pages/Contact'))
const Faq = lazy(() => import('./pages/Faq'))
const ContactThankYou = lazy(() => import('./pages/ContactThankYou'))
const Booking = lazy(() => import('./pages/Booking'))
const ThankYou = lazy(() => import('./pages/ThankYou'))
const About = lazy(() => import('./pages/About'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsConditions = lazy(() => import('./pages/TermsConditions'))
const CancellationPolicy = lazy(() => import('./pages/CancellationPolicy'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogPost = lazy(() => import('./pages/BlogPost'))
const Developer = lazy(() => import('./pages/Developer'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Login = lazy(() => import('./pages/Login'))

// Admin — separate chunk; not downloaded on homepage
const AdminLayout = lazy(() =>
  import('./admin/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout }))
)
const AdminDashboard = lazy(() => import('./admin/pages/Dashboard'))
const AdminBookings = lazy(() => import('./admin/pages/Bookings'))
const AdminRooms = lazy(() => import('./admin/pages/Rooms'))
const AdminGuests = lazy(() => import('./admin/pages/Guests'))
const AdminHousekeeping = lazy(() => import('./admin/pages/Housekeeping'))
const AdminStaff = lazy(() => import('./admin/pages/Staff'))
const AdminInquiries = lazy(() => import('./admin/pages/Inquiries'))
const AdminReports = lazy(() => import('./admin/pages/Reports'))
const AdminSettings = lazy(() => import('./admin/pages/Settings'))
const AdminTeamAccess = lazy(() => import('./admin/pages/TeamAccess'))
const AdminActivity = lazy(() => import('./admin/pages/Activity'))

const withSuspense = (element: ReactNode) => (
  <Suspense fallback={<RouteFallback />}>{element}</Suspense>
)

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={withSuspense(<Login />)} />

          <Route
            path="/admin"
            element={withSuspense(
              <AdminLayout />
            )}
          >
            <Route index element={withSuspense(<AdminDashboard />)} />
            <Route path="bookings" element={withSuspense(<AdminBookings />)} />
            <Route path="rooms" element={withSuspense(<AdminRooms />)} />
            <Route path="guests" element={withSuspense(<AdminGuests />)} />
            <Route path="housekeeping" element={withSuspense(<AdminHousekeeping />)} />
            <Route path="staff" element={withSuspense(<AdminStaff />)} />
            <Route path="inquiries" element={withSuspense(<AdminInquiries />)} />
            <Route path="reports" element={withSuspense(<AdminReports />)} />
            <Route path="activity" element={withSuspense(<AdminActivity />)} />
            <Route path="team-access" element={withSuspense(<AdminTeamAccess />)} />
            <Route path="settings" element={withSuspense(<AdminSettings />)} />
          </Route>

          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={withSuspense(<Home />)} />
                  <Route path="/rooms" element={withSuspense(<Rooms />)} />
                  <Route path="/rooms/:id" element={withSuspense(<RoomDetails />)} />
                  <Route path="/conference-room" element={withSuspense(<ConferenceRoom />)} />
                  <Route
                    path="/conference-room/booking"
                    element={withSuspense(<ConferenceRoomBooking />)}
                  />
                  <Route
                    path="/conference-thank-you"
                    element={withSuspense(<ConferenceThankYou />)}
                  />
                  <Route path="/dining" element={withSuspense(<Dining />)} />
                  <Route path="/experiences" element={withSuspense(<Experiences />)} />
                  <Route
                    path="/best-resort-thanchi"
                    element={withSuspense(<BestResortThanchi />)}
                  />
                  <Route
                    path="/family-resort-bandarban"
                    element={withSuspense(<FamilyResortBandarban />)}
                  />
                  <Route
                    path="/couple-resort-bandarban"
                    element={withSuspense(<CoupleResortBandarban />)}
                  />
                  <Route
                    path="/conference-resort-bandarban"
                    element={withSuspense(<ConferenceResortBandarban />)}
                  />
                  <Route path="/contact" element={withSuspense(<Contact />)} />
                  <Route path="/faq" element={withSuspense(<Faq />)} />
                  <Route path="/contact/thank-you" element={withSuspense(<ContactThankYou />)} />
                  <Route path="/about" element={withSuspense(<About />)} />
                  <Route path="/booking" element={withSuspense(<Booking />)} />
                  <Route path="/thank-you" element={withSuspense(<ThankYou />)} />
                  <Route path="/privacy-policy" element={withSuspense(<PrivacyPolicy />)} />
                  <Route path="/terms" element={withSuspense(<TermsConditions />)} />
                  <Route
                    path="/cancellation-policy"
                    element={withSuspense(<CancellationPolicy />)}
                  />
                  <Route path="/blog" element={withSuspense(<Blog />)} />
                  <Route path="/blog/:id" element={withSuspense(<BlogPost />)} />
                  <Route path="/developer" element={withSuspense(<Developer />)} />
                  <Route path="*" element={withSuspense(<NotFound />)} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App
