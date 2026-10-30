import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import AppRoutes from "./router";
import { AuthProvider } from "./lib/auth";
import { OrgProvider } from "./lib/org";
import { PlatformAdminProvider } from "./lib/platform";
import { bootstrapTheme } from "./lib/theme";

// Before React paints: the sign-in screens render before any workspace loads,
// so the remembered appearance has to be on <html> already.
bootstrapTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PlatformAdminProvider>
          <OrgProvider>
            <AppRoutes />
          </OrgProvider>
        </PlatformAdminProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
