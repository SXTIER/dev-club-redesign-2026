"""Validated inputs for private correspondence and recruitment."""
import re
from typing import Annotated, Literal

from pydantic import Field, StrictBool, StringConstraints, field_validator

from .common import Model, NonEmpty


class EmailModel(Model):
    @field_validator("sender_email", "email", check_fields=False)
    @classmethod
    def valid_email(cls, value: str) -> str:
        if len(value) > 254 or not re.fullmatch(r"[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+", value):
            raise ValueError("Valid email address is required")
        return value


class InquiryCreate(EmailModel):
    question: NonEmpty
    sender_email: NonEmpty
    category: NonEmpty
    consent: StrictBool

    @field_validator("consent")
    @classmethod
    def consent_required(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Consent is required")
        return value


class ReplyInput(Model):
    body: NonEmpty
    mark_answered: StrictBool = True


class TagsInput(Model):
    tags: list[NonEmpty]


class FaqCreate(Model):
    question: NonEmpty
    answer: NonEmpty
    category: NonEmpty
    tags: list[NonEmpty] = Field(default_factory=list)
    promoted_to_home: StrictBool = False


class FaqUpdate(Model):
    question: NonEmpty | None = None
    answer: NonEmpty | None = None
    category: NonEmpty | None = None
    tags: list[NonEmpty] | None = None
    promoted_to_home: StrictBool | None = None

    @field_validator("question", "answer", "category", "tags", "promoted_to_home")
    @classmethod
    def reject_null(cls, value):
        if value is None:
            raise ValueError("Field cannot be null")
        return value


class Personal(EmailModel):
    first_name: NonEmpty
    last_name: NonEmpty
    nickname: NonEmpty
    student_id: Annotated[str, StringConstraints(pattern=r"^[0-9]{7}$")]
    email: NonEmpty
    phone: Annotated[str, StringConstraints(pattern=r"^0[0-9]{9}$")]
    program: NonEmpty
    year: NonEmpty


class Motivation(Model):
    expectation: NonEmpty
    contribution: NonEmpty
    project_idea: NonEmpty
    team_experience: NonEmpty


class ApplicationCreate(Model):
    personal: Personal
    team: Literal["projects", "marketing"]
    role_id: NonEmpty
    role_label: NonEmpty
    custom_role: NonEmpty | None = None
    motivation: Motivation
    portfolio_url: str | None = None
    agreed_requirements: StrictBool
    agreed_pdpa: StrictBool

    @field_validator("agreed_requirements", "agreed_pdpa")
    @classmethod
    def agreement_required(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Agreement is required")
        return value


class ApplicationStatus(Model):
    status: Literal["Pending", "Accepted", "Rejected"]
