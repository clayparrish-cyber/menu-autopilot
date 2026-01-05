import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { TrendingUp, Upload, FileText, DollarSign } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    if (session.user.hasCompletedOnboarding) {
      redirect("/reports");
    } else {
      redirect("/onboarding");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Menu Autopilot</h1>
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          Stop Guessing. Start Profiting.
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Upload your POS data, get a prioritized action list to reprice, promote,
          or remove menu items. Menu engineering made simple.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-md text-lg font-medium hover:bg-blue-700"
          >
            Get Started Free
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-3 border border-gray-300 text-gray-700 rounded-md text-lg font-medium hover:bg-gray-50"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                1. Upload Your Data
              </h4>
              <p className="text-gray-600">
                Export your weekly POS item sales and upload the CSV. We handle
                Toast, Square, and most major systems.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                2. Get Scored Recommendations
              </h4>
              <p className="text-gray-600">
                Our engine classifies every item as Star, Plowhorse, Puzzle, or Dog
                and generates specific actions.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                3. Take Action, See Results
              </h4>
              <p className="text-gray-600">
                Follow the prioritized action list: reprice, reposition, promote, or
                remove. Track improvements weekly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
            What You Get
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <FileText className="w-8 h-8 text-blue-600 mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Weekly Action List
              </h4>
              <p className="text-gray-600">
                Prioritized recommendations sorted by impact. Know exactly what to
                do each week to improve margin.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <TrendingUp className="w-8 h-8 text-blue-600 mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Menu Engineering Dashboard
              </h4>
              <p className="text-gray-600">
                Visual matrix showing Stars, Plowhorses, Puzzles, and Dogs. Drill
                down into any item for details.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <DollarSign className="w-8 h-8 text-blue-600 mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Price Suggestions with Guardrails
              </h4>
              <p className="text-gray-600">
                Get specific price recommendations that respect category norms and
                won&apos;t trigger guest backlash.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <Upload className="w-8 h-8 text-blue-600 mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Easy CSV Upload
              </h4>
              <p className="text-gray-600">
                Smart column mapping handles different POS formats. Save your
                mapping for quick weekly uploads.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Simple Pricing
          </h3>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <h4 className="text-lg font-semibold text-gray-900">Solo</h4>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                $49<span className="text-lg font-normal text-gray-500">/mo</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>1 location</li>
                <li>Weekly reports</li>
                <li>CSV exports</li>
                <li>1 user</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-blue-500 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full">
                Popular
              </span>
              <h4 className="text-lg font-semibold text-gray-900">Team</h4>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                $99<span className="text-lg font-normal text-gray-500">/mo</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>1 location</li>
                <li>Weekly reports + dashboard</li>
                <li>CSV exports</li>
                <li>Up to 5 users</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <h4 className="text-lg font-semibold text-gray-900">Group</h4>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                $199<span className="text-lg font-normal text-gray-500">/mo</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>Up to 5 locations</li>
                <li>Consolidated rollup</li>
                <li>CSV exports</li>
                <li>Unlimited users</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to improve your menu profitability?
          </h3>
          <p className="text-lg text-gray-600 mb-8">
            Start with a free upload and see your first report in minutes.
          </p>
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-md text-lg font-medium hover:bg-blue-700"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Menu Autopilot - Menu engineering made simple</p>
        </div>
      </footer>
    </div>
  );
}
