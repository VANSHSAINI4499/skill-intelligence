"""Firebase Admin SDK initialisation.

Credential resolution order:
1. FIREBASE_SERVICE_ACCOUNT_JSON env var  — Vercel / any read-only host
   Set this to the *full* service-account JSON as a single-line string.
2. FIREBASE_SERVICE_ACCOUNT_PATH          — local development fallback
   Points to serviceAccountKey.json on disk (gitignored).
"""

import json

import firebase_admin
from firebase_admin import credentials, firestore

from config.settings import settings

if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
    _cred = credentials.Certificate(json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON))
else:
    _cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)

firebase_admin.initialize_app(_cred)

db: firestore.Client = firestore.client()
