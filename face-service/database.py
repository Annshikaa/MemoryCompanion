"""
Supabase client — service role key only.

IMPORTANT: This module must NEVER be imported by client-side code.
The service role key bypasses all RLS policies; every query here
must therefore enforce family_id scoping manually.
"""

import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger(__name__)

_SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not _SUPABASE_URL or not _SERVICE_ROLE_KEY:
    log.warning(
        "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. "
        "Database operations will fail."
    )

# Single module-level client (connection-pooled by the supabase-py library)
db: Client = create_client(_SUPABASE_URL, _SERVICE_ROLE_KEY)
