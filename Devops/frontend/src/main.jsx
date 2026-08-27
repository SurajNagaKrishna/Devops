import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "663003203662-kpfq4d8j6p4qrit9pvn89ng2n3rigdt9.apps.googleusercontent.com";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
       <App />
    </GoogleOAuthProvider>
  </StrictMode>
);