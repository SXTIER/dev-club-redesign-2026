"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";
import adminSeedJson from "@/content/admin-seed.json";
import eventsJson from "@/content/events.json";
import homeJson from "@/content/home.json";
import legalJson from "@/content/legal.json";
import mediaJson from "@/content/media.json";
import recruitmentJson from "@/content/recruitment.json";
import siteJson from "@/content/site.json";
import {
  getDataMode,
  getServices,
  type ContentSectionMap,
  type DataMode,
  type ServiceBundle,
} from "@/lib/services";
import { readOverlay } from "@/lib/storage/localOverlay";
import {
  adminSeedSchema,
  signinMemeSlideSchema,
  type SigninMemeSlide,
} from "@/lib/types/adminSeed";
import type { AdminSession } from "@/lib/types/auth";
import {
  homeContentSchema,
  legalContentSchema,
  recruitmentContentSchema,
  siteContentSchema,
  type ContentSectionKey,
  type HomeContent,
  type LegalContent,
  type RecruitmentContent,
  type SiteContent,
} from "@/lib/types/content";
import { eventsListSchema, type EventItem } from "@/lib/types/events";
import type { FaqBankItem, InquiryItem } from "@/lib/types/inquiries";
import { mediaListSchema, type MediaAsset } from "@/lib/types/media";
import type { RecruitmentApplication } from "@/lib/types/recruitment";

const INITIAL_SITE = siteContentSchema.parse(siteJson);
const INITIAL_HOME = homeContentSchema.parse(homeJson);
const INITIAL_EVENTS = eventsListSchema.parse(eventsJson);
const INITIAL_RECRUITMENT = recruitmentContentSchema.parse(recruitmentJson);
const INITIAL_LEGAL = legalContentSchema.parse(legalJson);
const INITIAL_MEDIA = mediaListSchema.parse(mediaJson);
const INITIAL_ADMIN_SEED = adminSeedSchema.parse(adminSeedJson);
const SIGNIN_MEMES_LIST_SCHEMA = z.array(signinMemeSlideSchema);

export interface AppDataContextValue {
  mode: DataMode;
  site: SiteContent;
  home: HomeContent;
  events: EventItem[];
  recruitment: RecruitmentContent;
  legal: LegalContent;
  media: MediaAsset[];
  applications: RecruitmentApplication[];
  inquiries: InquiryItem[];
  faqBank: FaqBankItem[];
  signinMemes: SigninMemeSlide[];
  session: AdminSession | null;
  services: ServiceBundle;
  isHydrated: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  refreshContent: () => Promise<void>;
  refreshMedia: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshAdminData: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export interface AppDataProviderProps {
  children: ReactNode;
  services?: ServiceBundle;
  mode?: DataMode;
}

export function AppDataProvider({
  children,
  services: injectedServices,
  mode: injectedMode,
}: AppDataProviderProps) {
  const mode = injectedMode ?? getDataMode();
  const rawServices = useMemo(
    () => injectedServices ?? getServices(),
    [injectedServices],
  );

  const [site, setSite] = useState<SiteContent>(INITIAL_SITE);
  const [home, setHome] = useState<HomeContent>(INITIAL_HOME);
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [recruitment, setRecruitment] =
    useState<RecruitmentContent>(INITIAL_RECRUITMENT);
  const [legal, setLegal] = useState<LegalContent>(INITIAL_LEGAL);
  const [media, setMedia] = useState<MediaAsset[]>(INITIAL_MEDIA);
  const [applications, setApplications] = useState<RecruitmentApplication[]>(() =>
    mode === "mock" ? INITIAL_ADMIN_SEED.applications : [],
  );
  const [inquiries, setInquiries] = useState<InquiryItem[]>(() =>
    mode === "mock" ? INITIAL_ADMIN_SEED.inquiries : [],
  );
  const [faqBank, setFaqBank] = useState<FaqBankItem[]>(() =>
    mode === "mock" ? INITIAL_ADMIN_SEED.faqBank : [],
  );
  const [signinMemes, setSigninMemes] = useState<SigninMemeSlide[]>(
    INITIAL_ADMIN_SEED.signinMemes,
  );
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const sessionRef = useRef<AdminSession | null>(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const refreshContent = useCallback(async () => {
    const [siteRes, homeRes, recRes, legalRes] = await Promise.allSettled([
      rawServices.content.getSection("site"),
      rawServices.content.getSection("home"),
      rawServices.content.getSection("recruitment"),
      rawServices.content.getSection("legal"),
    ]);
    if (!mountedRef.current) return;
    if (siteRes.status === "fulfilled") setSite(siteRes.value);
    if (homeRes.status === "fulfilled") setHome(homeRes.value);
    if (recRes.status === "fulfilled") setRecruitment(recRes.value);
    if (legalRes.status === "fulfilled") setLegal(legalRes.value);
  }, [rawServices]);

  const refreshMedia = useCallback(async () => {
    try {
      const list = await rawServices.media.listMedia();
      if (mountedRef.current) setMedia(list);
    } catch {
      // Keep existing media snapshot if fetch fails cleanly.
    }
  }, [rawServices]);

  const refreshEvents = useCallback(async () => {
    try {
      const list = await rawServices.events.listEvents();
      if (mountedRef.current) setEvents(list);
    } catch {
      // Keep existing events snapshot if fetch fails cleanly.
    }
  }, [rawServices]);

  const refreshAdminData = useCallback(async () => {
    const [appsRes, inqRes, bankRes] = await Promise.allSettled([
      rawServices.recruitment.listApplications(),
      rawServices.inquiries.listInquiries(),
      rawServices.inquiries.listFaqBank(),
    ]);
    if (!mountedRef.current) return;
    if (appsRes.status === "fulfilled") setApplications(appsRes.value);
    if (inqRes.status === "fulfilled") setInquiries(inqRes.value);
    if (bankRes.status === "fulfilled") setFaqBank(bankRes.value);
    if (mode === "mock") {
      setSigninMemes(
        readOverlay(
          "signinMemes",
          SIGNIN_MEMES_LIST_SCHEMA,
          INITIAL_ADMIN_SEED.signinMemes,
        ),
      );
    }
  }, [mode, rawServices]);

  const refresh = useCallback(async () => {
    if (mountedRef.current) setIsRefreshing(true);
    try {
      const [
        siteRes,
        homeRes,
        recRes,
        legalRes,
        eventsRes,
        mediaRes,
        sessionRes,
      ] = await Promise.allSettled([
        rawServices.content.getSection("site"),
        rawServices.content.getSection("home"),
        rawServices.content.getSection("recruitment"),
        rawServices.content.getSection("legal"),
        rawServices.events.listEvents(),
        rawServices.media.listMedia(),
        rawServices.auth.getSession(),
      ]);

      if (!mountedRef.current) return;

      if (siteRes.status === "fulfilled") setSite(siteRes.value);
      if (homeRes.status === "fulfilled") setHome(homeRes.value);
      if (recRes.status === "fulfilled") setRecruitment(recRes.value);
      if (legalRes.status === "fulfilled") setLegal(legalRes.value);
      if (eventsRes.status === "fulfilled") setEvents(eventsRes.value);
      if (mediaRes.status === "fulfilled") setMedia(mediaRes.value);

      const resolvedSession =
        sessionRes.status === "fulfilled" ? sessionRes.value : null;
      setSession(resolvedSession);

      if (mode === "mock" || resolvedSession?.authenticated) {
        await refreshAdminData();
      } else if (mode === "api") {
        setApplications([]);
        setInquiries([]);
        setFaqBank([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
        setIsHydrated(true);
      }
    }
  }, [mode, rawServices, refreshAdminData]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const reactiveServices = useMemo<ServiceBundle>(() => {
    const canListAdmin = () =>
      mode === "mock" || Boolean(sessionRef.current?.authenticated);

    return {
      content: {
        getSection: <K extends ContentSectionKey>(key: K) =>
          rawServices.content.getSection(key),
        async updateSection<K extends ContentSectionKey>(
          key: K,
          data: ContentSectionMap[K],
        ): Promise<ContentSectionMap[K]> {
          const updated = await rawServices.content.updateSection(key, data);
          if (mountedRef.current) {
            if (key === "site") setSite(updated as SiteContent);
            if (key === "home") setHome(updated as HomeContent);
            if (key === "recruitment")
              setRecruitment(updated as RecruitmentContent);
            if (key === "legal") setLegal(updated as LegalContent);
          }
          if (key === "site" || key === "home") {
            await refreshMedia();
          }
          return updated;
        },
        async resetAll() {
          await rawServices.content.resetAll();
          await refresh();
        },
        exportSectionJson: <K extends ContentSectionKey>(key: K) =>
          rawServices.content.exportSectionJson(key),
      },

      media: {
        listMedia: () => rawServices.media.listMedia(),
        async uploadMedia(input) {
          const uploaded = await rawServices.media.uploadMedia(input);
          await refreshMedia();
          if (input.sourceSlot) {
            await refreshContent();
          }
          return uploaded;
        },
        async assignMediaToSlot(assetId, slot) {
          const assigned = await rawServices.media.assignMediaToSlot(
            assetId,
            slot,
          );
          await Promise.all([refreshMedia(), refreshContent()]);
          return assigned;
        },
        async deleteMedia(assetId) {
          await rawServices.media.deleteMedia(assetId);
          if (mountedRef.current) {
            setMedia((prev) => prev.filter((item) => item.id !== assetId));
          }
        },
      },

      events: {
        listEvents: (filters) => rawServices.events.listEvents(filters),
        async createEvent(input, coverFile) {
          const created = await rawServices.events.createEvent(
            input,
            coverFile,
          );
          await refreshEvents();
          if (coverFile) {
            await refreshMedia();
          }
          return created;
        },
        async updateEvent(id, input, coverFile) {
          const updated = await rawServices.events.updateEvent(
            id,
            input,
            coverFile,
          );
          await refreshEvents();
          if (coverFile) {
            await refreshMedia();
          }
          return updated;
        },
        async deleteEvent(id) {
          await rawServices.events.deleteEvent(id);
          await refreshEvents();
        },
      },

      recruitment: {
        listApplications: () => rawServices.recruitment.listApplications(),
        async submitApplication(input, cvFile) {
          const created = await rawServices.recruitment.submitApplication(
            input,
            cvFile,
          );
          if (canListAdmin()) {
            try {
              const all = await rawServices.recruitment.listApplications();
              if (mountedRef.current) setApplications(all);
            } catch {
              if (mountedRef.current) {
                setApplications((prev) => [created, ...prev]);
              }
            }
          } else if (mountedRef.current) {
            setApplications((prev) => [created, ...prev]);
          }
          return created;
        },
        async updateStatus(id, status) {
          const updated = await rawServices.recruitment.updateStatus(
            id,
            status,
          );
          if (mountedRef.current) {
            setApplications((prev) =>
              prev.map((item) => (item.id === id ? updated : item)),
            );
          }
          return updated;
        },
        getCvDownloadUrl: (id) => rawServices.recruitment.getCvDownloadUrl(id),
      },

      inquiries: {
        listInquiries: () => rawServices.inquiries.listInquiries(),
        async submitInquiry(input) {
          const created = await rawServices.inquiries.submitInquiry(input);
          if (canListAdmin()) {
            try {
              const all = await rawServices.inquiries.listInquiries();
              if (mountedRef.current) setInquiries(all);
            } catch {
              if (mountedRef.current) {
                setInquiries((prev) => [created, ...prev]);
              }
            }
          } else if (mountedRef.current) {
            setInquiries((prev) => [created, ...prev]);
          }
          return created;
        },
        async replyInquiry(id, reply) {
          const updated = await rawServices.inquiries.replyInquiry(id, reply);
          if (mountedRef.current) {
            setInquiries((prev) =>
              prev.map((item) => (item.id === id ? updated : item)),
            );
          }
          return updated;
        },
        async updateTags(id, tags) {
          const updated = await rawServices.inquiries.updateTags(id, tags);
          if (mountedRef.current) {
            setInquiries((prev) =>
              prev.map((item) => (item.id === id ? updated : item)),
            );
          }
          return updated;
        },
        listFaqBank: () => rawServices.inquiries.listFaqBank(),
        async createFaqBankItem(input) {
          const created = await rawServices.inquiries.createFaqBankItem(input);
          if (mountedRef.current) {
            setFaqBank((prev) => [created, ...prev]);
          }
          return created;
        },
        async updateFaqBankItem(id, input) {
          const updated = await rawServices.inquiries.updateFaqBankItem(
            id,
            input,
          );
          if (mountedRef.current) {
            setFaqBank((prev) =>
              prev.map((item) => (item.id === id ? updated : item)),
            );
          }
          return updated;
        },
        async deleteFaqBankItem(id) {
          await rawServices.inquiries.deleteFaqBankItem(id);
          if (mountedRef.current) {
            setFaqBank((prev) => prev.filter((item) => item.id !== id));
          }
        },
        async copyFaqBankToHome(faqBankId) {
          const createdFaq =
            await rawServices.inquiries.copyFaqBankToHome(faqBankId);
          await refreshContent();
          if (canListAdmin()) {
            try {
              const bank = await rawServices.inquiries.listFaqBank();
              if (mountedRef.current) setFaqBank(bank);
            } catch {
              // Ignore if unavailable.
            }
          }
          return createdFaq;
        },
      },

      auth: {
        async login(input) {
          const nextSession = await rawServices.auth.login(input);
          if (mountedRef.current) setSession(nextSession);
          await refreshAdminData();
          return nextSession;
        },
        async logout() {
          await rawServices.auth.logout();
          if (mountedRef.current) {
            setSession(null);
            if (mode === "api") {
              setApplications([]);
              setInquiries([]);
              setFaqBank([]);
            }
          }
        },
        async getSession() {
          const current = await rawServices.auth.getSession();
          if (mountedRef.current) setSession(current);
          return current;
        },
      },
    };
  }, [
    mode,
    rawServices,
    refresh,
    refreshAdminData,
    refreshContent,
    refreshEvents,
    refreshMedia,
  ]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      mode,
      site,
      home,
      events,
      recruitment,
      legal,
      media,
      applications,
      inquiries,
      faqBank,
      signinMemes,
      session,
      services: reactiveServices,
      isHydrated,
      isRefreshing,
      refresh,
      refreshContent,
      refreshMedia,
      refreshEvents,
      refreshAdminData,
    }),
    [
      mode,
      site,
      home,
      events,
      recruitment,
      legal,
      media,
      applications,
      inquiries,
      faqBank,
      signinMemes,
      session,
      reactiveServices,
      isHydrated,
      isRefreshing,
      refresh,
      refreshContent,
      refreshMedia,
      refreshEvents,
      refreshAdminData,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used inside <AppDataProvider>.");
  }
  return ctx;
}
