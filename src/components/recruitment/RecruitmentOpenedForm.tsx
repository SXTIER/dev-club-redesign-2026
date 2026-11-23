"use client";

import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronDown, FileText, FileUp, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAppData } from "@/context/AppDataContext";
import { ApiError } from "@/lib/services/contracts";
import { validateCvFile } from "@/lib/storage/svgSanitizer";
import type { RecruitmentContent, RecruitmentRole } from "@/lib/types/content";
import {
  recruitmentMotivationSchema,
  recruitmentPersonalSchema,
  type RecruitmentApplication,
  type RecruitmentSubmitInput,
  type RecruitmentTeam,
} from "@/lib/types/recruitment";

export interface RecruitmentOpenedFormProps {
  content: RecruitmentContent;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  nickname?: string;
  studentId?: string;
  email?: string;
  phone?: string;
  program?: string;
  year?: string;
  role?: string;
  customRole?: string;
  expectation?: string;
  contribution?: string;
  projectIdea?: string;
  teamExperience?: string;
  portfolioUrl?: string;
  agreedRequirements?: string;
  agreedPdpa?: string;
}

interface SelectedRoleState {
  team: RecruitmentTeam;
  role: RecruitmentRole;
}

const CV_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function renderAgreementLabel(label: string) {
  if (label.endsWith("*")) {
    const base = label.slice(0, -1).trimEnd();
    return (
      <>
        <span>{base}</span>{" "}
        <span aria-hidden="true" className="text-[#FB4A2A] font-semibold">
          *
        </span>
      </>
    );
  }
  return label;
}

export default function RecruitmentOpenedForm({
  content,
}: RecruitmentOpenedFormProps) {
  const { services } = useAppData();
  const { openedCopy, projectsTeamRoles, marketingTeamRoles, agreements } =
    content;
  const { personal: personalCopy, role: roleCopy, motivation: motivationCopy } =
    openedCopy.sections;

  const baseId = useId();
  const ids = {
    firstName: `${baseId}-firstName`,
    lastName: `${baseId}-lastName`,
    nickname: `${baseId}-nickname`,
    studentId: `${baseId}-studentId`,
    email: `${baseId}-email`,
    phone: `${baseId}-phone`,
    program: `${baseId}-program`,
    year: `${baseId}-year`,
    customRole: `${baseId}-customRole`,
    expectation: `${baseId}-expectation`,
    contribution: `${baseId}-contribution`,
    projectIdea: `${baseId}-projectIdea`,
    teamExperience: `${baseId}-teamExperience`,
    cv: `${baseId}-cv`,
    portfolioUrl: `${baseId}-portfolioUrl`,
    agreedRequirements: `${baseId}-agreedRequirements`,
    agreedPdpa: `${baseId}-agreedPdpa`,
  };

  const cvInputRef = useRef<HTMLInputElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);
  const [stepsOpen, setStepsOpen] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState("");

  const [selectedRole, setSelectedRole] = useState<SelectedRoleState | null>(
    null,
  );
  const [customRole, setCustomRole] = useState("");

  const [expectation, setExpectation] = useState("");
  const [contribution, setContribution] = useState("");
  const [projectIdea, setProjectIdea] = useState("");
  const [teamExperience, setTeamExperience] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);

  const [agreedRequirements, setAgreedRequirements] = useState(false);
  const [agreedPdpa, setAgreedPdpa] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<RecruitmentApplication | null>(null);

  const clearFieldError = (field: keyof FormErrors) => {
    setErrors((prev) =>
      prev[field] ? { ...prev, [field]: undefined } : prev,
    );
  };

  const handleCvChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validation = validateCvFile(file);
    if (!validation.ok) {
      setCvError(validation.error);
      return;
    }

    setCvError(null);
    setCvFile(file);
  };

  const handleRemoveCv = () => {
    setCvFile(null);
    setCvError(null);
    if (cvInputRef.current) {
      cvInputRef.current.value = "";
    }
  };

  const validateAll = (): FormErrors => {
    const nextErrors: FormErrors = {};

    const personalResult = recruitmentPersonalSchema.safeParse({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      nickname: nickname.trim(),
      studentId: studentId.trim(),
      email: email.trim(),
      phone: phone.trim(),
      program: program.trim(),
      year: year.trim(),
    });

    if (!personalResult.success) {
      for (const issue of personalResult.error.issues) {
        const key = issue.path[0] as keyof FormErrors | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
    }

    if (!selectedRole) {
      nextErrors.role = "Please select a role in Projects Team or Marketing Team.";
    } else if (selectedRole.role.isOther && customRole.trim().length === 0) {
      nextErrors.customRole = "Please specify your desired role.";
    }

    const motivationResult = recruitmentMotivationSchema.safeParse({
      expectation: expectation.trim(),
      contribution: contribution.trim(),
      projectIdea: projectIdea.trim(),
      teamExperience: teamExperience.trim(),
    });

    if (!motivationResult.success) {
      for (const issue of motivationResult.error.issues) {
        const key = issue.path[0] as keyof FormErrors | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
    }

    const trimmedUrl = portfolioUrl.trim();
    if (trimmedUrl.length > 0 && !isValidHttpUrl(trimmedUrl)) {
      nextErrors.portfolioUrl =
        "Please enter a valid http:// or https:// URL.";
    }

    if (!agreedRequirements) {
      nextErrors.agreedRequirements =
        "Requirements agreement is required before submitting.";
    }
    if (!agreedPdpa) {
      nextErrors.agreedPdpa =
        "PDPA confirmation is required before submitting.";
    }

    return nextErrors;
  };

  const handleReset = () => {
    setFirstName("");
    setLastName("");
    setNickname("");
    setStudentId("");
    setEmail("");
    setPhone("");
    setProgram("");
    setYear("");
    setSelectedRole(null);
    setCustomRole("");
    setExpectation("");
    setContribution("");
    setProjectIdea("");
    setTeamExperience("");
    setPortfolioUrl("");
    setCvFile(null);
    setCvError(null);
    setAgreedRequirements(false);
    setAgreedPdpa(false);
    setErrors({});
    setSubmitError(null);
    setReceipt(null);
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors = validateAll();
    const hasFieldErrors = Object.values(nextErrors).some(Boolean);

    if (!cvFile && cvError) {
      setCvError(null);
    }

    if (hasFieldErrors) {
      setErrors(nextErrors);
      setSubmitError(
        "Please review and fix the highlighted fields before submitting.",
      );
      return;
    }

    if (!selectedRole) return;

    const payload: RecruitmentSubmitInput = {
      personal: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim(),
        studentId: studentId.trim(),
        email: email.trim(),
        phone: phone.trim(),
        program: program.trim(),
        year: year.trim(),
      },
      team: selectedRole.team,
      roleId: selectedRole.role.id,
      roleLabel: selectedRole.role.title,
      ...(selectedRole.role.isOther ? { customRole: customRole.trim() } : {}),
      motivation: {
        expectation: expectation.trim(),
        contribution: contribution.trim(),
        projectIdea: projectIdea.trim(),
        teamExperience: teamExperience.trim(),
      },
      ...(portfolioUrl.trim() ? { portfolioUrl: portfolioUrl.trim() } : {}),
      agreedRequirements: true,
      agreedPdpa: true,
    };

    setSubmitting(true);
    try {
      const created = await services.recruitment.submitApplication(
        payload,
        cvFile ?? undefined,
      );
      setReceipt(created);
      setErrors({});
      setSubmitError(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError(
          "Unable to submit your application right now. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputBaseClass =
    "w-full min-h-[48px] rounded-[8px] border bg-white px-3.5 py-2.5 text-[15px] text-[#1C1B1F] placeholder:text-[#757E91] focus:outline-2 focus:outline-offset-0 focus:outline-[#0038E1]";

  const renderRoleCard = (team: RecruitmentTeam, item: RecruitmentRole) => {
    const isSelected = selectedRole?.role.id === item.id;
    const radioId = `${baseId}-role-${item.id}`;
    const titleId = `${radioId}-title`;
    const descId = `${radioId}-desc`;

    return (
      <label
        key={item.id}
        htmlFor={radioId}
        className={[
          "flex items-start gap-3 rounded-[8px] border p-3.5 cursor-pointer transition-colors",
          isSelected
            ? "border-[#0038E1] bg-[#0038E1]/5 ring-1 ring-[#0038E1]"
            : errors.role
              ? "border-[#FB4A2A] bg-white hover:border-[#0038E1]"
              : "border-[#7A878C] bg-white hover:border-[#0038E1]",
        ].join(" ")}
      >
        <input
          id={radioId}
          type="radio"
          name="recruitment-role"
          value={item.id}
          checked={isSelected}
          aria-labelledby={titleId}
          aria-describedby={descId}
          onChange={() => {
            setSelectedRole({ team, role: item });
            clearFieldError("role");
            if (!item.isOther) {
              clearFieldError("customRole");
            }
          }}
          className="mt-1 h-4 w-4 shrink-0 accent-[#0038E1] cursor-pointer"
        />
        <span className="min-w-0">
          <span
            id={titleId}
            className="block text-[15px] font-medium text-[#1C1B1F] leading-snug"
          >
            {item.title}
          </span>
          <span
            id={descId}
            className="mt-0.5 block text-[13px] font-light text-[#757E91] leading-snug"
          >
            {item.description}
          </span>
        </span>
      </label>
    );
  };

  return (
    <div
      ref={formTopRef}
      className="w-full bg-white py-6 sm:py-8 lg:py-10"
    >
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16">
        <div>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-sm text-[#001C26] underline underline-offset-4 hover:text-[#0038E1] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038E1]"
          >
            {openedCopy.backLinkLabel}
          </Link>
        </div>

        <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 xl:gap-10 items-start">
          {/* Left Sticky Onboarding Column */}
          <aside className="min-w-0 lg:col-span-5 lg:sticky lg:top-24 relative overflow-hidden rounded-[16px] sm:rounded-[20px] bg-[#0038E1] text-white p-5 sm:p-8 xl:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              <div className="absolute inset-0 bg-black/10" />
              <div
                className="absolute inset-0 bg-repeat opacity-10"
                style={{
                  backgroundImage: 'url("/images/figma/hero-pattern.png")',
                  backgroundSize: "1024px 1024px",
                  backgroundPosition: "top left",
                }}
              />
            </div>

            <div className="relative z-10">
              <p className="text-[28px] sm:text-4xl xl:text-[46px] font-normal leading-[1.12] sm:whitespace-pre-line text-white">
                {openedCopy.sidebarHeadline}
              </p>

              <p className="mt-4 text-sm sm:text-base lg:text-[17px] leading-[1.6] text-white/95">
                {openedCopy.sidebarDescription}
              </p>

              <button
                type="button"
                aria-expanded={stepsOpen}
                aria-controls={`${baseId}-steps`}
                onClick={() => setStepsOpen((open) => !open)}
                className="mt-4 flex min-h-11 w-full items-center justify-between gap-3 border-t border-white/30 pt-3 text-left text-sm font-medium text-white lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Application steps
                <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${stepsOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              <div className="hidden lg:block my-6 border-t border-[#D6DBE0]/40" />

              <ol
                id={`${baseId}-steps`}
                className={`${stepsOpen ? "grid" : "hidden lg:grid"} mt-4 lg:mt-0 grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 lg:gap-5`}
              >
                {openedCopy.steps.map((step) => (
                  <li key={step.number} className="flex sm:flex-col lg:flex-row items-start gap-2 lg:gap-4">
                    <span className="text-base font-semibold text-[#A9E041] shrink-0 pt-0.5">
                      {step.number}
                    </span>
                    <div className="min-w-0">
                      <p className="text-base sm:text-[17px] font-medium leading-[1.4] text-white">
                        {step.title}
                      </p>
                      <p className="mt-1 text-xs sm:text-sm leading-[1.6] text-white/90">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          {/* Right Form / Receipt Column */}
          <div className="min-w-0 lg:col-span-7 bg-white border border-[#E2E8F0] rounded-[16px] lg:rounded-[20px] p-4 sm:p-7 lg:p-8">
            {receipt ? (
              <section
                aria-labelledby="receipt-heading"
                className="space-y-6 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E7FDA7] text-[#548000]">
                    <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
                  </div>
                  <Badge tone="warning">{receipt.status}</Badge>
                </div>

                <div className="space-y-2">
                  <h1
                    id="receipt-heading"
                    className="text-2xl sm:text-3xl font-bold text-[#001C26]"
                  >
                    {content.successCopy.title}
                  </h1>
                  <p className="text-base leading-relaxed text-[#4A5565]">
                    {content.successCopy.description}
                  </p>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-5 text-sm [overflow-wrap:anywhere]">
                  <div>
                    <dt className="text-[#757E91] font-medium">
                      Application ID
                    </dt>
                    <dd className="mt-1 font-mono text-base font-bold text-[#0038E1]">
                      {receipt.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#757E91] font-medium">Applicant</dt>
                    <dd className="mt-1 font-medium text-[#1C1B1F]">
                      {receipt.personal.firstName} {receipt.personal.lastName} (
                      {receipt.personal.nickname})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#757E91] font-medium">
                      Student ID &amp; Program
                    </dt>
                    <dd className="mt-1 text-[#1C1B1F]">
                      {receipt.personal.studentId} · {receipt.personal.program}{" "}
                      Year {receipt.personal.year}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#757E91] font-medium">
                      Team &amp; Role
                    </dt>
                    <dd className="mt-1 text-[#1C1B1F]">
                      {receipt.team === "projects"
                        ? roleCopy.projectsTeamLabel
                        : roleCopy.marketingTeamLabel}{" "}
                      —{" "}
                      {receipt.customRole
                        ? `${receipt.roleLabel}: ${receipt.customRole}`
                        : receipt.roleLabel}
                    </dd>
                  </div>
                  {receipt.cv ? (
                    <div className="sm:col-span-2">
                      <dt className="text-[#757E91] font-medium">
                        Uploaded CV
                      </dt>
                      <dd className="mt-1 font-mono text-[#1C1B1F]">
                        {receipt.cv.filename} ({formatBytes(receipt.cv.sizeBytes)})
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Link
                    href="/"
                    className="inline-flex h-11 px-5 items-center justify-center bg-[#0038E1] text-white text-sm sm:text-base font-medium border-2 border-[#001C26] hover:bg-[#002BAA] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
                  >
                    Back to Home
                  </Link>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleReset}
                  >
                    Submit another response
                  </Button>
                </div>
              </section>
            ) : (
              <div>
                <h1 className="text-xl sm:text-[26px] lg:text-[28px] font-bold leading-tight text-[#001C26]">
                  {openedCopy.formTitle}
                </h1>
                <p className="mt-1.5 text-sm sm:text-[15px] text-[#001C26]">
                  {openedCopy.formSubtitle.includes("*") ? (
                    <>
                      {openedCopy.formSubtitle.split("*")[0]}
                      <span className="text-[#FB4A2A] font-semibold">*</span>
                      {openedCopy.formSubtitle.split("*").slice(1).join("*")}
                    </>
                  ) : (
                    openedCopy.formSubtitle
                  )}
                </p>

                <form
                  noValidate
                  onSubmit={handleSubmit}
                  className="mt-8 space-y-9"
                >
                  {submitError ? (
                    <div
                      role="alert"
                      className="flex items-start gap-3 rounded-[8px] border border-[#FB4A2A] bg-[#FAAF98]/35 px-4 py-3 text-sm font-medium text-[#B41B00]"
                    >
                      <AlertCircle
                        className="w-5 h-5 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{submitError}</span>
                    </div>
                  ) : null}

                  {/* Section 01: Personal & Student Information */}
                  <section aria-labelledby={`${baseId}-sec-01`} className="space-y-4">
                    <h2
                      id={`${baseId}-sec-01`}
                      className="text-[18px] text-[#001C26]"
                    >
                      <span className="text-[#0038E1] font-normal">
                        {personalCopy.tag}
                      </span>{" "}
                      <span className="font-bold">{personalCopy.title}</span>
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      {/* First Name */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor={ids.firstName}
                          className="block text-[15px] text-[#1C1B1F]"
                        >
                          {personalCopy.fields.firstName.label}{" "}
                          <span aria-hidden="true" className="text-[#FB4A2A]">
                            *
                          </span>
                        </label>
                        <input
                          id={ids.firstName}
                          name="firstName"
                          type="text"
                          required
                          autoComplete="given-name"
                          value={firstName}
                          placeholder={personalCopy.fields.firstName.placeholder}
                          aria-invalid={errors.firstName ? "true" : "false"}
                          aria-describedby={
                            errors.firstName ? `${ids.firstName}-err` : undefined
                          }
                          onChange={(e) => {
                            setFirstName(e.target.value);
                            clearFieldError("firstName");
                          }}
                          className={[
                            inputBaseClass,
                            errors.firstName
                              ? "border-[#FB4A2A]"
                              : "border-[#7A878C]",
                          ].join(" ")}
                        />
                        {errors.firstName ? (
                          <p
                            id={`${ids.firstName}-err`}
                            className="text-xs sm:text-sm font-medium text-[#B41B00]"
                          >
                            {errors.firstName}
                          </p>
                        ) : null}
                      </div>

                      {/* Last Name */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor={ids.lastName}
                          className="block text-[15px] text-[#1C1B1F]"
                        >
                          {personalCopy.fields.lastName.label}{" "}
                          <span aria-hidden="true" className="text-[#FB4A2A]">
                            *
                          </span>
                        </label>
                        <input
                          id={ids.lastName}
                          name="lastName"
                          type="text"
                          required
                          autoComplete="family-name"
                          value={lastName}
                          placeholder={personalCopy.fields.lastName.placeholder}
                          aria-invalid={errors.lastName ? "true" : "false"}
                          aria-describedby={
                            errors.lastName ? `${ids.lastName}-err` : undefined
                          }
                          onChange={(e) => {
                            setLastName(e.target.value);
                            clearFieldError("lastName");
                          }}
                          className={[
                            inputBaseClass,
                            errors.lastName
                              ? "border-[#FB4A2A]"
                              : "border-[#7A878C]",
                          ].join(" ")}
                        />
                        {errors.lastName ? (
                          <p
                            id={`${ids.lastName}-err`}
                            className="text-xs sm:text-sm font-medium text-[#B41B00]"
                          >
                            {errors.lastName}
                          </p>
                        ) : null}
                      </div>

                      {/* NickName */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor={ids.nickname}
                          className="block text-[15px] text-[#1C1B1F]"
                        >
                          {personalCopy.fields.nickname.label}{" "}
                          <span aria-hidden="true" className="text-[#FB4A2A]">
                            *
                          </span>
                        </label>
                        <input
                          id={ids.nickname}
                          name="nickname"
                          type="text"
                          required
                          autoComplete="nickname"
                          value={nickname}
                          placeholder={personalCopy.fields.nickname.placeholder}
                          aria-invalid={errors.nickname ? "true" : "false"}
                          aria-describedby={
                            errors.nickname ? `${ids.nickname}-err` : undefined
                          }
                          onChange={(e) => {
                            setNickname(e.target.value);
                            clearFieldError("nickname");
                          }}
                          className={[
                            inputBaseClass,
                            errors.nickname
                              ? "border-[#FB4A2A]"
                              : "border-[#7A878C]",
                          ].join(" ")}
                        />
                        {errors.nickname ? (
                          <p
                            id={`${ids.nickname}-err`}
                            className="text-xs sm:text-sm font-medium text-[#B41B00]"
                          >
                            {errors.nickname}
                          </p>
                        ) : null}
                      </div>

                      {/* Student ID */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor={ids.studentId}
                          className="block text-[15px] text-[#1C1B1F]"
                        >
                          {personalCopy.fields.studentId.label}{" "}
                          <span aria-hidden="true" className="text-[#FB4A2A]">
                            *
                          </span>
                        </label>
                        <input
                          id={ids.studentId}
                          name="studentId"
                          type="text"
                          inputMode="numeric"
                          maxLength={7}
                          required
                          value={studentId}
                          placeholder={personalCopy.fields.studentId.placeholder}
                          aria-invalid={errors.studentId ? "true" : "false"}
                          aria-describedby={
                            errors.studentId
                              ? `${ids.studentId}-err`
                              : personalCopy.fields.studentId.hint
                                ? `${ids.studentId}-hint`
                                : undefined
                          }
                          onChange={(e) => {
                            setStudentId(e.target.value);
                            clearFieldError("studentId");
                          }}
                          className={[
                            inputBaseClass,
                            "font-mono",
                            errors.studentId
                              ? "border-[#FB4A2A]"
                              : "border-[#7A878C]",
                          ].join(" ")}
                        />
                        {errors.studentId ? (
                          <p
                            id={`${ids.studentId}-err`}
                            className="text-xs sm:text-sm font-medium text-[#B41B00]"
                          >
                            {errors.studentId}
                          </p>
                        ) : personalCopy.fields.studentId.hint ? (
                          <p
                            id={`${ids.studentId}-hint`}
                            className="text-xs text-[#757E91]"
                          >
                            {personalCopy.fields.studentId.hint}
                          </p>
                        ) : null}
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor={ids.email}
                          className="block text-[15px] text-[#1C1B1F]"
                        >
                          {personalCopy.fields.email.label}{" "}
                          <span aria-hidden="true" className="text-[#FB4A2A]">
                            *
                          </span>
                        </label>
                        <input
                          id={ids.email}
                          name="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          required
                          value={email}
                          placeholder={personalCopy.fields.email.placeholder}
                          aria-invalid={errors.email ? "true" : "false"}
                          aria-describedby={
                            errors.email ? `${ids.email}-err` : undefined
                          }
                          onChange={(e) => {
                            setEmail(e.target.value);
                            clearFieldError("email");
                          }}
                          className={[
                            inputBaseClass,
                            errors.email
                              ? "border-[#FB4A2A]"
                              : "border-[#7A878C]",
                          ].join(" ")}
                        />
                        {errors.email ? (
                          <p
                            id={`${ids.email}-err`}
                            className="text-xs sm:text-sm font-medium text-[#B41B00]"
                          >
                            {errors.email}
                          </p>
                        ) : null}
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor={ids.phone}
                          className="block text-[15px] text-[#1C1B1F]"
                        >
                          {personalCopy.fields.phone.label}{" "}
                          <span aria-hidden="true" className="text-[#FB4A2A]">
                            *
                          </span>
                        </label>
                        <input
                          id={ids.phone}
                          name="phone"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          autoComplete="tel"
                          required
                          value={phone}
                          placeholder={personalCopy.fields.phone.placeholder}
                          aria-invalid={errors.phone ? "true" : "false"}
                          aria-describedby={
                            errors.phone
                              ? `${ids.phone}-err`
                              : personalCopy.fields.phone.hint
                                ? `${ids.phone}-hint`
                                : undefined
                          }
                          onChange={(e) => {
                            setPhone(e.target.value);
                            clearFieldError("phone");
                          }}
                          className={[
                            inputBaseClass,
                            "font-mono",
                            errors.phone
                              ? "border-[#FB4A2A]"
                              : "border-[#7A878C]",
                          ].join(" ")}
                        />
                        {errors.phone ? (
                          <p
                            id={`${ids.phone}-err`}
                            className="text-xs sm:text-sm font-medium text-[#B41B00]"
                          >
                            {errors.phone}
                          </p>
                        ) : personalCopy.fields.phone.hint ? (
                          <p
                            id={`${ids.phone}-hint`}
                            className="text-xs text-[#757E91]"
                          >
                            {personalCopy.fields.phone.hint}
                          </p>
                        ) : null}
                      </div>

                      {/* Program */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor={ids.program}
                          className="block text-[15px] text-[#1C1B1F]"
                        >
                          {personalCopy.fields.program.label}{" "}
                          <span aria-hidden="true" className="text-[#FB4A2A]">
                            *
                          </span>
                        </label>
                        <select
                          id={ids.program}
                          name="program"
                          required
                          value={program}
                          aria-invalid={errors.program ? "true" : "false"}
                          aria-describedby={
                            errors.program ? `${ids.program}-err` : undefined
                          }
                          onChange={(e) => {
                            setProgram(e.target.value);
                            clearFieldError("program");
                          }}
                          className={[
                            inputBaseClass,
                            errors.program
                              ? "border-[#FB4A2A]"
                              : "border-[#7A878C]",
                          ].join(" ")}
                        >
                          <option value="">
                            {personalCopy.fields.program.placeholder}
                          </option>
                          {content.programs.map((prog) => (
                            <option key={prog} value={prog}>
                              {prog}
                            </option>
                          ))}
                        </select>
                        {errors.program ? (
                          <p
                            id={`${ids.program}-err`}
                            className="text-xs sm:text-sm font-medium text-[#B41B00]"
                          >
                            {errors.program}
                          </p>
                        ) : null}
                      </div>

                      {/* Year */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor={ids.year}
                          className="block text-[15px] text-[#1C1B1F]"
                        >
                          {personalCopy.fields.year.label}{" "}
                          <span aria-hidden="true" className="text-[#FB4A2A]">
                            *
                          </span>
                        </label>
                        <select
                          id={ids.year}
                          name="year"
                          required
                          value={year}
                          aria-invalid={errors.year ? "true" : "false"}
                          aria-describedby={
                            errors.year ? `${ids.year}-err` : undefined
                          }
                          onChange={(e) => {
                            setYear(e.target.value);
                            clearFieldError("year");
                          }}
                          className={[
                            inputBaseClass,
                            errors.year
                              ? "border-[#FB4A2A]"
                              : "border-[#7A878C]",
                          ].join(" ")}
                        >
                          <option value="">
                            {personalCopy.fields.year.placeholder}
                          </option>
                          {content.years.map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}
                            </option>
                          ))}
                        </select>
                        {errors.year ? (
                          <p
                            id={`${ids.year}-err`}
                            className="text-xs sm:text-sm font-medium text-[#B41B00]"
                          >
                            {errors.year}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  <hr className="border-[#E2E8F0]" />

                  {/* Section 02: Select Role & Focus */}
                  <section aria-labelledby={`${baseId}-sec-02`} className="space-y-5">
                    <h2
                      id={`${baseId}-sec-02`}
                      className="text-[18px] text-[#001C26]"
                    >
                      <span className="text-[#0038E1] font-normal">
                        {roleCopy.tag}
                      </span>{" "}
                      <span className="font-bold">{roleCopy.title}</span>
                    </h2>

                    {/* Projects Team */}
                    <fieldset className="space-y-2.5">
                      <legend className="text-[15px] font-medium text-[#1C1B1F]">
                        {roleCopy.projectsTeamLabel}
                      </legend>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {projectsTeamRoles.map((r) =>
                          renderRoleCard("projects", r),
                        )}
                      </div>
                    </fieldset>

                    {/* Marketing Team */}
                    <fieldset className="space-y-2.5">
                      <legend className="text-[15px] font-medium text-[#1C1B1F]">
                        {roleCopy.marketingTeamLabel}
                      </legend>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {marketingTeamRoles.map((r) =>
                          renderRoleCard("marketing", r),
                        )}
                      </div>
                    </fieldset>

                    {errors.role ? (
                      <p className="text-xs sm:text-sm font-medium text-[#B41B00]">
                        {errors.role}
                      </p>
                    ) : null}

                    {selectedRole?.role.isOther ? (
                      <div className="space-y-1.5 pt-1">
                        <label
                          htmlFor={ids.customRole}
                          className="block text-[15px] text-[#1C1B1F]"
                        >
                          Custom Role{" "}
                          <span aria-hidden="true" className="text-[#FB4A2A]">
                            *
                          </span>
                        </label>
                        <input
                          id={ids.customRole}
                          name="customRole"
                          type="text"
                          required
                          value={customRole}
                          placeholder={roleCopy.otherPlaceholder}
                          aria-invalid={errors.customRole ? "true" : "false"}
                          aria-describedby={
                            errors.customRole
                              ? `${ids.customRole}-err`
                              : undefined
                          }
                          onChange={(e) => {
                            setCustomRole(e.target.value);
                            clearFieldError("customRole");
                          }}
                          className={[
                            inputBaseClass,
                            errors.customRole
                              ? "border-[#FB4A2A]"
                              : "border-[#7A878C]",
                          ].join(" ")}
                        />
                        {errors.customRole ? (
                          <p
                            id={`${ids.customRole}-err`}
                            className="text-xs sm:text-sm font-medium text-[#B41B00]"
                          >
                            {errors.customRole}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </section>

                  <hr className="border-[#E2E8F0]" />

                  {/* Section 03: Motivation, Experience & Portfolio */}
                  <section aria-labelledby={`${baseId}-sec-03`} className="space-y-4">
                    <h2
                      id={`${baseId}-sec-03`}
                      className="text-[18px] text-[#001C26]"
                    >
                      <span className="text-[#0038E1] font-normal">
                        {motivationCopy.tag}
                      </span>{" "}
                      <span className="font-bold">{motivationCopy.title}</span>
                    </h2>

                    {/* Expectation */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor={ids.expectation}
                        className="block text-[15px] text-[#1C1B1F]"
                      >
                        {motivationCopy.fields.expectation.label}{" "}
                        <span aria-hidden="true" className="text-[#FB4A2A]">
                          *
                        </span>
                      </label>
                      <textarea
                        id={ids.expectation}
                        name="expectation"
                        rows={3}
                        required
                        value={expectation}
                        placeholder={
                          motivationCopy.fields.expectation.placeholder
                        }
                        aria-invalid={errors.expectation ? "true" : "false"}
                        aria-describedby={
                          errors.expectation
                            ? `${ids.expectation}-err`
                            : undefined
                        }
                        onChange={(e) => {
                          setExpectation(e.target.value);
                          clearFieldError("expectation");
                        }}
                        className={[
                          inputBaseClass,
                          "min-h-[112px] resize-y",
                          errors.expectation
                            ? "border-[#FB4A2A]"
                            : "border-[#7A878C]",
                        ].join(" ")}
                      />
                      {errors.expectation ? (
                        <p
                          id={`${ids.expectation}-err`}
                          className="text-xs sm:text-sm font-medium text-[#B41B00]"
                        >
                          {errors.expectation}
                        </p>
                      ) : null}
                    </div>

                    {/* Contribution */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor={ids.contribution}
                        className="block text-[15px] text-[#1C1B1F]"
                      >
                        {motivationCopy.fields.contribution.label}{" "}
                        <span aria-hidden="true" className="text-[#FB4A2A]">
                          *
                        </span>
                      </label>
                      <textarea
                        id={ids.contribution}
                        name="contribution"
                        rows={3}
                        required
                        value={contribution}
                        placeholder={
                          motivationCopy.fields.contribution.placeholder
                        }
                        aria-invalid={errors.contribution ? "true" : "false"}
                        aria-describedby={
                          errors.contribution
                            ? `${ids.contribution}-err`
                            : undefined
                        }
                        onChange={(e) => {
                          setContribution(e.target.value);
                          clearFieldError("contribution");
                        }}
                        className={[
                          inputBaseClass,
                          "min-h-[112px] resize-y",
                          errors.contribution
                            ? "border-[#FB4A2A]"
                            : "border-[#7A878C]",
                        ].join(" ")}
                      />
                      {errors.contribution ? (
                        <p
                          id={`${ids.contribution}-err`}
                          className="text-xs sm:text-sm font-medium text-[#B41B00]"
                        >
                          {errors.contribution}
                        </p>
                      ) : null}
                    </div>

                    {/* Project Idea */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor={ids.projectIdea}
                        className="block text-[15px] text-[#1C1B1F]"
                      >
                        {motivationCopy.fields.projectIdea.label}{" "}
                        <span aria-hidden="true" className="text-[#FB4A2A]">
                          *
                        </span>
                      </label>
                      <textarea
                        id={ids.projectIdea}
                        name="projectIdea"
                        rows={3}
                        required
                        value={projectIdea}
                        placeholder={
                          motivationCopy.fields.projectIdea.placeholder
                        }
                        aria-invalid={errors.projectIdea ? "true" : "false"}
                        aria-describedby={
                          errors.projectIdea
                            ? `${ids.projectIdea}-err`
                            : undefined
                        }
                        onChange={(e) => {
                          setProjectIdea(e.target.value);
                          clearFieldError("projectIdea");
                        }}
                        className={[
                          inputBaseClass,
                          "min-h-[112px] resize-y",
                          errors.projectIdea
                            ? "border-[#FB4A2A]"
                            : "border-[#7A878C]",
                        ].join(" ")}
                      />
                      {errors.projectIdea ? (
                        <p
                          id={`${ids.projectIdea}-err`}
                          className="text-xs sm:text-sm font-medium text-[#B41B00]"
                        >
                          {errors.projectIdea}
                        </p>
                      ) : null}
                    </div>

                    {/* Team Project Experience */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor={ids.teamExperience}
                        className="block text-[15px] text-[#1C1B1F]"
                      >
                        {motivationCopy.fields.teamExperience.label}{" "}
                        <span aria-hidden="true" className="text-[#FB4A2A]">
                          *
                        </span>
                      </label>
                      <textarea
                        id={ids.teamExperience}
                        name="teamExperience"
                        rows={3}
                        required
                        value={teamExperience}
                        placeholder={
                          motivationCopy.fields.teamExperience.placeholder
                        }
                        aria-invalid={errors.teamExperience ? "true" : "false"}
                        aria-describedby={
                          errors.teamExperience
                            ? `${ids.teamExperience}-err`
                            : undefined
                        }
                        onChange={(e) => {
                          setTeamExperience(e.target.value);
                          clearFieldError("teamExperience");
                        }}
                        className={[
                          inputBaseClass,
                          "min-h-[112px] resize-y",
                          errors.teamExperience
                            ? "border-[#FB4A2A]"
                            : "border-[#7A878C]",
                        ].join(" ")}
                      />
                      {errors.teamExperience ? (
                        <p
                          id={`${ids.teamExperience}-err`}
                          className="text-xs sm:text-sm font-medium text-[#B41B00]"
                        >
                          {errors.teamExperience}
                        </p>
                      ) : null}
                    </div>

                    {/* CV Upload */}
                    <div className="space-y-1.5">
                      <span className="block text-[15px] text-[#1C1B1F]">
                        {motivationCopy.fields.cv.label}
                      </span>

                      <div
                        className={[
                          "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[8px] border bg-white px-4 py-4",
                          cvError
                            ? "border-[#FB4A2A] bg-[#FAAF98]/15"
                            : "border-[#7A878C]",
                        ].join(" ")}
                      >
                        <input
                          ref={cvInputRef}
                          id={ids.cv}
                          type="file"
                          accept={CV_ACCEPT}
                          aria-label={motivationCopy.fields.cv.buttonLabel}
                          aria-invalid={cvError ? "true" : "false"}
                          aria-describedby={
                            cvError ? `${ids.cv}-err` : undefined
                          }
                          onChange={handleCvChange}
                          className="sr-only"
                        />

                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-[8px] bg-[#F4F5F7] border border-[#E2E8F0] flex items-center justify-center text-[#0038E1] shrink-0">
                            {cvFile ? (
                              <FileText className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <FileUp className="w-4 h-4" aria-hidden="true" />
                            )}
                          </div>
                          <div className="min-w-0">
                            {cvFile ? (
                              <>
                                <p className="text-[15px] font-medium text-[#1C1B1F] truncate">
                                  {cvFile.name}
                                </p>
                                <p className="text-xs text-[#757E91] font-mono">
                                  {formatBytes(cvFile.size)}
                                </p>
                              </>
                            ) : (
                              <p className="text-[15px] font-light text-[#757E91]">
                                {motivationCopy.fields.cv.emptyLabel}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                          {cvFile ? (
                            <button
                              type="button"
                              onClick={handleRemoveCv}
                              aria-label="Remove CV"
                              className="inline-flex items-center gap-1 min-h-11 px-3 rounded-[10px] border border-[#E2E8F0] text-sm text-[#B41B00] hover:bg-[#FAAF98]/25 transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" aria-hidden="true" />
                              <span>Remove</span>
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => cvInputRef.current?.click()}
                            className="inline-flex items-center justify-center min-h-11 px-4 py-2 rounded-[10px] border border-[#A1A7B4] bg-white text-[15px] text-[#4A5565] underline underline-offset-4 hover:border-[#0038E1] hover:text-[#0038E1] transition-colors cursor-pointer"
                          >
                            {motivationCopy.fields.cv.buttonLabel}
                          </button>
                        </div>
                      </div>

                      {cvError ? (
                        <div className="flex items-center justify-between gap-3">
                          <p
                            id={`${ids.cv}-err`}
                            role="alert"
                            className="text-xs sm:text-sm font-medium text-[#B41B00]"
                          >
                            {cvError}
                          </p>
                          <button
                            type="button"
                            onClick={() => setCvError(null)}
                            aria-label="Dismiss CV error"
                            className="shrink-0 text-xs font-medium text-[#B41B00] underline underline-offset-4 hover:text-[#7A1200] cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {/* Portfolio Link */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor={ids.portfolioUrl}
                        className="block text-[15px] text-[#1C1B1F]"
                      >
                        {motivationCopy.fields.portfolioUrl.label}
                      </label>
                      <input
                        id={ids.portfolioUrl}
                        name="portfolioUrl"
                        type="url"
                        value={portfolioUrl}
                        placeholder={
                          motivationCopy.fields.portfolioUrl.placeholder
                        }
                        aria-invalid={errors.portfolioUrl ? "true" : "false"}
                        aria-describedby={
                          errors.portfolioUrl
                            ? `${ids.portfolioUrl}-err`
                            : undefined
                        }
                        onChange={(e) => {
                          setPortfolioUrl(e.target.value);
                          clearFieldError("portfolioUrl");
                        }}
                        className={[
                          inputBaseClass,
                          errors.portfolioUrl
                            ? "border-[#FB4A2A]"
                            : "border-[#7A878C]",
                        ].join(" ")}
                      />
                      {errors.portfolioUrl ? (
                        <p
                          id={`${ids.portfolioUrl}-err`}
                          className="text-xs sm:text-sm font-medium text-[#B41B00]"
                        >
                          {errors.portfolioUrl}
                        </p>
                      ) : null}
                    </div>
                  </section>

                  <hr className="border-[#E2E8F0]" />

                  {/* Agreements */}
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-3">
                        <input
                          id={ids.agreedRequirements}
                          name="agreedRequirements"
                          type="checkbox"
                          required
                          checked={agreedRequirements}
                          aria-invalid={
                            errors.agreedRequirements ? "true" : "false"
                          }
                          aria-describedby={
                            errors.agreedRequirements
                              ? `${ids.agreedRequirements}-err`
                              : undefined
                          }
                          onChange={(e) => {
                            setAgreedRequirements(e.target.checked);
                            clearFieldError("agreedRequirements");
                          }}
                          className="mt-1 h-5 w-5 shrink-0 accent-[#0038E1] rounded border-2 border-[#0038E1] cursor-pointer"
                        />
                        <div>
                          <label
                            htmlFor={ids.agreedRequirements}
                            className="block text-[15px] font-medium text-[#1C1B1F] cursor-pointer"
                          >
                            {renderAgreementLabel(agreements.requirementsLabel)}
                          </label>
                          <p className="mt-0.5 text-[13px] leading-relaxed text-[#757E91]">
                            {agreements.requirementsDescription}
                          </p>
                        </div>
                      </div>
                      {errors.agreedRequirements ? (
                        <p
                          id={`${ids.agreedRequirements}-err`}
                          className="text-xs sm:text-sm font-medium text-[#B41B00] pl-8"
                        >
                          {errors.agreedRequirements}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-start gap-3">
                        <input
                          id={ids.agreedPdpa}
                          name="agreedPdpa"
                          type="checkbox"
                          required
                          checked={agreedPdpa}
                          aria-invalid={errors.agreedPdpa ? "true" : "false"}
                          aria-describedby={
                            errors.agreedPdpa
                              ? `${ids.agreedPdpa}-err`
                              : undefined
                          }
                          onChange={(e) => {
                            setAgreedPdpa(e.target.checked);
                            clearFieldError("agreedPdpa");
                          }}
                          className="mt-1 h-5 w-5 shrink-0 accent-[#0038E1] rounded border-2 border-[#0038E1] cursor-pointer"
                        />
                        <div>
                          <label
                            htmlFor={ids.agreedPdpa}
                            className="block text-[15px] font-medium text-[#1C1B1F] cursor-pointer"
                          >
                            {renderAgreementLabel(agreements.pdpaLabel)}
                          </label>
                          <p className="mt-0.5 text-[13px] leading-relaxed text-[#757E91]">
                            {agreements.pdpaDescription}{" "}
                            <Link
                              href="/privacy-policy"
                              className="text-[#0038E1] font-medium underline underline-offset-4 hover:text-[#002BAA]"
                            >
                              Privacy Policy
                            </Link>
                          </p>
                        </div>
                      </div>
                      {errors.agreedPdpa ? (
                        <p
                          id={`${ids.agreedPdpa}-err`}
                          className="text-xs sm:text-sm font-medium text-[#B41B00] pl-8"
                        >
                          {errors.agreedPdpa}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    aria-busy={submitting || undefined}
                    className="w-full h-[56px] sm:h-[60px] px-6 flex items-center justify-center bg-[#001C26] text-white text-base font-medium hover:bg-[#0038E1] active:bg-[#002BAA] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
                  >
                    {submitting ? "Submitting Application..." : content.submitLabel}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
