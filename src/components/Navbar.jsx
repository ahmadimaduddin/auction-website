import React, { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import { useNavigate, useLocation } from "react-router";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { ModalsContext } from "../contexts/ModalsContext";
import { ModalTypes } from "../utils/modalTypes";

const Navbar = ({ admin }) => {
  const openModal = useContext(ModalsContext).openModal;
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [authButtonText, setAuthButtonText] = useState("Sign up");
  const [adminButtonText, setAdminButtonText] = useState("Admin");
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.displayName != null) {
        setUser(`Hi ${user.displayName}`);
        setAuthButtonText("Sign out");
      }
    });

    // Clean up the onAuthStateChanged listener when the component unmounts
    return () => unsubscribe();
  }, [user.displayName]);

  const handleAdmin = () => {
    if (location.pathname.includes("admin")) {
      navigate("/"); // Just navigate to /
      setAdminButtonText("Admin");
    } else {
      navigate("/admin"); // Just navigate to /admin
      setAdminButtonText("Home");
    }
  };

  // ... inside your Navbar component ...

  const handleAuth = async () => {
    if (user) {
      await signOut(auth);
      setUser(null);
      setAuthButtonText("Log In");
    } else {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        console.log("⏳ Opening Google Popup...");
        const result = await signInWithPopup(auth, provider);
        console.log("✅ POPUP SUCCESS! Logged in as:", result.user.email);
      } catch (error) {
        console.error("❌ POPUP ERROR:", error.message);
      }
    }
  };

  /*
  const handleAuth = async () => {
      if (user) {
        // 1. Log the user out of Firebase
        await signOut(auth);
        
        // Update the button text back to login (keeping your original app state)
        setUser(null);
        setAuthButtonText("Log In"); 
        
      } else {
        // 2. Launch Google SSO instead of opening the original modal
        const provider = new GoogleAuthProvider();
        //provider.setCustomParameters({ prompt: 'select_account' }); // Forces account selection
        
        try {
          const result = await signInWithPopup(auth, provider);
          const loggedInUser = result.user;
          
          // 3. CRITICAL: Verify they are an employee
          // Replace "@yourcompany.com" with your actual domain
          if (!loggedInUser.email.endsWith("@dicoding.com")) {
            await signOut(auth); // Kick them out if personal email
            alert("Access restricted to company employees only.");
            return;
          }
          
          // 4. If login is successful, update the UI
          setUser(loggedInUser);
          setAuthButtonText("Log Out");
          
        } catch (error) {
          console.error("Login Failed", error);
        }
      }
    };
  
    */

  return (
    <nav className="navbar navbar-dark bg-primary">
      <div className="container-fluid">
        <div className="navbar-brand mb-0 h1 me-auto">
          <img
            src={import.meta.env.BASE_URL + "logo.png"}
            alt="Logo"
            width="30"
            height="24"
            className="d-inline-block align-text-top"
          />
          Dicoding Auction
        </div>
        <div className="row row-cols-auto">
          <div className="navbar-brand">{user.displayName || user.email}</div>
          {admin && (
            <button onClick={handleAdmin} className="btn btn-secondary me-2">{adminButtonText}</button>
          )}
          <button onClick={handleAuth} className="btn btn-secondary me-2">{authButtonText}</button>
        </div>
      </div>
    </nav>
  );
};


Navbar.propTypes = {
  admin: PropTypes.bool
}

export default Navbar;
