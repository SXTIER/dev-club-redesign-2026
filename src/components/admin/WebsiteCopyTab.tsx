"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ContentImage } from "@/components/ui/ContentImage";
import { MediaPickerModal } from "@/components/ui/MediaPickerModal";
import { Modal } from "@/components/ui/Modal";
import { useAppData } from "@/context/AppDataContext";
import { ApiError } from "@/lib/services/contracts";
import { findIdbRefs } from "@/lib/storage/localOverlay";
import {
  homeContentSchema,
  legalContentSchema,
  recruitmentContentSchema,
  siteContentSchema,
  type AcknowledgementCredit,
  type ContentSectionKey,
  type HomeContent,
  type ImageAsset,
  type LegalContent,
  type LegalDocument,
  type LegalSection,
  type NavLinkItem,
  type RecruitmentContent,
  type RecruitmentRole,
  type SiteContent,
} from "@/lib/types/content";
import type { MediaAsset } from "@/lib/types/media";

type EditorSectionId =
  | "home-hero"
  | "home-about"
  | "home-why-us"
  | "home-teams"
  | "home-timeline"
  | "home-location"
  | "home-faq"
  | "site-navigation"
  | "recruitment"
  | "legal";

interface SectionNavMeta {
  id: EditorSectionId;
  label: string;
  code: string;
  title: string;
  description: string;
  configKey: ContentSectionKey;
}

const SECTION_NAV: readonly SectionNavMeta[] = [
  {
    id: "home-hero",
    label: "Home · Hero",
    code: "01 / HOME HERO",
    title: "Home / Hero",
    description:
      "Manage the hero eyebrow, headline, description, CTA, and hero artwork shown on Home.",
    configKey: "home",
  },
  {
    id: "home-about",
    label: "Home · About Us",
    code: "02 / ABOUT US",
    title: "Home / About Us",
    description:
      "Edit the About Us section eyebrow, lead question, emphasis line, and body copy.",
    configKey: "home",
  },
  {
    id: "home-why-us",
    label: "Home · Why MUICT Dev Club",
    code: "03 / WHY MUICT DEV CLUB",
    title: "Home / Why MUICT Dev Club",
    description:
      "Fixed 3-pillar layout locked to 2026 CI accents. Edit titles and descriptions.",
    configKey: "home",
  },
  {
    id: "home-teams",
    label: "Home · Teams",
    code: "04 / TEAMS",
    title: "Home / Teams",
    description:
      "Fixed 5 club tracks locked to 2026 CI swatches. Edit names, descriptions, and tools.",
    configKey: "home",
  },
  {
    id: "home-timeline",
    label: "Home · Timeline Header",
    code: "05 / TIMELINE HEADER",
    title: "Home / Timeline Header",
    description:
      "Manage the Event Roadmap header copy. Individual events are managed in Events.",
    configKey: "home",
  },
  {
    id: "home-location",
    label: "Home · Location",
    code: "06 / LOCATION",
    title: "Home / Location",
    description:
      "Manage campus address details, Google Maps link, pin icon, and campus photo.",
    configKey: "home",
  },
  {
    id: "home-faq",
    label: "Home · FAQ",
    code: "07 / FAQ",
    title: "Home / FAQ",
    description:
      "Manage FAQ section header, Ask Question modal labels, and dynamic FAQ items.",
    configKey: "home",
  },
  {
    id: "site-navigation",
    label: "Site & Navigation",
    code: "08 / SITE & NAVIGATION",
    title: "Site / Brand, Navbar & Footer",
    description:
      "Edit brand name, slogan, dark/white logos, navigation links, and footer details.",
    configKey: "site",
  },
  {
    id: "recruitment",
    label: "Recruitment Copy & Roles",
    code: "09 / RECRUITMENT",
    title: "Recruitment / Status, Form Copy & Roles",
    description:
      "Toggle recruitment availability, edit form labels, and manage team roles.",
    configKey: "recruitment",
  },
  {
    id: "legal",
    label: "Legal Documents (EN / TH)",
    code: "10 / LEGAL (EN / TH)",
    title: "Legal / Privacy Policy, Terms & Acknowledgement",
    description:
      "Edit bilingual EN/TH clauses and website development acknowledgement credits.",
    configKey: "legal",
  },
];

type ImageSlotTarget =
  | { kind: "site.logoDark" }
  | { kind: "site.logoLight" }
  | { kind: "home.hero.heroArtwork" }
  | { kind: "home.hero.mascotImage" }
  | { kind: "home.hero.patternImage" }
  | { kind: "home.location.image" }
  | { kind: "home.location.pinIcon" };

type LegalDocKey = "privacyPolicy" | "termsOfUse" | "acknowledgement";
type LegalLangKey = "en" | "th";

function cloneData<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function formatCount(n: number): string {
  return String(n).padStart(2, "0");
}

function createId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}-${rand}`;
}

interface MobileEditorTarget {
  label: string;
  value: string;
  placeholder?: string;
  onCommit: (next: string) => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

interface MobileTextEditorContextValue {
  isMobile: boolean;
  openEditor: (target: MobileEditorTarget) => void;
}

const MobileTextEditorContext = createContext<MobileTextEditorContextValue>({
  isMobile: false,
  openEditor: () => {},
});

function MobileTextEditorModal({
  target,
  onClose,
}: {
  target: MobileEditorTarget | null;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(target?.value ?? "");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!target) return;
    setDraft(target.value);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [target, onClose]);

  if (!target) return null;

  const showDelete = Boolean(target.onDelete);
  const canDelete = target.canDelete ?? true;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={target.label}
      data-testid="mobile-text-editor-modal"
      className="fixed inset-0 z-50 bg-white flex flex-col"
    >
      {/* Top Bar */}
      <div className="shrink-0 h-14 px-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[#4A5565] truncate">
          {target.label}
        </span>
        <button
          type="button"
          aria-label="Close editor"
          onClick={onClose}
          className="inline-flex items-center justify-center w-9 h-9 text-[#1C1B1F] hover:bg-[#F4F5F7] rounded-[6px] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0038E1]"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Full-Screen Text Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        <textarea
          ref={textareaRef}
          aria-label={`${target.label} mobile editor`}
          value={draft}
          placeholder={target.placeholder}
          onChange={(event) => setDraft(event.target.value)}
          className="w-full flex-1 resize-none border-0 bg-white p-5 text-[16px] leading-relaxed text-[#1C1B1F] placeholder:text-[#A1A7B4] focus:outline-none"
        />
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="shrink-0 px-5 py-4 bg-white border-t border-[#F4F5F7] flex items-center gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => {
            target.onCommit(draft);
            onClose();
          }}
          className="flex-1 h-12 rounded-[10px] bg-[#0038E1] hover:bg-[#002BAA] active:bg-[#002BAA] text-white text-sm font-semibold tracking-wide uppercase transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
        >
          DONE
        </button>

        {showDelete ? (
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => {
              if (!canDelete) return;
              target.onDelete?.();
              onClose();
            }}
            className="h-12 px-4 rounded-[10px] bg-[#FAAF98] border border-[#FB4A2A] text-white hover:bg-[#FB4A2A] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 text-sm font-semibold tracking-wide uppercase transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FB4A2A]"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span>DELETE</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  onDelete,
  canDelete,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: "text" | "url";
  placeholder?: string;
  hint?: string;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  const id = useId();
  const { isMobile, openEditor } = useContext(MobileTextEditorContext);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[#4A5565]"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={isMobile}
        onClick={() => {
          if (isMobile) {
            openEditor({
              label,
              value,
              placeholder,
              onCommit: onChange,
              onDelete,
              canDelete,
            });
          }
        }}
        onChange={(event) => {
          if (!isMobile) {
            onChange(event.target.value);
          }
        }}
        className={[
          "w-full h-11 px-3.5 bg-white border border-[#A1A7B4] rounded-[5px] text-base text-[#1C1B1F] placeholder:text-[#A1A7B4] focus:outline-none focus:border-[#0038E1]",
          isMobile ? "cursor-pointer" : "",
        ].join(" ")}
      />
      {hint ? <p className="text-xs text-[#757E91]">{hint}</p> : null}
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  hint,
  onDelete,
  canDelete,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  const id = useId();
  const { isMobile, openEditor } = useContext(MobileTextEditorContext);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[#4A5565]"
      >
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        readOnly={isMobile}
        onClick={() => {
          if (isMobile) {
            openEditor({
              label,
              value,
              placeholder,
              onCommit: onChange,
              onDelete,
              canDelete,
            });
          }
        }}
        onChange={(event) => {
          if (!isMobile) {
            onChange(event.target.value);
          }
        }}
        className={[
          "w-full p-3.5 bg-white border border-[#A1A7B4] rounded-[10px] text-base text-[#1C1B1F] placeholder:text-[#A1A7B4] focus:outline-none focus:border-[#0038E1] resize-y",
          isMobile ? "cursor-pointer resize-none" : "",
        ].join(" ")}
      />
      {hint ? <p className="text-xs text-[#757E91]">{hint}</p> : null}
    </div>
  );
}

function SubsectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="border border-[#E2E8F0] rounded-[12px] bg-[#F8FAFC] p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-[#1C1B1F]">{title}</h3>
          {subtitle ? (
            <p className="text-xs text-[#4A5565] mt-0.5">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}

function ImageSlotField({
  label,
  slotHint,
  asset,
  onPickClick,
  onAltChange,
}: {
  label: string;
  slotHint: string;
  asset: ImageAsset;
  onPickClick: () => void;
  onAltChange: (alt: string) => void;
}) {
  const isLocalIdb = asset.src.startsWith("idb://");

  return (
    <div className="border border-[#E2E8F0] bg-white rounded-[10px] p-4 flex flex-col sm:flex-row gap-4 items-start">
      <div className="w-full sm:w-32 h-24 shrink-0 rounded-[8px] border border-[#E2E8F0] bg-[#E8ECF4] flex items-center justify-center overflow-hidden p-2">
        <ContentImage
          asset={asset}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      <div className="flex-1 min-w-0 space-y-3 w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[#1C1B1F]">{label}</p>
            <p className="font-mono text-xs text-[#757E91] break-all">
              {slotHint} · {asset.src}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLocalIdb ? <Badge tone="warning">idb:// local</Badge> : null}
            <Button
              variant="secondary"
              size="sm"
              onClick={onPickClick}
              className="rounded-[5px]"
            >
              <ImageIcon className="w-4 h-4" aria-hidden="true" />
              Choose from Media
            </Button>
          </div>
        </div>

        <TextField
          label={`${label} Alt Text`}
          value={asset.alt}
          onChange={onAltChange}
        />
      </div>
    </div>
  );
}

function StringListEditor({
  title,
  itemLabel,
  addLabel,
  items,
  minItems = 1,
  multiline = false,
  onChange,
}: {
  title: string;
  itemLabel: string;
  addLabel: string;
  items: string[];
  minItems?: number;
  multiline?: boolean;
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[#4A5565]">{title}</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange([...items, ""])}
          className="rounded-[5px]"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          {addLabel}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-[#757E91] italic">No entries added.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                {multiline ? (
                  <TextAreaField
                    label={`${itemLabel} ${idx + 1}`}
                    value={item}
                    rows={2}
                    onDelete={() =>
                      onChange(items.filter((_, i) => i !== idx))
                    }
                    canDelete={items.length > minItems}
                    onChange={(nextVal) =>
                      onChange(
                        items.map((entry, i) => (i === idx ? nextVal : entry)),
                      )
                    }
                  />
                ) : (
                  <TextField
                    label={`${itemLabel} ${idx + 1}`}
                    value={item}
                    onDelete={() =>
                      onChange(items.filter((_, i) => i !== idx))
                    }
                    canDelete={items.length > minItems}
                    onChange={(nextVal) =>
                      onChange(
                        items.map((entry, i) => (i === idx ? nextVal : entry)),
                      )
                    }
                  />
                )}
              </div>
              <button
                type="button"
                aria-label={`Remove ${itemLabel} ${idx + 1}`}
                disabled={items.length <= minItems}
                onClick={() =>
                  onChange(items.filter((_, i) => i !== idx))
                }
                className="hidden md:inline-flex mt-7 items-center justify-center w-10 h-11 border border-[#E2E8F0] rounded-[5px] bg-white text-[#B41B00] hover:bg-[#FAAF98]/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NavLinksEditor({
  title,
  itemPrefix,
  links,
  onChange,
}: {
  title: string;
  itemPrefix: string;
  links: NavLinkItem[];
  onChange: (next: NavLinkItem[]) => void;
}) {
  return (
    <SubsectionCard
      title={title}
      subtitle="At least one link is required."
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange([...links, { label: "", href: "/" }])}
          className="rounded-[5px]"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Link
        </Button>
      }
    >
      <div className="space-y-3">
        {links.map((link, idx) => (
          <div
            key={idx}
            className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end bg-white border border-[#E2E8F0] rounded-[8px] p-3"
          >
            <TextField
              label={`${itemPrefix} Label ${idx + 1}`}
              value={link.label}
              onChange={(val) =>
                onChange(
                  links.map((item, i) =>
                    i === idx ? { ...item, label: val } : item,
                  ),
                )
              }
            />
            <TextField
              label={`${itemPrefix} URL ${idx + 1}`}
              value={link.href}
              onChange={(val) =>
                onChange(
                  links.map((item, i) =>
                    i === idx ? { ...item, href: val } : item,
                  ),
                )
              }
            />
            <button
              type="button"
              aria-label={`Remove ${itemPrefix} ${idx + 1}`}
              disabled={links.length <= 1}
              onClick={() => onChange(links.filter((_, i) => i !== idx))}
              className="inline-flex items-center justify-center h-11 px-3 border border-[#E2E8F0] rounded-[5px] bg-white text-[#B41B00] hover:bg-[#FAAF98]/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </SubsectionCard>
  );
}

function RecruitmentFieldGroupEditor({
  title,
  field,
  onChange,
}: {
  title: string;
  field: { label: string; placeholder: string; hint?: string };
  onChange: (next: { label: string; placeholder: string; hint?: string }) => void;
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-3.5 space-y-3">
      <p className="text-xs font-mono font-semibold text-[#0038E1] uppercase">
        {title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField
          label={`${title} Label`}
          value={field.label}
          onChange={(label) => onChange({ ...field, label })}
        />
        <TextField
          label={`${title} Placeholder`}
          value={field.placeholder}
          onChange={(placeholder) => onChange({ ...field, placeholder })}
        />
      </div>
      <TextField
        label={`${title} Hint (optional)`}
        value={field.hint ?? ""}
        onChange={(val) =>
          onChange({ ...field, hint: val.length > 0 ? val : undefined })
        }
      />
    </div>
  );
}

function RecruitmentRoleListEditor({
  title,
  teamPrefix,
  roles,
  onChange,
}: {
  title: string;
  teamPrefix: string;
  roles: RecruitmentRole[];
  onChange: (next: RecruitmentRole[]) => void;
}) {
  return (
    <SubsectionCard
      title={title}
      subtitle="Add, edit, or remove selectable roles. At least one role is required."
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            onChange([
              ...roles,
              {
                id: createId(teamPrefix),
                title: "",
                description: "",
              },
            ])
          }
          className="rounded-[5px]"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Role
        </Button>
      }
    >
      <div className="space-y-3">
        {roles.map((role, idx) => (
          <div
            key={idx}
            className="bg-white border border-[#E2E8F0] rounded-[8px] p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#757E91]">
                ID: {role.id}
              </span>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs text-[#4A5565] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(role.isOther)}
                    onChange={(event) =>
                      onChange(
                        roles.map((item, i) =>
                          i === idx
                            ? {
                                ...item,
                                isOther: event.target.checked
                                  ? true
                                  : undefined,
                              }
                            : item,
                        ),
                      )
                    }
                    className="w-4 h-4 accent-[#0038E1]"
                  />
                  <span>Custom &ldquo;Other&rdquo; input role</span>
                </label>
                <button
                  type="button"
                  disabled={roles.length <= 1}
                  onClick={() => onChange(roles.filter((_, i) => i !== idx))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#B41B00] hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TextField
                label={`${title} ID ${idx + 1}`}
                value={role.id}
                onChange={(val) =>
                  onChange(
                    roles.map((item, i) =>
                      i === idx ? { ...item, id: val } : item,
                    ),
                  )
                }
              />
              <TextField
                label={`${title} Title ${idx + 1}`}
                value={role.title}
                onChange={(val) =>
                  onChange(
                    roles.map((item, i) =>
                      i === idx ? { ...item, title: val } : item,
                    ),
                  )
                }
              />
              <TextField
                label={`${title} Description ${idx + 1}`}
                value={role.description}
                onChange={(val) =>
                  onChange(
                    roles.map((item, i) =>
                      i === idx ? { ...item, description: val } : item,
                    ),
                  )
                }
              />
            </div>
          </div>
        ))}
      </div>
    </SubsectionCard>
  );
}

function LegalDocumentEditor({
  docLabel,
  document,
  onChange,
}: {
  docLabel: string;
  document: LegalDocument;
  onChange: (next: LegalDocument) => void;
}) {
  const updateSection = (idx: number, nextSection: LegalSection) => {
    onChange({
      ...document,
      sections: document.sections.map((sec, i) =>
        i === idx ? nextSection : sec,
      ),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TextField
          label={`${docLabel} Title`}
          value={document.title}
          onChange={(title) => onChange({ ...document, title })}
        />
        <TextField
          label={`${docLabel} Subtitle`}
          value={document.subtitle}
          onChange={(subtitle) => onChange({ ...document, subtitle })}
        />
        <TextField
          label={`${docLabel} Last Updated`}
          value={document.lastUpdated}
          onChange={(lastUpdated) => onChange({ ...document, lastUpdated })}
        />
      </div>

      <SubsectionCard
        title={`${docLabel} Clauses (${document.sections.length})`}
        subtitle="At least one clause is required."
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange({
                ...document,
                sections: [
                  ...document.sections,
                  { heading: "", paragraphs: [""] },
                ],
              })
            }
            className="rounded-[5px]"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Clause
          </Button>
        }
      >
        <div className="space-y-4">
          {document.sections.map((section, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#E2E8F0] rounded-[10px] p-4 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-[#0038E1]">
                  Clause {formatCount(idx + 1)}
                </span>
                <button
                  type="button"
                  disabled={document.sections.length <= 1}
                  onClick={() =>
                    onChange({
                      ...document,
                      sections: document.sections.filter((_, i) => i !== idx),
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#B41B00] hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Remove Clause
                </button>
              </div>

              <TextField
                label={`Clause ${idx + 1} Heading`}
                value={section.heading}
                onChange={(heading) =>
                  updateSection(idx, { ...section, heading })
                }
              />

              <StringListEditor
                title="Paragraphs"
                itemLabel={`Clause ${idx + 1} Paragraph`}
                addLabel="Add Paragraph"
                items={section.paragraphs}
                minItems={0}
                multiline
                onChange={(paragraphs) =>
                  updateSection(idx, { ...section, paragraphs })
                }
              />

              <StringListEditor
                title="Bullets (optional)"
                itemLabel={`Clause ${idx + 1} Bullet`}
                addLabel="Add Bullet"
                items={section.bullets ?? []}
                minItems={0}
                onChange={(bullets) =>
                  updateSection(idx, {
                    ...section,
                    bullets: bullets.length > 0 ? bullets : undefined,
                  })
                }
              />
            </div>
          ))}
        </div>
      </SubsectionCard>
    </div>
  );
}

export function WebsiteCopyTab() {
  const { site, home, recruitment, legal, events, isHydrated, services } =
    useAppData();

  const [activeSection, setActiveSection] =
    useState<EditorSectionId>("home-hero");
  const [siteDraft, setSiteDraft] = useState<SiteContent>(() => cloneData(site));
  const [homeDraft, setHomeDraft] = useState<HomeContent>(() => cloneData(home));
  const [recruitmentDraft, setRecruitmentDraft] = useState<RecruitmentContent>(
    () => cloneData(recruitment),
  );
  const [legalDraft, setLegalDraft] = useState<LegalContent>(() =>
    cloneData(legal),
  );
  const [dirtySections, setDirtySections] = useState<Set<ContentSectionKey>>(
    () => new Set(),
  );
  const dirtyRef = useRef<Set<ContentSectionKey>>(new Set());

  const [pickerTarget, setPickerTarget] = useState<ImageSlotTarget | null>(
    null,
  );
  const [legalDocTab, setLegalDocTab] =
    useState<LegalDocKey>("privacyPolicy");
  const [legalLangTab, setLegalLangTab] = useState<LegalLangKey>("en");

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportIdbRefs, setExportIdbRefs] = useState<string[]>([]);

  useEffect(() => {
    if (!dirtyRef.current.has("site")) {
      setSiteDraft(cloneData(site));
    }
  }, [site, dirtySections]);

  useEffect(() => {
    if (!dirtyRef.current.has("home")) {
      setHomeDraft(cloneData(home));
    }
  }, [home, dirtySections]);

  useEffect(() => {
    if (!dirtyRef.current.has("recruitment")) {
      setRecruitmentDraft(cloneData(recruitment));
    }
  }, [recruitment, dirtySections]);

  useEffect(() => {
    if (!dirtyRef.current.has("legal")) {
      setLegalDraft(cloneData(legal));
    }
  }, [legal, dirtySections]);

  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileEditorTarget, setMobileEditorTarget] =
    useState<MobileEditorTarget | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);

  const mobileEditorCtx = useMemo<MobileTextEditorContextValue>(
    () => ({
      isMobile: isMobileViewport,
      openEditor: (target) => setMobileEditorTarget(target),
    }),
    [isMobileViewport],
  );

  const markDirty = (key: ContentSectionKey) => {
    dirtyRef.current.add(key);
    setSaveMessage(null);
    setErrorMessage(null);
    setDirtySections((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const updateSite = (updater: (prev: SiteContent) => SiteContent) => {
    markDirty("site");
    setSiteDraft((prev) => updater(prev));
  };

  const updateHome = (updater: (prev: HomeContent) => HomeContent) => {
    markDirty("home");
    setHomeDraft((prev) => updater(prev));
  };

  const updateRecruitment = (
    updater: (prev: RecruitmentContent) => RecruitmentContent,
  ) => {
    markDirty("recruitment");
    setRecruitmentDraft((prev) => updater(prev));
  };

  const updateLegal = (updater: (prev: LegalContent) => LegalContent) => {
    markDirty("legal");
    setLegalDraft((prev) => updater(prev));
  };

  const activeMeta = useMemo(
    () =>
      SECTION_NAV.find((sec) => sec.id === activeSection) ?? SECTION_NAV[0],
    [activeSection],
  );

  const sectionCounts = useMemo<Record<EditorSectionId, string>>(() => {
    const publishedHomeEvents = events.filter(
      (evt) => evt.status === "Published" && evt.showOnHome,
    ).length;
    return {
      "home-hero": "05",
      "home-about": "04",
      "home-why-us": formatCount(homeDraft.whyUs.cards.length),
      "home-teams": formatCount(homeDraft.teams.items.length),
      "home-timeline": formatCount(publishedHomeEvents),
      "home-location": "06",
      "home-faq": formatCount(homeDraft.faq.items.length),
      "site-navigation": formatCount(
        siteDraft.navbar.links.length + siteDraft.footer.legalLinks.length,
      ),
      recruitment: formatCount(
        recruitmentDraft.projectsTeamRoles.length +
          recruitmentDraft.marketingTeamRoles.length,
      ),
      legal: "03",
    };
  }, [
    events,
    homeDraft.faq.items.length,
    homeDraft.teams.items.length,
    homeDraft.whyUs.cards.length,
    recruitmentDraft.marketingTeamRoles.length,
    recruitmentDraft.projectsTeamRoles.length,
    siteDraft.footer.legalLinks.length,
    siteDraft.navbar.links.length,
  ]);

  const handleDiscard = () => {
    dirtyRef.current = new Set();
    setSiteDraft(cloneData(site));
    setHomeDraft(cloneData(home));
    setRecruitmentDraft(cloneData(recruitment));
    setLegalDraft(cloneData(legal));
    setDirtySections(new Set());
    setSaveMessage(null);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    setErrorMessage(null);
    setSaveMessage(null);

    const keysToSave: ContentSectionKey[] =
      dirtySections.size > 0
        ? Array.from(dirtySections)
        : [activeMeta.configKey];

    const validatedPayloads: Array<{
      key: ContentSectionKey;
      data: SiteContent | HomeContent | RecruitmentContent | LegalContent;
    }> = [];

    for (const key of keysToSave) {
      if (key === "site") {
        const res = siteContentSchema.safeParse(siteDraft);
        if (!res.success) {
          const issue = res.error.issues[0];
          setErrorMessage(
            `Site & Navigation validation error (${issue.path.join(".") || "site"}): ${issue.message}`,
          );
          return;
        }
        validatedPayloads.push({ key, data: res.data });
      } else if (key === "home") {
        const res = homeContentSchema.safeParse(homeDraft);
        if (!res.success) {
          const issue = res.error.issues[0];
          setErrorMessage(
            `Home content validation error (${issue.path.join(".") || "home"}): ${issue.message}`,
          );
          return;
        }
        validatedPayloads.push({ key, data: res.data });
      } else if (key === "recruitment") {
        const res = recruitmentContentSchema.safeParse(recruitmentDraft);
        if (!res.success) {
          const issue = res.error.issues[0];
          setErrorMessage(
            `Recruitment copy validation error (${issue.path.join(".") || "recruitment"}): ${issue.message}`,
          );
          return;
        }
        validatedPayloads.push({ key, data: res.data });
      } else if (key === "legal") {
        const res = legalContentSchema.safeParse(legalDraft);
        if (!res.success) {
          const issue = res.error.issues[0];
          setErrorMessage(
            `Legal documents validation error (${issue.path.join(".") || "legal"}): ${issue.message}`,
          );
          return;
        }
        validatedPayloads.push({ key, data: res.data });
      }
    }

    setIsSaving(true);
    try {
      for (const item of validatedPayloads) {
        if (item.key === "site") {
          await services.content.updateSection("site", item.data as SiteContent);
        } else if (item.key === "home") {
          await services.content.updateSection("home", item.data as HomeContent);
        } else if (item.key === "recruitment") {
          await services.content.updateSection(
            "recruitment",
            item.data as RecruitmentContent,
          );
        } else {
          await services.content.updateSection(
            "legal",
            item.data as LegalContent,
          );
        }
      }
      dirtyRef.current = new Set();
      setDirtySections(new Set());
      setSaveMessage("✓ Changes saved successfully · Just now");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to save changes.",
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportJson = async () => {
    setErrorMessage(null);
    setIsExporting(true);
    try {
      const resolveSection = async <T,>(
        key: ContentSectionKey,
        draft: T,
      ): Promise<T> => {
        if (dirtySections.has(key)) {
          return draft;
        }
        const raw = await services.content.exportSectionJson(key);
        return JSON.parse(raw) as T;
      };

      const [siteExp, homeExp, recruitmentExp, legalExp] = await Promise.all([
        resolveSection("site", siteDraft),
        resolveSection("home", homeDraft),
        resolveSection("recruitment", recruitmentDraft),
        resolveSection("legal", legalDraft),
      ]);

      const payload = {
        site: siteExp,
        home: homeExp,
        recruitment: recruitmentExp,
        legal: legalExp,
      };
      const idbRefs = findIdbRefs(payload);
      setExportIdbRefs(idbRefs);

      const jsonText = JSON.stringify(payload, null, 2);
      if (
        typeof URL !== "undefined" &&
        typeof URL.createObjectURL === "function"
      ) {
        const blob = new Blob([jsonText], { type: "application/json" });
        const downloadUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = "muict-devclub-content.json";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        if (typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(downloadUrl);
        }
      }

      setSaveMessage(
        dirtySections.size > 0
          ? "Exported muict-devclub-content.json (includes unsaved draft changes)."
          : "Exported muict-devclub-content.json.",
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to export JSON.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetDefaults = async () => {
    setIsResetting(true);
    setErrorMessage(null);
    try {
      await services.content.resetAll();
      dirtyRef.current = new Set();
      setDirtySections(new Set());
      setExportIdbRefs([]);
      setResetModalOpen(false);
      setSaveMessage("Default website copy restored.");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to reset defaults.",
      );
    } finally {
      setIsResetting(false);
    }
  };

  const handleAssetPicked = (asset: MediaAsset) => {
    if (!pickerTarget) return;
    const nextAsset: ImageAsset = {
      id: asset.id,
      src: asset.url,
      alt: asset.title,
    };

    switch (pickerTarget.kind) {
      case "site.logoDark":
        updateSite((prev) => ({
          ...prev,
          logoDark: { ...nextAsset, alt: prev.logoDark.alt || nextAsset.alt },
        }));
        break;
      case "site.logoLight":
        updateSite((prev) => ({
          ...prev,
          logoLight: { ...nextAsset, alt: prev.logoLight.alt || nextAsset.alt },
        }));
        break;
      case "home.hero.heroArtwork":
        updateHome((prev) => ({
          ...prev,
          hero: {
            ...prev.hero,
            heroArtwork: {
              ...nextAsset,
              alt: prev.hero.heroArtwork.alt || nextAsset.alt,
            },
          },
        }));
        break;
      case "home.hero.mascotImage":
        updateHome((prev) => ({
          ...prev,
          hero: {
            ...prev.hero,
            mascotImage: {
              ...nextAsset,
              alt: prev.hero.mascotImage.alt || nextAsset.alt,
            },
          },
        }));
        break;
      case "home.hero.patternImage":
        updateHome((prev) => ({
          ...prev,
          hero: {
            ...prev.hero,
            patternImage: {
              ...nextAsset,
              alt: prev.hero.patternImage.alt || nextAsset.alt,
            },
          },
        }));
        break;
      case "home.location.image":
        updateHome((prev) => ({
          ...prev,
          location: {
            ...prev.location,
            image: {
              ...nextAsset,
              alt: prev.location.image.alt || nextAsset.alt,
            },
          },
        }));
        break;
      case "home.location.pinIcon":
        updateHome((prev) => ({
          ...prev,
          location: {
            ...prev.location,
            pinIcon: {
              ...nextAsset,
              alt: prev.location.pinIcon.alt || nextAsset.alt,
            },
          },
        }));
        break;
    }

    setPickerTarget(null);
  };

  const hasDirty = dirtySections.size > 0;

  if (!isHydrated) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-white border border-[#A1A7B4] rounded-[16px] p-10 text-center text-sm font-medium text-[#4A5565]"
      >
        Loading website copy...
      </div>
    );
  }

  return (
    <MobileTextEditorContext.Provider value={mobileEditorCtx}>
      <div className="space-y-5">
      {exportIdbRefs.length > 0 ? (
        <div
          role="alert"
          className="border border-[#FAA100] bg-[#FFF194] text-[#AA5000] rounded-[12px] p-4 flex items-start gap-3"
        >
          <AlertTriangle
            className="w-5 h-5 shrink-0 mt-0.5 text-[#AA5000]"
            aria-hidden="true"
          />
          <div className="text-sm space-y-1">
            <p className="font-semibold">
              Local IndexedDB media references detected ({exportIdbRefs.length})
            </p>
            <p>
              This export contains browser-local{" "}
              <code className="font-mono font-semibold">idb://</code> file
              references (
              {exportIdbRefs.map((id) => `idb://${id}`).join(", ")}). Those
              assets are stored only in this browser&apos;s IndexedDB and must
              be uploaded to static hosting or your backend media API before
              production deployment.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[270px_1fr] gap-6 items-start">
        {/* Mobile Section Selector (< lg) */}
        <div className="lg:hidden bg-white border border-[#A1A7B4] rounded-[10px] p-4 space-y-2">
          <label
            htmlFor="mobile-section-select"
            className="block text-sm font-medium text-[#1C1B1F]"
          >
            Website sections
          </label>
          <select
            id="mobile-section-select"
            value={activeSection}
            onChange={(event) =>
              setActiveSection(event.target.value as EditorSectionId)
            }
            className="w-full h-11 px-3 bg-white border border-[#A1A7B4] rounded-[5px] text-sm font-medium text-[#1C1B1F] focus:outline-none focus:border-[#0038E1]"
          >
            {SECTION_NAV.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.label} ({sectionCounts[sec.id]})
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Section Selector (>= lg) */}
        <aside
          aria-label="Website sections"
          className="hidden lg:flex flex-col justify-between bg-white border border-[#A1A7B4] rounded-[10px] p-4 min-h-[620px]"
        >
          <div className="space-y-4">
            <h2 className="px-2 pt-1 text-[20px] font-medium text-[#1C1B1F]">
              Website sections
            </h2>

            <nav className="flex flex-col gap-1.5">
              {SECTION_NAV.map((sec) => {
                const isActive = activeSection === sec.id;
                const isSectionDirty = dirtySections.has(sec.configKey);

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveSection(sec.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={[
                      "w-full min-h-[46px] px-3.5 py-2.5 rounded-[5px] flex items-center justify-between gap-2 text-left text-[14px] transition-colors cursor-pointer",
                      isActive
                        ? "bg-[#A6C0FF] text-[#002BAA] font-medium"
                        : "bg-white text-[#4A5565] hover:bg-[#F4F5F7]",
                    ].join(" ")}
                  >
                    <span className="truncate">{sec.label}</span>
                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      {isSectionDirty ? (
                        <span
                          aria-label="Unsaved changes"
                          className="w-2 h-2 rounded-full bg-[#FAA100]"
                        />
                      ) : null}
                      <span
                        className={[
                          "font-mono text-xs",
                          isActive ? "text-[#002BAA]" : "text-[#4A5565]",
                        ].join(" ")}
                      >
                        {sectionCounts[sec.id]}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E2E8F0] px-2 text-xs text-[#4A5565] space-y-1">
            <p className="font-medium text-[#1C1B1F]">
              Locked 2026 CI Tokens
            </p>
            <p>
              Fixed palette &amp; section layouts. Changes update the public
              website immediately on save.
            </p>
          </div>
        </aside>

        {/* Main Editor Card */}
        <section
          aria-label={activeMeta.title}
          className="bg-white border border-[#A1A7B4] rounded-[16px] p-5 sm:p-7 flex flex-col justify-between min-h-[620px] space-y-6"
        >
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#E2E8F0] pb-4">
              <div>
                <h2 className="text-[22px] sm:text-[25px] font-medium text-[#1C1B1F]">
                  {activeMeta.title}
                </h2>
                <p className="mt-1 text-sm sm:text-base text-[#4A5565]">
                  {activeMeta.description}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {hasDirty ? <Badge tone="warning">Unsaved draft</Badge> : null}
                <Badge tone="info" className="font-mono">
                  {activeMeta.configKey}.json
                </Badge>
              </div>
            </div>

            <p className="font-mono text-base sm:text-lg text-[#1C1B1F]">
              {activeMeta.code}
            </p>

            {/* Section Form Body */}
            {activeSection === "home-hero" ? (
              <div className="space-y-5">
                <TextField
                  label="Eyebrow"
                  value={homeDraft.hero.eyebrow}
                  onChange={(eyebrow) =>
                    updateHome((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, eyebrow },
                    }))
                  }
                />
                <TextField
                  label="Headline"
                  value={homeDraft.hero.headline}
                  onChange={(headline) =>
                    updateHome((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, headline },
                    }))
                  }
                />
                <TextAreaField
                  label="Description"
                  rows={3}
                  value={homeDraft.hero.description}
                  onChange={(description) =>
                    updateHome((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, description },
                    }))
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="CTA Label"
                    value={homeDraft.hero.ctaLabel}
                    onChange={(ctaLabel) =>
                      updateHome((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, ctaLabel },
                      }))
                    }
                  />
                  <TextField
                    label="CTA Link"
                    value={homeDraft.hero.ctaHref}
                    onChange={(ctaHref) =>
                      updateHome((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, ctaHref },
                      }))
                    }
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-sm font-medium text-[#1C1B1F]">
                    Hero Visual Assets
                  </p>
                  <ImageSlotField
                    label="Banner Graphic (heroArtwork)"
                    slotHint="home.hero.heroArtwork"
                    asset={homeDraft.hero.heroArtwork}
                    onPickClick={() =>
                      setPickerTarget({ kind: "home.hero.heroArtwork" })
                    }
                    onAltChange={(alt) =>
                      updateHome((prev) => ({
                        ...prev,
                        hero: {
                          ...prev.hero,
                          heroArtwork: { ...prev.hero.heroArtwork, alt },
                        },
                      }))
                    }
                  />
                  <ImageSlotField
                    label="Hero Mascot Image"
                    slotHint="home.hero.mascotImage"
                    asset={homeDraft.hero.mascotImage}
                    onPickClick={() =>
                      setPickerTarget({ kind: "home.hero.mascotImage" })
                    }
                    onAltChange={(alt) =>
                      updateHome((prev) => ({
                        ...prev,
                        hero: {
                          ...prev.hero,
                          mascotImage: { ...prev.hero.mascotImage, alt },
                        },
                      }))
                    }
                  />
                  <ImageSlotField
                    label="Pattern Background (patternImage)"
                    slotHint="home.hero.patternImage"
                    asset={homeDraft.hero.patternImage}
                    onPickClick={() =>
                      setPickerTarget({ kind: "home.hero.patternImage" })
                    }
                    onAltChange={(alt) =>
                      updateHome((prev) => ({
                        ...prev,
                        hero: {
                          ...prev.hero,
                          patternImage: { ...prev.hero.patternImage, alt },
                        },
                      }))
                    }
                  />
                </div>
              </div>
            ) : null}

            {activeSection === "home-about" ? (
              <div className="space-y-4">
                <TextField
                  label="Eyebrow"
                  value={homeDraft.about.eyebrow}
                  onChange={(eyebrow) =>
                    updateHome((prev) => ({
                      ...prev,
                      about: { ...prev.about, eyebrow },
                    }))
                  }
                />
                <TextAreaField
                  label="Lead Question"
                  rows={2}
                  value={homeDraft.about.question}
                  onChange={(question) =>
                    updateHome((prev) => ({
                      ...prev,
                      about: { ...prev.about, question },
                    }))
                  }
                />
                <TextField
                  label="Emphasis Line"
                  value={homeDraft.about.emphasis}
                  onChange={(emphasis) =>
                    updateHome((prev) => ({
                      ...prev,
                      about: { ...prev.about, emphasis },
                    }))
                  }
                />
                <TextAreaField
                  label="Body Paragraph"
                  rows={4}
                  value={homeDraft.about.body}
                  onChange={(body) =>
                    updateHome((prev) => ({
                      ...prev,
                      about: { ...prev.about, body },
                    }))
                  }
                />
              </div>
            ) : null}

            {activeSection === "home-why-us" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Eyebrow"
                    value={homeDraft.whyUs.eyebrow}
                    onChange={(eyebrow) =>
                      updateHome((prev) => ({
                        ...prev,
                        whyUs: { ...prev.whyUs, eyebrow },
                      }))
                    }
                  />
                  <TextField
                    label="Section Heading"
                    value={homeDraft.whyUs.heading}
                    onChange={(heading) =>
                      updateHome((prev) => ({
                        ...prev,
                        whyUs: { ...prev.whyUs, heading },
                      }))
                    }
                  />
                </div>

                <div className="space-y-3">
                  {homeDraft.whyUs.cards.map((card, idx) => (
                    <SubsectionCard
                      key={card.index}
                      title={`Pillar ${card.index}`}
                      action={
                        <Badge
                          tone={card.accent === "lime" ? "success" : "neutral"}
                        >
                          CI Accent: {card.accent}
                        </Badge>
                      }
                    >
                      <TextField
                        label={`Pillar ${card.index} Title`}
                        value={card.title}
                        onChange={(title) =>
                          updateHome((prev) => ({
                            ...prev,
                            whyUs: {
                              ...prev.whyUs,
                              cards: prev.whyUs.cards.map((c, i) =>
                                i === idx ? { ...c, title } : c,
                              ),
                            },
                          }))
                        }
                      />
                      <TextAreaField
                        label={`Pillar ${card.index} Description`}
                        rows={3}
                        value={card.description}
                        onChange={(description) =>
                          updateHome((prev) => ({
                            ...prev,
                            whyUs: {
                              ...prev.whyUs,
                              cards: prev.whyUs.cards.map((c, i) =>
                                i === idx ? { ...c, description } : c,
                              ),
                            },
                          }))
                        }
                      />
                    </SubsectionCard>
                  ))}
                </div>
              </div>
            ) : null}

            {activeSection === "home-teams" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <TextField
                    label="Eyebrow"
                    value={homeDraft.teams.eyebrow}
                    onChange={(eyebrow) =>
                      updateHome((prev) => ({
                        ...prev,
                        teams: { ...prev.teams, eyebrow },
                      }))
                    }
                  />
                  <TextField
                    label="Section Heading"
                    value={homeDraft.teams.heading}
                    onChange={(heading) =>
                      updateHome((prev) => ({
                        ...prev,
                        teams: { ...prev.teams, heading },
                      }))
                    }
                  />
                  <TextField
                    label="Subtitle"
                    value={homeDraft.teams.subtitle}
                    onChange={(subtitle) =>
                      updateHome((prev) => ({
                        ...prev,
                        teams: { ...prev.teams, subtitle },
                      }))
                    }
                  />
                </div>

                <div className="space-y-3">
                  {homeDraft.teams.items.map((team, idx) => (
                    <SubsectionCard
                      key={team.index}
                      title={`Team ${team.index}`}
                      action={
                        <span className="inline-flex items-center gap-2 text-xs font-mono text-[#4A5565]">
                          <span
                            aria-hidden="true"
                            className="w-4 h-4 rounded border border-[#001C26]"
                            style={{ backgroundColor: team.accentColor }}
                          />
                          Locked CI {team.accentColor}
                        </span>
                      }
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <TextField
                          label={`Team ${team.index} Name`}
                          value={team.name}
                          onChange={(name) =>
                            updateHome((prev) => ({
                              ...prev,
                              teams: {
                                ...prev.teams,
                                items: prev.teams.items.map((item, i) =>
                                  i === idx ? { ...item, name } : item,
                                ),
                              },
                            }))
                          }
                        />
                        <TextField
                          label={`Team ${team.index} Tools Label`}
                          value={team.toolsLabel}
                          onChange={(toolsLabel) =>
                            updateHome((prev) => ({
                              ...prev,
                              teams: {
                                ...prev.teams,
                                items: prev.teams.items.map((item, i) =>
                                  i === idx ? { ...item, toolsLabel } : item,
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                      <TextAreaField
                        label={`Team ${team.index} Description`}
                        rows={2}
                        value={team.description}
                        onChange={(description) =>
                          updateHome((prev) => ({
                            ...prev,
                            teams: {
                              ...prev.teams,
                              items: prev.teams.items.map((item, i) =>
                                i === idx ? { ...item, description } : item,
                              ),
                            },
                          }))
                        }
                      />
                    </SubsectionCard>
                  ))}
                </div>
              </div>
            ) : null}

            {activeSection === "home-timeline" ? (
              <div className="space-y-5">
                <TextField
                  label="Eyebrow"
                  value={homeDraft.timeline.eyebrow}
                  onChange={(eyebrow) =>
                    updateHome((prev) => ({
                      ...prev,
                      timeline: { ...prev.timeline, eyebrow },
                    }))
                  }
                />
                <TextField
                  label="Section Heading"
                  value={homeDraft.timeline.heading}
                  onChange={(heading) =>
                    updateHome((prev) => ({
                      ...prev,
                      timeline: { ...prev.timeline, heading },
                    }))
                  }
                />
                <TextAreaField
                  label="Subtitle"
                  rows={2}
                  value={homeDraft.timeline.subtitle}
                  onChange={(subtitle) =>
                    updateHome((prev) => ({
                      ...prev,
                      timeline: { ...prev.timeline, subtitle },
                    }))
                  }
                />

                <div className="border border-[#0038E1]/30 bg-[#A6C0FF]/20 rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#1C1B1F]">
                      Events &amp; Roadmap Single Source of Truth
                    </p>
                    <p className="text-sm text-[#4A5565]">
                      {events.length} total event(s) in{" "}
                      <code className="font-mono">events.json</code> (
                      {
                        events.filter(
                          (e) => e.status === "Published" && e.showOnHome,
                        ).length
                      }{" "}
                      published on Home).
                    </p>
                  </div>
                  <Link
                    href="/admin/events"
                    className="inline-flex items-center gap-2 h-10 px-4 bg-[#0038E1] text-white text-sm font-medium rounded-[5px] hover:bg-[#002BAA] transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Manage Events</span>
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ) : null}

            {activeSection === "home-location" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Eyebrow"
                    value={homeDraft.location.eyebrow}
                    onChange={(eyebrow) =>
                      updateHome((prev) => ({
                        ...prev,
                        location: { ...prev.location, eyebrow },
                      }))
                    }
                  />
                  <TextField
                    label="Section Heading"
                    value={homeDraft.location.heading}
                    onChange={(heading) =>
                      updateHome((prev) => ({
                        ...prev,
                        location: { ...prev.location, heading },
                      }))
                    }
                  />
                </div>
                <TextField
                  label="Campus Name"
                  value={homeDraft.location.campusName}
                  onChange={(campusName) =>
                    updateHome((prev) => ({
                      ...prev,
                      location: { ...prev.location, campusName },
                    }))
                  }
                />
                <TextField
                  label="Location Note / Hours"
                  value={homeDraft.location.note}
                  onChange={(note) =>
                    updateHome((prev) => ({
                      ...prev,
                      location: { ...prev.location, note },
                    }))
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Map Button Label"
                    value={homeDraft.location.mapButtonLabel}
                    onChange={(mapButtonLabel) =>
                      updateHome((prev) => ({
                        ...prev,
                        location: { ...prev.location, mapButtonLabel },
                      }))
                    }
                  />
                  <TextField
                    label="Google Maps URL"
                    type="url"
                    value={homeDraft.location.mapUrl}
                    onChange={(mapUrl) =>
                      updateHome((prev) => ({
                        ...prev,
                        location: { ...prev.location, mapUrl },
                      }))
                    }
                  />
                </div>

                <div className="space-y-3 pt-1">
                  <ImageSlotField
                    label="Campus Image"
                    slotHint="home.location.image"
                    asset={homeDraft.location.image}
                    onPickClick={() =>
                      setPickerTarget({ kind: "home.location.image" })
                    }
                    onAltChange={(alt) =>
                      updateHome((prev) => ({
                        ...prev,
                        location: {
                          ...prev.location,
                          image: { ...prev.location.image, alt },
                        },
                      }))
                    }
                  />
                  <ImageSlotField
                    label="Map Pin Icon"
                    slotHint="home.location.pinIcon"
                    asset={homeDraft.location.pinIcon}
                    onPickClick={() =>
                      setPickerTarget({ kind: "home.location.pinIcon" })
                    }
                    onAltChange={(alt) =>
                      updateHome((prev) => ({
                        ...prev,
                        location: {
                          ...prev.location,
                          pinIcon: { ...prev.location.pinIcon, alt },
                        },
                      }))
                    }
                  />
                </div>
              </div>
            ) : null}

            {activeSection === "home-faq" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <TextField
                    label="Eyebrow"
                    value={homeDraft.faq.eyebrow}
                    onChange={(eyebrow) =>
                      updateHome((prev) => ({
                        ...prev,
                        faq: { ...prev.faq, eyebrow },
                      }))
                    }
                  />
                  <TextField
                    label="Section Heading"
                    value={homeDraft.faq.heading}
                    onChange={(heading) =>
                      updateHome((prev) => ({
                        ...prev,
                        faq: { ...prev.faq, heading },
                      }))
                    }
                  />
                  <TextField
                    label="Ask Button Label"
                    value={homeDraft.faq.askButtonLabel}
                    onChange={(askButtonLabel) =>
                      updateHome((prev) => ({
                        ...prev,
                        faq: { ...prev.faq, askButtonLabel },
                      }))
                    }
                  />
                </div>

                <SubsectionCard
                  title={`Public FAQ Items (${homeDraft.faq.items.length})`}
                  subtitle="Add, edit, or remove questions shown in the Home FAQ accordion."
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        updateHome((prev) => ({
                          ...prev,
                          faq: {
                            ...prev.faq,
                            items: [
                              ...prev.faq.items,
                              {
                                id: createId("faq"),
                                question: "",
                                answer: "",
                              },
                            ],
                          },
                        }))
                      }
                      className="rounded-[5px] border-0"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      Add FAQ Item
                    </Button>
                  }
                >
                  <div className="space-y-3">
                    {homeDraft.faq.items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="bg-white border border-[#E2E8F0] rounded-[10px] p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-[#0038E1]">
                            FAQ #{formatCount(idx + 1)} · {item.id}
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove FAQ ${idx + 1}`}
                            disabled={homeDraft.faq.items.length <= 1}
                            onClick={() =>
                              updateHome((prev) => ({
                                ...prev,
                                faq: {
                                  ...prev.faq,
                                  items: prev.faq.items.filter(
                                    (_, i) => i !== idx,
                                  ),
                                },
                              }))
                            }
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#B41B00] hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Remove
                          </button>
                        </div>

                        <TextField
                          label="Question"
                          value={item.question}
                          onChange={(question) =>
                            updateHome((prev) => ({
                              ...prev,
                              faq: {
                                ...prev.faq,
                                items: prev.faq.items.map((entry, i) =>
                                  i === idx ? { ...entry, question } : entry,
                                ),
                              },
                            }))
                          }
                        />
                        <TextAreaField
                          label="Answer"
                          rows={2}
                          value={item.answer}
                          onChange={(answer) =>
                            updateHome((prev) => ({
                              ...prev,
                              faq: {
                                ...prev.faq,
                                items: prev.faq.items.map((entry, i) =>
                                  i === idx ? { ...entry, answer } : entry,
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </SubsectionCard>

                <SubsectionCard title="Ask Question Modal Copy">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="Modal Title"
                      value={homeDraft.faq.askModal.title}
                      onChange={(title) =>
                        updateHome((prev) => ({
                          ...prev,
                          faq: {
                            ...prev.faq,
                            askModal: { ...prev.faq.askModal, title },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Modal Subtitle"
                      value={homeDraft.faq.askModal.subtitle}
                      onChange={(subtitle) =>
                        updateHome((prev) => ({
                          ...prev,
                          faq: {
                            ...prev.faq,
                            askModal: { ...prev.faq.askModal, subtitle },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Question Field Label"
                      value={homeDraft.faq.askModal.questionLabel}
                      onChange={(questionLabel) =>
                        updateHome((prev) => ({
                          ...prev,
                          faq: {
                            ...prev.faq,
                            askModal: { ...prev.faq.askModal, questionLabel },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Question Placeholder"
                      value={homeDraft.faq.askModal.questionPlaceholder}
                      onChange={(questionPlaceholder) =>
                        updateHome((prev) => ({
                          ...prev,
                          faq: {
                            ...prev.faq,
                            askModal: {
                              ...prev.faq.askModal,
                              questionPlaceholder,
                            },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Email Field Label"
                      value={homeDraft.faq.askModal.emailLabel}
                      onChange={(emailLabel) =>
                        updateHome((prev) => ({
                          ...prev,
                          faq: {
                            ...prev.faq,
                            askModal: { ...prev.faq.askModal, emailLabel },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Email Placeholder"
                      value={homeDraft.faq.askModal.emailPlaceholder}
                      onChange={(emailPlaceholder) =>
                        updateHome((prev) => ({
                          ...prev,
                          faq: {
                            ...prev.faq,
                            askModal: {
                              ...prev.faq.askModal,
                              emailPlaceholder,
                            },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Category Field Label"
                      value={homeDraft.faq.askModal.categoryLabel}
                      onChange={(categoryLabel) =>
                        updateHome((prev) => ({
                          ...prev,
                          faq: {
                            ...prev.faq,
                            askModal: { ...prev.faq.askModal, categoryLabel },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Consent Label"
                      value={homeDraft.faq.askModal.consentLabel}
                      onChange={(consentLabel) =>
                        updateHome((prev) => ({
                          ...prev,
                          faq: {
                            ...prev.faq,
                            askModal: { ...prev.faq.askModal, consentLabel },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Privacy Link Label"
                      value={homeDraft.faq.askModal.privacyLinkLabel}
                      onChange={(privacyLinkLabel) =>
                        updateHome((prev) => ({
                          ...prev,
                          faq: {
                            ...prev.faq,
                            askModal: {
                              ...prev.faq.askModal,
                              privacyLinkLabel,
                            },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Cancel Button Label"
                      value={homeDraft.faq.askModal.cancelLabel}
                      onChange={(cancelLabel) =>
                        updateHome((prev) => ({
                          ...prev,
                          faq: {
                            ...prev.faq,
                            askModal: { ...prev.faq.askModal, cancelLabel },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Submit Button Label"
                      value={homeDraft.faq.askModal.submitLabel}
                      onChange={(submitLabel) =>
                        updateHome((prev) => ({
                          ...prev,
                          faq: {
                            ...prev.faq,
                            askModal: { ...prev.faq.askModal, submitLabel },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Success Confirmation Message"
                      value={homeDraft.faq.askModal.successMessage}
                      onChange={(successMessage) =>
                        updateHome((prev) => ({
                          ...prev,
                          faq: {
                            ...prev.faq,
                            askModal: { ...prev.faq.askModal, successMessage },
                          },
                        }))
                      }
                    />
                  </div>

                  <StringListEditor
                    title="Inquiry Categories"
                    itemLabel="Category"
                    addLabel="Add Category"
                    items={homeDraft.faq.askModal.categories}
                    minItems={1}
                    onChange={(categories) =>
                      updateHome((prev) => ({
                        ...prev,
                        faq: {
                          ...prev.faq,
                          askModal: { ...prev.faq.askModal, categories },
                        },
                      }))
                    }
                  />
                </SubsectionCard>
              </div>
            ) : null}

            {activeSection === "site-navigation" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Brand Name"
                    value={siteDraft.brandName}
                    onChange={(brandName) =>
                      updateSite((prev) => ({ ...prev, brandName }))
                    }
                  />
                  <TextField
                    label="Club Slogan"
                    value={siteDraft.slogan}
                    onChange={(slogan) =>
                      updateSite((prev) => ({ ...prev, slogan }))
                    }
                  />
                </div>

                <div className="space-y-3">
                  <ImageSlotField
                    label="Dark Wordmark Logo (Navbar)"
                    slotHint="site.logoDark"
                    asset={siteDraft.logoDark}
                    onPickClick={() => setPickerTarget({ kind: "site.logoDark" })}
                    onAltChange={(alt) =>
                      updateSite((prev) => ({
                        ...prev,
                        logoDark: { ...prev.logoDark, alt },
                      }))
                    }
                  />
                  <ImageSlotField
                    label="White Logo (Footer)"
                    slotHint="site.logoLight"
                    asset={siteDraft.logoLight}
                    onPickClick={() =>
                      setPickerTarget({ kind: "site.logoLight" })
                    }
                    onAltChange={(alt) =>
                      updateSite((prev) => ({
                        ...prev,
                        logoLight: { ...prev.logoLight, alt },
                      }))
                    }
                  />
                </div>

                <NavLinksEditor
                  title="Navbar Links"
                  itemPrefix="Nav Link"
                  links={siteDraft.navbar.links}
                  onChange={(links) =>
                    updateSite((prev) => ({
                      ...prev,
                      navbar: { ...prev.navbar, links },
                    }))
                  }
                />

                <SubsectionCard title="Navbar CTA Button">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="Navbar CTA Label"
                      value={siteDraft.navbar.cta.label}
                      onChange={(label) =>
                        updateSite((prev) => ({
                          ...prev,
                          navbar: {
                            ...prev.navbar,
                            cta: { ...prev.navbar.cta, label },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Navbar CTA Link"
                      value={siteDraft.navbar.cta.href}
                      onChange={(href) =>
                        updateSite((prev) => ({
                          ...prev,
                          navbar: {
                            ...prev.navbar,
                            cta: { ...prev.navbar.cta, href },
                          },
                        }))
                      }
                    />
                  </div>
                </SubsectionCard>

                <SubsectionCard title="Footer Content">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="Footer Organization"
                      value={siteDraft.footer.organization}
                      onChange={(organization) =>
                        updateSite((prev) => ({
                          ...prev,
                          footer: { ...prev.footer, organization },
                        }))
                      }
                    />
                    <TextField
                      label="Copyright Line"
                      value={siteDraft.footer.copyright}
                      onChange={(copyright) =>
                        updateSite((prev) => ({
                          ...prev,
                          footer: { ...prev.footer, copyright },
                        }))
                      }
                    />
                  </div>

                  <StringListEditor
                    title="Footer Address Lines"
                    itemLabel="Address Line"
                    addLabel="Add Line"
                    items={siteDraft.footer.addressLines}
                    minItems={1}
                    onChange={(addressLines) =>
                      updateSite((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, addressLines },
                      }))
                    }
                  />
                </SubsectionCard>

                <NavLinksEditor
                  title="Footer Legal Links"
                  itemPrefix="Legal Link"
                  links={siteDraft.footer.legalLinks}
                  onChange={(legalLinks) =>
                    updateSite((prev) => ({
                      ...prev,
                      footer: { ...prev.footer, legalLinks },
                    }))
                  }
                />
              </div>
            ) : null}

            {activeSection === "recruitment" ? (
              <div className="space-y-5">
                <SubsectionCard
                  title="Recruitment Status & Banner"
                  action={
                    <Badge
                      tone={recruitmentDraft.isOpen ? "success" : "danger"}
                    >
                      {recruitmentDraft.isOpen ? "Open" : "Closed"}
                    </Badge>
                  }
                >
                  <label className="inline-flex items-center gap-3 text-sm font-medium text-[#1C1B1F] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recruitmentDraft.isOpen}
                      onChange={(event) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          isOpen: event.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-[#0038E1]"
                    />
                    <span>
                      Recruitment Applications Open (shows application form
                      instead of closed notice)
                    </span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="Banner Eyebrow"
                      value={recruitmentDraft.banner.eyebrow}
                      onChange={(eyebrow) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          banner: { ...prev.banner, eyebrow },
                        }))
                      }
                    />
                    <TextField
                      label="Banner Headline"
                      value={recruitmentDraft.banner.headline}
                      onChange={(headline) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          banner: { ...prev.banner, headline },
                        }))
                      }
                    />
                  </div>
                </SubsectionCard>

                <SubsectionCard title="Closed State Copy">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="Closed Eyebrow"
                      value={recruitmentDraft.closedCopy.eyebrow}
                      onChange={(eyebrow) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          closedCopy: { ...prev.closedCopy, eyebrow },
                        }))
                      }
                    />
                    <TextField
                      label="Closed Side Title"
                      value={recruitmentDraft.closedCopy.sideTitle}
                      onChange={(sideTitle) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          closedCopy: { ...prev.closedCopy, sideTitle },
                        }))
                      }
                    />
                    <TextField
                      label="Closed Heading"
                      value={recruitmentDraft.closedCopy.heading}
                      onChange={(heading) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          closedCopy: { ...prev.closedCopy, heading },
                        }))
                      }
                    />
                    <TextField
                      label="Closed CTA Label"
                      value={recruitmentDraft.closedCopy.ctaLabel}
                      onChange={(ctaLabel) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          closedCopy: { ...prev.closedCopy, ctaLabel },
                        }))
                      }
                    />
                    <TextField
                      label="Closed CTA Link"
                      value={recruitmentDraft.closedCopy.ctaHref}
                      onChange={(ctaHref) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          closedCopy: { ...prev.closedCopy, ctaHref },
                        }))
                      }
                    />
                  </div>
                  <TextAreaField
                    label="Closed Description"
                    rows={2}
                    value={recruitmentDraft.closedCopy.description}
                    onChange={(description) =>
                      updateRecruitment((prev) => ({
                        ...prev,
                        closedCopy: { ...prev.closedCopy, description },
                      }))
                    }
                  />
                </SubsectionCard>

                <SubsectionCard title="Opened Application Header & Sidebar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="Back Link Label"
                      value={recruitmentDraft.openedCopy.backLinkLabel}
                      onChange={(backLinkLabel) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          openedCopy: { ...prev.openedCopy, backLinkLabel },
                        }))
                      }
                    />
                    <TextField
                      label="Form Title"
                      value={recruitmentDraft.openedCopy.formTitle}
                      onChange={(formTitle) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          openedCopy: { ...prev.openedCopy, formTitle },
                        }))
                      }
                    />
                    <TextField
                      label="Form Subtitle"
                      value={recruitmentDraft.openedCopy.formSubtitle}
                      onChange={(formSubtitle) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          openedCopy: { ...prev.openedCopy, formSubtitle },
                        }))
                      }
                    />
                    <TextField
                      label="Submit Button Label"
                      value={recruitmentDraft.submitLabel}
                      onChange={(submitLabel) =>
                        updateRecruitment((prev) => ({ ...prev, submitLabel }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextAreaField
                      label="Sidebar Headline"
                      rows={3}
                      value={recruitmentDraft.openedCopy.sidebarHeadline}
                      onChange={(sidebarHeadline) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          openedCopy: {
                            ...prev.openedCopy,
                            sidebarHeadline,
                          },
                        }))
                      }
                    />
                    <TextAreaField
                      label="Sidebar Description"
                      rows={3}
                      value={recruitmentDraft.openedCopy.sidebarDescription}
                      onChange={(sidebarDescription) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          openedCopy: {
                            ...prev.openedCopy,
                            sidebarDescription,
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-[#4A5565]">
                      Sidebar Steps (3 fixed steps)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {recruitmentDraft.openedCopy.steps.map((step, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-[#E2E8F0] rounded-[8px] p-3 space-y-2.5"
                        >
                          <TextField
                            label={`Step ${idx + 1} Number`}
                            value={step.number}
                            onChange={(number) =>
                              updateRecruitment((prev) => ({
                                ...prev,
                                openedCopy: {
                                  ...prev.openedCopy,
                                  steps: prev.openedCopy.steps.map((s, i) =>
                                    i === idx ? { ...s, number } : s,
                                  ),
                                },
                              }))
                            }
                          />
                          <TextField
                            label={`Step ${idx + 1} Title`}
                            value={step.title}
                            onChange={(title) =>
                              updateRecruitment((prev) => ({
                                ...prev,
                                openedCopy: {
                                  ...prev.openedCopy,
                                  steps: prev.openedCopy.steps.map((s, i) =>
                                    i === idx ? { ...s, title } : s,
                                  ),
                                },
                              }))
                            }
                          />
                          <TextAreaField
                            label={`Step ${idx + 1} Description`}
                            rows={2}
                            value={step.description}
                            onChange={(description) =>
                              updateRecruitment((prev) => ({
                                ...prev,
                                openedCopy: {
                                  ...prev.openedCopy,
                                  steps: prev.openedCopy.steps.map((s, i) =>
                                    i === idx ? { ...s, description } : s,
                                  ),
                                },
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </SubsectionCard>

                <RecruitmentRoleListEditor
                  title="Projects Team Roles"
                  teamPrefix="proj"
                  roles={recruitmentDraft.projectsTeamRoles}
                  onChange={(projectsTeamRoles) =>
                    updateRecruitment((prev) => ({
                      ...prev,
                      projectsTeamRoles,
                    }))
                  }
                />

                <RecruitmentRoleListEditor
                  title="Marketing Team Roles"
                  teamPrefix="mkt"
                  roles={recruitmentDraft.marketingTeamRoles}
                  onChange={(marketingTeamRoles) =>
                    updateRecruitment((prev) => ({
                      ...prev,
                      marketingTeamRoles,
                    }))
                  }
                />

                <SubsectionCard title="Section 01 · Personal & Student Information Copy">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="Personal Section Tag"
                      value={recruitmentDraft.openedCopy.sections.personal.tag}
                      onChange={(tag) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          openedCopy: {
                            ...prev.openedCopy,
                            sections: {
                              ...prev.openedCopy.sections,
                              personal: {
                                ...prev.openedCopy.sections.personal,
                                tag,
                              },
                            },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Personal Section Title"
                      value={recruitmentDraft.openedCopy.sections.personal.title}
                      onChange={(title) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          openedCopy: {
                            ...prev.openedCopy,
                            sections: {
                              ...prev.openedCopy.sections,
                              personal: {
                                ...prev.openedCopy.sections.personal,
                                title,
                              },
                            },
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(
                      [
                        ["firstName", "First Name"],
                        ["lastName", "Last Name"],
                        ["nickname", "Nickname"],
                        ["studentId", "Student ID"],
                        ["email", "Email"],
                        ["phone", "Phone"],
                        ["program", "Program"],
                        ["year", "Year"],
                      ] as const
                    ).map(([fieldKey, label]) => (
                      <RecruitmentFieldGroupEditor
                        key={fieldKey}
                        title={label}
                        field={
                          recruitmentDraft.openedCopy.sections.personal.fields[
                            fieldKey
                          ]
                        }
                        onChange={(nextField) =>
                          updateRecruitment((prev) => ({
                            ...prev,
                            openedCopy: {
                              ...prev.openedCopy,
                              sections: {
                                ...prev.openedCopy.sections,
                                personal: {
                                  ...prev.openedCopy.sections.personal,
                                  fields: {
                                    ...prev.openedCopy.sections.personal.fields,
                                    [fieldKey]: nextField,
                                  },
                                },
                              },
                            },
                          }))
                        }
                      />
                    ))}
                  </div>
                </SubsectionCard>

                <SubsectionCard title="Section 02 · Role Selection Copy">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="Role Section Tag"
                      value={recruitmentDraft.openedCopy.sections.role.tag}
                      onChange={(tag) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          openedCopy: {
                            ...prev.openedCopy,
                            sections: {
                              ...prev.openedCopy.sections,
                              role: { ...prev.openedCopy.sections.role, tag },
                            },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Role Section Title"
                      value={recruitmentDraft.openedCopy.sections.role.title}
                      onChange={(title) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          openedCopy: {
                            ...prev.openedCopy,
                            sections: {
                              ...prev.openedCopy.sections,
                              role: { ...prev.openedCopy.sections.role, title },
                            },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Projects Team Heading"
                      value={
                        recruitmentDraft.openedCopy.sections.role
                          .projectsTeamLabel
                      }
                      onChange={(projectsTeamLabel) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          openedCopy: {
                            ...prev.openedCopy,
                            sections: {
                              ...prev.openedCopy.sections,
                              role: {
                                ...prev.openedCopy.sections.role,
                                projectsTeamLabel,
                              },
                            },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Marketing Team Heading"
                      value={
                        recruitmentDraft.openedCopy.sections.role
                          .marketingTeamLabel
                      }
                      onChange={(marketingTeamLabel) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          openedCopy: {
                            ...prev.openedCopy,
                            sections: {
                              ...prev.openedCopy.sections,
                              role: {
                                ...prev.openedCopy.sections.role,
                                marketingTeamLabel,
                              },
                            },
                          },
                        }))
                      }
                    />
                  </div>
                  <TextField
                    label="Other Role Placeholder"
                    value={
                      recruitmentDraft.openedCopy.sections.role.otherPlaceholder
                    }
                    onChange={(otherPlaceholder) =>
                      updateRecruitment((prev) => ({
                        ...prev,
                        openedCopy: {
                          ...prev.openedCopy,
                          sections: {
                            ...prev.openedCopy.sections,
                            role: {
                              ...prev.openedCopy.sections.role,
                              otherPlaceholder,
                            },
                          },
                        },
                      }))
                    }
                  />
                </SubsectionCard>

                <SubsectionCard title="Section 03 · Motivation, Experience & CV Copy">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="Motivation Section Tag"
                      value={recruitmentDraft.openedCopy.sections.motivation.tag}
                      onChange={(tag) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          openedCopy: {
                            ...prev.openedCopy,
                            sections: {
                              ...prev.openedCopy.sections,
                              motivation: {
                                ...prev.openedCopy.sections.motivation,
                                tag,
                              },
                            },
                          },
                        }))
                      }
                    />
                    <TextField
                      label="Motivation Section Title"
                      value={
                        recruitmentDraft.openedCopy.sections.motivation.title
                      }
                      onChange={(title) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          openedCopy: {
                            ...prev.openedCopy,
                            sections: {
                              ...prev.openedCopy.sections,
                              motivation: {
                                ...prev.openedCopy.sections.motivation,
                                title,
                              },
                            },
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(
                      [
                        ["expectation", "Expectation"],
                        ["contribution", "Contribution"],
                        ["projectIdea", "Project Idea"],
                        ["teamExperience", "Team Experience"],
                        ["portfolioUrl", "Portfolio Link"],
                      ] as const
                    ).map(([fieldKey, label]) => (
                      <RecruitmentFieldGroupEditor
                        key={fieldKey}
                        title={label}
                        field={
                          recruitmentDraft.openedCopy.sections.motivation
                            .fields[fieldKey]
                        }
                        onChange={(nextField) =>
                          updateRecruitment((prev) => ({
                            ...prev,
                            openedCopy: {
                              ...prev.openedCopy,
                              sections: {
                                ...prev.openedCopy.sections,
                                motivation: {
                                  ...prev.openedCopy.sections.motivation,
                                  fields: {
                                    ...prev.openedCopy.sections.motivation
                                      .fields,
                                    [fieldKey]: nextField,
                                  },
                                },
                              },
                            },
                          }))
                        }
                      />
                    ))}

                    <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-3.5 space-y-3">
                      <p className="text-xs font-mono font-semibold text-[#0038E1] uppercase">
                        CV Upload Copy
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <TextField
                          label="CV Label"
                          value={
                            recruitmentDraft.openedCopy.sections.motivation
                              .fields.cv.label
                          }
                          onChange={(label) =>
                            updateRecruitment((prev) => ({
                              ...prev,
                              openedCopy: {
                                ...prev.openedCopy,
                                sections: {
                                  ...prev.openedCopy.sections,
                                  motivation: {
                                    ...prev.openedCopy.sections.motivation,
                                    fields: {
                                      ...prev.openedCopy.sections.motivation
                                        .fields,
                                      cv: {
                                        ...prev.openedCopy.sections.motivation
                                          .fields.cv,
                                        label,
                                      },
                                    },
                                  },
                                },
                              },
                            }))
                          }
                        />
                        <TextField
                          label="CV Empty Label"
                          value={
                            recruitmentDraft.openedCopy.sections.motivation
                              .fields.cv.emptyLabel
                          }
                          onChange={(emptyLabel) =>
                            updateRecruitment((prev) => ({
                              ...prev,
                              openedCopy: {
                                ...prev.openedCopy,
                                sections: {
                                  ...prev.openedCopy.sections,
                                  motivation: {
                                    ...prev.openedCopy.sections.motivation,
                                    fields: {
                                      ...prev.openedCopy.sections.motivation
                                        .fields,
                                      cv: {
                                        ...prev.openedCopy.sections.motivation
                                          .fields.cv,
                                        emptyLabel,
                                      },
                                    },
                                  },
                                },
                              },
                            }))
                          }
                        />
                        <TextField
                          label="CV Button Label"
                          value={
                            recruitmentDraft.openedCopy.sections.motivation
                              .fields.cv.buttonLabel
                          }
                          onChange={(buttonLabel) =>
                            updateRecruitment((prev) => ({
                              ...prev,
                              openedCopy: {
                                ...prev.openedCopy,
                                sections: {
                                  ...prev.openedCopy.sections,
                                  motivation: {
                                    ...prev.openedCopy.sections.motivation,
                                    fields: {
                                      ...prev.openedCopy.sections.motivation
                                        .fields,
                                      cv: {
                                        ...prev.openedCopy.sections.motivation
                                          .fields.cv,
                                        buttonLabel,
                                      },
                                    },
                                  },
                                },
                              },
                            }))
                          }
                        />
                        <TextField
                          label="CV Accept Label"
                          value={
                            recruitmentDraft.openedCopy.sections.motivation
                              .fields.cv.acceptLabel
                          }
                          onChange={(acceptLabel) =>
                            updateRecruitment((prev) => ({
                              ...prev,
                              openedCopy: {
                                ...prev.openedCopy,
                                sections: {
                                  ...prev.openedCopy.sections,
                                  motivation: {
                                    ...prev.openedCopy.sections.motivation,
                                    fields: {
                                      ...prev.openedCopy.sections.motivation
                                        .fields,
                                      cv: {
                                        ...prev.openedCopy.sections.motivation
                                          .fields.cv,
                                        acceptLabel,
                                      },
                                    },
                                  },
                                },
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </SubsectionCard>

                <SubsectionCard title="Programs, Years, Agreements & Confirmation">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StringListEditor
                      title="Programs"
                      itemLabel="Program"
                      addLabel="Add Program"
                      items={recruitmentDraft.programs}
                      minItems={1}
                      onChange={(programs) =>
                        updateRecruitment((prev) => ({ ...prev, programs }))
                      }
                    />
                    <StringListEditor
                      title="Academic Years"
                      itemLabel="Year"
                      addLabel="Add Year"
                      items={recruitmentDraft.years}
                      minItems={1}
                      onChange={(years) =>
                        updateRecruitment((prev) => ({ ...prev, years }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="Requirements Agreement Label"
                      value={recruitmentDraft.agreements.requirementsLabel}
                      onChange={(requirementsLabel) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          agreements: {
                            ...prev.agreements,
                            requirementsLabel,
                          },
                        }))
                      }
                    />
                    <TextField
                      label="PDPA Confirmation Label"
                      value={recruitmentDraft.agreements.pdpaLabel}
                      onChange={(pdpaLabel) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          agreements: { ...prev.agreements, pdpaLabel },
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextAreaField
                      label="Requirements Agreement Text"
                      rows={2}
                      value={
                        recruitmentDraft.agreements.requirementsDescription
                      }
                      onChange={(requirementsDescription) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          agreements: {
                            ...prev.agreements,
                            requirementsDescription,
                          },
                        }))
                      }
                    />
                    <TextAreaField
                      label="PDPA Confirmation Text"
                      rows={2}
                      value={recruitmentDraft.agreements.pdpaDescription}
                      onChange={(pdpaDescription) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          agreements: { ...prev.agreements, pdpaDescription },
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="Success Title"
                      value={recruitmentDraft.successCopy.title}
                      onChange={(title) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          successCopy: { ...prev.successCopy, title },
                        }))
                      }
                    />
                    <TextField
                      label="Success Description"
                      value={recruitmentDraft.successCopy.description}
                      onChange={(description) =>
                        updateRecruitment((prev) => ({
                          ...prev,
                          successCopy: { ...prev.successCopy, description },
                        }))
                      }
                    />
                  </div>
                </SubsectionCard>
              </div>
            ) : null}

            {activeSection === "legal" ? (
              <div className="space-y-5">
                <TextField
                  label="Back to Home Label"
                  value={legalDraft.backToHomeLabel}
                  onChange={(backToHomeLabel) =>
                    updateLegal((prev) => ({ ...prev, backToHomeLabel }))
                  }
                />

                <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#E2E8F0] py-3">
                  <div
                    role="group"
                    aria-label="Legal document selector"
                    className="inline-flex flex-wrap border border-[#A1A7B4] rounded-[5px] overflow-hidden bg-white"
                  >
                    {(
                      [
                        { id: "privacyPolicy", label: "Privacy Policy" },
                        { id: "termsOfUse", label: "Terms of Use" },
                        { id: "acknowledgement", label: "Acknowledgement" },
                      ] as const
                    ).map((docOption) => (
                      <button
                        key={docOption.id}
                        type="button"
                        onClick={() => setLegalDocTab(docOption.id)}
                        className={[
                          "h-10 px-3.5 text-sm font-medium transition-colors cursor-pointer",
                          legalDocTab === docOption.id
                            ? "bg-[#0038E1] text-white"
                            : "text-[#4A5565] hover:bg-[#F4F5F7]",
                        ].join(" ")}
                      >
                        {docOption.label}
                      </button>
                    ))}
                  </div>

                  <div
                    role="group"
                    aria-label="Legal language selector"
                    className="inline-flex border border-[#A1A7B4] rounded-[5px] overflow-hidden bg-white"
                  >
                    {(
                      [
                        { id: "en", label: "English (EN)" },
                        { id: "th", label: "ภาษาไทย (TH)" },
                      ] as const
                    ).map((langOption) => (
                      <button
                        key={langOption.id}
                        type="button"
                        onClick={() => setLegalLangTab(langOption.id)}
                        className={[
                          "h-10 px-3.5 text-sm font-medium transition-colors cursor-pointer",
                          legalLangTab === langOption.id
                            ? "bg-[#1C1B1F] text-white"
                            : "text-[#4A5565] hover:bg-[#F4F5F7]",
                        ].join(" ")}
                      >
                        {langOption.label}
                      </button>
                    ))}
                  </div>
                </div>

                <LegalDocumentEditor
                  docLabel={`${
                    legalDocTab === "privacyPolicy"
                      ? "Privacy Policy"
                      : legalDocTab === "termsOfUse"
                        ? "Terms of Use"
                        : "Acknowledgement"
                  } (${legalLangTab.toUpperCase()})`}
                  document={legalDraft[legalDocTab][legalLangTab]}
                  onChange={(nextDoc) =>
                    updateLegal((prev) => ({
                      ...prev,
                      [legalDocTab]: {
                        ...prev[legalDocTab],
                        [legalLangTab]: nextDoc,
                      },
                    }))
                  }
                />

                {legalDocTab === "acknowledgement" ? (
                  <SubsectionCard
                    title={`Acknowledgement Credits (${legalDraft.acknowledgement.credits.length})`}
                    subtitle="Displayed below the Acknowledgement document."
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          updateLegal((prev) => ({
                            ...prev,
                            acknowledgement: {
                              ...prev.acknowledgement,
                              credits: [
                                ...prev.acknowledgement.credits,
                                { name: "", affiliation: "", role: "" },
                              ],
                            },
                          }))
                        }
                        className="rounded-[5px]"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        Add Credit
                      </Button>
                    }
                  >
                    <div className="space-y-3">
                      {legalDraft.acknowledgement.credits.map(
                        (credit: AcknowledgementCredit, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white border border-[#E2E8F0] rounded-[8px] p-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end"
                          >
                            <TextField
                              label={`Credit Name ${idx + 1}`}
                              value={credit.name}
                              onChange={(name) =>
                                updateLegal((prev) => ({
                                  ...prev,
                                  acknowledgement: {
                                    ...prev.acknowledgement,
                                    credits: prev.acknowledgement.credits.map(
                                      (c, i) =>
                                        i === idx ? { ...c, name } : c,
                                    ),
                                  },
                                }))
                              }
                            />
                            <TextField
                              label={`Affiliation ${idx + 1}`}
                              value={credit.affiliation}
                              onChange={(affiliation) =>
                                updateLegal((prev) => ({
                                  ...prev,
                                  acknowledgement: {
                                    ...prev.acknowledgement,
                                    credits: prev.acknowledgement.credits.map(
                                      (c, i) =>
                                        i === idx ? { ...c, affiliation } : c,
                                    ),
                                  },
                                }))
                              }
                            />
                            <TextField
                              label={`Role ${idx + 1}`}
                              value={credit.role}
                              onChange={(role) =>
                                updateLegal((prev) => ({
                                  ...prev,
                                  acknowledgement: {
                                    ...prev.acknowledgement,
                                    credits: prev.acknowledgement.credits.map(
                                      (c, i) =>
                                        i === idx ? { ...c, role } : c,
                                    ),
                                  },
                                }))
                              }
                            />
                            <button
                              type="button"
                              aria-label={`Remove credit ${idx + 1}`}
                              disabled={
                                legalDraft.acknowledgement.credits.length <= 1
                              }
                              onClick={() =>
                                updateLegal((prev) => ({
                                  ...prev,
                                  acknowledgement: {
                                    ...prev.acknowledgement,
                                    credits:
                                      prev.acknowledgement.credits.filter(
                                        (_, i) => i !== idx,
                                      ),
                                  },
                                }))
                              }
                              className="inline-flex items-center justify-center h-11 px-3 border border-[#E2E8F0] rounded-[5px] bg-white text-[#B41B00] hover:bg-[#FAAF98]/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  </SubsectionCard>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Feedback & Action Bar */}
          <div className="pt-5 border-t border-[#E2E8F0] space-y-4">
            {errorMessage ? (
              <div
                role="alert"
                className="border border-[#FB4A2A] bg-[#FAAF98]/35 text-[#B41B00] rounded-[8px] px-4 py-3 text-sm font-medium"
              >
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="min-h-[24px] flex items-center">
                {saveMessage ? (
                  <p
                    role="status"
                    className="inline-flex items-center gap-1.5 text-sm sm:text-base font-medium text-[#548000]"
                  >
                    <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{saveMessage}</span>
                  </p>
                ) : (
                  <p className="text-sm text-[#757E91]">
                    {hasDirty
                      ? "You have unsaved draft changes."
                      : "All sections match live website content."}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  loading={isExporting}
                  onClick={() => void handleExportJson()}
                  className="rounded-[5px] border-[#A1A7B4] text-[#1C1B1F]"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Export .json
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setResetModalOpen(true)}
                  className="rounded-[5px] border-[#A1A7B4] text-[#B41B00]"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  Reset Defaults
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  disabled={!hasDirty || isSaving}
                  onClick={handleDiscard}
                  className="rounded-[5px] border-[#A1A7B4] text-[#0038E1]"
                >
                  Discard Changes
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  loading={isSaving}
                  onClick={() => void handleSave()}
                  className="rounded-[5px] border-0"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Media Picker Modal for editable ImageAsset slots */}
      <MediaPickerModal
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelectAsset={handleAssetPicked}
        title="Select Image Asset"
      />

      {/* Reset Defaults Confirmation Modal */}
      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Defaults"
        subtitle="Restore all bundled 2026 CI website copy across site, home, recruitment, and legal documents."
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setResetModalOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isResetting}
              onClick={() => void handleResetDefaults()}
            >
              Confirm Reset
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[#4A5565] leading-relaxed">
          This will overwrite all custom edits saved in{" "}
          <code className="font-mono text-[#1C1B1F]">site</code>,{" "}
          <code className="font-mono text-[#1C1B1F]">home</code>,{" "}
          <code className="font-mono text-[#1C1B1F]">recruitment</code>, and{" "}
          <code className="font-mono text-[#1C1B1F]">legal</code> with the
          bundled defaults. Uploaded files in Media &amp; Assets remain intact.
        </p>
      </Modal>

      <MobileTextEditorModal
        target={mobileEditorTarget}
        onClose={() => setMobileEditorTarget(null)}
      />
      </div>
    </MobileTextEditorContext.Provider>
  );
}
