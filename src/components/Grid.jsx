import React, { useContext } from "react";
import { Item } from "./Item";
import { ItemsContext } from "../contexts/ItemsContext";
import { ModalsContext } from "../contexts/ModalsContext"; // 1. Import this

const Grid = () => {
  const { items } = useContext(ItemsContext);
  const { openModal } = useContext(ModalsContext); // 2. Grab the modal tool

  return (

    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4">
      {items.map((item) => {
        // 3. PASS IT TO THE ITEM COMPONENT
        return <Item key={item.id} item={item} openModal={openModal} />;
      })}
    </div>
  );
};

export default Grid;