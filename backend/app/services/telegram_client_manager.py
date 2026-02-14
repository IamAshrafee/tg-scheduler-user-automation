import os
import time
import asyncio
from typing import Optional, Dict, Any
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import (
    SessionPasswordNeededError,
    PhoneCodeInvalidError,
    PhoneCodeExpiredError,
    FloodWaitError,
    AuthKeyUnregisteredError,
)
from cryptography.fernet import Fernet

from app.config import get_settings

settings = get_settings()

# Directory to store encrypted session files
SESSIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "sessions")
os.makedirs(SESSIONS_DIR, exist_ok=True)


class TelegramClientManager:
    """
    Manages multiple Telethon clients — one per connected Telegram account.
    Handles session encryption, the 2-step login flow, and client lifecycle.
    """

    def __init__(self):
        self._fernet = Fernet(settings.ENCRYPTION_KEY.encode())
        self._active_clients: Dict[str, TelegramClient] = {}  # account_id -> client
        self._login_cache: Dict[str, Dict[str, Any]] = {}  # phone -> {client, phone_code_hash, timestamp}
        self._LOGIN_CACHE_TTL = 300  # 5 minutes

    # ─── Session encryption helpers ───

    def _encrypt_session(self, session_string: str) -> bytes:
        return self._fernet.encrypt(session_string.encode("utf-8"))

    def _decrypt_session(self, encrypted: bytes) -> str:
        return self._fernet.decrypt(encrypted).decode("utf-8")

    def _session_path(self, account_id: str) -> str:
        return os.path.join(SESSIONS_DIR, f"{account_id}.session.enc")

    def save_session(self, account_id: str, session_string: str):
        encrypted = self._encrypt_session(session_string)
        path = self._session_path(account_id)
        with open(path, "wb") as f:
            f.write(encrypted)

    def load_session(self, account_id: str) -> Optional[str]:
        path = self._session_path(account_id)
        if not os.path.exists(path):
            return None
        with open(path, "rb") as f:
            encrypted = f.read()
        return self._decrypt_session(encrypted)

    def delete_session_file(self, account_id: str):
        path = self._session_path(account_id)
        if os.path.exists(path):
            os.remove(path)

    # ─── Login flow ───

    def _cleanup_expired_cache(self):
        now = time.time()
        expired = [
            phone for phone, data in self._login_cache.items()
            if now - data["timestamp"] > self._LOGIN_CACHE_TTL
        ]
        for phone in expired:
            entry = self._login_cache.pop(phone, None)
            if entry and entry.get("client"):
                try:
                    asyncio.create_task(entry["client"].disconnect())
                except Exception:
                    pass

    async def send_code(self, phone_number: str) -> dict:
        """
        Step 1: Create a temporary client and send the login code.
        Returns info about the sent code.
        """
        self._cleanup_expired_cache()

        # If there's already a pending login for this phone, disconnect old client
        if phone_number in self._login_cache:
            old = self._login_cache.pop(phone_number)
            if old.get("client"):
                try:
                    await old["client"].disconnect()
                except Exception:
                    pass

        client = TelegramClient(
            StringSession(),
            settings.TELEGRAM_API_ID,
            settings.TELEGRAM_API_HASH,
        )
        await client.connect()

        try:
            sent_code = await client.send_code_request(phone_number)
        except FloodWaitError as e:
            await client.disconnect()
            raise Exception(f"Telegram rate limit. Please wait {e.seconds} seconds before trying again.")

        self._login_cache[phone_number] = {
            "client": client,
            "phone_code_hash": sent_code.phone_code_hash,
            "timestamp": time.time(),
        }

        return {
            "phone_number": phone_number,
            "phone_code_hash": sent_code.phone_code_hash,
            "message": "Login code sent to your Telegram app.",
        }

    async def verify_code(
        self, phone_number: str, code: str, password: Optional[str] = None
    ) -> dict:
        """
        Step 2: Verify the login code (and 2FA password if needed).
        Returns user info and the session string.
        """
        self._cleanup_expired_cache()

        cache_entry = self._login_cache.get(phone_number)
        if not cache_entry:
            raise Exception("Login session expired or not found. Please request a new code.")

        client: TelegramClient = cache_entry["client"]
        phone_code_hash = cache_entry["phone_code_hash"]

        try:
            await client.sign_in(
                phone=phone_number,
                code=code,
                phone_code_hash=phone_code_hash,
            )
        except SessionPasswordNeededError:
            # 2FA is enabled
            if not password:
                raise Exception("Two-factor authentication is enabled. Please provide your 2FA password.")
            try:
                await client.sign_in(password=password)
            except Exception as e:
                raise Exception(f"Invalid 2FA password: {str(e)}")
        except PhoneCodeInvalidError:
            raise Exception("Invalid verification code. Please try again.")
        except PhoneCodeExpiredError:
            self._login_cache.pop(phone_number, None)
            await client.disconnect()
            raise Exception("Verification code has expired. Please request a new code.")

        # Get user info
        me = await client.get_me()
        session_string = client.session.save()

        # Clean up login cache (but keep client alive — we'll store it in active pool)
        self._login_cache.pop(phone_number, None)

        return {
            "telegram_user_id": me.id,
            "first_name": me.first_name or "",
            "username": me.username or "",
            "session_string": session_string,
            "client": client,
        }

    # ─── Active client pool ───

    async def get_client(self, account_id: str) -> Optional[TelegramClient]:
        """Get or create an active client for a connected account."""
        if account_id in self._active_clients:
            client = self._active_clients[account_id]
            if client.is_connected():
                return client
            # Try to reconnect
            try:
                await client.connect()
                return client
            except Exception:
                del self._active_clients[account_id]

        # Load session from disk and create new client
        session_string = self.load_session(account_id)
        if not session_string:
            return None

        client = TelegramClient(
            StringSession(session_string),
            settings.TELEGRAM_API_ID,
            settings.TELEGRAM_API_HASH,
        )
        try:
            await client.connect()
            if not await client.is_user_authorized():
                return None
        except AuthKeyUnregisteredError:
            return None
        except Exception:
            return None

        self._active_clients[account_id] = client
        return client

    def store_client(self, account_id: str, client: TelegramClient):
        """Store an already-connected client in the active pool."""
        self._active_clients[account_id] = client

    async def disconnect_client(self, account_id: str):
        """Disconnect and remove a client from the pool."""
        client = self._active_clients.pop(account_id, None)
        if client:
            try:
                await client.disconnect()
            except Exception:
                pass

    async def disconnect_all(self):
        """Disconnect all active clients (for shutdown)."""
        for account_id in list(self._active_clients.keys()):
            await self.disconnect_client(account_id)

        # Also clean up any pending login sessions
        for phone, entry in list(self._login_cache.items()):
            if entry.get("client"):
                try:
                    await entry["client"].disconnect()
                except Exception:
                    pass
        self._login_cache.clear()

    # ─── Telegram data fetching ───

    async def get_groups(self, account_id: str) -> list:
        """Fetch the user's joined groups and channels."""
        client = await self.get_client(account_id)
        if not client:
            raise Exception("Telegram account is not connected.")

        from telethon.tl.types import Channel, Chat

        dialogs = await client.get_dialogs()
        groups = []
        for dialog in dialogs:
            entity = dialog.entity
            if isinstance(entity, (Channel, Chat)):
                groups.append({
                    "id": entity.id,
                    "title": dialog.title or "",
                    "type": "channel" if isinstance(entity, Channel) and entity.broadcast else "group",
                    "username": getattr(entity, "username", None),
                    "members_count": getattr(entity, "participants_count", None),
                    "access_hash": getattr(entity, "access_hash", None),
                })
        return groups

    async def get_sticker_sets(self, account_id: str) -> list:
        """Fetch the user's saved sticker sets."""
        client = await self.get_client(account_id)
        if not client:
            raise Exception("Telegram account is not connected.")

        from telethon.tl.functions.messages import GetAllStickersRequest

        result = await client(GetAllStickersRequest(hash=0))
        sticker_sets = []
        for s in result.sets:
            sticker_sets.append({
                "id": s.id,
                "access_hash": s.access_hash,
                "title": s.title,
                "short_name": s.short_name,
                "count": s.count,
            })
        return sticker_sets

    async def get_stickers_in_set(self, account_id: str, set_short_name: str) -> list:
        """Fetch individual stickers from a sticker set, including thumbnails."""
        client = await self.get_client(account_id)
        if not client:
            raise Exception("Telegram account is not connected.")

        import base64
        from telethon.tl.functions.messages import GetStickerSetRequest
        from telethon.tl.types import InputStickerSetShortName

        result = await client(
            GetStickerSetRequest(
                stickerset=InputStickerSetShortName(short_name=set_short_name),
                hash=0,
            )
        )
        stickers = []
        for doc in result.documents:
            emoji = next(
                (
                    pack.emoticon
                    for pack in result.packs
                    if doc.id in pack.documents
                ),
                "",
            )

            # Try to download sticker thumbnail as base64
            thumbnail = None
            try:
                thumb_bytes = await client.download_media(doc, file=bytes, thumb=-1)
                if thumb_bytes:
                    b64 = base64.b64encode(thumb_bytes).decode("ascii")
                    thumbnail = f"data:image/webp;base64,{b64}"
            except Exception:
                pass

            stickers.append({
                "id": str(doc.id),
                "access_hash": str(doc.access_hash),
                "emoji": emoji,
                "file_reference": doc.file_reference.hex() if doc.file_reference else None,
                "thumbnail": thumbnail,
            })
        return stickers


# Singleton instance
telegram_client_manager = TelegramClientManager()
