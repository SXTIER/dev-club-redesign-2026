import type { RecruitmentApplication } from "@/lib/types/recruitment";

const APPLICATION_CSV_HEADERS = [
  "Application ID",
  "Submitted At",
  "Status",
  "Student ID",
  "First Name",
  "Last Name",
  "Nickname",
  "Email",
  "Phone",
  "Program",
  "Year",
  "Team",
  "Role",
  "Custom Role",
  "Expectation",
  "Contribution",
  "Project Idea",
  "Team Experience",
  "Portfolio URL",
  "CV Filename",
] as const;

const FORMULA_INJECTION_PATTERN = /^\s*[=+\-@\t\r]/;

/**
 * Neutralizes spreadsheet formula injection prefixes and encodes a CSV data
 * cell using RFC 4180 double-quoting.
 */
function formatCsvDataCell(rawValue: string | undefined | null): string {
  const value = rawValue ?? "";
  const neutralized = FORMULA_INJECTION_PATTERN.test(value)
    ? `'${value}`
    : value;
  const escaped = neutralized.replace(/"/g, '""');
  return `"${escaped}"`;
}

function formatTeamLabel(team: RecruitmentApplication["team"]): string {
  return team === "projects" ? "Projects Team" : "Marketing Team";
}

/**
 * Builds an RFC 4180 CSV string for recruitment applications with formula
 * injection protection across all cell values.
 */
export function buildApplicationsCsv(
  apps: readonly RecruitmentApplication[],
): string {
  const headerRow = APPLICATION_CSV_HEADERS.join(",");
  const dataRows = apps.map((app) => {
    const cells = [
      app.id,
      app.createdAt,
      app.status,
      app.personal.studentId,
      app.personal.firstName,
      app.personal.lastName,
      app.personal.nickname,
      app.personal.email,
      app.personal.phone,
      app.personal.program,
      app.personal.year,
      formatTeamLabel(app.team),
      app.roleLabel,
      app.customRole ?? "",
      app.motivation.expectation,
      app.motivation.contribution,
      app.motivation.projectIdea,
      app.motivation.teamExperience,
      app.portfolioUrl ?? "",
      app.cv?.filename ?? "",
    ];

    return cells.map((cell) => formatCsvDataCell(cell)).join(",");
  });

  return [headerRow, ...dataRows].join("\r\n");
}

/**
 * Triggers a browser download of recruitment applications as a UTF-8 CSV file
 * and revokes the temporary object URL cleanly.
 */
export function downloadApplicationsCsv(
  apps: readonly RecruitmentApplication[],
  filename?: string,
): void {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return;
  }

  const csv = buildApplicationsCsv(apps);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const resolvedFilename =
    filename?.trim() || `muict-devclub-applications-${dateStamp}.csv`;

  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = resolvedFilename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  if (typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(objectUrl);
  }
}
