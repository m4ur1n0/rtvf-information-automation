export function formatSentDate(epochSeconds: number): string {
  const date = new Date(epochSeconds * 1000);

  // Format as: "Jan 15, 2024"
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  return date.toLocaleDateString("en-US", options);
}

export function formatFullDate(epochSeconds: number): string {
  const date = new Date(epochSeconds * 1000);

  // Format as: "January 15, 2024 at 3:45 PM"
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  const dateStr = date.toLocaleDateString("en-US", dateOptions);
  const timeStr = date.toLocaleTimeString("en-US", timeOptions);

  return `${dateStr} at ${timeStr}`;
}
