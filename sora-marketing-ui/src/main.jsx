import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Auth from "./pages/Auth.jsx";
import Generator from "./pages/Generator.jsx";

function App() {
  const [user, setUser] = useState(null);

  return user ? (
    <Generator />
  ) : (
    <Auth onAuthed={(u) => setUser(u)} />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

