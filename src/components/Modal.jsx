import React, { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import { ModalsContext } from "../contexts/ModalsContext";
import { ItemsContext } from "../contexts/ItemsContext";
import { ModalTypes } from "../utils/modalTypes";
import { itemStatus } from "../utils/itemStatus"; // <-- Make sure this is imported!
import { formatField } from "../utils/formatString"; // <-- Make sure this is imported!
import { auth, db } from "../firebase/config"; // <-- Make sure this is imported!
import { doc, updateDoc, Timestamp } from "firebase/firestore"; // <-- Make sure this is imported!

// --- 1. Base Modal ---
export const Modal = ({ type, title, children }) => {
  const { closeModal, currentModal } = useContext(ModalsContext);
  if (type !== currentModal) return null;

  return ReactDOM.createPortal(
    <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }} onClick={closeModal}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={closeModal} />
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- 2. Rules Modal ---
export const RulesModal = () => {
  const { closeModal } = useContext(ModalsContext);
  return (
    <Modal type={ModalTypes.RULES} title="Auction Bidding Rules">
      <div className="modal-body">
        <h5>Welcome to the Dicoding Asset Auction!</h5>
        <ul className="list-group list-group-flush">
          <li className="list-group-item"><strong>1. Anti-Monopoly:</strong> You can only bid on one item per category at a time.</li>
          <li className="list-group-item"><strong>2. Fair Play:</strong> Bids in the last 5 minutes extend the auction by 10 mins.</li>
          <li className="list-group-item"><strong>3. Commit to Buy:</strong> Every bid is a binding commitment.</li>
          <li className="list-group-item"><strong>4. No Tech Support:</strong> Assets are sold "As-Is".</li>
        </ul>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-primary" onClick={closeModal}>I Understand</button>
      </div>
    </Modal>
  );
};

// --- 3. SignUp Modal (Keep your existing code here!) ---
export const SignUpModal = () => {
  // ... Paste your existing SignUpModal code here ...
};

export const ItemModal = () => {
  const { activeItem, closeModal } = useContext(ModalsContext);
  const { items } = useContext(ItemsContext);

  if (!activeItem) return null;

  const minIncrease = 10000;

  // ✅ CALCULATE TIMER & ENDED STATUS
  const endTimeMs = activeItem?.endTime?.toMillis
    ? activeItem.endTime.toMillis()
    : new Date(activeItem?.endTime || 0).getTime();

  // ✅ DEFINE THE VARIABLE REACT NEEDS
  const isAuctionEnded = endTimeMs < Date.now();

  const [bid, setBid] = useState("");
  const [valid, setValid] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [secondaryImageSrc, setSecondaryImageSrc] = useState(null);

  useEffect(() => {
    if (!activeItem || !activeItem.secondaryImage) {
      setSecondaryImageSrc(null);
      return;
    }

    // THE HYBRID LOGIC:
    const src = activeItem.secondaryImage.startsWith("http")
      ? activeItem.secondaryImage
      : import.meta.env.BASE_URL + activeItem.secondaryImage;

    setSecondaryImageSrc(src);
  }, [activeItem]);

  const handleSubmitBid = async () => {
    let nowTime = new Date().getTime();

    // Check if ended
    if (endTimeMs - nowTime < 0) {
      setFeedback("Sorry, this item has already ended!");
      setValid("is-invalid");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    const amount = parseFloat(bid);

    // 1. Anti-Monopoly Check
    if (activeItem.category && activeItem.category.trim() !== "") {
      const sameCategoryItems = items.filter(i => i.category === activeItem.category && i.id !== activeItem.id);
      const isWinningAnother = sameCategoryItems.some(otherItem => {
        if (!otherItem.bids) return false;
        const bids = Object.values(otherItem.bids);
        const winner = bids.reduce((prev, curr) => (prev.amount > curr.amount) ? prev : curr);
        return winner.uid === auth.currentUser.uid;
      });

      if (isWinningAnother) {
        setFeedback(`You are already winning another item in the [${activeItem.category}] batch.`);
        setValid("is-invalid");
        setIsSubmitting(false);
        return;
      }
    }

    // 2. Submit Bid
    const status = itemStatus(activeItem);
    await updateDoc(doc(db, "auction", "items"), {
      [formatField(activeItem.id, status.bids + 1)]: {
        amount: amount,
        uid: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || "",
        email: auth.currentUser.email || "",
      },
    });

    setValid("is-valid");
    setTimeout(() => { closeModal(); setIsSubmitting(false); }, 1000);
  };

  return (
    <Modal type={ModalTypes.ITEM} title={activeItem.title}>
      <div className="modal-body">
        <p>{activeItem.detail}</p>
        {secondaryImageSrc && <img src={secondaryImageSrc} className="img-fluid rounded" alt={activeItem.title} />}
      </div>
      <div className="modal-footer justify-content-start">
        <div className="input-group">
          <span className="input-group-text">{activeItem.currency}</span>
          <input
            type="number"
            className={`form-control ${valid}`}
            onChange={(e) => setBid(e.target.value)}
            // Check end time dynamically
            disabled={
              activeItem.isOpen === false ||
              (activeItem.endTime?.toMillis ? activeItem.endTime.toMillis() : new Date(activeItem.endTime || 0).getTime()) < Date.now() ||
              isSubmitting
            }
            placeholder={
              activeItem.isOpen === false ? "Locked" :
                ((activeItem.endTime?.toMillis ? activeItem.endTime.toMillis() : new Date(activeItem.endTime || 0).getTime()) < Date.now()) ? "Auction Ended" : `Min: ${itemStatus(activeItem).amount + minIncrease}`
            }
            min={itemStatus(activeItem).amount + minIncrease}
            step={minIncrease}
          />
          <button
            type="button"
            className={`btn ${(activeItem.isOpen === false || (activeItem.endTime?.toMillis ? activeItem.endTime.toMillis() : new Date(activeItem.endTime || 0).getTime()) < Date.now()) ? "btn-secondary" : "btn-primary"}`}
            onClick={handleSubmitBid}
            disabled={isSubmitting || activeItem.isOpen === false || (activeItem.endTime?.toMillis ? activeItem.endTime.toMillis() : new Date(activeItem.endTime || 0).getTime()) < Date.now()}
          >
            {activeItem.isOpen === false ? "🔒 Bidding Opens Soon" :
              ((activeItem.endTime?.toMillis ? activeItem.endTime.toMillis() : new Date(activeItem.endTime || 0).getTime()) < Date.now()) ? "Item Ended" : "Submit bid"}
          </button>
        </div>
        <div className="text-danger small">{feedback}</div>
      </div>
    </Modal>
  );
};