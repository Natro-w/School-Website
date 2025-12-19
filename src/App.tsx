import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from '@/components/theme-provider';
import Header from '@/components/common/Header';
import Sidebar from '@/components/common/Sidebar';
import PerformanceIndicator from '@/components/common/PerformanceIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import routes from './routes';

// Loading fallback component
const PageLoader = () => (
  <div className="flex flex-col gap-4 p-6">
    <Skeleton className="h-8 w-64 bg-muted" />
    <Skeleton className="h-64 w-full bg-muted" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Skeleton className="h-48 bg-muted" />
      <Skeleton className="h-48 bg-muted" />
      <Skeleton className="h-48 bg-muted" />
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="flex flex-col min-h-screen">
      <PerformanceIndicator />
      {!isLoginPage && <Header />}
      <div className="flex flex-1">
        {!isLoginPage && <Sidebar />}
        <main className={`flex-1 ${isLoginPage ? '' : 'p-4 xl:p-6 pb-20 xl:pb-6'}`}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {routes.map((route, index) => {
                const Component = route.component;
                return (
                  <Route
                    key={index}
                    path={route.path}
                    element={<Component />}
                  />
                );
              })}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="school-ui-theme">
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
