import { useEffect, useState } from "react";
import { api } from "./api";
import { formatWhen, wasUpdated } from "./format";
import StatusTrack from "./StatusTrack";
import { statusLabel } from "./statuses";

export default function RequesterApp({ token, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const [project, setProject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setError("");
    try {
      const data = await api("/tickets", { token });
      setTickets(data.tickets);
    } catch (err) {
      if (err.status === 401) onLogout();
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  const projects = [...new Set(tickets.map((ticket) => ticket.project))];

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setBanner("");
    setBusy(true);
    try {
      await api("/tickets", {
        method: "POST",
        token,
        body: { project, title, description },
      });
      setProject("");
      setTitle("");
      setDescription("");
      setBanner("Request sent. The progress flag will update here after it's reviewed.");
      await load();
    } catch (err) {
      if (err.status === 401) onLogout();
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="layout">
      <section className="card panel-sticky">
        <h2>New request</h2>
        <p className="lede">Describe the change the way you would in a message. Project, what it is, and enough detail to act on it.</p>
        <form onSubmit={onSubmit}>
          <label htmlFor="project">Project</label>
          <input
            id="project"
            name="project"
            list="project-names"
            maxLength={80}
            value={project}
            onChange={(event) => setProject(event.target.value)}
            placeholder="Peerless Connect"
            required
          />
          <datalist id="project-names">
            {projects.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <label htmlFor="title">Short title</label>
          <input
            id="title"
            name="title"
            minLength={4}
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add an export button"
            required
          />
          <label htmlFor="description">What needs to change?</label>
          <textarea
            id="description"
            name="description"
            minLength={10}
            maxLength={5000}
            rows={7}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Where it is, what happens now, and what you want instead."
            required
          />
          <p className="counter">{description.length}/5000</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {banner && (
            <p className="form-success" role="status">
              {banner}
            </p>
          )}
          <button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Submit request"}
          </button>
        </form>
      </section>
      <section>
        <div className="section-head">
          <h2>All requests</h2>
          <button type="button" className="secondary" onClick={load}>
            Refresh
          </button>
        </div>
        {loading && <p className="muted">Loading tickets…</p>}
        {!loading && tickets.length === 0 && (
          <div className="empty">
            <p>No requests yet.</p>
            <p className="muted">When someone sends one, it shows up here with a progress flag.</p>
          </div>
        )}
        <div className="stack">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TicketCard({ ticket }) {
  const [expanded, setExpanded] = useState(ticket.description.length <= 280);
  const text = expanded ? ticket.description : `${ticket.description.slice(0, 280).trimEnd()}…`;

  return (
    <article className={`ticket status-${ticket.status}`}>
      <header className="ticket-head">
        <div>
          <p className="project">{ticket.project}</p>
          <h3>{ticket.title}</h3>
        </div>
        <span className="ticket-id">#{ticket.id}</span>
      </header>
      <p className="meta">
        <span className={`flag flag-${ticket.status}`}>{statusLabel(ticket.status)}</span>
        From {ticket.submitter_name} · Sent {formatWhen(ticket.created_at)}
        {wasUpdated(ticket) ? ` · Updated ${formatWhen(ticket.updated_at)}` : ""}
      </p>
      <p className="description">{text}</p>
      {ticket.description.length > 280 && (
        <button type="button" className="text-button" onClick={() => setExpanded((open) => !open)}>
          {expanded ? "Show less" : "Show full request"}
        </button>
      )}
      <StatusTrack status={ticket.status} />
      {ticket.progress_note && (
        <blockquote className={ticket.status === "needs_info" ? "note note-ask" : "note"}>
          <span className="note-label">
            {ticket.status === "needs_info" ? "Question" : "Update"}
          </span>
          {ticket.progress_note}
        </blockquote>
      )}
    </article>
  );
}
