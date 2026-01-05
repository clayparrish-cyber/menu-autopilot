"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, CreditCard, Loader2 } from "lucide-react";

interface BillingInfo {
  subscriptionTier: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
}

const PLANS = [
  {
    id: "SOLO",
    name: "Solo",
    price: 49,
    features: [
      "1 location",
      "Weekly reports",
      "Email reports",
      "CSV exports",
      "1 user",
    ],
  },
  {
    id: "TEAM",
    name: "Team",
    price: 99,
    features: [
      "1 location",
      "Weekly reports",
      "Email reports",
      "CSV exports",
      "Dashboard access",
      "Up to 5 users",
    ],
    popular: true,
  },
  {
    id: "GROUP",
    name: "Group",
    price: 199,
    features: [
      "Up to 5 locations",
      "Weekly reports",
      "Email reports",
      "CSV exports",
      "Dashboard access",
      "Consolidated rollup",
      "Unlimited users",
    ],
  },
];

export default function BillingPage() {
  const { data: session } = useSession();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBilling() {
      try {
        const res = await fetch("/api/billing");
        if (res.ok) {
          const data = await res.json();
          setBilling(data);
        }
      } catch (error) {
        console.error("Failed to fetch billing:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBilling();
  }, []);

  const handleSubscribe = async (planId: string) => {
    setUpgrading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        alert("Failed to create checkout session");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout");
    } finally {
      setUpgrading(null);
    }
  };

  const handleManage = async () => {
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error("Portal error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentPlan = billing?.subscriptionTier || "NONE";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500">
          Manage your subscription and billing settings
        </p>
      </div>

      {/* Current Plan */}
      {currentPlan !== "NONE" && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Current Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-gray-900">{currentPlan}</p>
              {billing?.currentPeriodEnd && (
                <p className="text-sm text-gray-500">
                  Renews on {new Date(billing.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              onClick={handleManage}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Manage Subscription
            </button>
          </div>
        </div>
      )}

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-lg shadow p-6 ${
                plan.popular ? "ring-2 ring-blue-500" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500 text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-lg font-medium text-gray-900">{plan.name}</h3>
              <p className="mt-2">
                <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-500">/month</span>
              </p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="ml-2 text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isCurrentPlan || upgrading !== null}
                className={`mt-6 w-full py-2 px-4 border rounded-md text-sm font-medium ${
                  isCurrentPlan
                    ? "bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed"
                    : "bg-blue-600 text-white border-transparent hover:bg-blue-700"
                } disabled:opacity-50`}
              >
                {upgrading === plan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : isCurrentPlan ? (
                  "Current Plan"
                ) : currentPlan === "NONE" ? (
                  "Subscribe"
                ) : (
                  "Change Plan"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {currentPlan === "NONE" && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>Free Trial:</strong> You can upload data and see limited results.
            Subscribe to unlock full reports and recommendations.
          </p>
        </div>
      )}
    </div>
  );
}
