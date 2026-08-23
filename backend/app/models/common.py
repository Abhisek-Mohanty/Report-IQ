import datetime

from pydantic import BaseModel, validator


class DateTimeModelMixin(BaseModel):
    createdAt: datetime.datetime = None  # type: ignore
    updatedAt: datetime.datetime = None  # type: ignore

    @validator("createdAt", "updatedAt", pre=True)
    def default_datetime(
        cls, value: datetime.datetime  # noqa: N805, WPS110
    ) -> datetime.datetime:
        return value or datetime.datetime.now()


class IDModelMixin(BaseModel):
    id: int = 0
