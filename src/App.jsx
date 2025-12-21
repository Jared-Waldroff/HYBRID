import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import { supabase } from './lib/supabaseClient'

// Pages
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import CalendarPage from './pages/CalendarPage'
import ExercisesPage from './pages/ExercisesPage'
import GoalsPage from './pages/GoalsPage'
import SettingsPage from './pages/SettingsPage'
import CreateWorkoutPage from './pages/CreateWorkoutPage'
import ActiveWorkoutPage from './pages/ActiveWorkoutPage'
import ExerciseDetailPage from './pages/ExerciseDetailPage'
import CrossFitWorkoutPage from './pages/CrossFitWorkoutPage'

function AppContent() {
  // Handle app visibility changes (screen lock/unlock)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // App became visible - refresh the session to reconnect
        console.log('App became visible - refreshing session...')
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          if (error) {
            console.error('Session refresh error:', error)
          } else if (session) {
            // Trigger a session refresh to ensure the connection is active
            await supabase.auth.refreshSession()
            console.log('Session refreshed successfully')
          }
        } catch (err) {
          console.error('Error refreshing session:', err)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      } />

      <Route path="/calendar" element={
        <ProtectedRoute>
          <CalendarPage />
        </ProtectedRoute>
      } />

      <Route path="/exercises" element={
        <ProtectedRoute>
          <ExercisesPage />
        </ProtectedRoute>
      } />

      <Route path="/goals" element={
        <ProtectedRoute>
          <GoalsPage />
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      } />

      <Route path="/create-workout" element={
        <ProtectedRoute>
          <CreateWorkoutPage />
        </ProtectedRoute>
      } />

      <Route path="/workout/:id" element={
        <ProtectedRoute>
          <ActiveWorkoutPage />
        </ProtectedRoute>
      } />

      <Route path="/exercise/:id" element={
        <ProtectedRoute>
          <ExerciseDetailPage />
        </ProtectedRoute>
      } />

      <Route path="/cf-workout" element={
        <ProtectedRoute>
          <CrossFitWorkoutPage />
        </ProtectedRoute>
      } />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
