from typing import Literal

from pydantic import BaseModel, Field


class GroupIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    plat: Literal["whatsapp", "telegram", "discord"]
    link: str = Field(min_length=1, max_length=500)
    members: int = Field(default=0, ge=0)
    desc: str = Field(default="", max_length=200)


class Group(GroupIn):
    id: str
    photo: str = ""


class LoginRequest(BaseModel):
    password: str
