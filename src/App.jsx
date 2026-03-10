import React from "react";
import PropTypes from "prop-types";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { AutoSignIn } from "./firebase/AutoSignIn";
import { ItemsProvider } from "./contexts/ItemsProvider";
import { ModalsProvider } from "./contexts/ModalsProvider";
import Navbar from "./components/Navbar";
import { SignUpModal, RulesModal } from "./components/Modal";
import HomePage from "./pages/Home";
import AdminPage from "./pages/Admin";
import Footer from "./components/Footer";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

function App() {
  const demo = false;

  // 1. Grab both 'user' AND 'admin' from your secure sign-in file
  const { user, admin } = AutoSignIn();

  const Providers = ({ children }) => {
    return (
      <ItemsProvider demo={demo}>
        <ModalsProvider>{children}</ModalsProvider>
      </ItemsProvider>
    );
  };

  function ProtectedRoute({ children, condition }) {
    return condition ? children : <Navigate to={import.meta.env.BASE_URL} />;
  }

  // 2. Create a clean, professional "Please Log In" screen
  const LoginScreen = () => (
    <div className="container mt-5 text-center" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card p-5 shadow-sm border-0 bg-light">
        <h2 className="mb-3">🔒 Internal Company Portal</h2>
        <p className="text-muted">
          Welcome to the Dicoding Asset Auction. <br />
          Please log in using your <b>@dicoding.com</b> email address to view and bid on company assets.
        </p>
      </div>
    </div>
  );

  return (
    <Providers>
      {/* 1. Add basename here. It MUST match your Repo Name EXACTLY */}
      <Router basename="/auction-website">
        <Navbar admin={admin} />
        <SignUpModal />
        <RulesModal />
        <Routes>
          {/* 2. Paths must start with "/" */}
          <Route 
            path="/" 
            element={user ? <HomePage /> : <LoginScreen />} 
          />
          
          <Route
            path="/admin"
            element={
              <ProtectedRoute condition={admin}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      <Footer />
    </Providers>
  );
}

App.propTypes = {
  children: PropTypes.arrayOf(PropTypes.element),
  condition: PropTypes.bool
}

export default App;