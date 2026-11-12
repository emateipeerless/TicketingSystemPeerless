import { useEffect, useState } from "react";
import { api } from "./api";
import { formatWhen } from "./format";
import StatusTrack from "./StatusTrack";
import { STATUSES, statusLabel } from "./statuses";

function draftsFrom(tickets) {
  return Object.fromEntries(
    tickets.map((ticket) => [
      ticket.id,
      { status: ticket.status, progress_note: ticket.progress_note },
    ])
  );
}

export default function AdminApp({ token, onLogout }) {
  const [tab, setTab] = useState("queue");

  return (
    <div>
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "queue"}
          className={tab === "queue" ? "tab active" : "tab"}
          onClick={() => setTab("queue")}
        >
          Queue
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "people"}
          className={tab === "people" ? "tab active" : "tab"}
          onClick={() => setTab("people")}
        >
          Coworkers
        </button>
      </div>
      {tab === "queue" ? (
        <Queue token={token} onLogout={onLogout} />
      ) : (
        <People token={token} onLogout={onLogout} />
      )}
    </div>
  );
}

function Queue({ token, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [cardErrors, setCardErrors] = useState({});
  const [notice, setNotice] = useState("");

  async function load() {
    setError("");
    try {
      const data = await api("/tickets", { token });
      setTickets(data.tickets);
      setDrafts(draftsFrom(data.tickets));
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

  useEffect(() => {
    if (!savedId) return undefined;
    const timer = setTimeout(() => setSavedId(null), 2000);
    return () => clearTimeout(timer);
  }, [savedId]);

  const visible = tickets.filter((ticket) =>
    filter === "open" ? ticket.status !== "done" : ticket.status === filter
  );
  const openCount = tickets.filter((ticket) => ticket.status !== "done").length;

  function updateDraft(id, key, value) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
    setCardErrors((current) => ({ ...current, [id]: "" }));
  }

  async function save(ticket) {
    const draft = drafts[ticket.id];
    if (draft.status === "needs_info" && !draft.progress_note.trim()) {
      setCardErrors((current) => ({
        ...current,
        [ticket.id]: "Add a note explaining what you need from them.",
      }));
      return;
    }
    setSavingId(ticket.id);
    setCardErrors((current) => ({ ...current, [ticket.id]: "" }));
    try {
      const data = await api(`/tickets/${ticket.id}`, {
        method: "PATCH",
        token,
        body: draft,
      });
      setTickets((current) =>
        current.map((item) => (item.id === data.ticket.id ? data.ticket : item))
      );
      setDrafts((current) => ({
        ...current,
        [data.ticket.id]: {
          status: data.ticket.status,
          progress_note: data.ticket.progress_note,
        },
      }));
      const leavesThisList =
        (filter === "open" && data.ticket.status === "done") ||
        (filter !== "open" && data.ticket.status !== filter);
      if (leavesThisList) {
        setSavedId(null);
        setNotice(`#${data.ticket.id} is now ${statusLabel(data.ticket.status)}.`);
      } else {
        setNotice("");
        setSavedId(data.ticket.id);
      }
    } catch (err) {
      if (err.status === 401) onLogout();
      else setCardErrors((current) => ({ ...current, [ticket.id]: err.message }));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Submitted tickets</h2>
          <p className="lede">Set the flag and leave a note. That is what they see the next time they sign in.</p>
        </div>
        <button type="button" className="secondary" onClick={load}>
          Refresh
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="form-success" role="status">
          {notice}
        </p>
      )}
      <div className="filters">
        <button
          type="button"
          className={filter === "open" ? "chip active" : "chip"}
          onClick={() => setFilter("open")}
        >
          Active {openCount}
        </button>
        {STATUSES.map((status) => {
          const count = tickets.filter((ticket) => ticket.status === status.id).length;
          return (
            <button
              key={status.id}
              type="button"
              className={filter === status.id ? "chip active" : "chip"}
              onClick={() => setFilter(status.id)}
            >
              {status.label} {count}
            </button>
          );
        })}
      </div>
      {loading && <p className="muted">Loading tickets…</p>}
      {!loading && visible.length === 0 && (
        <div className="empty">
          <p>{tickets.length === 0 ? "No tickets yet." : "Nothing in this filter."}</p>
        </div>
      )}
      <div className="stack">
        {visible.map((ticket) => {
          const draft = drafts[ticket.id] || {
            status: ticket.status,
            progress_note: ticket.progress_note,
          };
          const dirty =
            draft.status !== ticket.status || draft.progress_note !== ticket.progress_note;
          return (
            <article key={ticket.id} className={`ticket status-${ticket.status}`}>
              <header className="ticket-head">
                <div>
                  <p className="project">{ticket.project}</p>
                  <h3>{ticket.title}</h3>
                </div>
                <span className="ticket-id">#{ticket.id}</span>
              </header>
              <p className="meta">
                From {ticket.submitter_name} ({ticket.submitter_username}) · Sent{" "}
                {formatWhen(ticket.created_at)}
              </p>
              <p className="description">{ticket.description}</p>
              <StatusTrack status={draft.status} />
              <div className="edit-grid">
                <div>
                  <label htmlFor={`status-${ticket.id}`}>Progress</label>
                  <select
                    id={`status-${ticket.id}`}
                    value={draft.status}
                    onChange={(event) => updateDraft(ticket.id, "status", event.target.value)}
                  >
                    {STATUSES.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.label} — {status.hint}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`note-${ticket.id}`}>Note they will see</label>
                  <textarea
                    id={`note-${ticket.id}`}
                    rows={3}
                    maxLength={2000}
                    value={draft.progress_note}
                    onChange={(event) => updateDraft(ticket.id, "progress_note", event.target.value)}
                    placeholder={
                      draft.status === "needs_info"
                        ? "What do you need them to answer?"
                        : "Optional update, for example what you changed or when you'll get to it."
                    }
                  />
                </div>
              </div>
              {cardErrors[ticket.id] && (
                <p className="form-error" role="alert">
                  {cardErrors[ticket.id]}
                </p>
              )}
              <div className="row-actions">
                <button type="button" disabled={!dirty || savingId === ticket.id} onClick={() => save(ticket)}>
                  {savingId === ticket.id ? "Saving…" : `Save ${statusLabel(draft.status)}`}
                </button>
                {savedId === ticket.id && <span className="saved">Saved</span>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function People({ token, onLogout }) {
  const [users, setUsers] = useState([]);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [created, setCreated] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetId, setResetId] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await api("/users", { token });
      setUsers(data.users);
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

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setBusy(true);
    try {
      const data = await api("/users", {
        method: "POST",
        token,
        body: { display_name: displayName, username, password },
      });
      setCreated({
        display_name: data.user.display_name,
        username: data.user.username,
        password,
      });
      setDisplayName("");
      setUsername("");
      setPassword("");
      await load();
    } catch (err) {
      if (err.status === 401) onLogout();
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onReset(event) {
    event.preventDefault();
    setError("");
    setResetMessage("");
    try {
      const data = await api(`/users/${resetId}/password`, {
        method: "POST",
        token,
        body: { password: resetPassword },
      });
      setResetMessage(`New password saved for ${data.user.display_name}. They will need to sign in again.`);
      setResetId(null);
      setResetPassword("");
    } catch (err) {
      if (err.status === 401) onLogout();
      else setError(err.message);
    }
  }

  const coworkers = users.filter((user) => user.role !== "admin");

  return (
    <div className="layout">
      <section className="card panel-sticky">
        <h2>Add a coworker</h2>
        <p className="lede">They use this sign-in to submit requests and check progress. Share the password with them directly.</p>
        <form onSubmit={onSubmit}>
          <label htmlFor="display-name">Name</label>
          <input
            id="display-name"
            value={displayName}
            maxLength={80}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
          <label htmlFor="new-username">Username</label>
          <input
            id="new-username"
            spellCheck={false}
            autoComplete="off"
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9._]{3,32}"
            title="Letters, numbers, dots, or underscores"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          <label htmlFor="new-password">Temporary password</label>
          <input
            id="new-password"
            type="text"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        {created && (
          <div className="callout">
            <p>
              <strong>{created.display_name}</strong> can sign in as <strong>{created.username}</strong>
            </p>
            <p>
              Password: <code>{created.password}</code>
            </p>
            <p className="muted">Copy it now. It is stored hashed, so this screen is the last time it is shown.</p>
            <button type="button" className="secondary" onClick={() => setCreated(null)}>
              Done
            </button>
          </div>
        )}
      </section>
      <section>
        <h2>Accounts</h2>
        {resetMessage && (
          <p className="form-success" role="status">
            {resetMessage}
          </p>
        )}
        <div className="stack">
          {loading && <p className="muted">Loading accounts…</p>}
          {!loading && coworkers.length === 0 && <div className="empty">No coworker accounts yet.</div>}
          {coworkers.map((user) => (
            <article key={user.id} className="person">
              <div>
                <h3>{user.display_name}</h3>
                <p className="meta">{user.username}</p>
              </div>
              {resetId === user.id ? (
                <form className="reset-form" onSubmit={onReset}>
                  <input
                    type="text"
                    minLength={8}
                    maxLength={128}
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                    placeholder="New password"
                    aria-label={`New password for ${user.display_name}`}
                    required
                  />
                  <button type="submit">Save</button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setResetId(null);
                      setResetPassword("");
                    }}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setResetId(user.id);
                    setResetPassword("");
                    setResetMessage("");
                  }}
                >
                  Set new password
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
