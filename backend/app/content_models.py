"""Validated content documents matching the frontend's content schemas."""
from typing import Annotated, Literal

from pydantic import AnyUrl, Field, StrictBool, StringConstraints, field_validator

from .common import Model, NonEmpty

Text = Annotated[str, StringConstraints(strict=True)]


class ImageAsset(Model):
    id: NonEmpty | None = None
    src: NonEmpty

    @field_validator('id', mode='before')
    @classmethod
    def reject_null_id(cls, value):
        if value is None:
            raise ValueError('id may be omitted but cannot be null')
        return value
    alt: Text


class NavLink(Model):
    label: NonEmpty
    href: NonEmpty


class Navbar(Model):
    links: list[NavLink] = Field(min_length=1)
    cta: NavLink


class Footer(Model):
    organization: NonEmpty
    address_lines: list[NonEmpty] = Field(min_length=1)
    legal_links: list[NavLink] = Field(min_length=1)
    copyright: NonEmpty


class SiteContent(Model):
    brand_name: NonEmpty
    slogan: NonEmpty
    logo_dark: ImageAsset
    logo_light: ImageAsset
    navbar: Navbar
    footer: Footer


class WhyUsCard(Model):
    index: NonEmpty
    title: NonEmpty
    description: NonEmpty
    accent: Literal['lime', 'neutral']


class TeamTrack(Model):
    index: NonEmpty
    name: NonEmpty
    description: NonEmpty
    tools_label: NonEmpty
    accent_color: NonEmpty


class FaqItem(Model):
    id: NonEmpty
    question: NonEmpty
    answer: NonEmpty


class Hero(Model):
    eyebrow: NonEmpty
    headline: NonEmpty
    description: NonEmpty
    cta_label: NonEmpty
    cta_href: NonEmpty
    hero_artwork: ImageAsset
    mascot_image: ImageAsset
    pattern_image: ImageAsset


class About(Model):
    eyebrow: NonEmpty
    question: NonEmpty
    emphasis: NonEmpty
    body: NonEmpty


class WhyUs(Model):
    eyebrow: NonEmpty
    heading: NonEmpty
    cards: list[WhyUsCard] = Field(min_length=3, max_length=3)


class Teams(Model):
    eyebrow: NonEmpty
    heading: NonEmpty
    subtitle: NonEmpty
    items: list[TeamTrack] = Field(min_length=5, max_length=5)


class Timeline(Model):
    eyebrow: NonEmpty
    heading: NonEmpty
    subtitle: NonEmpty


class Location(Model):
    eyebrow: NonEmpty
    heading: NonEmpty
    campus_name: NonEmpty
    note: NonEmpty
    map_button_label: NonEmpty
    map_url: NonEmpty
    pin_icon: ImageAsset
    image: ImageAsset

    @field_validator('map_url')
    @classmethod
    def validate_url(cls, value: str) -> str:
        # Validate without normalizing the stored URL or adding a trailing slash.
        AnyUrl(value)
        return value


class AskModal(Model):
    title: NonEmpty
    subtitle: NonEmpty
    question_label: NonEmpty
    question_placeholder: NonEmpty
    email_label: NonEmpty
    email_placeholder: NonEmpty
    category_label: NonEmpty
    categories: list[NonEmpty] = Field(min_length=1)
    consent_label: NonEmpty
    privacy_link_label: NonEmpty
    cancel_label: NonEmpty
    submit_label: NonEmpty
    success_message: NonEmpty


class HomeFaq(Model):
    eyebrow: NonEmpty
    heading: NonEmpty
    ask_button_label: NonEmpty
    ask_modal: AskModal
    items: list[FaqItem] = Field(min_length=1)


class HomeContent(Model):
    hero: Hero
    about: About
    why_us: WhyUs
    teams: Teams
    timeline: Timeline
    location: Location
    faq: HomeFaq


class RecruitmentRole(Model):
    id: NonEmpty
    title: NonEmpty
    description: NonEmpty
    is_other: StrictBool | None = None


    @field_validator('is_other', mode='before')
    @classmethod
    def reject_null_is_other(cls, value):
        if value is None:
            raise ValueError('isOther may be omitted but cannot be null')
        return value


class RecruitmentStep(Model):
    number: NonEmpty
    title: NonEmpty
    description: NonEmpty


class FieldCopy(Model):
    label: NonEmpty
    placeholder: NonEmpty
    hint: Text | None = None

    @field_validator('hint', mode='before')
    @classmethod
    def reject_null_hint(cls, value):
        if value is None:
            raise ValueError('hint may be omitted but cannot be null')
        return value



class Banner(Model):
    eyebrow: NonEmpty
    headline: NonEmpty


class ClosedCopy(Model):
    eyebrow: NonEmpty
    side_title: NonEmpty
    heading: NonEmpty
    description: NonEmpty
    cta_label: NonEmpty
    cta_href: NonEmpty


class PersonalFields(Model):
    first_name: FieldCopy
    last_name: FieldCopy
    nickname: FieldCopy
    student_id: FieldCopy
    email: FieldCopy
    phone: FieldCopy
    program: FieldCopy
    year: FieldCopy


class PersonalSection(Model):
    tag: NonEmpty
    title: NonEmpty
    fields: PersonalFields


class RoleSection(Model):
    tag: NonEmpty
    title: NonEmpty
    projects_team_label: NonEmpty
    marketing_team_label: NonEmpty
    other_placeholder: NonEmpty


class CvCopy(Model):
    label: NonEmpty
    empty_label: NonEmpty
    button_label: NonEmpty
    accept_label: NonEmpty


class MotivationFields(Model):
    expectation: FieldCopy
    contribution: FieldCopy
    project_idea: FieldCopy
    team_experience: FieldCopy
    cv: CvCopy
    portfolio_url: FieldCopy


class MotivationSection(Model):
    tag: NonEmpty
    title: NonEmpty
    fields: MotivationFields


class RecruitmentSections(Model):
    personal: PersonalSection
    role: RoleSection
    motivation: MotivationSection


class OpenedCopy(Model):
    back_link_label: NonEmpty
    sidebar_headline: NonEmpty
    sidebar_description: NonEmpty
    steps: list[RecruitmentStep] = Field(min_length=3, max_length=3)
    form_title: NonEmpty
    form_subtitle: NonEmpty
    sections: RecruitmentSections


class Agreements(Model):
    requirements_label: NonEmpty
    requirements_description: NonEmpty
    pdpa_label: NonEmpty
    pdpa_description: NonEmpty


class SuccessCopy(Model):
    title: NonEmpty
    description: NonEmpty


class RecruitmentContent(Model):
    is_open: StrictBool
    banner: Banner
    closed_copy: ClosedCopy
    opened_copy: OpenedCopy
    projects_team_roles: list[RecruitmentRole] = Field(min_length=1)
    marketing_team_roles: list[RecruitmentRole] = Field(min_length=1)
    programs: list[NonEmpty] = Field(min_length=1)
    years: list[NonEmpty] = Field(min_length=1)
    agreements: Agreements
    submit_label: NonEmpty
    success_copy: SuccessCopy


class LegalSection(Model):
    heading: NonEmpty
    paragraphs: list[NonEmpty]
    bullets: list[NonEmpty] | None = None

    @field_validator('bullets', mode='before')
    @classmethod
    def reject_null_bullets(cls, value):
        if value is None:
            raise ValueError('bullets may be omitted but cannot be null')
        return value


class LegalDocument(Model):
    title: NonEmpty
    subtitle: NonEmpty
    last_updated: NonEmpty
    sections: list[LegalSection] = Field(min_length=1)


class TranslatedDocument(Model):
    en: LegalDocument
    th: LegalDocument


class Credit(Model):
    name: NonEmpty
    affiliation: NonEmpty
    role: NonEmpty


class Acknowledgement(TranslatedDocument):
    credits: list[Credit] = Field(min_length=1)


class LegalContent(Model):
    back_to_home_label: NonEmpty
    privacy_policy: TranslatedDocument
    terms_of_use: TranslatedDocument
    acknowledgement: Acknowledgement


CONTENT_MODELS = {
    'site': SiteContent,
    'home': HomeContent,
    'recruitment': RecruitmentContent,
    'legal': LegalContent,
}
