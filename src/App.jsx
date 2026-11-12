import { useEffect, useState } from "react";
import { api, clearSession, loadSession, saveSession } from "./api";
import AdminApp from "./AdminApp";
import Login from "./Login";
import RequesterApp from "./RequesterApp";

export default function App() {
  const [session, setSession] = useState(loadSession);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notice, setNotice] = useState("");

  function persist(next) {
    saveSession(next);
    setSession(next);
  }

  function logout() {
    clearSession();
    setSession(null);
    setPasswordOpen(false);
    setNotice("");
  }

  if (!session) {
    return <Login onLogin={persist} />;
  }

  const roleLabel = session.user.role === "admin" ? "Developer" : "Requests";

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-row">
          <img className="header-photo" src="/PicOfMe.jpg" alt="Ethan" />
          <div className="brand">
            <span className="brand-mark">Peerless</span>
            <span className="brand-name">Tickets</span>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="who">
            <strong>{session.user.display_name}</strong>
            <span>{roleLabel}</span>
          </div>
          <button type="button" className="ghost" onClick={() => setPasswordOpen(true)}>
            Password
          </button>
          <button type="button" className="ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      {notice && (
        <p className="banner success" role="status">
          {notice}
        </p>
      )}
      <main>
        {session.user.role === "admin" ? (
          <AdminApp token={session.token} onLogout={logout} />
        ) : (
          <RequesterApp token={session.token} onLogout={logout} />
        )}
      </main>
      {passwordOpen && (
        <PasswordDialog
          token={session.token}
          onClose={() => setPasswordOpen(false)}
          onSaved={(next) => {
            persist(next);
            setPasswordOpen(false);
            setNotice("Password updated.");
          }}
        />
      )}
    </div>
  );
}

function PasswordDialog({ token, onClose, onSaved }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    if (next !== confirm) {
      setError("New password and confirmation don't match.");
      return;
    }
    setBusy(true);
    try {
      const data = await api("/me/password", {
        method: "POST",
        token,
        body: { current_password: current, new_password: next },
      });
      onSaved(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="password-title">Change password</h2>
        <form onSubmit={onSubmit}>
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            required
          />
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={next}
            onChange={(event) => setNext(event.target.value)}
            required
          />
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
