"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AirTipIcon } from "../components/logo";

export default function TipLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/tips/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/tips/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--tip-bg-deep)' }}
    >
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo/Brand */}
        <div className="text-center mb-10">
          <div
            className="inline-block mb-6 rounded-2xl"
            style={{ boxShadow: '0 0 60px var(--tip-accent-glow)' }}
          >
            <AirTipIcon size={80} />
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: 'var(--tip-text-primary)' }}
          >
            AirTip
          </h1>
          <p
            className="mt-2 font-mono text-sm"
            style={{ color: 'var(--tip-text-muted)' }}
          >
            tip management made simple
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'var(--tip-bg-elevated)',
            border: '1px solid var(--tip-border)'
          }}
        >
          <h2
            className="text-xl font-semibold mb-6"
            style={{ color: 'var(--tip-text-primary)' }}
          >
            Sign in
          </h2>

          {error && (
            <div
              className="mb-6 p-4 rounded-lg text-sm font-medium"
              style={{
                background: 'rgba(239, 100, 97, 0.1)',
                border: '1px solid rgba(239, 100, 97, 0.3)',
                color: 'var(--tip-error)'
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--tip-text-secondary)' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="tip-input w-full px-4 py-3"
                placeholder="you@restaurant.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--tip-text-secondary)' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="tip-input w-full px-4 py-3"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="tip-btn-primary w-full py-3 px-4 rounded-xl text-base disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{
                      borderColor: 'var(--tip-bg-deep)',
                      borderTopColor: 'transparent'
                    }}
                  />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6" style={{ borderTop: '1px dashed var(--tip-border)' }}>
            <p
              className="text-center text-sm"
              style={{ color: 'var(--tip-text-muted)' }}
            >
              Don&apos;t have an account?{" "}
              <Link
                href="/tips/register"
                className="font-medium transition-colors"
                style={{ color: 'var(--tip-accent)' }}
              >
                Get started
              </Link>
            </p>
          </div>
        </div>

        {/* Receipt tape decoration */}
        <div className="mt-8 flex justify-center">
          <div
            className="font-mono text-xs text-center px-4 py-2"
            style={{
              color: 'var(--tip-text-muted)',
              borderTop: '1px dashed var(--tip-border)',
              borderBottom: '1px dashed var(--tip-border)',
            }}
          >
            THANK YOU FOR USING AIRTIP
          </div>
        </div>
      </div>
    </div>
  );
}
