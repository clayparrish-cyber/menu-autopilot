"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CHANNEL_OPTIONS, getLocationSettingsFromChannel } from "@/lib/channel";
import type { Channel } from "@prisma/client";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const [formData, setFormData] = useState({
    channel: "BAR_KITCHEN" as Channel,
    accountName: "",
    locationName: "",
    locationAddress: "",
  });

  // Derived settings from channel preset
  const channelSettings = getLocationSettingsFromChannel(formData.channel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Steps 1 and 2 just advance
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ...channelSettings,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete onboarding");
      }

      await update();
      router.push("/uploads/new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Menu Autopilot</h1>
          <p className="mt-2 text-gray-600">Let&apos;s set up your account</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
            1
          </div>
          <div className={`w-12 h-1 ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
            2
          </div>
          <div className={`w-12 h-1 ${step >= 3 ? "bg-blue-600" : "bg-gray-200"}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
            3
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Channel Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">What best describes this location?</h2>
                <p className="text-sm text-gray-500">This helps us optimize settings for your type of business.</p>

                <div className="space-y-3">
                  {CHANNEL_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        formData.channel === option.value
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="channel"
                        value={option.value}
                        checked={formData.channel === option.value}
                        onChange={(e) => setFormData({ ...formData, channel: e.target.value as Channel })}
                        className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="ml-3">
                        <span className="block text-sm font-medium text-gray-900">{option.label}</span>
                        <span className="block text-xs text-gray-500">{option.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Business Details */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Business Details</h2>

                <div>
                  <label htmlFor="accountName" className="block text-sm font-medium text-gray-700">
                    Business Name
                  </label>
                  <input
                    id="accountName"
                    type="text"
                    required
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="My Restaurant"
                  />
                </div>

                <div>
                  <label htmlFor="locationName" className="block text-sm font-medium text-gray-700">
                    Location Name
                  </label>
                  <input
                    id="locationName"
                    type="text"
                    required
                    value={formData.locationName}
                    onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Downtown"
                  />
                </div>

                <div>
                  <label htmlFor="locationAddress" className="block text-sm font-medium text-gray-700">
                    Address (optional)
                  </label>
                  <input
                    id="locationAddress"
                    type="text"
                    value={formData.locationAddress}
                    onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="123 Main St"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Review Settings */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Review Settings</h2>
                <p className="text-sm text-gray-500">
                  Based on your {CHANNEL_OPTIONS.find(o => o.value === formData.channel)?.label} profile,
                  we&apos;ve optimized these settings. You can adjust them later.
                </p>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Target Food Cost</span>
                    <span className="font-medium text-gray-900">{channelSettings.targetFoodCostPct}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">High Confidence Qty</span>
                    <span className="font-medium text-gray-900">{channelSettings.confidenceQtyHigh}+ per week</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Max Price Increase</span>
                    <span className="font-medium text-gray-900">
                      {(channelSettings.priceIncreaseMaxPct * 100).toFixed(0)}% or ${channelSettings.priceIncreaseMaxAbs.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Quadrant Thresholds</span>
                    <span className="font-medium text-gray-900">
                      {channelSettings.popularityThresholdPct}th percentile
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Ready to go!</strong> After setup, you&apos;ll upload your first weekly sales data.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                >
                  &larr; Back
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || (step === 2 && (!formData.accountName || !formData.locationName))}
                className="ml-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? "Saving..." : step < 3 ? "Next" : "Complete Setup"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
