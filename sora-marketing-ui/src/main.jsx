import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import Landing from "./pages/Landing.jsx";
import Auth from "./pages/Auth.jsx";
import Generator from "./pages/Generator.jsx";

function App() {

  const [page, setPage] = React.useState("landing");

  const [userEmail, setUserEmail] = React.useState(() => {
    return localStorage.getItem("user_email") || "";
  });

  const authed = !!localStorage.getItem("access_token");

  React.useEffect(() => {
    if (authed) {
      setPage("generator");
    }
  }, [authed]);


  if (page === "landing") {
    return <Landing onStart={() => setPage("auth")} />;
  }

  if (page === "auth") {
    return (
      <Auth
        onAuthed={(u) => {
          const email = u?.email || "";
          localStorage.setItem("user_email", email);
          setUserEmail(email);
          setPage("generator");
        }}
      />
    );
  }

  // generator page
  return (
    <Generator
      user={{ email: userEmail }}
      onLogout={() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("token_type");
        localStorage.removeItem("user_email");
        setUserEmail("");
        setPage("landing");
      }}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
