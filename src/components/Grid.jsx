import React, { useContext } from "react";
import { Item } from "./Item";
import { ItemsContext } from "../contexts/ItemsContext";
import { ModalsContext } from "../contexts/ModalsContext";

const Grid = () => {
  const { items } = useContext(ItemsContext);
  const { openModal } = useContext(ModalsContext);

  // --- SORTING LOGIC: Live first, Ended last ---
  const sortedItems = items ? [...items]
    .filter(item => !item.isArchived)
    .sort((a, b) => {
      const aTime = a.endTime?.toMillis ? a.endTime.toMillis() : new Date(a.endTime).getTime();
      const bTime = b.endTime?.toMillis ? b.endTime.toMillis() : new Date(b.endTime).getTime();
      const now = Date.now();
      
      const aEnded = aTime < now;
      const bEnded = bTime < now;

      // If one is ended and the other isn't, put the Ended one at the bottom (return 1)
      if (aEnded !== bEnded) return aEnded ? 1 : -1;

      // If both are active, sort by ending soonest
      return aTime - bTime;
    }) : [];

  return (
    <div className="row row-cols-1 row-cols-md-3 g-4">
      {sortedItems.map((item) => {
        return <Item key={item.id} item={item} openModal={openModal} />;
      })}
    </div>
  );
};

export default Grid;