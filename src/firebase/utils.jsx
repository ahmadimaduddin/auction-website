import {
  getDoc,
  updateDoc,
  doc,
  setDoc,
  Timestamp,
  deleteField,
} from "firebase/firestore";
import { db } from "./config";
import yaml from "js-yaml";

// 1. Import it from its original home
import { formatField } from "../utils/formatString";

// 2. Add 'export' to parseField
export const parseField = (key) => {
    const match = key.match(/item(\d+)_bid(\d+)/);
    return {
      item: Number(match[1]),
      bid: Number(match[2]),
    };
};

// 3. Re-export formatField so your new Admin Page can easily grab it from here!
export { formatField };

// ... (Keep your editItems function down here!) ...
  
export const unflattenItems = (doc, demo) => {
  let items = {};
  for (const [key, value] of Object.entries(doc.data())) {
    const { item, bid } = parseField(key);

    if (!(item in items)) items[item] = { bids: {} };

    if (bid === 0) {
      const { amount, endTime, ...itemData } = value;
      // Spread operator on `items[item]` in case bid 0 wasn't the first to be read
      items[item] = { ...items[item], ...itemData, startingPrice: amount, endTime: endTime.toDate() };
      if (demo) {
        const now = new Date();
        items[item].endTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours(),
          now.getMinutes() + items[item].endTime.getMinutes(),
          items[item].endTime.getSeconds()
        );
      }
    } else {
      items[item].bids[bid] = value;
    }
  }
  return Object.values(items);
};
  
export const editItems = (id = undefined, updateItems = false, deleteBids = false) => {
  fetch(import.meta.env.BASE_URL + "items.yml")
    .then((response) => response.text())
    .then((text) => yaml.load(text))
    .then((items) => {
      // FIX 1: Safely match the ID as a string
      if (id !== undefined) items =[items.find((item) => String(item.id) === String(id))];

      let action = updateItems ? 'update item data' : (deleteBids ? 'delete all bids' : '');
      let item = id === undefined ? 'all items' : `item ${id}`;
      if (confirm(`You are about to ${action} for ${item}, are you sure?`) == false) {
        return;
      }

      const docRef = doc(db, "auction", "items");
      getDoc(docRef)
        .then((docSnap) => {
          console.debug("editItems() read from auction/items");
          
          let data = docSnap.exists() ? docSnap.data() : {};
          let fields = Object.keys(data);
          
          if (fields.length === 0)
            fields = items.map((item) => formatField(item.id, 0));
          
          const updates = {};
          items.forEach((newItem) => {
            const endDate = newItem.endTime ? new Date(newItem.endTime) : new Date("2026-12-31T23:59:59");
            newItem.endTime = Timestamp.fromDate(endDate);
            
            fields
              // FIX 2: Force both sides to be Strings so "1" === "1" matches perfectly!
              .filter((field) => String(parseField(field).item) === String(newItem.id))
              .forEach((field) => {
                if (updateItems && parseField(field).bid === 0)
                  updates[field] = newItem;
                if (deleteBids && parseField(field).bid)
                  updates[field] = deleteField(); // This deletes the bid!
              });
          });

          // FIX 3: Stop early if there is actually nothing to delete
          if (Object.keys(updates).length === 0) {
             alert("No bids found to delete!");
             return;
          }

          // FIX 4: Apply the changes and alert the Admin when done
          setDoc(docRef, updates, { merge: true }).then(() => {
             console.debug("editItems() write success!");
             alert("Success! Action completed.");
          });
        })
        .catch((error) => console.error("Error in editItems:", error));
    });
};