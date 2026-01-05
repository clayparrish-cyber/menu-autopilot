"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    accountName: "",
    locationName: "",
    locationAddress: "",
    targetFoodCostPct: 30,
    minQtyThreshold: 10,
    popularityThreshold: 60,
    marginThreshold: 60,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      setStep(2);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
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
          <div className={`w-16 h-1 ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
            2
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 ? (
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
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Target Settings</h2>
                <p className="text-sm text-gray-500">These can be adjusted later in settings.</p>

                <div>
                  <label htmlFor="targetFoodCostPct" className="block text-sm font-medium text-gray-700">
                    Target Food Cost % (default: 30%)
                  </label>
                  <input
                    id="targetFoodCostPct"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.targetFoodCostPct}
                    onChange={(e) => setFormData({ ...formData, targetFoodCostPct: parseInt(e.target.value) || 30 })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="minQtyThreshold" className="block text-sm font-medium text-gray-700">
                    Minimum Quantity for High Confidence (default: 10)
                  </label>
                  <input
                    id="minQtyThreshold"
                    type="number"
                    min="1"
                    value={formData.minQtyThreshold}
                    onChange={(e) => setFormData({ ...formData, minQtyThreshold: parseInt(e.target.value) || 10 })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="popularityThreshold" className="block text-sm font-medium text-gray-700">
                      Popularity Threshold Percentile
                    </label>
                    <input
                      id="popularityThreshold"
                      type="number"
                      min="1"
                      max="99"
                      value={formData.popularityThreshold}
                      onChange={(e) => setFormData({ ...formData, popularityThreshold: parseInt(e.target.value) || 60 })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="marginThreshold" className="block text-sm font-medium text-gray-700">
                      Margin Threshold Percentile
                    </label>
                    <input
                      id="marginThreshold"
                      type="number"
                      min="1"
                      max="99"
                      value={formData.marginThreshold}
                      onChange={(e) => setFormData({ ...formData, marginThreshold: parseInt(e.target.value) || 60 })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                >
                  &larr; Back
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="ml-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? "Saving..." : step === 1 ? "Next" : "Complete Setup"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
