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
        <p>Please read these rules carefully before bidding:</p>
        <ul className="list-group list-group-flush">
          <li className="list-group-item">
            <strong>1. Batch Limit (Anti-Monopoly):</strong> You can only be the highest bidder on <b>one item per category</b> at a time. If you are already leading in a batch, you must wait for someone to outbid you before you can bid on another item in that same category.
          </li>
          <li className="list-group-item">
            <strong>2. Bidding Lockout:</strong> Bidding is locked for new participants in the last 30 minutes. You must have placed at least one bid before this window to participate in the final closing.
          </li>
          <li className="list-group-item">
            <strong>3. Sniping Protection:</strong> Any bid placed in the final 5 minutes of an auction will automatically extend the auction duration by 15 minutes.
          </li>
          <li className="list-group-item">
            <strong>4. Price Ceiling:</strong> Bids cannot exceed the defined Maximum Sales Value to ensure fair pricing for all employees.
          </li>
          <li className="list-group-item">
            <strong>5. Terms of Sale:</strong> Assets are sold "As-Is". No warranty or IT support is provided after purchase.
          </li>
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
    setIsSubmitting(true);
    let nowTime = new Date().getTime();
    
    // 1. Time Check
    const endTimeMs = activeItem.endTime?.toMillis ? activeItem.endTime.toMillis() : new Date(activeItem.endTime || 0).getTime();
    const timeLeft = endTimeMs - nowTime;

    if (timeLeft < 0) {
      setFeedback("Sorry, this item has ended!");
      setValid("is-invalid");
      setIsSubmitting(false);
      return;
    }

    // 2. ANTI-MONOPOLY & 30-MINUTE ENTRY LOCK
    if (activeItem.category && activeItem.category.trim() !== "") {
      const sameCategoryItems = items.filter(i => i.category === activeItem.category && i.id !== activeItem.id);
      
      // Check if user has bid on THIS item before
      const hasBidOnThisItemBefore = activeItem.bids && Object.values(activeItem.bids).some(b => b.uid === auth.currentUser.uid);
      
      // Check if user is winning another item in the same category
      let isWinningAnother = sameCategoryItems.some(otherItem => {
        if (!otherItem.bids) return false;
        const bidsArray = Object.values(otherItem.bids);
        if (bidsArray.length === 0) return false; // Prevent reduce on empty array
        const winningBid = bidsArray.reduce((prev, curr) => (prev.amount > curr.amount) ? prev : curr);
        return winningBid.uid === auth.currentUser.uid;
      });

      // LOCK LOGIC:
      // If < 30 mins left, you MUST have bid on this specific item before,
      // OR you must be placing the very first bid on this item (to allow new items to start).
      const THIRTY_MINUTES = 30 * 60 * 1000;
      const isNewBidderOnThisItem = !hasBidOnThisItemBefore;
      const isFirstBidEverOnItem = !activeItem.bids || Object.keys(activeItem.bids).length === 0;

      if (timeLeft < THIRTY_MINUTES && isNewBidderOnThisItem && !isFirstBidEverOnItem) {
        setFeedback("Bidding is locked for new participants in the last 30 minutes.");
        setValid("is-invalid");
        setIsSubmitting(false);
        return;
      }

      if (isWinningAnother) {
        setFeedback(`You are already winning another item in the [${activeItem.category}] batch.`);
        setValid("is-invalid");
        setIsSubmitting(false);
        return;
      }
    }
    
    // 3. Bid Amount Checks
    if (!/^\d+(\.\d{1,2})?$/.test(bid)) {
      setFeedback("Please enter a valid amount!");
      setValid("is-invalid");
      setIsSubmitting(false);
      return;
    }
    
    const amount = parseFloat(bid);
    const status = itemStatus(activeItem);
    const minIncrease = 10000;
    
    if (amount < status.amount + minIncrease) {
      setFeedback("Bid too low!");
      setValid("is-invalid");
      setIsSubmitting(false);
      return;
    }

    // 4. Sniping Protection (Extend 15 mins if < 5 mins left)
    const FIVE_MINUTES = 5 * 60 * 1000;
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    let newEndTime = activeItem.endTime;
    if (timeLeft < FIVE_MINUTES) {
        newEndTime = Timestamp.fromMillis(endTimeMs + FIFTEEN_MINUTES);
    }
    
    // 5. Submit
    await updateDoc(doc(db, "auction", "items"), {
      [formatField(activeItem.id, status.bids + 1)]: {
        amount: amount,
        uid: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || auth.currentUser.email, 
        email: auth.currentUser.email || "",             
      },
      [`${formatField(activeItem.id, 0)}.endTime`]: newEndTime
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