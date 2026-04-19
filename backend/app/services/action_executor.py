import os
import asyncio
import random
from datetime import datetime
from typing import Optional

from app.models.task import Task
from app.services.telegram_client_manager import telegram_client_manager
from app.services.activity_log_service import activity_log_service
from app.services.task_service import task_service


UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


async def execute_task(task: Task, dry_run: bool = False, schedule_time: Optional[datetime] = None) -> dict:
    """
    Execute a task action via Telegram.
    Handles anti-ban measures (typing simulation, random delay),
    retry logic, and activity logging.
    """
    account_id = str(task.telegram_account_id)
    result = {"status": "sent", "reason": None}

    # --- Anti-ban: Random delay ---
    delay_minutes = task.schedule.random_delay_minutes
    if delay_minutes > 0 and not dry_run:
        delay_seconds = random.randint(0, delay_minutes * 60)
        await asyncio.sleep(delay_seconds)

    # --- Get Telegram client ---
    client = await telegram_client_manager.get_client(account_id)
    if not client:
        result["status"] = "failed"
        result["reason"] = "Telegram account is not connected or session expired."
        if not dry_run:
            # Auto-disconnect account in DB so other tasks don't keep trying/failing
            from app.services.telegram_account_service import telegram_account_service
            await telegram_account_service.update_status(account_id, "disconnected")
            await _log_execution(task, result)
        return result

    # --- Resolve target entity ---
    try:
        target = task.target
        entity = await client.get_entity(target.chat_id)
    except Exception as e:
        result["status"] = "failed"
        result["reason"] = f"Could not resolve target: {str(e)}"
        if not dry_run:
            await _log_execution(task, result)
        return result

    # --- Anti-ban: Typing simulation ---
    if task.simulate_typing and not dry_run:
        from telethon.tl.functions.messages import SetTypingRequest
        from telethon.tl.types import SendMessageTypingAction
        try:
            await client(SetTypingRequest(peer=entity, action=SendMessageTypingAction()))
            # Wait 2-5 seconds to simulate typing
            await asyncio.sleep(random.uniform(2, 5))
        except Exception:
            pass  # Non-critical, continue

    # --- Execute action with retry ---
    max_retries = 3
    backoff = [5, 15, 45]

    for attempt in range(max_retries):
        try:
            await _execute_action(client, entity, task, schedule_time=schedule_time)
            result["status"] = "sent"
            result["reason"] = None
            break
        except Exception as e:
            if attempt < max_retries - 1:
                if not dry_run:
                    await asyncio.sleep(backoff[attempt])
                result["status"] = "failed"
                result["reason"] = f"Attempt {attempt + 1} failed: {str(e)}"
            else:
                result["status"] = "failed"
                result["reason"] = f"All {max_retries} attempts failed. Last error: {str(e)}"

    # --- Log execution ---
    if not dry_run:
        await _log_execution(task, result, retry_count=max_retries - 1 if result["status"] == "failed" else 0)

        # Don't update task metadata when pre-scheduling — the pre-scheduler
        # sends multiple time slots per day, and we don't want to increment
        # execution_count for each slot or overwrite next_execution.
        if not schedule_time:
            await task_service.update_after_execution(
                str(task.id),
                success=(result["status"] == "sent"),
                timezone=task.schedule.timezone or "Asia/Dhaka",
            )

    return result


async def _execute_action(client, entity, task: Task, schedule_time: Optional[datetime] = None):
    """Dispatch to the correct send method based on action_type."""
    action = task.action_type
    content = task.action_content

    # Build common kwargs for scheduling
    schedule_kwargs = {}
    if schedule_time:
        schedule_kwargs["schedule"] = schedule_time

    if action == "send_sticker":
        sticker_id_str = content.sticker_id  # stored as string
        sticker_set_name = content.sticker_set_id  # the set's short_name

        # Try to get the real sticker document from the set (fresh file_reference)
        sticker_doc = None
        if sticker_set_name:
            try:
                from telethon.tl.functions.messages import GetStickerSetRequest
                from telethon.tl.types import InputStickerSetShortName
                result = await client(
                    GetStickerSetRequest(
                        stickerset=InputStickerSetShortName(short_name=sticker_set_name),
                        hash=0,
                    )
                )
                for doc in result.documents:
                    if str(doc.id) == sticker_id_str:
                        sticker_doc = doc
                        break
            except Exception:
                pass

        if sticker_doc:
            await client.send_file(entity, sticker_doc, **schedule_kwargs)
        else:
            # Fallback: try with InputDocument
            from telethon.tl.types import InputDocument
            sticker_doc = InputDocument(
                id=int(sticker_id_str),
                access_hash=int(content.sticker_access_hash or 0),
                file_reference=b"",
            )
            await client.send_file(entity, sticker_doc, **schedule_kwargs)

    elif action == "send_text":
        parse_mode = content.parse_mode  # "markdown", "html", or None
        await client.send_message(entity, content.text or "", parse_mode=parse_mode, **schedule_kwargs)

    elif action == "send_photo":
        file_path = os.path.join(UPLOADS_DIR, os.path.basename(content.file_path or ""))
        if not os.path.exists(file_path):
            raise Exception(f"File not found: {content.file_path}")
        await client.send_file(entity, file_path, caption=content.caption or "", **schedule_kwargs)

    elif action == "send_video":
        file_path = os.path.join(UPLOADS_DIR, os.path.basename(content.file_path or ""))
        if not os.path.exists(file_path):
            raise Exception(f"File not found: {content.file_path}")
        await client.send_file(entity, file_path, caption=content.caption or "", video_note=False, **schedule_kwargs)

    elif action == "send_document":
        file_path = os.path.join(UPLOADS_DIR, os.path.basename(content.file_path or ""))
        if not os.path.exists(file_path):
            raise Exception(f"File not found: {content.file_path}")
        await client.send_file(entity, file_path, caption=content.caption or "", force_document=True, **schedule_kwargs)

    elif action == "forward_message":
        await client.forward_messages(
            entity,
            messages=content.source_message_id,
            from_peer=content.source_chat_id,
            **schedule_kwargs,
        )

    else:
        raise Exception(f"Unknown action_type: {action}")


async def _log_execution(task: Task, result: dict, retry_count: int = 0):
    """Write an activity log entry."""
    await activity_log_service.log(
        task_id=str(task.id),
        telegram_account_id=str(task.telegram_account_id),
        user_id=str(task.user_id),
        task_name=task.name,
        action_type=task.action_type,
        target_title=task.target.chat_title,
        status=result["status"],
        reason=result.get("reason"),
        scheduled_time=task.next_execution,
        actual_sent_time=datetime.utcnow() if result["status"] == "sent" else None,
        retry_count=retry_count,
    )
