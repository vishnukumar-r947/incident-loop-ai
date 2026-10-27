import { Navigate, useLocation } from 'react-router-dom'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('incident_loop_token')
  const location = useLocation()

  if (!token) {
    // Redirect unauthenticated visitors to /login, saving their target location
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute
