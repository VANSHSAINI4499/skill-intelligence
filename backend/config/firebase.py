"""Firebase Admin SDK initialisation."""

import firebase_admin
from firebase_admin import credentials, firestore

from config.settings import settings

_cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
firebase_admin.initialize_app(_cred)

db: firestore.Client = firestore.client()
