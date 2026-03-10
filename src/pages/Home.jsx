import React, { useContext } from "react"; // Added useContext
import Grid from "../components/Grid";
import { ItemModal } from "../components/Modal";
import { ModalsContext } from "../contexts/ModalsContext"; // Import Context
import { ModalTypes } from "../utils/modalTypes";       // Import ModalTypes

function HomePage() {
  // Grab the "openModal" tool
  const { openModal } = useContext(ModalsContext);

  return (
    <div className="container mt-3">
      {/* THIS IS THE BUTTON! */}
      <div className="mb-4 text-center">
        <button 
          className="btn btn-outline-primary" 
          onClick={() => openModal(ModalTypes.RULES)}
        >
          📜 Read Bidding Rules
        </button>
      </div>
      
      <Grid />
      <ItemModal />
    </div>
  );
}

export default HomePage;