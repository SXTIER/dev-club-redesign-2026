"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BookmarkPlus,
  Check,
  Edit3,
  Lock,
  Mail,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { useAppData } from "@/context/AppDataContext";
import type { FaqBankItem, InquiryItem } from "@/lib/types/inquiries";
import { AddFaqModal, type FaqBankDraft } from "./AddFaqModal";
import { ReplyEmailModal } from "./ReplyEmailModal";

type TrackerTab = "inquiries" | "faq-bank";
type InquiryStatusFilter = "all" | "Unanswered" | "Answered";
type InquirySortOption = "newest" | "oldest" | "category";

const INBOX_PAGE_SIZE = 10;
const FAQ_PAGE_SIZE = 10;

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function InquiriesManager() {
  const { inquiries, faqBank, home, services } = useAppData();

  const baseId = useId();
  const inquiriesTabId = `${baseId}-tab-inquiries`;
  const faqBankTabId = `${baseId}-tab-faq-bank`;
  const inquiriesPanelId = `${baseId}-panel-inquiries`;
  const faqBankPanelId = `${baseId}-panel-faq-bank`;

  const [activeTab, setActiveTab] = useState<TrackerTab>("inquiries");

  // Inquiries state
  const [statusFilter, setStatusFilter] = useState<InquiryStatusFilter>("all");
  const [sortBy, setSortBy] = useState<InquirySortOption>("newest");
  const [inquirySearch, setInquirySearch] = useState("");
  const [inboxPage, setInboxPage] = useState(1);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(
    () => inquiries[0]?.id ?? null,
  );

  // Tag editor state
  const [addingTag, setAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [updatingTags, setUpdatingTags] = useState(false);

  // FAQ Bank state
  const [faqSearch, setFaqSearch] = useState("");
  const [faqCategoryFilter, setFaqCategoryFilter] = useState("all");
  const [faqPage, setFaqPage] = useState(1);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [deleteFaqTarget, setDeleteFaqTarget] = useState<FaqBankItem | null>(
    null,
  );
  const [deletingFaq, setDeletingFaq] = useState(false);

  // Modals & notifications
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaqItem, setEditingFaqItem] = useState<FaqBankItem | null>(null);
  const [faqDraft, setFaqDraft] = useState<FaqBankDraft | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const inquiryCounts = useMemo(() => {
    let unanswered = 0;
    let answered = 0;
    for (const item of inquiries) {
      if (item.status === "Unanswered") unanswered += 1;
      else answered += 1;
    }
    return {
      total: inquiries.length,
      unanswered,
      answered,
    };
  }, [inquiries]);

  const publishedFaqCount = home.faq.items.length;

  const filteredInquiries = useMemo(() => {
    const q = inquirySearch.trim().toLowerCase();

    const filtered = inquiries.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.senderEmail.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "category") {
        const catCmp = a.category.localeCompare(b.category);
        if (catCmp !== 0) return catCmp;
        return b.createdAt.localeCompare(a.createdAt);
      }
      if (sortBy === "oldest") {
        return a.createdAt.localeCompare(b.createdAt);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [inquiries, statusFilter, inquirySearch, sortBy]);

  useEffect(() => {
    if (filteredInquiries.length === 0) {
      if (selectedInquiryId !== null) {
        setSelectedInquiryId(null);
      }
      return;
    }
    if (!filteredInquiries.some((item) => item.id === selectedInquiryId)) {
      setSelectedInquiryId(filteredInquiries[0].id);
    }
  }, [filteredInquiries, selectedInquiryId]);

  const selectedInquiry: InquiryItem | null = useMemo(() => {
    if (filteredInquiries.length === 0) return null;
    return (
      filteredInquiries.find((item) => item.id === selectedInquiryId) ??
      filteredInquiries[0]
    );
  }, [filteredInquiries, selectedInquiryId]);

  const totalInboxPages = Math.max(
    1,
    Math.ceil(filteredInquiries.length / INBOX_PAGE_SIZE),
  );
  const safeInboxPage = Math.min(inboxPage, totalInboxPages);
  const pagedInquiries = useMemo(() => {
    const start = (safeInboxPage - 1) * INBOX_PAGE_SIZE;
    return filteredInquiries.slice(start, start + INBOX_PAGE_SIZE);
  }, [filteredInquiries, safeInboxPage]);

  const faqCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const item of faqBank) {
      if (item.category.trim()) cats.add(item.category.trim());
    }
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [faqBank]);

  const filteredFaqBank = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    return faqBank.filter((item) => {
      if (faqCategoryFilter !== "all" && item.category !== faqCategoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [faqBank, faqCategoryFilter, faqSearch]);

  const totalFaqPages = Math.max(
    1,
    Math.ceil(filteredFaqBank.length / FAQ_PAGE_SIZE),
  );
  const safeFaqPage = Math.min(faqPage, totalFaqPages);
  const pagedFaqBank = useMemo(() => {
    const start = (safeFaqPage - 1) * FAQ_PAGE_SIZE;
    return filteredFaqBank.slice(start, start + FAQ_PAGE_SIZE);
  }, [filteredFaqBank, safeFaqPage]);

  const handleAddTag = async () => {
    if (!selectedInquiry || updatingTags) return;
    const trimmed = newTagInput.trim();
    if (!trimmed) return;

    setUpdatingTags(true);
    setNotice(null);
    try {
      await services.inquiries.updateTags(selectedInquiry.id, [
        ...selectedInquiry.tags,
        trimmed,
      ]);
      setNewTagInput("");
      setAddingTag(false);
    } catch (err) {
      setNotice({
        tone: "error",
        message: err instanceof Error ? err.message : "Failed to add tag.",
      });
    } finally {
      setUpdatingTags(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedInquiry || updatingTags) return;
    setUpdatingTags(true);
    setNotice(null);
    try {
      await services.inquiries.updateTags(
        selectedInquiry.id,
        selectedInquiry.tags.filter((tag) => tag !== tagToRemove),
      );
    } catch (err) {
      setNotice({
        tone: "error",
        message: err instanceof Error ? err.message : "Failed to remove tag.",
      });
    } finally {
      setUpdatingTags(false);
    }
  };

  const handleOpenAddFaq = () => {
    setEditingFaqItem(null);
    setFaqDraft(null);
    setFaqModalOpen(true);
  };

  const handleSaveInquiryToFaqBank = (inquiry: InquiryItem) => {
    setEditingFaqItem(null);
    setFaqDraft({
      question: inquiry.question,
      answer: inquiry.reply?.body ?? "",
      category: inquiry.category,
      tags: inquiry.tags,
    });
    setFaqModalOpen(true);
  };

  const handleCopyToHomeFaq = async (item: FaqBankItem) => {
    if (promotingId) return;
    setPromotingId(item.id);
    setNotice(null);
    try {
      await services.inquiries.copyFaqBankToHome(item.id);
      setNotice({
        tone: "success",
        message: `Copied to Home FAQ — "${item.question}" is now published on Home / FAQ.`,
      });
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to copy FAQ item to Home.",
      });
    } finally {
      setPromotingId(null);
    }
  };

  const handleConfirmDeleteFaq = async () => {
    if (!deleteFaqTarget || deletingFaq) return;
    setDeletingFaq(true);
    setNotice(null);
    try {
      await services.inquiries.deleteFaqBankItem(deleteFaqTarget.id);
      setNotice({
        tone: "success",
        message: `Removed "${deleteFaqTarget.question}" from private FAQ Bank.`,
      });
      setDeleteFaqTarget(null);
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to remove FAQ Bank item.",
      });
    } finally {
      setDeletingFaq(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 3-Column KPI Strip */}
      <section
        aria-label="Inquiries metrics"
        className="grid grid-cols-1 md:grid-cols-3 gap-5"
      >
        <div
          data-testid="kpi-total-questions"
          className="bg-white border border-[#A1A7B4] rounded-[16px] p-5 sm:p-6 flex flex-col justify-between gap-3"
        >
          <p className="text-lg sm:text-[22px] font-medium text-[#1C1B1F]">
            Total Questions
          </p>
          <p className="text-4xl sm:text-[46px] font-medium leading-none text-[#1C1B1F]">
            {inquiryCounts.total}
          </p>
          <p className="text-sm text-[#4A5565]">
            {inquiryCounts.answered} answered · {inquiryCounts.unanswered}{" "}
            unanswered
          </p>
        </div>

        <div
          data-testid="kpi-unanswered"
          className="bg-white border border-[#A1A7B4] rounded-[16px] p-5 sm:p-6 flex flex-col justify-between gap-3"
        >
          <p className="text-lg sm:text-[22px] font-medium text-[#1C1B1F]">
            Unanswered
          </p>
          <p className="text-4xl sm:text-[46px] font-medium leading-none text-[#1C1B1F]">
            {inquiryCounts.unanswered}
          </p>
          <p className="text-sm text-[#4A5565]">
            {inquiryCounts.answered} answered · Keep your inbox clear
          </p>
        </div>

        <div
          data-testid="kpi-published-faqs"
          className="bg-white border border-[#A1A7B4] rounded-[16px] p-5 sm:p-6 flex flex-col justify-between gap-3"
        >
          <p className="text-lg sm:text-[22px] font-medium text-[#1C1B1F]">
            Published FAQs
          </p>
          <p className="text-3xl sm:text-[34px] font-medium leading-tight text-[#1C1B1F]">
            {publishedFaqCount} on Home
          </p>
          <p className="text-sm text-[#4A5565]">Source: Home / FAQ</p>
        </div>
      </section>

      {/* Inline Feedback Notice */}
      {notice ? (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={[
            "rounded-[10px] border px-4 py-3 text-sm font-medium flex items-start gap-2.5",
            notice.tone === "error"
              ? "border-[#FB4A2A] bg-[#FAAF98]/35 text-[#B41B00]"
              : "border-[#A9E041] bg-[#E7FDA7]/65 text-[#548000]",
          ].join(" ")}
        >
          {notice.tone === "error" ? (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <Check className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <span>{notice.message}</span>
        </div>
      ) : null}

      {/* Top Workspace Tabs + Quick Add FAQ Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Inquiries and FAQ Bank sections"
          className="inline-flex flex-wrap items-center gap-3"
        >
          <button
            id={inquiriesTabId}
            type="button"
            role="tab"
            aria-selected={activeTab === "inquiries"}
            aria-controls={inquiriesPanelId}
            onClick={() => setActiveTab("inquiries")}
            className={[
              "h-11 px-4 sm:px-5 rounded-[5px] text-sm sm:text-base transition-colors cursor-pointer whitespace-nowrap",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]",
              activeTab === "inquiries"
                ? "bg-[#0038E1] text-white font-medium"
                : "bg-white border border-[#A1A7B4] text-[#0038E1] hover:bg-[#F4F5F7]",
            ].join(" ")}
          >
            Inquiries ({inquiryCounts.total})
          </button>

          <button
            id={faqBankTabId}
            type="button"
            role="tab"
            aria-selected={activeTab === "faq-bank"}
            aria-controls={faqBankPanelId}
            onClick={() => setActiveTab("faq-bank")}
            className={[
              "h-11 px-4 sm:px-5 rounded-[5px] text-sm sm:text-base transition-colors cursor-pointer whitespace-nowrap",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]",
              activeTab === "faq-bank"
                ? "bg-[#0038E1] text-white font-medium"
                : "bg-white border border-[#A1A7B4] text-[#0038E1] hover:bg-[#F4F5F7]",
            ].join(" ")}
          >
            FAQ Bank ({faqBank.length})
          </button>
        </div>

        <Button
          type="button"
          variant={activeTab === "faq-bank" ? "primary" : "secondary"}
          onClick={handleOpenAddFaq}
          className={
            activeTab === "faq-bank"
              ? "rounded-[5px] border-0 self-start sm:self-auto"
              : "rounded-[5px] border-[#A1A7B4] text-[#0038E1] self-start sm:self-auto"
          }
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add FAQ
        </Button>
      </div>

      {/* TAB 1: Inquiries Split Inbox / Detail View */}
      {activeTab === "inquiries" ? (
        <div
          id={inquiriesPanelId}
          role="tabpanel"
          aria-labelledby={inquiriesTabId}
          className="space-y-5"
        >
          {/* Status Filter Pills + Sort + Search */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Filter inquiries by status"
              className="flex flex-wrap items-center gap-2"
            >
              {(
                [
                  {
                    key: "all",
                    label: "All",
                    count: inquiryCounts.total,
                  },
                  {
                    key: "Unanswered",
                    label: "Unanswered",
                    count: inquiryCounts.unanswered,
                  },
                  {
                    key: "Answered",
                    label: "Answered",
                    count: inquiryCounts.answered,
                  },
                ] as const
              ).map((pill) => {
                const active = statusFilter === pill.key;
                return (
                  <button
                    key={pill.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setStatusFilter(pill.key);
                      setInboxPage(1);
                    }}
                    className={[
                      "h-10 px-3.5 rounded-[5px] text-sm transition-colors cursor-pointer whitespace-nowrap",
                      active
                        ? "bg-[#0038E1] text-white font-medium"
                        : "bg-white border border-[#A1A7B4] text-[#0038E1] hover:bg-[#F4F5F7]",
                    ].join(" ")}
                  >
                    {pill.label} ({pill.count})
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative sm:w-80">
                <Search
                  className="w-4 h-4 text-[#757E91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={inquirySearch}
                  onChange={(event) => {
                    setInquirySearch(event.target.value);
                    setInboxPage(1);
                  }}
                  aria-label="Search inquiries"
                  placeholder="Search questions, email, or tag..."
                  className="w-full h-11 pl-10 pr-3.5 rounded-[5px] border border-[#A1A7B4] bg-white text-sm sm:text-base text-[#1C1B1F] placeholder:text-[#4A5565] focus:outline-none focus:border-[#0038E1]"
                />
              </div>

              <select
                aria-label="Sort inquiries"
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as InquirySortOption)
                }
                className="h-11 px-3.5 rounded-[5px] border border-[#A1A7B4] bg-white text-sm sm:text-base text-[#0038E1] font-medium focus:outline-none focus:border-[#0038E1] cursor-pointer"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="category">Category</option>
              </select>
            </div>
          </div>

          {/* Split Inbox & Detail Panel */}
          {filteredInquiries.length === 0 ? (
            <div className="bg-white border border-[#A1A7B4] rounded-[16px] p-10 text-center space-y-1.5">
              <p className="text-base font-medium text-[#1C1B1F]">
                No inquiries match your current filter.
              </p>
              <p className="text-sm text-[#4A5565]">
                Clear your search or switch status filter pills above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Inbox List */}
              <div className="lg:col-span-5 bg-white border border-[#A1A7B4] rounded-[16px] overflow-hidden min-w-0">
                <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
                  <h2 className="text-lg sm:text-[22px] font-medium text-[#1C1B1F]">
                    Recent questions
                  </h2>
                  <span className="text-xs font-mono text-[#4A5565]">
                    {filteredInquiries.length} shown
                  </span>
                </div>

                <div className="p-2.5 space-y-2">
                  {pagedInquiries.map((item) => {
                    const isSelected = selectedInquiry?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedInquiryId(item.id);
                          setAddingTag(false);
                        }}
                        aria-current={isSelected ? "true" : undefined}
                        className={[
                          "w-full text-left rounded-[6px] p-3.5 transition-colors cursor-pointer space-y-2 border",
                          isSelected
                            ? "bg-[#A6C0FF]/45 border-[#0038E1]"
                            : "bg-white border-transparent hover:bg-[#F8FAFC] hover:border-[#E2E8F0]",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm sm:text-base font-medium text-[#1C1B1F] line-clamp-2">
                            {item.question}
                          </p>
                          <Badge
                            tone={item.status === "Answered" ? "teal" : "warning"}
                            className="rounded-[5px] shrink-0"
                          >
                            {item.status}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-[#4A5565] truncate">
                            {item.senderEmail} · {formatShortDate(item.createdAt)}
                          </span>
                          <span className="font-medium text-[#002BAA]">
                            {item.category}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {totalInboxPages > 1 ? (
                  <div className="px-4 py-3 border-t border-[#E2E8F0]">
                    <Pagination
                      currentPage={safeInboxPage}
                      totalPages={totalInboxPages}
                      onPageChange={setInboxPage}
                      totalItems={filteredInquiries.length}
                      pageSize={INBOX_PAGE_SIZE}
                    />
                  </div>
                ) : null}
              </div>

              {/* Right Active Detail Panel */}
              <div
                data-testid="inquiry-detail-panel"
                className="lg:col-span-7 bg-white border border-[#A1A7B4] rounded-[16px] p-5 sm:p-6 space-y-5 min-w-0"
              >
                {selectedInquiry ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1.5">
                        <h3 className="text-xl sm:text-[24px] font-medium text-[#1C1B1F] leading-snug break-words">
                          {selectedInquiry.question}
                        </h3>
                        <p className="text-sm text-[#4A5565] break-all">
                          {selectedInquiry.senderEmail} · Received{" "}
                          {formatDateTime(selectedInquiry.createdAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Badge tone="info" className="rounded-[5px]">
                          {selectedInquiry.category}
                        </Badge>
                        <Badge
                          tone={
                            selectedInquiry.status === "Answered"
                              ? "teal"
                              : "warning"
                          }
                          className="rounded-[5px]"
                        >
                          {selectedInquiry.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Category Tags Management */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#4A5565]">
                        Category tags
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedInquiry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[5px] border border-[#A1A7B4] bg-white text-sm text-[#0038E1]"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              disabled={updatingTags}
                              aria-label={`Remove tag ${tag}`}
                              onClick={() => void handleRemoveTag(tag)}
                              className="text-[#4A5565] hover:text-[#B41B00] cursor-pointer disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </span>
                        ))}

                        {addingTag ? (
                          <div className="inline-flex flex-wrap items-center gap-1.5">
                            <input
                              type="text"
                              value={newTagInput}
                              onChange={(event) =>
                                setNewTagInput(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void handleAddTag();
                                } else if (event.key === "Escape") {
                                  setAddingTag(false);
                                  setNewTagInput("");
                                }
                              }}
                              aria-label="New tag name"
                              placeholder="Tag name..."
                              className="h-9 px-2.5 rounded-[5px] border border-[#0038E1] bg-white text-sm text-[#1C1B1F] focus:outline-none"
                            />
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              disabled={updatingTags || !newTagInput.trim()}
                              onClick={() => void handleAddTag()}
                              className="rounded-[5px] border-0"
                            >
                              Add
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setAddingTag(false);
                                setNewTagInput("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAddingTag(true)}
                            className="inline-flex items-center h-9 px-3 rounded-[5px] border border-[#A1A7B4] bg-white text-sm font-medium text-[#0038E1] hover:bg-[#F4F5F7] cursor-pointer"
                          >
                            + Add Tag
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Full Question Body */}
                    <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#757E91]">
                        Submitted question
                      </p>
                      <p className="text-base sm:text-lg text-[#1C1B1F] whitespace-pre-line break-words">
                        {selectedInquiry.question}
                      </p>
                    </div>

                    {/* Reply History */}
                    {selectedInquiry.reply ? (
                      <div className="rounded-[10px] border border-[#41E0A8]/60 bg-[#BDFBCC]/25 p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#006C6C]">
                          <span className="font-semibold uppercase tracking-wide">
                            Club Email Reply Sent
                          </span>
                          <span>
                            {selectedInquiry.reply.sentBy} ·{" "}
                            {formatDateTime(selectedInquiry.reply.sentAt)}
                          </span>
                        </div>
                        <p className="text-sm sm:text-base text-[#1C1B1F] whitespace-pre-line break-words">
                          {selectedInquiry.reply.body}
                        </p>
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div className="pt-2 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => setReplyModalOpen(true)}
                          className="rounded-[5px] border-0"
                        >
                          <Mail className="w-4 h-4" aria-hidden="true" />
                          Reply via Dev Club Email
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            handleSaveInquiryToFaqBank(selectedInquiry)
                          }
                          className="rounded-[5px] border-[#A1A7B4] text-[#0038E1]"
                        >
                          <BookmarkPlus
                            className="w-4 h-4"
                            aria-hidden="true"
                          />
                          Save to FAQ Bank
                        </Button>
                      </div>

                      <p className="text-xs sm:text-sm text-[#4A5565]">
                        FAQ Bank keeps useful questions for future FAQs. Saving
                        a question does not mark it as answered.
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: Private FAQ Bank */
        <div
          id={faqBankPanelId}
          role="tabpanel"
          aria-labelledby={faqBankTabId}
          className="space-y-5"
        >
          {/* Explicit Private · Admins only Banner */}
          <div className="rounded-[12px] border border-[#0038E1]/25 bg-[#A6C0FF]/25 px-4 py-3.5 flex items-start gap-3">
            <Lock
              className="w-5 h-5 shrink-0 text-[#002BAA] mt-0.5"
              aria-hidden="true"
            />
            <div className="space-y-0.5 text-sm text-[#1C1B1F]">
              <p className="font-semibold text-[#002BAA]">
                Private · Admins only
              </p>
              <p className="text-[#4A5565]">
                Items in the FAQ Bank stay private to committee admins until you
                explicitly click Copy to Home FAQ. Promoting copies a one-way
                snapshot to Home / FAQ.
              </p>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                className="w-4 h-4 text-[#757E91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={faqSearch}
                onChange={(event) => {
                  setFaqSearch(event.target.value);
                  setFaqPage(1);
                }}
                aria-label="Search FAQ Bank"
                placeholder="Search saved questions, answers, or tags..."
                className="w-full h-11 pl-10 pr-3.5 rounded-[5px] border border-[#A1A7B4] bg-white text-sm sm:text-base text-[#1C1B1F] placeholder:text-[#4A5565] focus:outline-none focus:border-[#0038E1]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label="Filter FAQ Bank by category"
                value={faqCategoryFilter}
                onChange={(event) => {
                  setFaqCategoryFilter(event.target.value);
                  setFaqPage(1);
                }}
                className="h-11 px-3.5 rounded-[5px] border border-[#A1A7B4] bg-white text-sm sm:text-base text-[#0038E1] font-medium focus:outline-none focus:border-[#0038E1] cursor-pointer"
              >
                <option value="all">All categories</option>
                {faqCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <span className="text-sm text-[#4A5565]">
                {faqBank.length} saved · {publishedFaqCount} published on Home
              </span>
            </div>
          </div>

          {/* FAQ Bank Table / Mobile Cards */}
          <div className="bg-white border border-[#A1A7B4] rounded-[16px] overflow-hidden">
            {pagedFaqBank.length === 0 ? (
              <div className="px-6 py-12 text-center space-y-2">
                <p className="text-base font-medium text-[#1C1B1F]">
                  No FAQ Bank entries found.
                </p>
                <p className="text-sm text-[#4A5565]">
                  Click + Add FAQ above or save an inquiry from your inbox.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table (>= 1024px) */}
                <div
                  data-testid="faq-bank-desktop-table"
                  className="hidden lg:block overflow-x-auto"
                >
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] text-[13px] font-medium text-[#4A5565]">
                        <th scope="col" className="py-3.5 pl-6 pr-3">
                          Saved question &amp; answer
                        </th>
                        <th scope="col" className="py-3.5 px-3">
                          Category
                        </th>
                        <th scope="col" className="py-3.5 px-3">
                          Visibility
                        </th>
                        <th scope="col" className="py-3.5 px-3">
                          Saved on
                        </th>
                        <th scope="col" className="py-3.5 pl-3 pr-6 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#A1A7B4]/60">
                      {pagedFaqBank.map((item) => {
                        const isPromoting = promotingId === item.id;
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-[#F8FAFC] transition-colors"
                          >
                            <td className="py-4 pl-6 pr-3 align-top max-w-[440px]">
                              <p className="text-base font-medium text-[#1C1B1F]">
                                {item.question}
                              </p>
                              <p className="mt-1 text-sm text-[#4A5565] line-clamp-2">
                                {item.answer}
                              </p>
                              {item.tags.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {item.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 text-xs rounded border border-[#E2E8F0] bg-[#F8FAFC] text-[#4A5565]"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </td>

                            <td className="py-4 px-3 align-top">
                              <Badge tone="info" className="rounded-[5px]">
                                {item.category}
                              </Badge>
                            </td>

                            <td className="py-4 px-3 align-top">
                              <div className="flex flex-col items-start gap-1.5">
                                <Badge tone="neutral" className="rounded-[5px]">
                                  Private
                                </Badge>
                                {item.promotedToHome ? (
                                  <Badge tone="teal" className="rounded-[5px]">
                                    Copied to Home
                                  </Badge>
                                ) : null}
                              </div>
                            </td>

                            <td className="py-4 px-3 align-top text-sm text-[#4A5565] whitespace-nowrap">
                              {formatShortDate(item.updatedAt)}
                            </td>

                            <td className="py-4 pl-3 pr-6 align-top text-right">
                              <div className="inline-flex flex-wrap items-center justify-end gap-2.5">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  loading={isPromoting}
                                  onClick={() => void handleCopyToHomeFaq(item)}
                                  className="rounded-[5px] border-[#0038E1] text-[#0038E1]"
                                >
                                  <ArrowUpRight
                                    className="w-3.5 h-3.5"
                                    aria-hidden="true"
                                  />
                                  Copy to Home FAQ
                                </Button>
                                <button
                                  type="button"
                                  aria-label={`Edit ${item.question}`}
                                  onClick={() => {
                                    setFaqDraft(null);
                                    setEditingFaqItem(item);
                                    setFaqModalOpen(true);
                                  }}
                                  className="text-sm font-medium text-[#0038E1] hover:underline underline-offset-4 cursor-pointer"
                                >
                                  Edit FAQ
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Delete ${item.question}`}
                                  onClick={() => setDeleteFaqTarget(item)}
                                  className="text-sm font-medium text-[#B41B00] hover:underline underline-offset-4 cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked Cards (< 1024px) */}
                <div
                  data-testid="faq-bank-mobile-cards"
                  className="lg:hidden divide-y divide-[#E2E8F0]"
                >
                  {pagedFaqBank.map((item) => {
                    const isPromoting = promotingId === item.id;
                    return (
                      <article key={item.id} className="p-4 space-y-3 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="info" className="rounded-[5px]">
                            {item.category}
                          </Badge>
                          <Badge tone="neutral" className="rounded-[5px]">
                            Private
                          </Badge>
                          {item.promotedToHome ? (
                            <Badge tone="teal" className="rounded-[5px]">
                              Copied to Home
                            </Badge>
                          ) : null}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <h3 className="text-base font-medium text-[#1C1B1F] break-words">
                            {item.question}
                          </h3>
                          <p className="text-sm text-[#4A5565] break-words">
                            {item.answer}
                          </p>
                        </div>

                        <p className="text-xs text-[#757E91]">
                          Saved on {formatShortDate(item.updatedAt)}
                        </p>

                        <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            loading={isPromoting}
                            onClick={() => void handleCopyToHomeFaq(item)}
                            className="rounded-[5px] border-[#0038E1] text-[#0038E1]"
                          >
                            <ArrowUpRight
                              className="w-3.5 h-3.5"
                              aria-hidden="true"
                            />
                            Copy to Home FAQ
                          </Button>

                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            aria-label={`Edit ${item.question}`}
                            onClick={() => {
                              setFaqDraft(null);
                              setEditingFaqItem(item);
                              setFaqModalOpen(true);
                            }}
                            className="rounded-[5px] border-[#A1A7B4] text-[#0038E1]"
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                            Edit
                          </Button>

                          <button
                            type="button"
                            aria-label={`Delete ${item.question}`}
                            onClick={() => setDeleteFaqTarget(item)}
                            className="inline-flex items-center gap-1 h-9 px-2.5 text-sm font-medium text-[#B41B00] hover:bg-[#FAAF98]/30 rounded-[5px] transition-colors cursor-pointer ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {filteredFaqBank.length > 0 ? (
              <div className="px-5 sm:px-6 py-4 border-t border-[#E2E8F0]">
                {totalFaqPages > 1 ? (
                  <Pagination
                    currentPage={safeFaqPage}
                    totalPages={totalFaqPages}
                    onPageChange={setFaqPage}
                    totalItems={filteredFaqBank.length}
                    pageSize={FAQ_PAGE_SIZE}
                  />
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#4A5565]">
                    <p>
                      Showing {filteredFaqBank.length} saved question
                      {filteredFaqBank.length === 1 ? "" : "s"}
                    </p>
                    <p className="font-mono text-[#0038E1]">
                      1–{filteredFaqBank.length} of {filteredFaqBank.length}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Reply via Dev Club Email Modal */}
      <ReplyEmailModal
        open={replyModalOpen}
        inquiry={selectedInquiry}
        onClose={() => setReplyModalOpen(false)}
        onReplied={(updated) => {
          setNotice({
            tone: "success",
            message: `Reply sent to ${updated.senderEmail} (${updated.status}).`,
          });
        }}
      />

      {/* Add / Edit FAQ Bank Modal */}
      <AddFaqModal
        open={faqModalOpen}
        onClose={() => setFaqModalOpen(false)}
        editingItem={editingFaqItem}
        initialDraft={faqDraft}
        onSaved={(saved, mode) => {
          setNotice({
            tone: "success",
            message:
              mode === "edit"
                ? `Updated "${saved.question}" in private FAQ Bank.`
                : `Saved "${saved.question}" to private FAQ Bank (admins only).`,
          });
        }}
      />

      {/* Delete FAQ Bank Item Confirmation Modal */}
      <Modal
        open={deleteFaqTarget !== null}
        onClose={() => {
          if (!deletingFaq) setDeleteFaqTarget(null);
        }}
        title="Delete FAQ Bank Entry"
        subtitle="Remove this private question and answer from FAQ Bank?"
        maxWidthClass="max-w-md"
        footer={
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              disabled={deletingFaq}
              onClick={() => setDeleteFaqTarget(null)}
              className="rounded-[5px] border-[#A1A7B4] text-[#0038E1]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deletingFaq}
              onClick={() => void handleConfirmDeleteFaq()}
              className="rounded-[5px]"
            >
              Confirm Delete
            </Button>
          </div>
        }
      >
        {deleteFaqTarget ? (
          <div className="space-y-2 text-sm text-[#4A5565]">
            <p className="text-base font-medium text-[#1C1B1F]">
              {deleteFaqTarget.question}
            </p>
            <p>
              This removes the item from your private FAQ Bank. Any copy already
              promoted to Home / FAQ remains untouched in Site Content.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
