import type { AdminSession, LoginInput } from "@/lib/types/auth";
import type {
  ContentSectionKey,
  EditableImageSlot,
  FaqItem,
} from "@/lib/types/content";
import type { EventItem, EventUpsertInput } from "@/lib/types/events";
import type {
  FaqBankItem,
  InquiryCreateInput,
  InquiryItem,
} from "@/lib/types/inquiries";
import type { MediaAsset } from "@/lib/types/media";
import type {
  ApplicationStatus,
  RecruitmentApplication,
  RecruitmentSubmitInput,
} from "@/lib/types/recruitment";
import {
  ApiError,
  type ContentSectionMap,
  type CvDownloadInfo,
  type EventListFilters,
  type FaqBankCreateInput,
  type FaqBankUpdateInput,
  type MediaUploadRequest,
  type ReplyInquiryInput,
  type ServiceBundle,
  type UploadedMediaAsset,
} from "./contracts";

export interface HttpAdapterOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  getBearerToken?: () => string | null | undefined;
}

function defaultErrorCode(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 415:
      return "UNSUPPORTED_MEDIA_TYPE";
    case 422:
      return "VALIDATION_ERROR";
    default:
      return `HTTP_${status}`;
  }
}

function formatFastApiDetailItem(item: unknown): string | null {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return null;

  const entry = item as Record<string, unknown>;
  const msg =
    typeof entry.msg === "string"
      ? entry.msg
      : typeof entry.message === "string"
        ? entry.message
        : null;
  if (!msg) return null;

  if (Array.isArray(entry.loc) && entry.loc.length > 0) {
    const fieldParts = entry.loc
      .map((part) => String(part))
      .filter((part) => part !== "body" && part !== "query" && part !== "path");
    if (fieldParts.length > 0) {
      return `${fieldParts.join(".")}: ${msg}`;
    }
  }
  return msg;
}

function formatDrfFieldErrors(record: Record<string, unknown>): string | null {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(record)) {
    if (key === "code" || key === "status" || key === "details") continue;
    if (Array.isArray(val)) {
      const msgs = val.filter((v): v is string => typeof v === "string");
      if (msgs.length > 0) {
        parts.push(`${key}: ${msgs.join(", ")}`);
      }
    } else if (typeof val === "string" && val.trim()) {
      parts.push(`${key}: ${val}`);
    }
  }
  return parts.length > 0 ? parts.join("; ") : null;
}

async function normalizeHttpError(response: Response): Promise<ApiError> {
  const status = response.status;
  let code = defaultErrorCode(status);
  let message = response.statusText || `Request failed with status ${status}`;
  let details: unknown;

  let rawText = "";
  try {
    rawText = await response.text();
  } catch {
    return new ApiError(status, code, message);
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return new ApiError(status, code, message);
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    details = parsed;

    if (typeof parsed === "string" && parsed.trim()) {
      message = parsed.trim();
      return new ApiError(status, code, message, details);
    }

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const body = parsed as Record<string, unknown>;

      if (typeof body.code === "string" && body.code.trim()) {
        code = body.code.trim();
      }

      if (Array.isArray(body.detail)) {
        const formatted = body.detail
          .map(formatFastApiDetailItem)
          .filter((item): item is string => Boolean(item));
        if (formatted.length > 0) {
          message = formatted.join("; ");
        }
        if (typeof body.code !== "string") {
          code = status === 422 ? "VALIDATION_ERROR" : code;
        }
        details = body.detail;
      } else if (typeof body.detail === "string" && body.detail.trim()) {
        message = body.detail.trim();
      } else if (typeof body.message === "string" && body.message.trim()) {
        message = body.message.trim();
      } else if (typeof body.error === "string" && body.error.trim()) {
        message = body.error.trim();
      } else {
        const drfMsg = formatDrfFieldErrors(body);
        if (drfMsg) {
          message = drfMsg;
        }
      }

      if (Array.isArray(body.usedBy)) {
        const baseDetails =
          body.details && typeof body.details === "object" && !Array.isArray(body.details)
            ? (body.details as Record<string, unknown>)
            : {};
        details = { ...baseDetails, usedBy: body.usedBy };
      } else if (body.details !== undefined) {
        details = body.details;
      }
    }
  } catch {
    const looksLikeHtml =
      trimmed.startsWith("<") || trimmed.toLowerCase().includes("<html");
    message = looksLikeHtml
      ? response.statusText || `Request failed with status ${status}`
      : trimmed;
    details = trimmed;
  }

  return new ApiError(status, code, message, details);
}

/**
 * Creates a Python-ready REST ServiceBundle (`credentials: 'include'`, optional Bearer JWT,
 * FormData `payload` + `file`/`cover`/`cv` multipart uploads, and FastAPI/DRF error normalization).
 */
export function createHttpServices(options: HttpAdapterOptions): ServiceBundle {
  const baseUrl = options.baseUrl.trim().replace(/\/+$/, "");
  const fetchFn =
    options.fetchImpl ??
    ((input: RequestInfo | URL, init?: RequestInit) =>
      globalThis.fetch(input, init));

  let fallbackToken: string | null = null;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${baseUrl}${cleanPath}`;
    const headers = new Headers(init.headers);

    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    const isFormData =
      typeof FormData !== "undefined" && init.body instanceof FormData;
    if (init.body !== undefined && !isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const token = options.getBearerToken?.() ?? fallbackToken;
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await fetchFn(url, {
        ...init,
        headers,
        credentials: "include",
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Network request failed";
      throw new ApiError(0, "NETWORK_ERROR", msg, error);
    }

    if (!response.ok) {
      throw await normalizeHttpError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const rawText = await response.text();
    if (!rawText.trim()) {
      return undefined as T;
    }

    try {
      return JSON.parse(rawText) as T;
    } catch (error) {
      throw new ApiError(
        response.status,
        "INVALID_JSON",
        "Backend returned invalid JSON.",
        error,
      );
    }
  }

  const content: ServiceBundle["content"] = {
    getSection<K extends ContentSectionKey>(
      key: K,
    ): Promise<ContentSectionMap[K]> {
      return request<ContentSectionMap[K]>(`/content/${encodeURIComponent(key)}`);
    },

    updateSection<K extends ContentSectionKey>(
      key: K,
      data: ContentSectionMap[K],
    ): Promise<ContentSectionMap[K]> {
      return request<ContentSectionMap[K]>(
        `/content/${encodeURIComponent(key)}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      );
    },

    resetAll(): Promise<void> {
      return request<void>("/content/reset", { method: "POST" });
    },

    async exportSectionJson<K extends ContentSectionKey>(
      key: K,
    ): Promise<string> {
      const section = await content.getSection(key);
      return JSON.stringify(section, null, 2);
    },
  };

  const media: ServiceBundle["media"] = {
    listMedia(): Promise<MediaAsset[]> {
      return request<MediaAsset[]>("/media");
    },

    uploadMedia(input: MediaUploadRequest): Promise<UploadedMediaAsset> {
      const formData = new FormData();
      const meta: { title?: string; sourceSlot?: string } = {};
      if (input.title !== undefined && input.title.trim()) {
        meta.title = input.title.trim();
      }
      if (input.sourceSlot !== undefined) {
        meta.sourceSlot = input.sourceSlot;
      }
      formData.append("payload", JSON.stringify(meta));
      formData.append("file", input.file);

      return request<UploadedMediaAsset>("/media", {
        method: "POST",
        body: formData,
      });
    },

    assignMediaToSlot(
      assetId: string,
      slot: EditableImageSlot,
    ): Promise<MediaAsset> {
      return request<MediaAsset>(
        `/media/${encodeURIComponent(assetId)}/slot`,
        {
          method: "PATCH",
          body: JSON.stringify({ slot }),
        },
      );
    },

    deleteMedia(assetId: string): Promise<void> {
      return request<void>(`/media/${encodeURIComponent(assetId)}`, {
        method: "DELETE",
      });
    },
  };

  const events: ServiceBundle["events"] = {
    listEvents(filters?: EventListFilters): Promise<EventItem[]> {
      const params = new URLSearchParams();
      if (filters?.published !== undefined) {
        params.set("published", String(filters.published));
      }
      if (filters?.showOnHome !== undefined) {
        params.set("showOnHome", String(filters.showOnHome));
      }
      const query = params.toString();
      return request<EventItem[]>(query ? `/events?${query}` : "/events");
    },

    createEvent(input: EventUpsertInput, coverFile?: File): Promise<EventItem> {
      if (coverFile) {
        const formData = new FormData();
        formData.append("payload", JSON.stringify(input));
        formData.append("cover", coverFile);
        return request<EventItem>("/events", {
          method: "POST",
          body: formData,
        });
      }

      return request<EventItem>("/events", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    updateEvent(
      id: string,
      input: Partial<EventUpsertInput>,
      coverFile?: File,
    ): Promise<EventItem> {
      const path = `/events/${encodeURIComponent(id)}`;
      if (coverFile) {
        const formData = new FormData();
        formData.append("payload", JSON.stringify(input));
        formData.append("cover", coverFile);
        return request<EventItem>(path, {
          method: "PATCH",
          body: formData,
        });
      }

      return request<EventItem>(path, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },

    deleteEvent(id: string): Promise<void> {
      return request<void>(`/events/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };

  const recruitment: ServiceBundle["recruitment"] = {
    listApplications(): Promise<RecruitmentApplication[]> {
      return request<RecruitmentApplication[]>("/recruitment/applications");
    },

    submitApplication(
      input: RecruitmentSubmitInput,
      cvFile?: File,
    ): Promise<RecruitmentApplication> {
      const formData = new FormData();
      formData.append("payload", JSON.stringify(input));
      if (cvFile) {
        formData.append("cv", cvFile);
      }

      return request<RecruitmentApplication>("/recruitment/applications", {
        method: "POST",
        body: formData,
      });
    },

    updateStatus(
      id: string,
      status: ApplicationStatus,
    ): Promise<RecruitmentApplication> {
      return request<RecruitmentApplication>(
        `/recruitment/applications/${encodeURIComponent(id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      );
    },

    getCvDownloadUrl(id: string): Promise<CvDownloadInfo> {
      return request<CvDownloadInfo>(
        `/recruitment/applications/${encodeURIComponent(id)}/cv`,
      );
    },
  };

  const inquiries: ServiceBundle["inquiries"] = {
    listInquiries(): Promise<InquiryItem[]> {
      return request<InquiryItem[]>("/inquiries");
    },

    submitInquiry(input: InquiryCreateInput): Promise<InquiryItem> {
      return request<InquiryItem>("/inquiries", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    replyInquiry(id: string, reply: ReplyInquiryInput): Promise<InquiryItem> {
      return request<InquiryItem>(
        `/inquiries/${encodeURIComponent(id)}/reply`,
        {
          method: "POST",
          body: JSON.stringify({
            body: reply.body,
            markAnswered: reply.markAnswered ?? true,
          }),
        },
      );
    },

    updateTags(id: string, tags: string[]): Promise<InquiryItem> {
      return request<InquiryItem>(
        `/inquiries/${encodeURIComponent(id)}/tags`,
        {
          method: "PATCH",
          body: JSON.stringify({ tags }),
        },
      );
    },

    listFaqBank(): Promise<FaqBankItem[]> {
      return request<FaqBankItem[]>("/faq-bank");
    },

    createFaqBankItem(input: FaqBankCreateInput): Promise<FaqBankItem> {
      return request<FaqBankItem>("/faq-bank", {
        method: "POST",
        body: JSON.stringify({
          ...input,
          tags: input.tags ?? [],
        }),
      });
    },

    updateFaqBankItem(
      id: string,
      input: FaqBankUpdateInput,
    ): Promise<FaqBankItem> {
      return request<FaqBankItem>(`/faq-bank/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },

    deleteFaqBankItem(id: string): Promise<void> {
      return request<void>(`/faq-bank/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },

    copyFaqBankToHome(faqBankId: string): Promise<FaqItem> {
      return request<FaqItem>(
        `/faq-bank/${encodeURIComponent(faqBankId)}/copy-to-home`,
        {
          method: "POST",
        },
      );
    },
  };

  const auth: ServiceBundle["auth"] = {
    async login(input: LoginInput): Promise<AdminSession> {
      const session = await request<AdminSession>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (session.token) {
        fallbackToken = session.token;
      }
      return session;
    },

    async logout(): Promise<void> {
      try {
        await request<void>("/auth/logout", { method: "POST" });
      } finally {
        fallbackToken = null;
      }
    },

    async getSession(): Promise<AdminSession | null> {
      try {
        const session = await request<AdminSession | null>("/auth/me");
        if (!session || !session.authenticated) {
          return null;
        }
        return session;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
  };

  return {
    content,
    media,
    events,
    recruitment,
    inquiries,
    auth,
  };
}
