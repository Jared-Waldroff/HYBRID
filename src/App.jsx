import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import CalendarPage from './pages/CalendarPage'
import ExercisesPage from './pages/ExercisesPage'
import SettingsPage from './pages/SettingsPage'
import CreateWorkoutPage from './pages/CreateWorkoutPage'
import ActiveWorkoutPage from './pages/ActiveWorkoutPage'
import ExerciseDetailPage from './pages/ExerciseDetailPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
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
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
