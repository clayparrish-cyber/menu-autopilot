// app/tips/(app)/dashboard/page.tsx
import { getTipAuthContext } from "@/lib/tips/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus, Calendar, Users, MapPin, ChevronRight, Clock } from "lucide-react";

export default async function TipDashboardPage() {
  const ctx = await getTipAuthContext();
  if (!ctx) return null;

  const isManager = ctx.user.role === "ADMIN" || ctx.user.role === "MANAGER";

  // Get recent shifts for this org's locations
  const locations = await prisma.tipLocation.findMany({
    where: { organizationId: ctx.organization.id },
    include: {
      shifts: {
        orderBy: { shiftDate: "desc" },
        take: 5,
        include: {
          entries: {
            select: { id: true, status: true },
          },
        },
      },
      staff: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  });

  const hasLocations = locations.length > 0;
  const totalStaff = locations.reduce((sum, loc) => sum + loc.staff.length, 0);
  const recentShifts = locations.flatMap((loc) =>
    loc.shifts.map((shift) => ({ ...shift, locationName: loc.name }))
  ).sort((a, b) => new Date(b.shiftDate).getTime() - new Date(a.shiftDate).getTime()).slice(0, 5);

  // If server, show their pending entries
  let pendingEntries: Array<{
    id: string;
    shiftDate: Date;
    shiftType: string;
    locationName: string;
  }> = [];

  if (ctx.user.role === "SERVER" && ctx.user.staffId) {
    const entries = await prisma.shiftEntry.findMany({
      where: {
        staffId: ctx.user.staffId,
        status: "PENDING",
      },
      include: {
        shift: {
          include: {
            location: { select: { name: true } },
          },
        },
      },
      orderBy: { shift: { shiftDate: "desc" } },
      take: 10,
    });

    pendingEntries = entries.map((e) => ({
      id: e.id,
      shiftDate: e.shift.shiftDate,
      shiftType: e.shift.shiftType,
      locationName: e.shift.location.name,
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isManager ? "Dashboard" : "My Tips"}
        </h1>
        <p className="text-gray-600 mt-1">
          {isManager
            ? "Manage shifts and reconcile tip-outs"
            : "View and submit your tip allocations"}
        </p>
      </div>

      {/* Setup prompt for new accounts */}
      {!hasLocations && ctx.user.role === "ADMIN" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-start">
            <MapPin className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                Welcome to AirTip!
              </h2>
              <p className="text-blue-800 mb-4">
                Get started by setting up your first location and adding staff members.
              </p>
              <Link
                href="/tips/admin/locations"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Manager view */}
      {isManager && hasLocations && (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex items-center">
                <MapPin className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <div className="text-2xl font-bold text-gray-900">{locations.length}</div>
                  <div className="text-sm text-gray-500">Locations</div>
                </div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <div className="text-2xl font-bold text-gray-900">{totalStaff}</div>
                  <div className="text-sm text-gray-500">Active Staff</div>
                </div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-amber-500" />
                <div className="ml-3">
                  <div className="text-2xl font-bold text-gray-900">
                    {recentShifts.filter((s) => s.status === "OPEN" || s.status === "IN_PROGRESS").length}
                  </div>
                  <div className="text-sm text-gray-500">Open Shifts</div>
                </div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-emerald-500" />
                <div className="ml-3">
                  <div className="text-2xl font-bold text-gray-900">
                    {recentShifts.filter((s) => s.status === "CLOSED").length}
                  </div>
                  <div className="text-sm text-gray-500">Closed This Week</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/tips/shifts/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Shift
              </Link>
              <Link
                href="/tips/shifts"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Calendar className="mr-2 h-4 w-4" />
                View All Shifts
              </Link>
              {ctx.user.role === "ADMIN" && (
                <Link
                  href="/tips/admin/staff"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Manage Staff
                </Link>
              )}
            </div>
          </div>

          {/* Recent shifts */}
          {recentShifts.length > 0 && (
            <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
              <div className="px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Shifts</h2>
              </div>
              {recentShifts.map((shift) => {
                const totalEntries = shift.entries.length;
                const submittedEntries = shift.entries.filter(
                  (e) => e.status !== "PENDING"
                ).length;

                return (
                  <Link
                    key={shift.id}
                    href={`/tips/shifts/${shift.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <Calendar className="h-8 w-8 text-blue-500" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">
                          {shift.locationName} - {shift.shiftType}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(shift.shiftDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-gray-900">
                          {submittedEntries}/{totalEntries}
                        </p>
                        <p className="text-xs text-gray-500">submitted</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          shift.status === "CLOSED"
                            ? "bg-green-100 text-green-700"
                            : shift.status === "OPEN"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {shift.status.replace("_", " ")}
                      </span>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Server view - pending entries */}
      {ctx.user.role === "SERVER" && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Tip Allocations
            </h2>
          </div>
          {pendingEntries.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No pending allocations</h3>
              <p className="mt-2 text-sm text-gray-500">
                Check back after your next shift!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/tips/shifts/${entry.id}/allocate`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-amber-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {entry.locationName} - {entry.shiftType}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(entry.shiftDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-md">
                      Submit
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
