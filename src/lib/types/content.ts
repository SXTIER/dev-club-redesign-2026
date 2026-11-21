import { z } from "zod";

/**
 * Shared image asset reference stored in modular JSON content and event/admin entities.
 * `src` may be a static `/images/figma/...` path, an `idb://<assetId>` reference in mock mode,
 * or an HTTPS URL in API mode.
 */
export const imageAssetSchema = z.object({
  id: z.string().min(1).optional(),
  src: z.string().min(1),
  alt: z.string(),
});

export type ImageAsset = z.infer<typeof imageAssetSchema>;

export const editableImageSlotSchema = z.enum([
  "site.logoDark",
  "site.logoLight",
  "home.hero.heroArtwork",
  "home.location.image",
]);

export type EditableImageSlot = z.infer<typeof editableImageSlotSchema>;

export const contentSectionKeySchema = z.enum([
  "site",
  "home",
  "recruitment",
  "legal",
]);

export type ContentSectionKey = z.infer<typeof contentSectionKeySchema>;

export const navLinkItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

export type NavLinkItem = z.infer<typeof navLinkItemSchema>;

export const siteContentSchema = z.object({
  brandName: z.string().min(1),
  slogan: z.string().min(1),
  logoDark: imageAssetSchema,
  logoLight: imageAssetSchema,
  navbar: z.object({
    links: z.array(navLinkItemSchema).min(1),
    cta: navLinkItemSchema,
  }),
  footer: z.object({
    organization: z.string().min(1),
    addressLines: z.array(z.string().min(1)).min(1),
    legalLinks: z.array(navLinkItemSchema).min(1),
    copyright: z.string().min(1),
  }),
});

export type SiteContent = z.infer<typeof siteContentSchema>;

export const whyUsCardSchema = z.object({
  index: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  accent: z.enum(["lime", "neutral"]),
});

export type WhyUsCard = z.infer<typeof whyUsCardSchema>;

export const teamTrackSchema = z.object({
  index: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  toolsLabel: z.string().min(1),
  accentColor: z.string().min(1),
});

export type TeamTrack = z.infer<typeof teamTrackSchema>;

export const faqItemSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
});

export type FaqItem = z.infer<typeof faqItemSchema>;

export const homeContentSchema = z.object({
  hero: z.object({
    eyebrow: z.string().min(1),
    headline: z.string().min(1),
    description: z.string().min(1),
    ctaLabel: z.string().min(1),
    ctaHref: z.string().min(1),
    heroArtwork: imageAssetSchema,
    mascotImage: imageAssetSchema,
    patternImage: imageAssetSchema,
  }),
  about: z.object({
    eyebrow: z.string().min(1),
    question: z.string().min(1),
    emphasis: z.string().min(1),
    body: z.string().min(1),
  }),
  whyUs: z.object({
    eyebrow: z.string().min(1),
    heading: z.string().min(1),
    cards: z.array(whyUsCardSchema).length(3),
  }),
  teams: z.object({
    eyebrow: z.string().min(1),
    heading: z.string().min(1),
    subtitle: z.string().min(1),
    items: z.array(teamTrackSchema).length(5),
  }),
  timeline: z.object({
    eyebrow: z.string().min(1),
    heading: z.string().min(1),
    subtitle: z.string().min(1),
  }),
  location: z.object({
    eyebrow: z.string().min(1),
    heading: z.string().min(1),
    campusName: z.string().min(1),
    note: z.string().min(1),
    mapButtonLabel: z.string().min(1),
    mapUrl: z.string().url(),
    pinIcon: imageAssetSchema,
    image: imageAssetSchema,
  }),
  faq: z.object({
    eyebrow: z.string().min(1),
    heading: z.string().min(1),
    askButtonLabel: z.string().min(1),
    askModal: z.object({
      title: z.string().min(1),
      subtitle: z.string().min(1),
      questionLabel: z.string().min(1),
      questionPlaceholder: z.string().min(1),
      emailLabel: z.string().min(1),
      emailPlaceholder: z.string().min(1),
      categoryLabel: z.string().min(1),
      categories: z.array(z.string().min(1)).min(1),
      consentLabel: z.string().min(1),
      privacyLinkLabel: z.string().min(1),
      cancelLabel: z.string().min(1),
      submitLabel: z.string().min(1),
      successMessage: z.string().min(1),
    }),
    items: z.array(faqItemSchema).min(1),
  }),
});

export type HomeContent = z.infer<typeof homeContentSchema>;

export const recruitmentRoleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  isOther: z.boolean().optional(),
});

export type RecruitmentRole = z.infer<typeof recruitmentRoleSchema>;

export const recruitmentStepSchema = z.object({
  number: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
});

export type RecruitmentStep = z.infer<typeof recruitmentStepSchema>;

export const recruitmentFieldCopySchema = z.object({
  label: z.string().min(1),
  placeholder: z.string().min(1),
  hint: z.string().optional(),
});

export const recruitmentContentSchema = z.object({
  isOpen: z.boolean(),
  banner: z.object({
    eyebrow: z.string().min(1),
    headline: z.string().min(1),
  }),
  closedCopy: z.object({
    eyebrow: z.string().min(1),
    sideTitle: z.string().min(1),
    heading: z.string().min(1),
    description: z.string().min(1),
    ctaLabel: z.string().min(1),
    ctaHref: z.string().min(1),
  }),
  openedCopy: z.object({
    backLinkLabel: z.string().min(1),
    sidebarHeadline: z.string().min(1),
    sidebarDescription: z.string().min(1),
    steps: z.array(recruitmentStepSchema).length(3),
    formTitle: z.string().min(1),
    formSubtitle: z.string().min(1),
    sections: z.object({
      personal: z.object({
        tag: z.string().min(1),
        title: z.string().min(1),
        fields: z.object({
          firstName: recruitmentFieldCopySchema,
          lastName: recruitmentFieldCopySchema,
          nickname: recruitmentFieldCopySchema,
          studentId: recruitmentFieldCopySchema,
          email: recruitmentFieldCopySchema,
          phone: recruitmentFieldCopySchema,
          program: recruitmentFieldCopySchema,
          year: recruitmentFieldCopySchema,
        }),
      }),
      role: z.object({
        tag: z.string().min(1),
        title: z.string().min(1),
        projectsTeamLabel: z.string().min(1),
        marketingTeamLabel: z.string().min(1),
        otherPlaceholder: z.string().min(1),
      }),
      motivation: z.object({
        tag: z.string().min(1),
        title: z.string().min(1),
        fields: z.object({
          expectation: recruitmentFieldCopySchema,
          contribution: recruitmentFieldCopySchema,
          projectIdea: recruitmentFieldCopySchema,
          teamExperience: recruitmentFieldCopySchema,
          cv: z.object({
            label: z.string().min(1),
            emptyLabel: z.string().min(1),
            buttonLabel: z.string().min(1),
            acceptLabel: z.string().min(1),
          }),
          portfolioUrl: recruitmentFieldCopySchema,
        }),
      }),
    }),
  }),
  projectsTeamRoles: z.array(recruitmentRoleSchema).min(1),
  marketingTeamRoles: z.array(recruitmentRoleSchema).min(1),
  programs: z.array(z.string().min(1)).min(1),
  years: z.array(z.string().min(1)).min(1),
  agreements: z.object({
    requirementsLabel: z.string().min(1),
    requirementsDescription: z.string().min(1),
    pdpaLabel: z.string().min(1),
    pdpaDescription: z.string().min(1),
  }),
  submitLabel: z.string().min(1),
  successCopy: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),
});

export type RecruitmentContent = z.infer<typeof recruitmentContentSchema>;

export const legalSectionSchema = z.object({
  heading: z.string().min(1),
  paragraphs: z.array(z.string().min(1)),
  bullets: z.array(z.string().min(1)).optional(),
});

export type LegalSection = z.infer<typeof legalSectionSchema>;

export const legalDocumentSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  lastUpdated: z.string().min(1),
  sections: z.array(legalSectionSchema).min(1),
});

export type LegalDocument = z.infer<typeof legalDocumentSchema>;

export const acknowledgementCreditSchema = z.object({
  name: z.string().min(1),
  affiliation: z.string().min(1),
  role: z.string().min(1),
});

export type AcknowledgementCredit = z.infer<typeof acknowledgementCreditSchema>;

export const legalContentSchema = z.object({
  backToHomeLabel: z.string().min(1),
  privacyPolicy: z.object({
    en: legalDocumentSchema,
    th: legalDocumentSchema,
  }),
  termsOfUse: z.object({
    en: legalDocumentSchema,
    th: legalDocumentSchema,
  }),
  acknowledgement: z.object({
    en: legalDocumentSchema,
    th: legalDocumentSchema,
    credits: z.array(acknowledgementCreditSchema).min(1),
  }),
});

export type LegalContent = z.infer<typeof legalContentSchema>;
