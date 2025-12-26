import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import Auth from "./pages/Auth.jsx";
import Generator from "./pages/Generator.jsx";

function App() {
  const [userEmail, setUserEmail] = React.useState(() => {
    return localStorage.getItem("user_email") || "";
  });

  const authed = !!localStorage.getItem("access_token");

  return authed ? (
    <Generator userEmail={userEmail} />
  ) : (
    <Auth
      onAuthed={(u) => {
        const email = u?.email || "";
        setUserEmail(email);
      }}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
