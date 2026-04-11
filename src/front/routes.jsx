import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { Single } from "./pages/Single";
import { Demo } from "./pages/Demo";
import Register from "./pages/Register";
import { Login } from "./pages/Login";
import { AccessDenied } from "./components/AccessDenied";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import UserManagement from "./pages/UserManagement";
import RoleManagement from "./pages/RoleManagement";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { OfficialRoute } from "./components/OfficialRoute";
import CompetenceManagement from "./pages/CompetenceManagement";
import TheoryManagement from "./pages/TheoryManagement";
import TheoryConsole from "./pages/TheoryConsole";
import CreateProject from "./pages/CreateProject";
import LocationManagement from "./pages/LocationManagement";
import ProjectList from "./pages/ProjectList";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectTechnicalSetup from "./pages/ProjectTechnicalSetup";
import ActivityCatalogManagement from "./pages/ActivityCatalogManagement";
import VerificationMeansManagement from "./pages/VerificationMeansManagement";
import { OfficialDashboard } from "./pages/OfficialDashboard";
import { ManagerDashboard } from "./pages/ManagerDashboard"
import AuditInbox from "./pages/AuditInbox";
import Profile from "./pages/Profile";
import OfficialInbox from "./pages/OfficialInbox"
import QuickHealthDash from "./pages/QuickHealthDash";
import { TrackingDashboard } from "./pages/TrackingDashboard";
import { OfficialPlanning } from "./pages/OfficialPlanning";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />} errorElement={<h1>Not found!</h1>} >

      {/* Nested Routes: Defines sub-routes within the BaseHome component. */}
      <Route path="/" element={<Home />} />
      <Route path="/single/:theId" element={<Single />} />  {/* Dynamic route for single items */}
      <Route path="/demo" element={<Demo />} />
      <Route path="/register" element={< Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/denied" element={<AccessDenied />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/profile" element={< Profile />} />
      {/* RUTA PROTEGIDA PARA EL GERENTE */}
      <Route
        path="/manager/users"
        element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/roles"
        element={
          <ProtectedRoute>
            <RoleManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/competences"
        element={
          <ProtectedRoute>
            <CompetenceManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/theories"
        element={
          <ProtectedRoute>
            <TheoryManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/theories/:id/console"
        element={
          <ProtectedRoute>
            <TheoryConsole />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/projects/create"
        element={
          <ProtectedRoute>
            <CreateProject />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/locations"
        element={
          <ProtectedRoute>
            <LocationManagement />
          </ProtectedRoute>
        }
      />


      <Route
        path="/manager/projects"
        element={
          <ProtectedRoute>
            <ProjectList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/projects/:id"
        element={
          <ProtectedRoute>
            <ProjectDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/projects/edit/:id"
        element={
          <ProtectedRoute>
            <CreateProject />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/projects/:projectId/setup"
        element={
          <ProtectedRoute>
            <ProjectTechnicalSetup />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/catalogs/verification-means"
        element={
          <ProtectedRoute>
            <VerificationMeansManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/catalogs/activities"
        element={
          <ProtectedRoute>
            <ActivityCatalogManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/dashboard"
        element={
          <ProtectedRoute>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/official/dashboard"
        element={
          <OfficialRoute>
            <OfficialDashboard />
          </OfficialRoute>
        }
      />

      <Route
        path="/official/my-activities"
        element={
          <OfficialRoute>
            <OfficialInbox />
          </OfficialRoute>
        }
      />

      <Route
        path="/official/health-status"
        element={
          <OfficialRoute>
            <QuickHealthDash />
          </OfficialRoute>
        }
      />

      <Route
        path="/manager/audit-inbox"
        element={
          <ProtectedRoute allowedRoles={["Administrador", "Gerente", "Monitoreo"]}>
            <AuditInbox />
          </ProtectedRoute>
        }
      />

      <Route
        path="/official/planning"
        element={
          <OfficialRoute>
            <OfficialPlanning />
          </OfficialRoute>
        }
      />

      <Route
        path="/official/tracking"
        element={
          <OfficialRoute>
            <TrackingDashboard />
          </OfficialRoute>
        }
      />

    </Route>
  )
);