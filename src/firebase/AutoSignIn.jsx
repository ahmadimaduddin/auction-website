import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./config";

export const AutoSignIn = () => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("🔍 LOGIN CHECK:", currentUser ? currentUser.email : "Nobody logged in");

      if (currentUser) {

        // 👑 ADMIN BYPASS: Add your personal Gmail here
        const myPersonalEmail = "olele76@gmail.com";

        // 1. Check if email is NOT dicoding AND NOT your personal email
        const isDicoding = currentUser.email.toLowerCase().endsWith("@dicoding.com");
        const isBypassed = currentUser.email.toLowerCase() === myPersonalEmail.toLowerCase();

        if (!isDicoding && !isBypassed) {
          alert("Access restricted.");
          await auth.signOut();
          return;
        }


        setUser(currentUser);

        // CHECK ADMIN STATUS
        const userDocRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists() && docSnap.data().admin) {
          console.log("👑 ADMIN PRIVILEGES GRANTED");
          setAdmin(true);
        } else {
          console.log("💼 REGULAR EMPLOYEE");
          setAdmin(false);
        }

      } else {
        setUser(null);
        setAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // THIS IS THE CRITICAL LINE THAT WAS MISSING:
  return { user, admin };
};