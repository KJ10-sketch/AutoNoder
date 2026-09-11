"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, LogIn } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const result = mode === "sign-in"
      ? await authClient.signIn.email({ email, password })
      : await authClient.signUp.email({ name, email, password });

    setBusy(false);
    if (result.error) {
      setError(result.error.message || "Authentication failed.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link href="/" className="auth-back"><ArrowLeft size={16}/> Back to AutoNoder</Link>
        <div className="auth-icon"><LogIn size={20}/></div>
        <h1>{mode === "sign-in" ? "Welcome back" : "Create your workspace"}</h1>
        <p>{mode === "sign-in" ? "Sign in to manage your automations." : "Start building and running your first workflow."}</p>

        <form onSubmit={submit} className="auth-form">
          {mode === "sign-up" && (
            <label>Name<input className="search" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required /></label>
          )}
          <label>Email<input className="search" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
          <label>Password<input className="search" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} placeholder="At least 8 characters" required /></label>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn primary auth-submit" disabled={busy} type="submit">
            {busy ? <><Loader2 size={16} className="spin"/> Working…</> : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button className="auth-switch" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); }}>
          {mode === "sign-in" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
