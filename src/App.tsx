import "./index.css";
import { Suspense, lazy } from "react";
import AppRoutes from "./routes";
import LayoutBackground from "./components/layout/LayoutBackground";
import { Toaster } from "./components/ui/sonner";
import { PWAInstallCard } from "./components/PWAInstallCard";

const LicenseModal = lazy(() => import("./components/legal/LicenseModal"));

export default function App() {
  return (
    <LayoutBackground>
      <AppRoutes />
      <Suspense fallback={null}>
        <LicenseModal />
      </Suspense>
      <PWAInstallCard />
      <Toaster position="top-center" theme="dark" richColors />
    </LayoutBackground>
  );
}
