import React, { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import { itemStatus } from "../utils/itemStatus";
import { formatTime, formatMoney } from "../utils/formatString";
import { ModalsContext } from "../contexts/ModalsContext";
import { ModalTypes } from "../utils/modalTypes";

export const Item = ({ item, openModal }) => {
  //const { openModal } = useContext(ModalsContext);

  const [primaryImageSrc, setPrimaryImageSrc] = useState(null);
  const [bids, setBids] = useState(0);
  const [amount, setAmount] = useState(item.startingPrice);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const status = itemStatus(item);
    setBids(status.bids);
    setAmount(formatMoney(item.currency, status.amount));
  }, [item]);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();

      // Safely handle Firebase Timestamps vs JS Dates
      const endTimeMs = item.endTime?.toMillis ? item.endTime.toMillis() : new Date(item.endTime).getTime();
      const remaining = endTimeMs - now;

      if (remaining > 0) {
        setTimeLeft(formatTime(remaining));
        requestAnimationFrame(updateTimer);
      } else {
        setTimeLeft("Item Ended");
      }
    };

    requestAnimationFrame(updateTimer);
  }, [item.endTime]);

  useEffect(() => {
    if (item.primaryImage) {
      // If it starts with 'http', it's an external link (Imgur/Unsplash).
      // If it doesn't, it's a local file in your 'public' folder.
      const src = item.primaryImage.startsWith("http")
        ? item.primaryImage
        : import.meta.env.BASE_URL + item.primaryImage;

      setPrimaryImageSrc(src);
    }
  }, [item.primaryImage]);

  // 1. Create a state to hold the winner's name
  const [highestBidder, setHighestBidder] = useState("Be the first to bid!");

  // 2. Use an Effect to update the name ONLY when the bids change
  useEffect(() => {
    if (item && item.bids) {
      const bidsArray = Object.values(item.bids);

      if (bidsArray.length > 0) {
        const winningBid = bidsArray.reduce((prev, current) =>
          (prev.amount > current.amount) ? prev : current
        );

        const winnerName = winningBid.displayName || winningBid.name || winningBid.email || "Anonymous Employee";
        setHighestBidder(`👑 Leading: ${winnerName}`);
      } else {
        setHighestBidder("Be the first to bid!");
      }
    } else {
      setHighestBidder("Be the first to bid!");
    }
  }, [item?.bids]);

  const endTimeMs = item.endTime?.toMillis ? item.endTime.toMillis() : new Date(item.endTime).getTime();
  const isEnded = endTimeMs < Date.now();

  return (
    <div className="col">
      <div
        className={`card h-100 ${item.isOpen === false ? "border-info shadow-sm" : ""}`}
        onClick={() => openModal(ModalTypes.ITEM, item)} // <--- Now this uses the passed prop!
        style={{ cursor: "pointer" }}
      >
        <img
          src={item.primaryImage.startsWith("http") ? item.primaryImage : import.meta.env.BASE_URL + item.primaryImage}
          className="card-img-top"
          alt={item.title}
        />

        {/* Show "Ended" if time is up, ELSE show "Preview" if locked */}
        {isEnded ? (
          <div className="bg-secondary text-white text-center fw-bold py-1" style={{ fontSize: "0.85em" }}>
            🏁 AUCTION ENDED
          </div>
        ) : item.isOpen === false ? (
          <div className="bg-info text-dark text-center fw-bold py-1" style={{ fontSize: "0.85em" }}>
            🔒 PREVIEW (Bidding Opens Soon)
          </div>
        ) : null}

        <div className="card-body">
          <h5 className="title">{item.title}</h5>
          <h6 className="card-subtitle mb-2 text-body-secondary">{item.subtitle}</h6>

          {/* NEW: Display the Max Sales Value */}
          {item.salesValue > 0 && (
            <span className="badge bg-warning text-dark mt-1">
              Max Value: Rp {item.salesValue.toLocaleString('id-ID')}
            </span>
          )}

          {/* ✅ SHOW CATEGORY BADGE */}
          {item.category && (
            <span className="badge bg-secondary mb-2" style={{ fontSize: "0.75em" }}>
              Kategory: {item.category}
            </span>
          )}

        </div>

        <div className="mt-2 px-3" style={{ fontSize: "0.9em" }}>
          {item.isOpen === false ? (
            <span className="text-muted">No bids allowed yet</span>
          ) : (
            <span className={highestBidder.includes("Leading") ? "text-success fw-bold" : "text-muted"}>
              {highestBidder}
            </span>
          )}
        </div>

        <ul className="list-group list-group-flush mt-2">
          <li className="list-group-item"><strong>{amount}</strong></li>
          <li className="list-group-item">
            {item.isOpen === false ? "0 bids" : `${bids} bids`} · {timeLeft}
          </li>
        </ul>
      </div>
    </div>
  );
}; // <--- THIS WAS THE MISSING BRACKET!

Item.propTypes = {
  item: PropTypes.shape({
    startingPrice: PropTypes.number,
    amount: PropTypes.number,
    currency: PropTypes.string.isRequired,
    endTime: PropTypes.object.isRequired,
    primaryImage: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string.isRequired,
    bids: PropTypes.object,
    isOpen: PropTypes.bool // Added this since we are checking it!
  })
};