import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { queryClient } from "./lib/queryClient";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
      <Toaster
        position="top-center"
        dir="rtl"
        toastOptions={{
          style: { fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif" },
        }}
      />
    </AuthProvider>
  </QueryClientProvider>,
);
