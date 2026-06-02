"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Shield, Activity, DollarSign, Zap, ArrowUpRight, ArrowDownRight, Send, HelpCircle, Mail, Phone, CreditCard } from 'lucide-react';

const TelemetryChart = dynamic(() => import('@/components/TelemetryChart'), { ssr: false });

export default function Dashboard() {
  const cardClassName = "relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/[0.05] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.1]";

  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [liveMetrics, setLiveMetrics] = useState({
    total_requests: 0,
    emails_blocked: 0,
    phones_blocked: 0,
    cc_blocked: 0,
    cache_hits: 0
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("http://localhost:8000/v1/metrics");
        if (res.ok) {
          const data = await res.json();
          setLiveMetrics(data);
        }
      } catch (err) {
        console.error("Failed to fetch metrics", err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleTestPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse("");

    try {
      const res = await fetch("http://localhost:8000/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();
      setResponse(data.choices[0].message.content);
    } catch (err: any) {
      setError(err.message || "Failed to connect to gateway. Ensure backend is running on http://localhost:8000.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/30 selection:text-white relative overflow-hidden">

      {/* Background ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <main className="max-w-[1200px] mx-auto px-6 py-12 relative z-10">

        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-end mb-12 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-white/10">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-medium tracking-tight text-white">
                EnPassant
              </h1>
            </div>
            <p className="text-neutral-400 text-sm max-w-md leading-relaxed">
              Enterprise AI Proxy Gateway. Real-time observability, semantic caching, and PII redaction layer.
            </p>
          </div>

          <div className="flex items-center gap-3 px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-full shadow-sm backdrop-blur-md">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <span className="text-neutral-300 font-medium text-xs tracking-wide">
              Gateway Operational
            </span>
          </div>
        </header>

        {/* Metrics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">

          {/* Total Requests */}
          <div className={cardClassName}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1 text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider">
                Live Gateway
              </div>
            </div>
            <h3 className="text-neutral-400 text-xs font-medium tracking-wide mb-1 uppercase">Total Requests</h3>
            <div className="text-3xl font-semibold tracking-tight text-white">
              {liveMetrics.total_requests}
            </div>
          </div>

          {/* Cache Hits */}
          <div className={cardClassName}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/10">
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1 text-sky-400 bg-sky-500/5 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider">
                Optimized
              </div>
            </div>
            <h3 className="text-neutral-400 text-xs font-medium tracking-wide mb-1 uppercase">Cache Hits</h3>
            <div className="text-3xl font-semibold tracking-tight text-white">
              {liveMetrics.cache_hits}
            </div>
          </div>

          {/* Emails Blocked */}
          <div className={cardClassName}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider">
                Redacted
              </div>
            </div>
            <h3 className="text-neutral-400 text-xs font-medium tracking-wide mb-1 uppercase">Emails Redacted</h3>
            <div className="text-3xl font-semibold tracking-tight text-white">
              {liveMetrics.emails_blocked}
            </div>
          </div>

          {/* Phones Blocked */}
          <div className={cardClassName}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/10">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1 text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider">
                Redacted
              </div>
            </div>
            <h3 className="text-neutral-400 text-xs font-medium tracking-wide mb-1 uppercase">Phones Redacted</h3>
            <div className="text-3xl font-semibold tracking-tight text-white">
              {liveMetrics.phones_blocked}
            </div>
          </div>

          {/* Credit Cards Blocked */}
          <div className={cardClassName}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/10">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1 text-rose-400 bg-rose-500/5 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider">
                Redacted
              </div>
            </div>
            <h3 className="text-neutral-400 text-xs font-medium tracking-wide mb-1 uppercase">CCs Redacted</h3>
            <div className="text-3xl font-semibold tracking-tight text-white">
              {liveMetrics.cc_blocked}
            </div>
          </div>
        </section>

        {/* Dashboard Panels Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Main Chart Panel */}
          <div className={`lg:col-span-2 ${cardClassName} flex flex-col min-h-[320px]`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-medium text-sm tracking-wide">Traffic & Latency</h3>
              <div className="flex gap-2">
                <div className="px-3 py-1 text-[11px] font-medium text-white bg-white/10 rounded-md cursor-pointer border border-white/10 transition-colors">24h</div>
                <div className="px-3 py-1 text-[11px] font-medium text-neutral-400 hover:text-white rounded-md cursor-pointer transition-colors">7d</div>
                <div className="px-3 py-1 text-[11px] font-medium text-neutral-400 hover:text-white rounded-md cursor-pointer transition-colors">30d</div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 relative mt-2 min-h-[220px]">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808003_1px,transparent_1px),linear-gradient(to_bottom,#80808003_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
              <div className="relative w-full h-full">
                <TelemetryChart />
              </div>
            </div>
          </div>

          {/* Activity Feed Panel */}
          <div className={`${cardClassName} flex flex-col min-h-[320px]`}>
            <h3 className="text-white font-medium text-sm tracking-wide mb-6">Recent Events</h3>
            <div className="space-y-5 flex-1 mt-2">
              {[
                { time: 'Just now', event: 'PII redacted from payload', colorClass: 'bg-rose-500 shadow-rose-500/50' },
                { time: '2m ago', event: 'Cache hit (semantic)', colorClass: 'bg-indigo-500 shadow-indigo-500/50' },
                { time: '15m ago', event: 'New API key generated', colorClass: 'bg-amber-500 shadow-amber-500/50' },
                { time: '1h ago', event: 'System health check passed', colorClass: 'bg-emerald-500 shadow-emerald-500/50' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 text-sm items-start relative">
                  {/* Subtle connecting line for timeline effect */}
                  {i !== 3 && <div className="absolute left-1 top-4 w-[1px] h-8 bg-white/5" />}

                  <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)] ${item.colorClass} relative z-10`} />
                  <div>
                    <div className="text-neutral-200 font-medium text-[13px]">{item.event}</div>
                    <div className="text-neutral-500 text-[11px] mt-0.5 tracking-wide">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 border border-white/5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.02] transition-colors">
              View All Logs
            </button>
          </div>
        </section>

        {/* Gateway Playground Section */}
        <section className={`${cardClassName} mb-12`}>
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-medium text-base tracking-wide">Gateway Playground</h3>
              <p className="text-neutral-400 text-xs mt-0.5">Test real-time routing and PII redaction by sending prompts through the proxy.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Interactive Form */}
            <form onSubmit={handleTestPrompt} className="lg:col-span-7 flex flex-col gap-4">
              <div>
                <label className="block text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2">
                  Enter Prompt
                </label>
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Please email user details to john.doe@example.com or call me at (555) 0199."
                    className="w-full min-h-[120px] bg-black/40 border border-white/[0.08] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 rounded-xl p-4 text-sm text-neutral-200 placeholder-neutral-500 outline-none resize-none transition-all"
                    disabled={isLoading}
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 text-[10px] text-neutral-500">
                    <span>Try entering email, phone, or credit cards</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPrompt("Can you verify this credit card number: 4111 2222 3333 4444?")}
                    className="px-2.5 py-1 text-[11px] font-medium text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-md border border-white/[0.05] transition-colors"
                  >
                    CC Test
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrompt("Send the invoice to support@company.com or fax to 555-555-0143")}
                    className="px-2.5 py-1 text-[11px] font-medium text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-md border border-white/[0.05] transition-colors"
                  >
                    Email/Phone Test
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-neutral-800 disabled:to-neutral-900 text-white disabled:text-neutral-500 text-xs font-semibold rounded-lg shadow-lg shadow-indigo-500/10 border border-white/10 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full" />
                      Routing...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send to Proxy
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Gateway Inspector Panel */}
            <div className="lg:col-span-5 flex flex-col min-h-[180px] bg-white/[0.01] border border-white/[0.03] rounded-xl p-5">
              <span className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-3 block">
                Gateway Inspector Output
              </span>

              {error && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-rose-500/5 border border-rose-500/15 rounded-lg text-rose-200">
                  <span className="text-sm font-semibold mb-1">Gateway Error</span>
                  <span className="text-xs text-rose-300 max-w-xs">{error}</span>
                </div>
              )}

              {!error && !isLoading && !response && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-white/[0.05] rounded-lg text-neutral-500">
                  <HelpCircle className="w-6 h-6 mb-2 opacity-30" />
                  <span className="text-xs">Send a prompt through the gateway to view the live inspection output.</span>
                </div>
              )}

              {isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <div className="animate-pulse flex space-y-3 flex-col items-center">
                    <div className="h-2 w-24 bg-white/10 rounded"></div>
                    <div className="h-2 w-48 bg-white/10 rounded"></div>
                    <div className="h-2 w-32 bg-white/10 rounded"></div>
                  </div>
                </div>
              )}

              {!error && response && (
                <div className="flex-1 flex flex-col">
                  <div className="text-xs text-emerald-400 font-medium mb-2 flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Response Success
                  </div>
                  <div className="flex-1 bg-black/30 border border-white/[0.05] rounded-lg p-3.5 text-xs text-neutral-300 font-mono overflow-y-auto max-h-[180px] leading-relaxed">
                    {response}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
