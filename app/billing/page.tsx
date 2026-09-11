"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CreditCard, Loader2 } from "lucide-react";

interface BillingState {
  polarCustomerId: string | null;
  polarSubscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionProductId: string | null;
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/billing/status", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load billing status.");
        setBilling(data.billing);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load billing status."));
  }, []);

  async function startCheckout() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: `${window.location.origin}/billing?checkout=success` }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to start checkout.");
      if (!data.url) throw new Error("Polar did not return a checkout URL.");
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start checkout.");
      setBusy(false);
    }
  }

  const active = billing?.subscriptionStatus && ["active", "trialing", "succeeded"].includes(billing.subscriptionStatus.toLowerCase());

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Auto<span>Noder</span></div>
        <nav className="nav">
          <Link className="nav-item" href="/"><ArrowLeft size={17}/><span>Dashboard</span></Link>
          <Link className="nav-item" href="/workflows"><span>Workflows</span></Link>
          <Link className="nav-item" href="/executions"><span>Executions</span></Link>
          <Link className="nav-item active" href="/billing"><CreditCard size={17}/><span>Billing</span></Link>
        </nav>
        <div className="sidebar-footer">Subscription access is synchronized from Polar webhooks.</div>
      </aside>
      <main className="main">
        <header className="topbar"><h1>Billing</h1><Link className="btn ghost" href="/settings/credentials">Credentials</Link></header>
        <section className="content">
          <div className="hero"><div><h2>AutoNoder Pro</h2><p>Manage your subscription through Polar hosted checkout.</p></div></div>
          <div className="workflow-grid">
            <section className="card">
              <div className="card-head"><h3>Subscription</h3>{active ? <span className="badge"><CheckCircle2 size={12}/> Active</span> : <span className="badge">{billing?.subscriptionStatus ?? "Not subscribed"}</span>}</div>
              <div style={{marginTop:18,display:"grid",gap:12}}>
                <div className="list-row"><span>Customer</span><small>{billing?.polarCustomerId ?? "Not linked yet"}</small></div>
                <div className="list-row"><span>Subscription</span><small>{billing?.polarSubscriptionId ?? "Not linked yet"}</small></div>
                <div className="list-row"><span>Product</span><small>{billing?.subscriptionProductId ?? "Not configured"}</small></div>
              </div>
            </section>
            <section className="card">
              <div className="card-head"><h3>Upgrade</h3><span className="badge">Polar</span></div>
              <p style={{color:"var(--muted)",fontSize:13,lineHeight:1.6,marginTop:12}}>Start a hosted checkout session. The resulting customer and subscription state will be synchronized into your AutoNoder account by the signed webhook handler.</p>
              <button className="btn primary" onClick={startCheckout} disabled={busy} style={{marginTop:14}}>{busy ? <Loader2 className="spin" size={15}/> : <CreditCard size={15}/>} Continue to checkout</button>
            </section>
          </div>
          {message && <div className="builder-toast">{message}</div>}
        </section>
      </main>
    </div>
  );
}
