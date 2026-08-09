import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("Account created — check your email to confirm, then log in.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (session === undefined) {
    return <div style={loadingWrapStyle}>Loading…</div>;
  }

  if (session === null) {
    return (
      <div style={pageStyle}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600&family=Inter:wght@400;500;600&display=swap');
          .ag-card { max-width: 380px; width: 100%; background: #fff; border: 1px solid #DBDFD5; border-radius: 12px; padding: 32px 28px; font-family: 'Inter', sans-serif; }
          .ag-title { font-family: 'Source Serif 4', serif; font-size: 24px; font-weight: 700; color: #1C2430; margin: 0 0 4px; }
          .ag-sub { color: #667085; font-size: 13.5px; margin: 0 0 22px; }
          .ag-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
          .ag-field label { font-size: 11.5px; color: #667085; }
          .ag-field input { border: 1px solid #DBDFD5; border-radius: 7px; padding: 10px 12px; font-size: 14px; font-family: inherit; outline: none; }
          .ag-field input:focus { border-color: #667085; }
          .ag-btn { width: 100%; background: #1C2430; color: #fff; border: none; border-radius: 7px; padding: 11px; font-size: 14px; font-family: inherit; cursor: pointer; margin-top: 6px; }
          .ag-btn:disabled { opacity: 0.6; cursor: default; }
          .ag-switch { text-align: center; margin-top: 16px; font-size: 13px; color: #667085; }
          .ag-switch button { background: none; border: none; color: #1C2430; font-weight: 600; cursor: pointer; font-family: inherit; padding: 0 4px; }
          .ag-error { background: #FBEAE4; color: #B5482A; font-size: 12.5px; padding: 9px 12px; border-radius: 6px; margin-bottom: 14px; }
          .ag-info { background: #E9F1EE; color: #2F6F63; font-size: 12.5px; padding: 9px 12px; border-radius: 6px; margin-bottom: 14px; }
        `}</style>
        <div className="ag-card">
          <h1 className="ag-title">Ledger</h1>
          <p className="ag-sub">{mode === "login" ? "Log in to your pipeline." : "Create your account."}</p>

          {error && <div className="ag-error">{error}</div>}
          {info && <div className="ag-info">{info}</div>}

          <form onSubmit={handleSubmit}>
            <div className="ag-field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="ag-field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <button className="ag-btn" type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
            </button>
          </form>

          <div className="ag-switch">
            {mode === "login" ? (
              <>No account? <button onClick={() => { setMode("signup"); setError(""); setInfo(""); }}>Sign up</button></>
            ) : (
              <>Already have one? <button onClick={() => { setMode("login"); setError(""); setInfo(""); }}>Log in</button></>
            )}
          </div>
        </div>
      </div>
    );
  }

  return children(session);
}

const pageStyle = {
  minHeight: "100vh",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#ECEFE9",
  padding: 20,
};

const loadingWrapStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Inter, sans-serif",
  color: "#667085",
};