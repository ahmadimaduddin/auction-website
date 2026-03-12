import React, { useState, useContext } from "react";
import { editItems, formatField, parseField } from "../firebase/utils";
import { db } from "../firebase/config";
import { doc, setDoc, updateDoc, deleteField, Timestamp, getDoc } from "firebase/firestore";
import { ItemsContext } from "../contexts/ItemsContext";
import { formatJakartaTime } from "../utils/formatString";

function AdminPage() {
  const { items } = useContext(ItemsContext);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const getLocalDatetimeString = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date - offset)).toISOString().slice(0, 16);
  };

  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 7);

  // 1. ADDED "category" TO STATE
  const [formData, setFormData] = useState({
    title: "", subtitle: "", detail: "", amount: "",
    salesValue: "",
    category: "", // <-- NEW FIELD
    primaryImage: "images/laptopdell.jpg", secondaryImage: "",
    endDate: formatJakartaTime(defaultEndDate)
  });

  const handleEditClick = (item) => {
    const endTimeMs = item.endTime?.toMillis ? item.endTime.toMillis() : new Date(item.endTime).getTime();
    const d = new Date(endTimeMs);

    // 2. THIS IS THE ONLY FORMAT datetime-local ACCEPTS:
    const isoString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    setFormData({
      title: item.title,
      subtitle: item.subtitle,
      detail: item.detail || "",
      amount: item.startingPrice || item.amount,
      salesValue: item.salesValue || "", // <-- LOAD IT
      category: item.category || "", // <-- Load existing category
      primaryImage: item.primaryImage,
      secondaryImage: item.secondaryImage || "",
      endDate: isoString
    });

    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const endTimestamp = Timestamp.fromDate(new Date(formData.endDate));
    const docRef = doc(db, "auction", "items");

    if (editingId) {
      const fieldKey = formatField(editingId, 0);
      await updateDoc(docRef, {
        [`${fieldKey}.title`]: formData.title, [`${fieldKey}.subtitle`]: formData.subtitle,
        [`${fieldKey}.detail`]: formData.detail,
        [`${fieldKey}.amount`]: parseFloat(formData.amount), [`${fieldKey}.startingPrice`]: parseFloat(formData.amount),
        [`${fieldKey}.salesValue`]: parseFloat(formData.salesValue) || 0,
        [`${fieldKey}.category`]: formData.category, // <-- Save Category
        [`${fieldKey}.primaryImage`]: formData.primaryImage, [`${fieldKey}.secondaryImage`]: formData.secondaryImage,
        [`${fieldKey}.endTime`]: endTimestamp
      });
      alert("Item successfully updated!");
    } else {
      const newItemId = Date.now();
      const fieldKey = formatField(newItemId, 0);
      const itemData = {
        id: newItemId,
        title: formData.title,
        subtitle: formData.subtitle,
        detail: formData.detail,
        amount: parseFloat(formData.amount),
        startingPrice: parseFloat(formData.amount),
        currency: "IDR",
        salesValue: parseFloat(formData.salesValue) || 0,
        category: formData.category, // <-- Save Category
        primaryImage: formData.primaryImage,
        secondaryImage: formData.secondaryImage,
        isOpen: false,
        endTime: endTimestamp
      };
      await setDoc(docRef, { [fieldKey]: itemData }, { merge: true });
      alert("Asset added in Preview Mode! Open bidding when you are ready.");
    }

    setShowForm(false);
    setEditingId(null);
    setFormData({ title: "", subtitle: "", detail: "", amount: "", category: "", primaryImage: "images/laptopdell.jpg", secondaryImage: "", endDate: formatJakartaTime(defaultEndDate) });
  };

  const handleOpenBidding = async (itemId) => {
    if (!confirm("Open bidding? Employees will be able to place bids immediately!")) return;
    const fieldKey = formatField(itemId, 0);
    const docRef = doc(db, "auction", "items");
    await updateDoc(docRef, { [`${fieldKey}.isOpen`]: true });
  };

  const handleCloseEarly = async (itemId) => {
    if (!confirm("End this auction right now? The highest bidder will win!")) return;
    const fieldKey = formatField(itemId, 0);
    const docRef = doc(db, "auction", "items");
    await updateDoc(docRef, { [`${fieldKey}.endTime`]: Timestamp.now() });
  };

  // ==========================================
  // 5. SAFE DELETE (Item + All its Bids)
  // ==========================================
  const handleDelete = async (itemId) => {
    if (!confirm("⚠️ WARNING: This will permanently delete this asset AND all bids associated with it. Are you sure?")) return;

    const docRef = doc(db, "auction", "items");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const updates = {};
      let deletedFieldsCount = 0;

      // Look through the database and find everything that belongs to this item ID
      Object.keys(docSnap.data()).forEach((field) => {
        const parsed = parseField(field);

        // If the field belongs to our item (whether it's the base item or a bid), delete it
        if (parsed.item === itemId) {
          updates[field] = deleteField();
          deletedFieldsCount++;
        }
      });

      if (deletedFieldsCount > 0) {
        await updateDoc(docRef, updates);
        alert(`✨ Success! Deleted ${deletedFieldsCount} fields (item + all bids).`);
      } else {
        alert("Item not found in database!");
      }
    }
  };

  // ==========================================
  // 6. DELETE ALL BIDS (Database-wide)
  // ==========================================
  const handleDeleteAllBids = async () => {
    if (!confirm("⚠️ Are you sure you want to permanently delete EVERY bid on EVERY item?")) return;

    const docRef = doc(db, "auction", "items");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const updates = {};
      let bidCount = 0;

      // Loop through the entire database
      Object.keys(docSnap.data()).forEach((field) => {
        // If the field is a bid (bid > 0), mark it for deletion
        if (parseField(field).bid > 0) {
          updates[field] = deleteField();
          bidCount++;
        }
      });

      if (bidCount === 0) {
        alert("No bids found to delete!");
        return;
      }

      // Push the massive delete command to Firebase
      await updateDoc(docRef, updates);
      alert(`Success! Cleared ${bidCount} bids across all items.`);
    }
  };

  const getWinner = (itemBids) => {
    if (!itemBids) return { name: "No bids yet", email: "", amount: 0 };
    const bidsArray = Object.values(itemBids);
    if (bidsArray.length === 0) return { name: "No bids yet", email: "", amount: 0 };

    const winningBid = bidsArray.reduce((prev, current) => (prev.amount > current.amount) ? prev : current);
    return {
      name: winningBid.displayName || winningBid.name || winningBid.email || "Anonymous",
      email: winningBid.email || "",
      amount: winningBid.amount
    };
  };

  // ==========================================
  // 7. ARCHIVE COMPLETED AUCTIONS
  // ==========================================
  const handleArchiveEndedItems = async () => {
    if (!confirm("📦 Archive completed auctions? They will be hidden from employees but kept in your Admin history.")) return;

    const docRef = doc(db, "auction", "items");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const updates = {};
      let archivedCount = 0;
      const now = Date.now();

      Object.keys(data).forEach((field) => {
        const parsed = parseField(field);
        if (parsed.bid === 0) {
          const itemData = data[field];
          const endTimeMs = itemData.endTime?.toMillis ? itemData.endTime.toMillis() : new Date(itemData.endTime).getTime();

          // If the item has ended and isn't already archived
          if (endTimeMs < now && !itemData.isArchived) {
            updates[`${field}.isArchived`] = true; // <-- Safely sets the Archive flag!
            archivedCount++;
          }
        }
      });

      if (archivedCount === 0) {
        alert("No new completed auctions to archive!");
        return;
      }

      await updateDoc(docRef, updates);
      alert(`✨ Success! Archived ${archivedCount} completed auctions.`);
    }
  };

  const clickAddNew = () => {
    setEditingId(null);
    setFormData({ title: "", subtitle: "", detail: "", amount: "", category: "", primaryImage: "images/laptopdell.jpg", secondaryImage: "", endDate: formatJakartaTime(defaultEndDate) });
    setShowForm(!showForm);
  };

  // --- INTELLIGENT SORTING LOGIC ---
  const sortedItems = items ? [...items].sort((a, b) => {
    const aTime = a.endTime?.toMillis ? a.endTime.toMillis() : new Date(a.endTime).getTime();
    const bTime = b.endTime?.toMillis ? b.endTime.toMillis() : new Date(b.endTime).getTime();
    const now = Date.now();

    const aEnded = aTime < now;
    const bEnded = bTime < now;

    // 1. Live/Preview items go to the top. Ended items go to the bottom.
    if (aEnded !== bEnded) return aEnded ? 1 : -1;

    // 2. If both are Live, sort by ending soonest
    if (!aEnded) return aTime - bTime;

    // 3. If both are Ended, show the most recently ended first
    return bTime - aTime;
  }) : [];

  const handleExportCSV = () => {
    // 1. Define the CSV Header
    let csvContent = "data:text/csv;charset=utf-8,Asset Name,Category,Winner Name,Winner Email,Final Bid\n";

    items.forEach(item => {
      // 2. Get the winner object properly
      const winner = getWinner(item.bids);

      // 3. Extract data from the winner object
      // If winner is a string "No bids yet", handle it safely
      const winnerName = typeof winner === 'object' ? winner.name : "No bids yet";
      const winnerEmail = typeof winner === 'object' ? winner.email : "";
      const finalBid = typeof winner === 'object' ? winner.amount : 0;

      // 4. Clean strings to prevent commas from breaking the CSV (using quotes)
      const row = `${item.title},${item.category || "-"},"${winnerName}","${winnerEmail}",${finalBid}\n`;
      csvContent += row;
    });

    // 5. Trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "auction_winners.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="container mt-4 mb-5">
      <h2 className="mb-4">👑 Admin Command Center</h2>

      <div className="card p-3 mb-4 shadow-sm border-0 bg-light d-flex flex-row justify-content-between align-items-center">
        <div>
          <button className="btn btn-primary me-2" onClick={clickAddNew}>
            {showForm && !editingId ? "Cancel Adding" : "+ Quick Add Item"}
          </button>
          <button className="btn btn-outline-secondary me-2" onClick={() => editItems(undefined, true, false)}>
            Sync from items.yml
          </button>
          <button className="btn btn-danger me-2" onClick={handleDeleteAllBids}>
            ⚠️ Delete All Bids
          </button>
          <button className="btn btn-outline-success me-2" onClick={handleExportCSV}>
            📥 Export Winners (CSV)
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card p-4 mb-4 shadow-sm border-0 border-top border-primary border-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">{editingId ? "✏️ Edit Asset Details" : "✨ Add New Asset (Preview Mode)"}</h5>
            {editingId && <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowForm(false)}>Cancel Edit</button>}
          </div>

          <form onSubmit={handleSaveItem} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Asset Name</label>
              <input type="text" className="form-control" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Specs / Subtitle</label>
              <input type="text" className="form-control" required value={formData.subtitle} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} />
            </div>
            {/* NEW CATEGORY INPUT */}
            <div className="col-md-3">
              <label className="form-label">Category / Batch</label>
              <input type="text" className="form-control" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Start Price (Rp)</label>
              <input type="number" className="form-control" required min="0" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
            </div>
            {/* NEW MAX VALUE INPUT */}
            <div className="col-md-3">
              <label className="form-label">Max Value (Cap)</label>
              <input type="number" className="form-control" placeholder="Optional cap" value={formData.salesValue} onChange={e => setFormData({ ...formData, salesValue: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label">End Date & Time</label>
              <input
                type="datetime-local"
                className="form-control"
                required
                value={formData.endDate} // This will now show the correct date!
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Primary Image Path</label>
              <input type="text" className="form-control" required value={formData.primaryImage} onChange={e => setFormData({ ...formData, primaryImage: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Secondary Image Path (Optional)</label>
              <input type="text" className="form-control" placeholder="e.g. images/laptop-side.jpg" value={formData.secondaryImage} onChange={e => setFormData({ ...formData, secondaryImage: e.target.value })} />
            </div>

            <div className="col-12">
              <label className="form-label">Condition Details & Description</label>
              <textarea className="form-control" rows="3" required value={formData.detail} onChange={e => setFormData({ ...formData, detail: e.target.value })}></textarea>
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-success">
                {editingId ? "Save Changes" : "Publish to Live Auction"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LIVE AUCTIONS DATA TABLE */}
      <div className="card shadow-sm border-0 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th>Asset Info</th>
                <th>Price & Bids</th>
                <th>Status & Deadline</th>
                <th>Leader / Winner</th>
                <th className="text-end" style={{ minWidth: "250px" }}>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {items && [...items]
                .sort((a, b) => {
                  const aTime = a.endTime?.toMillis ? a.endTime.toMillis() : new Date(a.endTime).getTime();
                  const bTime = b.endTime?.toMillis ? b.endTime.toMillis() : new Date(b.endTime).getTime();
                  const now = Date.now();
                  const aEnded = aTime < now;
                  const bEnded = bTime < now;
                  if (aEnded !== bEnded) return aEnded ? 1 : -1;
                  return aTime - bTime;
                })
                .map((item) => {
                  // Logic
                  const endTimeMs = item.endTime?.toMillis ? item.endTime.toMillis() : new Date(item.endTime).getTime();
                  const isEnded = endTimeMs < Date.now();
                  const isPreview = item.isOpen === false;
                  const formattedDate = formatJakartaTime(endTimeMs);

                  let bidCount = 0;
                  let currentPrice = item.startingPrice || item.amount;
                  if (item.bids) {
                    const bidsArray = Object.values(item.bids);
                    bidCount = bidsArray.length;
                    if (bidCount > 0) {
                      const winningBid = bidsArray.reduce((prev, current) => (prev.amount > current.amount) ? prev : current);
                      currentPrice = winningBid.amount;
                    }
                  }

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <img
                            src={item.primaryImage?.startsWith("http") ? item.primaryImage : import.meta.env.BASE_URL + item.primaryImage}
                            alt={item.title}
                            style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "8px", marginRight: "15px" }}
                          />
                          <div>
                            <strong>{item.title}</strong>
                            {item.category && <span className="ms-2 badge bg-secondary" style={{ fontSize: "0.7em" }}>{item.category}</span>}
                            <br />
                            <small className="text-muted">Start: Rp {item.startingPrice?.toLocaleString('id-ID') || item.amount?.toLocaleString('id-ID')}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong className={bidCount > 0 ? "text-success" : ""}>Rp {currentPrice.toLocaleString('id-ID')}</strong>
                        <br />
                        <small className="text-muted">{bidCount} bid(s) placed</small>
                      </td>
                      <td>
                        <div className="mb-1">
                          {isEnded ? <span className="badge bg-secondary">Ended</span>
                            : isPreview ? <span className="badge bg-info text-dark">Preview (Locked)</span>
                              : <span className="badge bg-success">Live</span>}
                        </div>
                        <small className="text-muted">{formattedDate}</small>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.95em" }}>{getWinner(item.bids).name}</span>
                      </td>
                      <td className="text-end">
                        {!isEnded && isPreview && (
                          <button className="btn btn-sm btn-info me-2 fw-bold text-dark mb-1" onClick={() => handleOpenBidding(item.id)}>🔓 Open</button>
                        )}
                        {!isEnded && !isPreview && (
                          <button className="btn btn-sm btn-warning me-2 mb-1" onClick={() => handleCloseEarly(item.id)}>Close</button>
                        )}
                        {isEnded && (
                          <button className="btn btn-sm btn-outline-success me-2 mb-1" onClick={() => {
                            const winner = getWinner(item.bids);
                            if (!winner.email) { alert("No email saved!"); return; }
                            const subject = `Congratulations! You won: ${item.title}`;
                            const body = `Hi ${winner.name},\n\nCongratulations on winning the ${item.title} for Rp ${winner.amount.toLocaleString('id-ID')}.\n\nPlease coordinate with HRGA.`;
                            window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${winner.email}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                          }}>📧 Email</button>
                        )}
                        <button className="btn btn-sm btn-outline-primary me-2 mb-1" onClick={() => handleEditClick(item)}>Edit</button>
                        <button className="btn btn-sm btn-outline-danger mb-1" onClick={() => handleDelete(item.id)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ CORRECT PLACEMENT: OUTSIDE THE TABLE COMPLETELY! */}
      <div className="text-end mt-3">
        <button className="btn btn-sm btn-secondary" onClick={handleArchiveEndedItems}>
          🧹 Clear Completed Auctions
        </button>
      </div>

    </div>
  );
}

export default AdminPage;