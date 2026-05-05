
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import "leaflet/dist/leaflet.css";
import { AssistantProvider } from './contexts/AssistantContext';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { ThemeProvider } from './components/theme-provider';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
// Remove dark mode class addition
createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <AppProvider>
            <AssistantProvider>
              <App />
            </AssistantProvider>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
);
