import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { ReactNode, Suspense, lazy, useEffect } from "react";

// Core pages
const Index = lazy(() => import("@/pages/Index"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const FeatureLocked = lazy(() => import("@/pages/FeatureLocked"));
const TimeOff = lazy(() => import("@/pages/TimeOff"));
const TimeClockPage = lazy(() => import("@/pages/TimeClock"));
const VideoConferencePage = lazy(() => import("@/pages/video-conference/Index"));
const WorkOrdersPage = lazy(() => import("@/pages/WorkOrders"));
const DashboardPage = lazy(() => import("@/pages/dashboard/Index"));

// Forms
const FormsIndex = lazy(() => import("@/pages/forms/Index"));
const C85Form = lazy(() => import("@/pages/forms/C85"));
const JSAForm = lazy(() => import("@/pages/forms/JSA"));
const DVIRForm = lazy(() => import("@/pages/forms/DVIR"));
const IncidentForm = lazy(() => import("@/pages/forms/Incident"));
const WhistleblowerForm = lazy(() => import("@/pages/forms/WhistleblowerPage"));
const CompanyForms = lazy(() => import("@/pages/forms/CompanyForms"));

// Navigation
const NavigationHome = lazy(() => import("@/pages/navigation/Home"));
const OnlineNavigator = lazy(() => import("@/pages/navigation/Navigator"));
const OfflineNavigator = lazy(() => import("@/pages/navigation/OfflineMaps"));
const Hazard = lazy(() => import("@/pages/navigation/Hazard"));
const Weather = lazy(() => import("@/pages/navigation/Weather"));
const OrganizationIndex = lazy(() => import("@/pages/organization/Index"));
import { useAssistant } from "@/contexts/AssistantContext";

// Messages
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));

// Training
const TrainingIndex = lazy(() => import("@/pages/training/Index"));
const PMTModule = lazy(() => import("@/pages/training/PMT"));
const FlaggerModule = lazy(() => import("@/pages/training/Flagger"));
const CDLPrepModule = lazy(() => import("@/pages/training/CDLPrep"));
const CourseDetail = lazy(() => import("@/pages/training/CourseDetail"));
const TrainingVideosPage = lazy(() => import("@/pages/training/Videos"));
const C85Template = lazy(() => import("@/pages/forms/C85Template"));

// Scheduling
const SchedulingIndex = lazy(() => import("@/pages/scheduling/Index"));
const ScheduleEditor = lazy(() => import("@/pages/scheduling/Editor"));
const DayViewPage = lazy(() => import("@/pages/scheduling/day-view"));

// Style preview (dev only)
const StylePreview = lazy(() => import("@/pages/StylePreview"));

// Owner
const OwnerDashboard = lazy(() => import("@/pages/owner/OwnerDashboard"));

// Legal / public shell
import PublicLayout from "@/components/layout/PublicLayout";
const Privacy = lazy(() => import("@/pages/legal/Privacy"));
const Terms = lazy(() => import("@/pages/legal/Terms"));
const Disclaimer = lazy(() => import("@/pages/legal/Disclaimer"));
const Contact = lazy(() => import("@/pages/legal/Contact"));
const LicenseAgreement = lazy(() => import("@/pages/legal/LicenseAgreement"));
const PurchaseSuccess = lazy(() => import("@/pages/PurchaseSuccess"));
const PurchaseCancelled = lazy(() => import("@/pages/PurchaseCancelled"));
const Install = lazy(() => import("@/pages/Install"));
const ActivateAccess = lazy(() => import("@/pages/ActivateAccess"));

// Layout / Auth
import AppLayout from "@/components/layout/AppLayout";
import { AuthGuard, RequireAdminPage } from "./guards";
import { useAuth } from "@/contexts/AuthContext";

type AppRoute = {
  path: string;
  element: ReactNode;
};

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-orange-100/80">
      Loading...
    </div>
  );
}

const publicRoutes: AppRoute[] = [
  { path: "/", element: <Index /> },
  { path: "/privacy", element: <Privacy /> },
  { path: "/terms", element: <Terms /> },
  { path: "/disclaimer", element: <Disclaimer /> },
  { path: "/contact", element: <Contact /> },
  { path: "/license-agreement", element: <LicenseAgreement /> },
  { path: "/LICENSE-AGEEMENT", element: <LicenseAgreement /> },
  { path: "/purchase/success", element: <PurchaseSuccess /> },
  { path: "/purchase/cancelled", element: <PurchaseCancelled /> },
  { path: "/install", element: <Install /> },
  { path: "/activate", element: <ActivateAccess /> },
];

const dashboardRoutes: AppRoute[] = [
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/feature-locked", element: <FeatureLocked /> },
  { path: "/dispatch", element: <RequireAdminPage><Navigate to="/admin/dispatch" replace /></RequireAdminPage> },
  { path: "/timeoff", element: <TimeOff /> },
  { path: "/timeclock", element: <TimeClockPage /> },
  { path: "/work-orders", element: <WorkOrdersPage /> },
  { path: "/video-conference", element: <VideoConferencePage /> },
];

const organizationRoutes: AppRoute[] = [
  { path: "/organization", element: <OrganizationIndex /> },
];

const formRoutes: AppRoute[] = [
  { path: "/forms", element: <FormsIndex /> },
  { path: "/forms/hub", element: <FormsIndex /> },
  { path: "/forms/c85", element: <C85Form /> },
  { path: "/forms/c85-template", element: <C85Template /> },
  { path: "/forms/jsa", element: <JSAForm /> },
  { path: "/forms/dvir", element: <DVIRForm /> },
  { path: "/forms/incident", element: <IncidentForm /> },
  { path: "/forms/whistleblower", element: <WhistleblowerForm /> },
  { path: "/forms/company", element: <CompanyForms /> },
];

const navigationRoutes: AppRoute[] = [
  { path: "/navigation", element: <NavigationHome /> },
  { path: "/navigation/live", element: <OnlineNavigator /> },
  { path: "/navigation/offline", element: <OfflineNavigator /> },
  { path: "/navigation/hazard", element: <Hazard /> },
  { path: "/navigation/weather", element: <Weather /> },
];

const vaultRoutes: AppRoute[] = [{ path: "/vault", element: <RequireAdminPage><Navigate to="/admin/vault" replace /></RequireAdminPage> }];
const messageRoutes: AppRoute[] = [{ path: "/messages", element: <MessagesPage /> }];

const trainingRoutes: AppRoute[] = [
  { path: "/training", element: <TrainingIndex /> },
  { path: "/pages/training/index", element: <Navigate to="/training" replace /> },
  { path: "/training/pmt", element: <PMTModule /> },
  { path: "/training/flagger", element: <FlaggerModule /> },
  { path: "/training/cdl", element: <CDLPrepModule /> },
  { path: "/training/videos", element: <TrainingVideosPage /> },
  { path: "/training/course/:id", element: <CourseDetail /> },
];

const schedulingRoutes: AppRoute[] = [
  { path: "/scheduling", element: <SchedulingIndex /> },
  { path: "/scheduling/editor", element: <RequireAdminPage><ScheduleEditor /></RequireAdminPage> },
  { path: "/scheduling/day/:date", element: <DayViewPage /> },
];

const integrationRoutes: AppRoute[] = [
  { path: "/integrations", element: <RequireAdminPage><Navigate to="/admin/integrations" replace /></RequireAdminPage> },
];

const securityRoutes: AppRoute[] = [
  { path: "/security", element: <RequireAdminPage><Navigate to="/admin/security" replace /></RequireAdminPage> },
];
const devRoutes: AppRoute[] = [{ path: "/style-preview", element: <StylePreview /> }];

const protectedRoutes: AppRoute[] = [
  ...dashboardRoutes,
  ...organizationRoutes,
  ...formRoutes,
  ...navigationRoutes,
  ...vaultRoutes,
  ...messageRoutes,
  ...trainingRoutes,
  ...schedulingRoutes,
  ...integrationRoutes,
  ...securityRoutes,
  ...devRoutes,
  { path: "/owner", element: <RequireAdminPage><OwnerDashboard /></RequireAdminPage> },
  { path: "/owner/:tab", element: <RequireAdminPage><OwnerDashboard /></RequireAdminPage> },
  { path: "/admin", element: <RequireAdminPage><OwnerDashboard /></RequireAdminPage> },
  { path: "/admin/:tab", element: <RequireAdminPage><OwnerDashboard /></RequireAdminPage> },
];

function renderRoutes(routes: AppRoute[]) {
  return routes.map(({ path, element }) => (
    <Route
      key={path}
      path={path}
      element={<Suspense fallback={<RouteFallback />}>{element}</Suspense>}
    />
  ));
}

function OrgGateRedirect() {
  const { user, loading, orgMemberships } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isOrganizationRoute = location.pathname.startsWith("/organization");

  useEffect(() => {
    if (loading) return;
    if (user && orgMemberships.length === 0 && !isOrganizationRoute) {
      navigate("/organization?mode=create", { replace: true });
    }
  }, [user, loading, orgMemberships.length, isOrganizationRoute, navigate]);

  return null;
}

function AssistantRouteTracker() {
  const location = useLocation();
  const { setRoute } = useAssistant();

  useEffect(() => {
    setRoute(location.pathname);
  }, [location.pathname, setRoute]);

  return null;
}

export default function AppRoutes() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <AssistantRouteTracker />
      <OrgGateRedirect />
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          {renderRoutes(publicRoutes)}
        </Route>

        {/* Protected Routes */}
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            {renderRoutes(protectedRoutes)}
          </Route>
        </Route>

        {/* Fallback */}
        <Route
          path="*"
          element={
            <Suspense fallback={<RouteFallback />}>
              <NotFound />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
