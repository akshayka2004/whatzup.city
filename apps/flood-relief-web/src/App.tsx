import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { HomePage } from "@/pages/public/HomePage";
import { AlertsPage } from "@/pages/public/AlertsPage";
import { CollectionCentresPage } from "@/pages/public/CollectionCentresPage";
import { ReliefCampsPage } from "@/pages/public/ReliefCampsPage";
import { VolunteerGroupsPage } from "@/pages/public/VolunteerGroupsPage";
import { EmergencyContactsPage } from "@/pages/public/EmergencyContactsPage";
import { LoginPage } from "@/pages/admin/LoginPage";
import { DashboardPage } from "@/pages/admin/DashboardPage";
import { AlertsAdminPage } from "@/pages/admin/AlertsAdminPage";
import { CollectionCentresAdminPage } from "@/pages/admin/CollectionCentresAdminPage";
import { ReliefCampsAdminPage } from "@/pages/admin/ReliefCampsAdminPage";
import { VolunteerGroupsAdminPage } from "@/pages/admin/VolunteerGroupsAdminPage";
import { EmergencyContactsAdminPage } from "@/pages/admin/EmergencyContactsAdminPage";
import { UsersAdminPage } from "@/pages/admin/UsersAdminPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  fontFamily: "var(--font-sans)",
                  fontSize: "14px",
                  borderRadius: "10px",
                },
                success: { iconTheme: { primary: "#16a34a", secondary: "#fff" } },
                error: { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
              }}
            />
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<HomePage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="collection-centres" element={<CollectionCentresPage />} />
                <Route path="relief-camps" element={<ReliefCampsPage />} />
                <Route path="volunteer-groups" element={<VolunteerGroupsPage />} />
                <Route path="emergency-contacts" element={<EmergencyContactsPage />} />
              </Route>

              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="alerts" element={<AlertsAdminPage />} />
                <Route path="collection-centres" element={<CollectionCentresAdminPage />} />
                <Route path="relief-camps" element={<ReliefCampsAdminPage />} />
                <Route path="volunteer-groups" element={<VolunteerGroupsAdminPage />} />
                <Route path="emergency-contacts" element={<EmergencyContactsAdminPage />} />
                <Route path="users" element={<UsersAdminPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
