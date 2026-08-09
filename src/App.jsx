import AuthGate from "./AuthGate";
import { supabase } from "./supabaseClient";
import JobLedger from "./JobLedger";

export default function App() {
  return (
    <AuthGate>
      {(session) => (
        <JobLedger
          user={session.user}
          onLogout={() => supabase.auth.signOut()}
        />
      )}
    </AuthGate>
  );
}