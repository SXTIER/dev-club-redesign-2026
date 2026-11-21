import type { AdminSession, LoginInput } from "@/lib/types/auth";
import type {
  ContentSectionKey,
  EditableImageSlot,
  FaqItem,
  HomeContent,
  LegalContent,
  RecruitmentContent,
  SiteContent,
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

/**
 * Normalized service error thrown by both MockAdapter and HttpAdapter.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface ContentSectionMap {
  site: SiteContent;
  home: HomeContent;
  recruitment: RecruitmentContent;
  legal: LegalContent;
}

export interface ContentService {
  getSection<K extends ContentSectionKey>(key: K): Promise<ContentSectionMap[K]>;
  updateSection<K extends ContentSectionKey>(
    key: K,
    data: ContentSectionMap[K],
  ): Promise<ContentSectionMap[K]>;
  resetAll(): Promise<void>;
  exportSectionJson<K extends ContentSectionKey>(key: K): Promise<string>;
}

export interface MediaUploadRequest {
  file: File;
  title?: string;
  sourceSlot?: EditableImageSlot | (string & {});
}

export interface UploadedMediaAsset extends MediaAsset {
  sanitized?: boolean;
  sanitizationNote?: string;
}

export interface MediaService {
  listMedia(): Promise<MediaAsset[]>;
  uploadMedia(input: MediaUploadRequest): Promise<UploadedMediaAsset>;
  assignMediaToSlot(
    assetId: string,
    slot: EditableImageSlot,
  ): Promise<MediaAsset>;
  deleteMedia(assetId: string): Promise<void>;
}

export interface EventListFilters {
  published?: boolean;
  showOnHome?: boolean;
}

export interface EventsService {
  listEvents(filters?: EventListFilters): Promise<EventItem[]>;
  createEvent(input: EventUpsertInput, coverFile?: File): Promise<EventItem>;
  updateEvent(
    id: string,
    input: Partial<EventUpsertInput>,
    coverFile?: File,
  ): Promise<EventItem>;
  deleteEvent(id: string): Promise<void>;
}

export interface CvDownloadInfo {
  url: string;
  filename: string;
  mimeType: string;
}

export interface RecruitmentService {
  listApplications(): Promise<RecruitmentApplication[]>;
  submitApplication(
    input: RecruitmentSubmitInput,
    cvFile?: File,
  ): Promise<RecruitmentApplication>;
  updateStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<RecruitmentApplication>;
  getCvDownloadUrl(id: string): Promise<CvDownloadInfo>;
}

export interface ReplyInquiryInput {
  body: string;
  markAnswered?: boolean;
  sentBy?: string;
}

export interface FaqBankCreateInput {
  question: string;
  answer: string;
  category: string;
  tags?: string[];
  promotedToHome?: boolean;
}

export type FaqBankUpdateInput = Partial<FaqBankCreateInput>;

export interface InquiriesService {
  listInquiries(): Promise<InquiryItem[]>;
  submitInquiry(input: InquiryCreateInput): Promise<InquiryItem>;
  replyInquiry(id: string, reply: ReplyInquiryInput): Promise<InquiryItem>;
  updateTags(id: string, tags: string[]): Promise<InquiryItem>;
  listFaqBank(): Promise<FaqBankItem[]>;
  createFaqBankItem(input: FaqBankCreateInput): Promise<FaqBankItem>;
  updateFaqBankItem(
    id: string,
    input: FaqBankUpdateInput,
  ): Promise<FaqBankItem>;
  deleteFaqBankItem(id: string): Promise<void>;
  copyFaqBankToHome(faqBankId: string): Promise<FaqItem>;
}

export interface AuthService {
  login(input: LoginInput): Promise<AdminSession>;
  logout(): Promise<void>;
  getSession(): Promise<AdminSession | null>;
}

export interface ServiceBundle {
  content: ContentService;
  media: MediaService;
  events: EventsService;
  recruitment: RecruitmentService;
  inquiries: InquiriesService;
  auth: AuthService;
}
