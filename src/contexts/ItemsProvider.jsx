import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { db, auth } from "../firebase/config"; // 1. IMPORT auth
import { onSnapshot, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth"; // 2. IMPORT onAuthStateChanged
import { unflattenItems } from "../firebase/utils";
import { ItemsContext } from "./ItemsContext";

export const ItemsProvider = ({ demo, children }) => {
  const [items, setItems] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 3. Track login state

  // 4. Watch for Login/Logout changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // 5. If not logged in, stop everything and return
    if (!isLoggedIn) {
      setItems([]);
      return;
    }

    const docRef = doc(db, "auction", "items");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        console.debug("<ItemsProvider /> read from auction/items");
        setItems(unflattenItems(docSnap, demo));
      } else {
        setItems([]); 
      }
    }, (error) => {
      // Ignore permission errors during signout
      if (error.code !== 'permission-denied') {
        console.error("Firebase Listener Error:", error.message);
      }
    });

    return () => unsubscribe(); 
  }, [demo, isLoggedIn]); // 6. Listen to isLoggedIn

  return (
    <ItemsContext.Provider value={{ items }}>{children}</ItemsContext.Provider>
  );
};

ItemsProvider.propTypes = {
  demo: PropTypes.bool,
  children: PropTypes.any // Changed from object to any to avoid warnings
}