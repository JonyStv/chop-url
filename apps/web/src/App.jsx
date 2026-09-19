import { Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { useAuthStore } from "./store/authStore.js";

import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute.jsx";

import "./App.css";
const NotificationContainer = lazy(
  () => import("./components/Notification/NotificationContainer.jsx"),
);
const Layout = lazy(() => import("./layouts/Layout.jsx"));
const Home = lazy(() => import("./pages/Home/Home.jsx"));
const Links = lazy(() => import("./pages/Links/Links.jsx"));
const Analytics = lazy(() => import("./pages/Analytics/Analytics.jsx"));
const Settings = lazy(() => import("./pages/Settings/Settings.jsx"));
const Identify = lazy(() => import("./pages/Identify/Identify.jsx"));
const NotFound = lazy(() => import("./pages/NotFound/NotFound.jsx"));
function App() {
  const initAuth = useAuthStore((state) => state.initAuth);
  const isLoading = useAuthStore((state) => state.isLoading);

  // Inicializar la autenticación al montar el componente
  useEffect(() => {
    initAuth();
  }, [initAuth]);
  const withSuspense = (Component) => (
    <Suspense fallback={<div className="loading"></div>}>
      <Component />
    </Suspense>
  );
  if (isLoading) {
    return <div className="loading"></div>;
  }
  return (
    <>
      <NotificationContainer />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={withSuspense(Home)} />
          <Route path="links" element={withSuspense(Links)} />
          <Route path="analytics" element={withSuspense(Analytics)} />
          <Route
            path="settings"
            element={
              <ProtectedRoute redirectTo="/identify" requireAuth={true}>
                {withSuspense(Settings)}
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={withSuspense(NotFound)}></Route>
        <Route
          path="identify"
          element={
            <ProtectedRoute redirectTo="/" requireAuth={false}>
              {withSuspense(Identify)}
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
