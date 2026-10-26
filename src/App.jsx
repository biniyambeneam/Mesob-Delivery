import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './context/useAuth.js';
import Footer from './components/Footer.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import PwaInstallPrompt from './components/PwaInstallPrompt.jsx';
import AuthPage from './pages/AuthPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import StudentDashboardPage from './pages/StudentDashboardPage.jsx';
import ManagerDashboardPage from './pages/ManagerDashboardPage.jsx';

function HomeRedirect() {
  const { loading, isProfileLoading, session, profile } = useAuth();

  if (loading || isProfileLoading) {
    return <LoadingScreen message="Loading your account..." />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile?.is_manager && !profile?.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function AuthRoute() {
  const { loading, isProfileLoading, session, profile } = useAuth();

  if (loading || isProfileLoading) {
    return <LoadingScreen message="Checking session..." />;
  }

  if (!session) {
    return <AuthPage />;
  }

  if (!profile?.is_manager && !profile?.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function OnboardingRoute() {
  const { loading, isProfileLoading, session, profile } = useAuth();

  if (loading || isProfileLoading) {
    return <LoadingScreen message="Preparing onboarding..." />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (profile?.is_manager || profile?.onboarding_complete) {
    return <Navigate to="/dashboard" replace />;
  }

  return <OnboardingPage />;
}

function DashboardRoute() {
  const { loading, isProfileLoading, session, profile } = useAuth();

  if (loading || isProfileLoading) {
    return <LoadingScreen message="Building dashboard..." />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile?.is_manager && !profile?.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }

  return profile?.is_manager ? <ManagerDashboardPage /> : <StudentDashboardPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/auth" element={<AuthRoute />} />
          <Route path="/onboarding" element={<OnboardingRoute />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
        <PwaInstallPrompt />
      </BrowserRouter>
    </AuthProvider>
  );
}
