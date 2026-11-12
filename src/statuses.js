export const STATUSES = [
  { id: "submitted", label: "Submitted", hint: "Received, not started yet" },
  { id: "in_review", label: "In review", hint: "Being looked at" },
  { id: "in_progress", label: "In progress", hint: "Work has started" },
  { id: "needs_info", label: "Needs info", hint: "Waiting on a reply" },
  { id: "done", label: "Done", hint: "Finished" },
];

export function statusLabel(id) {
  return STATUSES.find((status) => status.id === id)?.label || id;
}
