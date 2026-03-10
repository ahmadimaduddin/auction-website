const formatNumberWithCommas = (x) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const formatMoney = (currency, amount) => {
  return `${currency}${formatNumberWithCommas(amount)}`;
};

export const formatJakartaTime = (dateInput) => {
  const date = new Date(dateInput);
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false // Uses 24-hour format
  });
};

const formatTime = (time) => {
  const seconds = time / 1000;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  // More exciting seconds when item has < 10 minutes left
  const formattedSeconds =
    minutes > 9 || hours || days
      ? Math.round(remainingSeconds)
      : remainingSeconds.toFixed(1);

  let timeString = "";
  if (days) timeString += `${days}d `;
  if (hours) timeString += `${hours}h `;
  if (minutes) timeString += `${minutes}m `;
  if (remainingSeconds) timeString += `${formattedSeconds}s`;

  return timeString.trim();
};

const formatField = (item, bid) => {
  const item_padded = item.toString().padStart(5, "0");
  const bid_padded = bid.toString().padStart(5, "0");
  return `item${item_padded}_bid${bid_padded}`;
};

export { formatNumberWithCommas, formatMoney, formatTime, formatField };
