// app/tips/(app)/dashboard/page.tsx
import { getTipAuthContext } from "@/lib/tips/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

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
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Welcome to AirTip!
          </h2>
          <p className="text-blue-800 mb-4">
            Get started by setting up your first location and adding staff members.
          </p>
          <Link
            href="/tips/admin/locations"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Add Location
          </Link>
        </div>
      )}

      {/* Manager view */}
      {isManager && hasLocations && (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">{locations.length}</div>
              <div className="text-sm text-gray-600">Locations</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">{totalStaff}</div>
              <div className="text-sm text-gray-600">Active Staff</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">
                {recentShifts.filter((s) => s.status === "OPEN").length}
              </div>
              <div className="text-sm text-gray-600">Open Shifts</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">
                {recentShifts.filter((s) => s.status === "CLOSED").length}
              </div>
              <div className="text-sm text-gray-600">Closed This Week</div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/tips/shifts?action=new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                + New Shift
              </Link>
              <Link
                href="/tips/shifts"
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                View All Shifts
              </Link>
              {ctx.user.role === "ADMIN" && (
                <Link
                  href="/tips/admin/staff"
                  className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Manage Staff
                </Link>
              )}
            </div>
          </div>

          {/* Recent shifts */}
          {recentShifts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Shifts</h2>
              <div className="space-y-3">
                {recentShifts.map((shift) => {
                  const totalEntries = shift.entries.length;
                  const submittedEntries = shift.entries.filter(
                    (e) => e.status !== "PENDING"
                  ).length;

                  return (
                    <Link
                      key={shift.id}
                      href={`/tips/shifts/${shift.id}`}
                      className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {shift.locationName} - {shift.shiftType}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(shift.shiftDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          {submittedEntries}/{totalEntries} submitted
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            shift.status === "CLOSED"
                              ? "bg-green-100 text-green-700"
                              : shift.status === "OPEN"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {shift.status}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Server view - pending entries */}
      {ctx.user.role === "SERVER" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pending Tip Allocations
          </h2>
          {pendingEntries.length === 0 ? (
            <p className="text-gray-600">
              No pending tip allocations. Check back after your next shift!
            </p>
          ) : (
            <div className="space-y-3">
              {pendingEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/tips/shifts/${entry.id}/allocate`}
                  className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {entry.locationName} - {entry.shiftType}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(entry.shiftDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-lg">
                    Submit
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
