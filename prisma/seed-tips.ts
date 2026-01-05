// Seed script for AirTip demo data
// Run with: npx tsx prisma/seed-tips.ts

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { ShiftType, StaffRoleType } from "@prisma/client";
import crypto from "crypto";

// Simple password hasher (matches auth.ts)
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("Seeding AirTip demo data...\n");

  // Create demo organization
  const org = await prisma.tipOrganization.upsert({
    where: { id: "demo-org" },
    update: {},
    create: {
      id: "demo-org",
      name: "Demo Restaurant Group",
    },
  });
  console.log(`Created organization: ${org.name}`);

  // Create demo admin user
  const adminPassword = await hashPassword("demo123");
  const admin = await prisma.tipUser.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      passwordHash: adminPassword,
      name: "Demo Admin",
      role: "ADMIN",
      organizationId: org.id,
    },
  });
  console.log(`Created admin user: ${admin.email} (password: demo123)`);

  // Create manager user
  const managerPassword = await hashPassword("demo123");
  const manager = await prisma.tipUser.upsert({
    where: { email: "manager@demo.com" },
    update: {},
    create: {
      email: "manager@demo.com",
      passwordHash: managerPassword,
      name: "Sarah Manager",
      role: "MANAGER",
      organizationId: org.id,
    },
  });
  console.log(`Created manager user: ${manager.email} (password: demo123)`);

  // Create two locations
  const downtown = await prisma.tipLocation.upsert({
    where: { id: "loc-downtown" },
    update: {},
    create: {
      id: "loc-downtown",
      name: "Downtown",
      address: "123 Main Street, San Francisco, CA 94102",
      timezone: "America/Los_Angeles",
      organizationId: org.id,
    },
  });

  const marina = await prisma.tipLocation.upsert({
    where: { id: "loc-marina" },
    update: {},
    create: {
      id: "loc-marina",
      name: "Marina District",
      address: "456 Chestnut Street, San Francisco, CA 94123",
      timezone: "America/Los_Angeles",
      organizationId: org.id,
    },
  });
  console.log(`Created locations: ${downtown.name}, ${marina.name}`);

  // Create staff members
  const staffData = [
    // Downtown servers
    { name: "Alex Johnson", role: StaffRoleType.SERVER, locationId: downtown.id },
    { name: "Maria Garcia", role: StaffRoleType.SERVER, locationId: downtown.id },
    { name: "James Wilson", role: StaffRoleType.SERVER, locationId: downtown.id },
    { name: "Emily Chen", role: StaffRoleType.SERVER, locationId: downtown.id },
    // Downtown support
    { name: "Carlos Rodriguez", role: StaffRoleType.BARTENDER, locationId: downtown.id },
    { name: "Sophie Kim", role: StaffRoleType.BARTENDER, locationId: downtown.id },
    { name: "David Brown", role: StaffRoleType.BUSSER, locationId: downtown.id },
    { name: "Lisa Nguyen", role: StaffRoleType.RUNNER, locationId: downtown.id },
    { name: "Mike Thompson", role: StaffRoleType.HOST, locationId: downtown.id },
    // Marina servers
    { name: "Rachel Adams", role: StaffRoleType.SERVER, locationId: marina.id },
    { name: "Kevin Lee", role: StaffRoleType.SERVER, locationId: marina.id },
    { name: "Amanda White", role: StaffRoleType.SERVER, locationId: marina.id },
    // Marina support
    { name: "Tyler Jackson", role: StaffRoleType.BARTENDER, locationId: marina.id },
    { name: "Nina Patel", role: StaffRoleType.BUSSER, locationId: marina.id },
    { name: "Chris Martinez", role: StaffRoleType.RUNNER, locationId: marina.id },
  ];

  const staffMembers = [];
  for (const staff of staffData) {
    const created = await prisma.tipStaff.upsert({
      where: {
        locationId_name: { locationId: staff.locationId, name: staff.name },
      },
      update: {},
      create: {
        name: staff.name,
        roleType: staff.role,
        locationId: staff.locationId,
        isActive: true,
      },
    });
    staffMembers.push(created);
  }
  console.log(`Created ${staffMembers.length} staff members`);

  // Create shifts for the past 2 weeks
  const today = new Date();
  const shiftTypes: ShiftType[] = ["LUNCH", "DINNER"];
  const shiftsCreated = [];

  for (let daysAgo = 14; daysAgo >= 0; daysAgo--) {
    const shiftDate = new Date(today);
    shiftDate.setDate(today.getDate() - daysAgo);
    shiftDate.setHours(0, 0, 0, 0);

    // Skip some days randomly for realism
    if (Math.random() < 0.2) continue;

    for (const location of [downtown, marina]) {
      for (const shiftType of shiftTypes) {
        // Skip breakfast/brunch and some random shifts
        if (Math.random() < 0.3) continue;

        const locationStaff = staffMembers.filter(
          (s) =>
            s.locationId === location.id &&
            (s.roleType === "SERVER" || s.roleType === "BARTENDER")
        );
        const supportStaff = staffMembers.filter(
          (s) =>
            s.locationId === location.id &&
            s.roleType !== "SERVER" &&
            s.roleType !== "BARTENDER"
        );

        // Pick 2-4 servers for this shift
        const numServers = Math.floor(Math.random() * 3) + 2;
        const servers = locationStaff
          .sort(() => Math.random() - 0.5)
          .slice(0, numServers);

        // Generate entries for each server
        const entries = servers.map((server) => {
          const grossSales = Math.floor(Math.random() * 1500) + 500;
          const tipRate = 0.18 + Math.random() * 0.07; // 18-25%
          const ccTips = Math.floor(grossSales * tipRate);
          const cashTips = Math.floor(Math.random() * 100);
          const checkCount = Math.floor(grossSales / 60);

          return {
            serverName: server.name,
            staffId: server.id,
            grossSales,
            ccTips,
            cashTips,
            totalTips: ccTips + cashTips,
            checkCount,
            status: "PENDING" as const,
            actualTipOut: 0,
            netTips: ccTips + cashTips,
          };
        });

        // Calculate totals
        const totalCCTips = entries.reduce((sum, e) => sum + e.ccTips, 0);
        const totalCashTips = entries.reduce((sum, e) => sum + e.cashTips, 0);
        const totalSales = entries.reduce((sum, e) => sum + e.grossSales, 0);

        // Determine shift status based on age
        let status: "OPEN" | "IN_PROGRESS" | "CLOSED" = "OPEN";
        if (daysAgo > 3) {
          status = "CLOSED";
        } else if (daysAgo > 1) {
          status = Math.random() > 0.5 ? "CLOSED" : "IN_PROGRESS";
        } else if (daysAgo === 1) {
          status = Math.random() > 0.7 ? "CLOSED" : "IN_PROGRESS";
        }

        // Create the shift
        const shift = await prisma.shift.create({
          data: {
            shiftDate,
            shiftType,
            status,
            locationId: location.id,
            totalCCTips,
            totalCashTips,
            totalSales,
            toastTotalCCTips: totalCCTips,
            toastTotalSales: totalSales,
            entries: {
              create: entries.map((e) => ({
                ...e,
                status: status === "CLOSED" ? "SUBMITTED" : e.status,
              })),
            },
          },
          include: { entries: true },
        });

        // For closed/in-progress shifts, add allocations
        if (status !== "OPEN") {
          for (const entry of shift.entries) {
            // Each server tips out ~20% of their tips to support staff
            const tipOutAmount = Math.floor(entry.totalTips * 0.2);
            const tipOutPerPerson = Math.floor(tipOutAmount / 3);

            // Pick 2-3 random support staff to tip out
            const recipients = supportStaff
              .sort(() => Math.random() - 0.5)
              .slice(0, Math.min(3, supportStaff.length));

            let totalTipOut = 0;
            for (const recipient of recipients) {
              const amount =
                tipOutPerPerson + Math.floor(Math.random() * 10) - 5;
              if (amount > 0) {
                await prisma.tipAllocation.create({
                  data: {
                    entryId: entry.id,
                    recipientName: recipient.name,
                    recipientStaffId: recipient.id,
                    amount,
                    notes:
                      recipient.roleType === "BARTENDER"
                        ? "bar tipout"
                        : recipient.roleType === "BUSSER"
                        ? "busser tipout"
                        : "support tipout",
                  },
                });
                totalTipOut += amount;
              }
            }

            // Update entry with actual tip-out
            await prisma.shiftEntry.update({
              where: { id: entry.id },
              data: {
                actualTipOut: totalTipOut,
                netTips: entry.totalTips - totalTipOut,
                status: status === "CLOSED" ? "SUBMITTED" : "PENDING",
              },
            });
          }

          // Update shift total allocated
          const totalAllocated = await prisma.tipAllocation.aggregate({
            where: { entry: { shiftId: shift.id } },
            _sum: { amount: true },
          });
          await prisma.shift.update({
            where: { id: shift.id },
            data: { totalAllocated: totalAllocated._sum.amount || 0 },
          });
        }

        shiftsCreated.push(shift);
      }
    }
  }

  console.log(`Created ${shiftsCreated.length} shifts with entries and allocations`);

  // Summary
  const closedShifts = shiftsCreated.filter((s) => s.status === "CLOSED").length;
  const inProgressShifts = shiftsCreated.filter(
    (s) => s.status === "IN_PROGRESS"
  ).length;
  const openShifts = shiftsCreated.filter((s) => s.status === "OPEN").length;

  console.log("\n--- Summary ---");
  console.log(`Organization: ${org.name}`);
  console.log(`Locations: 2 (Downtown, Marina District)`);
  console.log(`Staff: ${staffMembers.length} members`);
  console.log(
    `Shifts: ${shiftsCreated.length} total (${closedShifts} closed, ${inProgressShifts} in progress, ${openShifts} open)`
  );
  console.log("\n--- Login Credentials ---");
  console.log("Admin: admin@demo.com / demo123");
  console.log("Manager: manager@demo.com / demo123");
  console.log("\nDone!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
