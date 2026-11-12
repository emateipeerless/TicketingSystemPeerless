export function formatWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function wasUpdated(ticket) {
  const created = new Date(ticket.created_at).getTime();
  const updated = new Date(ticket.updated_at).getTime();
  return updated - created > 1000;
}
