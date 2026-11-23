import json
from datetime import datetime, timezone
from typing import Annotated, TypeVar
from uuid import uuid4

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, StringConstraints, ValidationError
from pydantic.alias_generators import to_camel

NonEmpty = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20000)]
T = TypeVar("T", bound=BaseModel)


class Model(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex}"


def parse_payload(model: type[T], value: dict | str) -> T:
    try:
        return model.model_validate_json(value) if isinstance(value, str) else model.model_validate(value)
    except ValidationError as error:
        raise HTTPException(422, detail=json.loads(error.json(include_context=False, include_input=False))) from error
