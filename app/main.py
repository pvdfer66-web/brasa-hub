from dotenv import load_dotenv

load_dotenv()

import base64
import io
import json
from datetime import date
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile, status
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
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

app = FastAPI(title="Gruposzap18 — Hub de Grupos")

templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))

PHOTO_MAX_SIZE = (480, 480)

PLAT_ICON = {
    "whatsapp": '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.4 2 11.8c0 1.9.5 3.6 1.5 5.2L2 22l5.2-1.4c1.5.8 3.1 1.2 4.8 1.2 5.5 0 10-4.4 10-9.8C22 6.4 17.5 2 12 2zm0 17.8c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3c-.9-1.4-1.3-3-1.3-4.7 0-4.4 3.7-8 8.3-8s8.3 3.6 8.3 8-3.6 7.6-8.1 7.6zm4.6-5.8c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.3-.5-.5-1-1.1-1.4-1.7-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1s1 2.5 1.1 2.6c.1.2 2 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
    "telegram": '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 3.5L2.8 10.9c-1.1.4-1.1 1.1-.2 1.4l4.8 1.5 1.9 5.7c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.1-2 4.4 3.2c.8.5 1.4.2 1.6-.7l3-14c.3-1.1-.4-1.6-1.7-1z"/></svg>',
    "discord": '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 5.6c-1.3-.6-2.6-1-4-1.3l-.2.4c1.3.3 2.5.8 3.7 1.5-2.6-1.2-5.6-1.2-8.2-1.5-1.3.3-2.5.8-3.7 1.5 1.2-.7 2.4-1.2 3.7-1.5l-.2-.4c-1.4.3-2.7.7-4 1.3C3.1 8.9 2.4 12.1 2.7 15.3c1.6 1.2 3.2 1.9 4.7 2.4l.6-1c-.8-.3-1.6-.7-2.3-1.2.2.1.4.3.6.4 3.1 1.4 6.6 1.4 9.7 0 .2-.1.4-.2.6-.4-.7.5-1.5.9-2.3 1.2l.6 1c1.5-.5 3.1-1.2 4.7-2.4.4-3.6-.6-6.7-2.1-9.7zM9.1 13.6c-.7 0-1.3-.7-1.3-1.5s.6-1.5 1.3-1.5 1.3.7 1.3 1.5-.6 1.5-1.3 1.5zm5.8 0c-.7 0-1.3-.7-1.3-1.5s.6-1.5 1.3-1.5 1.3.7 1.3 1.5-.6 1.5-1.3 1.5z"/></svg>',
}
PLAT_LABEL = {"whatsapp": "WhatsApp", "telegram": "Telegram", "discord": "Discord"}
SITE_URL = "https://gruposzap18.com.br"


def _doc_to_group(doc) -> Group:
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


def _fetch_groups() -> list[Group]:
    docs = groups_collection.order_by("created_at", direction="DESCENDING").stream()
    return [_doc_to_group(doc) for doc in docs]


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
    return _fetch_groups()


@app.get("/api/groups/{group_id}", response_model=Group)
def get_group(group_id: str):
    doc = groups_collection.document(group_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    return _doc_to_group(doc)


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


@app.put("/api/groups/{group_id}", response_model=Group)
def update_group(
    group_id: str,
    name: str = Form(...),
    plat: str = Form(...),
    link: str = Form(...),
    members: int = Form(0),
    desc: str = Form(""),
    photo: UploadFile | None = File(None),
    _: None = Depends(get_current_admin),
):
    doc_ref = groups_collection.document(group_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")

    payload = GroupIn(name=name, plat=plat, link=link, members=members, desc=desc)
    photo_url = doc.to_dict().get("photo", "")
    if photo is not None and photo.filename:
        photo_url = _encode_photo(photo)

    doc_ref.update(
        {
            "name": payload.name.strip(),
            "plat": payload.plat,
            "link": payload.link.strip(),
            "members": payload.members,
            "desc": payload.desc.strip(),
            "photo": photo_url,
        }
    )
    return Group(id=group_id, photo=photo_url, **payload.model_dump())


@app.delete("/api/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(group_id: str, _: None = Depends(get_current_admin)):
    doc_ref = groups_collection.document(group_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    doc_ref.delete()


# ---------- server-rendered pages ----------

def _fmt_int(n: int) -> str:
    return f"{n:,}".replace(",", ".")


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    groups = _fetch_groups()
    total_members = sum(g.members for g in groups)
    eyebrow_text = (
        f"{len(groups)} grupo{'s' if len(groups) != 1 else ''} ativo{'s' if len(groups) != 1 else ''} agora"
        if groups
        else "grupos chegando em breve"
    )
    meta_description = (
        "Encontre grupos de WhatsApp, Telegram e Discord sobre os mais diversos assuntos. "
        "Busque, encontre e entre — sem cadastro e sem enrolação."
    )
    return templates.TemplateResponse(
        request,
        "index.html",
        {
            "groups": groups,
            "total_members": _fmt_int(total_members),
            "eyebrow_text": eyebrow_text,
            "meta_description": meta_description,
            "site_url": SITE_URL,
            "plat_icon": PLAT_ICON,
            "plat_label": PLAT_LABEL,
            "groups_json": json.dumps([g.model_dump() for g in groups]),
        },
    )


@app.get("/grupo.html", response_class=HTMLResponse)
def group_page(request: Request, id: str | None = None):
    group = None
    if id:
        doc = groups_collection.document(id).get()
        if doc.exists:
            group = _doc_to_group(doc)

    meta_description = group.desc if group and group.desc else "Grupo não encontrado — Gruposzap18."
    return templates.TemplateResponse(
        request,
        "grupo.html",
        {
            "group": group,
            "meta_description": meta_description,
            "site_url": SITE_URL,
            "plat_icon": PLAT_ICON,
            "plat_label": PLAT_LABEL,
        },
        status_code=200 if group else 404,
    )


@app.get("/robots.txt", response_class=PlainTextResponse)
def robots():
    return "User-agent: *\nAllow: /\n\nSitemap: " + SITE_URL + "/sitemap.xml\n"


# ---------- sitemap ----------


@app.get("/sitemap.xml")
def sitemap():
    today = date.today().isoformat()
    urls = [(SITE_URL + "/", "daily", "1.0")]
    for doc in groups_collection.stream():
        urls.append((f"{SITE_URL}/grupo.html?id={doc.id}", "weekly", "0.7"))

    entries = "".join(
        f"<url><loc>{loc}</loc><lastmod>{today}</lastmod>"
        f"<changefreq>{freq}</changefreq><priority>{prio}</priority></url>"
        for loc, freq, prio in urls
    )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{entries}</urlset>"
    )
    return Response(content=xml, media_type="application/xml")


# ---------- static frontend (deve ser montado por último) ----------

app.mount("/", StaticFiles(directory="static", html=True), name="static")
