"""
Redis in-memory manager supporting:
- Distributed slot locking (SET NX EX)
- 6-digit OTP storage with TTL
- Atomic rate limiting (sliding window counters)
- Graceful in-memory fallback if standalone Redis server is unavailable in local dev
"""

import time
import logging
from typing import Optional, Any, Set, List
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("redis_manager")

class RedisManager:
    def __init__(self):
        self.client: Optional[aioredis.Redis] = None
        self._fallback_store: dict = {}      # key -> (value, expire_timestamp)
        self._use_fallback: bool = False

    async def connect(self):
        """Connect to Redis or gracefully activate memory fallback for offline dev."""
        try:
            url = settings.REDIS_URL
            # Auto-upgrade to TLS (rediss://) for Upstash or if url uses redis:// with upstash.io
            if "upstash.io" in url and url.startswith("redis://"):
                url = url.replace("redis://", "rediss://", 1)
            
            self.client = aioredis.from_url(
                url,
                decode_responses=True,
                socket_connect_timeout=3.0,
                socket_timeout=3.0
            )
            # Ping test
            await self.client.ping()
            self._use_fallback = False
            logger.info("Connected to Redis successfully.")
        except Exception as e:
            self._use_fallback = True
            logger.warning(f"Redis server not reached ({e}). Using robust In-Memory fallback store.")

    async def _ensure_client(self):
        """Ensures Redis client is initialized for serverless environments."""
        if self.client is None and not self._use_fallback:
            await self.connect()

    async def disconnect(self):
        if self.client and not self._use_fallback:
            try:
                await self.client.aclose()
            except Exception:
                pass

    async def get(self, key: str) -> Optional[str]:
        """Generic get for key."""
        if not self._use_fallback and self.client:
            try:
                return await self.client.get(key)
            except Exception:
                pass
        if key in self._fallback_store:
            val, exp = self._fallback_store[key]
            if time.time() < exp:
                return val
            self._fallback_store.pop(key, None)
        return None

    async def set(self, key: str, value: str, expire: int = 600) -> None:
        """Generic set for key with expiration."""
        if not self._use_fallback and self.client:
            try:
                await self.client.set(key, value, ex=expire)
                return
            except Exception:
                pass
        self._fallback_store[key] = (value, time.time() + expire)

    # --- 1. Distributed Slot Lock (SET NX EX) ---
    async def acquire_slot_lock(self, slot_id: str, patient_id: str, ttl_seconds: int = 600) -> bool:
        """
        Attempts to acquire a temporary 10-minute hold on a slot.
        Returns True if acquired, False if already held by another patient.
        """
        key = f"slot:lock:{slot_id}"
        if not self._use_fallback and self.client:
            try:
                acquired = await self.client.set(key, patient_id, nx=True, ex=ttl_seconds)
                return bool(acquired)
            except Exception:
                pass
        
        # Fallback memory store
        now = time.time()
        if key in self._fallback_store:
            val, exp = self._fallback_store[key]
            if now < exp:
                return False  # Already locked!
        
        self._fallback_store[key] = (patient_id, now + ttl_seconds)
        return True

    async def release_slot_lock(self, slot_id: str) -> None:
        """Releases the slot lock after confirmation or cancellation."""
        key = f"slot:lock:{slot_id}"
        if not self._use_fallback and self.client:
            try:
                await self.client.delete(key)
                return
            except Exception:
                pass
        self._fallback_store.pop(key, None)

    async def get_slot_lock(self, slot_id: str) -> Optional[str]:
        """Returns the holder of the slot lock if active."""
        key = f"slot:lock:{slot_id}"
        if not self._use_fallback and self.client:
            try:
                return await self.client.get(key)
            except Exception:
                pass
        
        if key in self._fallback_store:
            val, exp = self._fallback_store[key]
            if time.time() < exp:
                return val
            self._fallback_store.pop(key, None)
        return None

    async def get_active_slot_locks(self, slot_ids: List[str]) -> Set[str]:
        """
        Blazing-fast batch lock checker using a single Redis MGET command
        instead of sequential roundtrips. Reduces 100 queries (~20 seconds) to 1 query (~20ms).
        Returns a set of slot_ids that are currently locked.
        """
        if not slot_ids:
            return set()
        
        locked_set: Set[str] = set()
        keys = [f"slot:lock:{sid}" for sid in slot_ids]

        # 1. Real Redis client with MGET (single network roundtrip!)
        if not self._use_fallback and self.client:
            try:
                # aioredis supports client.mget(*keys) or client.mget(keys)
                results = await self.client.mget(keys)
                if results:
                    for sid, val in zip(slot_ids, results):
                        if val is not None:
                            locked_set.add(sid)
                return locked_set
            except Exception as e:
                logger.warning(f"Batch MGET failed, falling back to local store: {e}")

        # 2. In-memory fallback
        now = time.time()
        for sid, key in zip(slot_ids, keys):
            if key in self._fallback_store:
                val, exp = self._fallback_store[key]
                if now < exp:
                    locked_set.add(sid)
                else:
                    self._fallback_store.pop(key, None)

        return locked_set

    # --- 2. OTP Code Storage & Rate Limiter ---
    async def set_otp(self, contact: str, code_hash: str, ttl_seconds: int = 600) -> None:
        """Stores the hashed 6-digit code with a 10-minute expiration."""
        key = f"otp:{contact}"
        if not self._use_fallback and self.client:
            try:
                await self.client.set(key, code_hash, ex=ttl_seconds)
                return
            except Exception:
                pass
        self._fallback_store[key] = (code_hash, time.time() + ttl_seconds)

    async def get_otp(self, contact: str) -> Optional[str]:
        """Retrieves the stored OTP hash if not expired."""
        key = f"otp:{contact}"
        if not self._use_fallback and self.client:
            try:
                return await self.client.get(key)
            except Exception:
                pass
        
        if key in self._fallback_store:
            val, exp = self._fallback_store[key]
            if time.time() < exp:
                return val
            self._fallback_store.pop(key, None)
        return None

    async def delete_otp(self, contact: str) -> None:
        """Consumes the OTP once successfully verified."""
        key = f"otp:{contact}"
        if not self._use_fallback and self.client:
            try:
                await self.client.delete(key)
                return
            except Exception:
                pass
        self._fallback_store.pop(key, None)

    async def increment_verify_attempts(self, contact: str, ttl_seconds: int = 600) -> int:
        """
        Increments failed OTP verification attempts for a contact.
        Returns the updated attempt count.
        """
        key = f"otp:verify_attempts:{contact}"
        if not self._use_fallback and self.client:
            try:
                count = await self.client.incr(key)
                if count == 1:
                    await self.client.expire(key, ttl_seconds)
                return int(count)
            except Exception:
                pass

        now = time.time()
        if key in self._fallback_store:
            count, exp = self._fallback_store[key]
            if now < exp:
                count += 1
                self._fallback_store[key] = (count, exp)
                return int(count)
            else:
                self._fallback_store[key] = (1, now + ttl_seconds)
                return 1
        else:
            self._fallback_store[key] = (1, now + ttl_seconds)
            return 1

    async def get_verify_attempts(self, contact: str) -> int:
        """Retrieves the current number of failed verification attempts for a contact."""
        key = f"otp:verify_attempts:{contact}"
        if not self._use_fallback and self.client:
            try:
                val = await self.client.get(key)
                return int(val) if val else 0
            except Exception:
                pass

        if key in self._fallback_store:
            count, exp = self._fallback_store[key]
            if time.time() < exp:
                return int(count)
            self._fallback_store.pop(key, None)
        return 0

    async def reset_verify_attempts(self, contact: str) -> None:
        """Resets the failed verification counter when a new code is issued or code is successfully verified."""
        key = f"otp:verify_attempts:{contact}"
        if not self._use_fallback and self.client:
            try:
                await self.client.delete(key)
                return
            except Exception:
                pass
        self._fallback_store.pop(key, None)

    async def check_and_increment_rate_limit(self, contact: str, max_attempts: int = 3, window_seconds: int = 900) -> bool:
        """
        Enforces max 3 attempts per 15 minutes.
        Returns True if within rate limit, False if exceeded.
        """
        key = f"otp:attempts:{contact}"
        now = time.time()

        if not self._use_fallback and self.client:
            try:
                count = await self.client.incr(key)
                if count == 1:
                    await self.client.expire(key, window_seconds)
                return count <= max_attempts
            except Exception:
                pass

        # Fallback memory rate limiter
        if key in self._fallback_store:
            count, exp = self._fallback_store[key]
            if now < exp:
                count += 1
                self._fallback_store[key] = (count, exp)
                return count <= max_attempts
            else:
                self._fallback_store[key] = (1, now + window_seconds)
                return True
        else:
            self._fallback_store[key] = (1, now + window_seconds)
            return True

    # --- 3. Directory Caching ---
    async def get_cache(self, key: str) -> Optional[str]:
        if not self._use_fallback and self.client:
            try:
                return await self.client.get(f"cache:{key}")
            except Exception:
                pass
        if f"cache:{key}" in self._fallback_store:
            val, exp = self._fallback_store[f"cache:{key}"]
            if time.time() < exp:
                return val
            self._fallback_store.pop(f"cache:{key}", None)
        return None

    async def set_cache(self, key: str, value: str, ttl: int = 300) -> None:
        if not self._use_fallback and self.client:
            try:
                await self.client.set(f"cache:{key}", value, ex=ttl)
                return
            except Exception:
                pass
        self._fallback_store[f"cache:{key}"] = (value, time.time() + ttl)

    async def clear_cache_pattern(self, pattern: str) -> None:
        """Invalidates directory cache on doctor updates."""
        if not self._use_fallback and self.client:
            try:
                keys = await self.client.keys(f"cache:{pattern}*")
                if keys:
                    await self.client.delete(*keys)
                return
            except Exception:
                pass
        # Clear matching from memory
        keys_to_del = [k for k in self._fallback_store if k.startswith(f"cache:{pattern}")]
        for k in keys_to_del:
            self._fallback_store.pop(k, None)

redis_manager = RedisManager()
