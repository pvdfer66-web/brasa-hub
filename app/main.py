from dotenv import load_dotenv

load_dotenv()

import base64
import io

from fastapi import Depends, FastAPI, File, Form, HTTPException, Response, UploadFile, status
from fastapi.staticfiles import StaticFiles
from firebase_admin import firestore
from PIL import Image, UnidentifiedImageError

from app.auth import (
    SESSION_COOKIE,
    SESSION_MAX_AGE,
    create_session_token,
    get_current_admin,
    verify_password,
)
from app.firebase_client import groups_collection
from app.schemas import Group, GroupIn, LoginRequest

app = FastAPI(title="Brasa — Hub de Grupos")

PHOTO_MAX_SIZE = (480, 480)


def _encode_photo(photo: UploadFile) -> str:
    try:
        img = Image.open(photo.file)
        img.load()
    except UnidentifiedImageError:
        raise HTTPException(status_code=422, detail="Arquivo de imagem inválido")
    img = img.convert("RGB")
    img.thumbnail(PHOTO_MAX_SIZE)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=75)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


# ---------- auth ----------

@app.post("/api/login")
def login(payload: LoginRequest, response: Response):
    if not verify_password(payload.password):
        raise HTTPException(status_code=401, detail="Senha incorreta")
    token = create_session_token()
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
    )
    return {"ok": True}


@app.post("/api/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE)
    return {"ok": True}


@app.get("/api/me")
def me(_: None = Depends(get_current_admin)):
    return {"authenticated": True}


# ---------- groups ----------

@app.get("/api/groups", response_model=list[Group])
def list_groups():
    docs = groups_collection.order_by("created_at", direction="DESCENDING").stream()
    return [
        Group(
            id=doc.id,
            name=data.get("name", ""),
            plat=data.get("plat", "whatsapp"),
            link=data.get("link", ""),
            members=data.get("members", 0),
            desc=data.get("desc", ""),
            photo=data.get("photo", ""),
        )
        for doc in docs
        for data in [doc.to_dict()]
    ]


@app.get("/api/groups/{group_id}", response_model=Group)
def get_group(group_id: str):
    doc = groups_collection.document(group_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    data = doc.to_dict()
    return Group(
        id=doc.id,
        name=data.get("name", ""),
        plat=data.get("plat", "whatsapp"),
        link=data.get("link", ""),
        members=data.get("members", 0),
        desc=data.get("desc", ""),
        photo=data.get("photo", ""),
    )


@app.post("/api/groups", response_model=Group, status_code=status.HTTP_201_CREATED)
def create_group(
    name: str = Form(...),
    plat: str = Form(...),
    link: str = Form(...),
    members: int = Form(0),
    desc: str = Form(""),
    photo: UploadFile | None = File(None),
    _: None = Depends(get_current_admin),
):
    payload = GroupIn(name=name, plat=plat, link=link, members=members, desc=desc)
    doc_ref = groups_collection.document()

    photo_url = ""
    if photo is not None and photo.filename:
        photo_url = _encode_photo(photo)

    doc_ref.set(
        {
            "name": payload.name.strip(),
            "plat": payload.plat,
            "link": payload.link.strip(),
            "members": payload.members,
            "desc": payload.desc.strip(),
            "photo": photo_url,
            "created_at": firestore.SERVER_TIMESTAMP,
        }
    )
    return Group(id=doc_ref.id, photo=photo_url, **payload.model_dump())


@app.delete("/api/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(group_id: str, _: None = Depends(get_current_admin)):
    doc_ref = groups_collection.document(group_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    doc_ref.delete()


# ---------- static frontend (deve ser montado por último) ----------

app.mount("/", StaticFiles(directory="static", html=True), name="static")
