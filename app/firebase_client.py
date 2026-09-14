import json
import os

import firebase_admin
from firebase_admin import credentials, firestore

_cred_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")
_cred_path = os.environ.get("FIREBASE_CREDENTIALS", "serviceAccountKey.json")

if not firebase_admin._apps:
    cred = (
        credentials.Certificate(json.loads(_cred_json))
        if _cred_json
        else credentials.Certificate(_cred_path)
    )
    firebase_admin.initialize_app(cred)

db = firestore.client()
groups_collection = db.collection("groups")
