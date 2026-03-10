import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { db } from "../firebase/config";
import { onSnapshot, doc, setDoc } from "firebase/firestore";
import { unflattenItems } from "../firebase/utils";
import { ItemsContext } from "./ItemsContext";

export const ItemsProvider = ({ demo, children }) => {
  const [items, setItems] = useState([]);

useEffect(() => {
    const docRef = doc(db, "auction", "items");
    
    // We add an error handler to the snapshot so it doesn't crash React if it fails
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        // Populate items state
        console.debug("<ItemsProvider /> read from auction/items");
        setItems(unflattenItems(docSnap, demo));
      } else {
        // Do NOT try to write to the database here!
        // Just set the items to an empty array so the page loads cleanly.
        console.debug("<ItemsProvider /> auction/items is empty. Waiting for Admin to upload items.");
        setItems([]); 
      }
    }, (error) => {
      console.error("Firebase Listener Error:", error.message);
    });

    return () => unsubscribe(); // Clean up the listener on unmount
  }, [demo]);

  return (
    <ItemsContext.Provider value={{ items }}>{children}</ItemsContext.Provider>
  );
};

ItemsProvider.propTypes = {
  demo: PropTypes.bool,
  children: PropTypes.object
}
