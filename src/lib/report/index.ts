// lib/report/index.ts
export * from "./types";
export { WeeklyReportPayloadSchema } from "./schema";
export { generateWeeklyReportPayload } from "./generator";
export type { ReportGeneratorInput } from "./generator";
export { pdfSpec } from "./pdfSpec";
