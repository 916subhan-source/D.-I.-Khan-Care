"""
Asynchronous background task runner for non-blocking operations.
Decouples heavy external I/O (Email SMTP, Resend API, notifications, audit logging)
from HTTP request/response lifecycles so receptionist and doctor actions return in < 50ms.
"""

import logging
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import AsyncSessionLocal
from app.models import Appointment, Doctor
from app.services.notification_service import notification_service

logger = logging.getLogger("background_tasks")


async def bg_notify_appointment_completed(appointment_id: str, clinical_notes: str = "") -> None:
    """Dispatches patient visit completed email and review request in background queue."""
    try:
        async with AsyncSessionLocal() as session:
            stmt = (
                select(Appointment)
                .options(
                    selectinload(Appointment.doctor).selectinload(Doctor.user),
                    selectinload(Appointment.slot),
                    selectinload(Appointment.patient),
                    selectinload(Appointment.payment)
                )
                .where(Appointment.id == appointment_id)
            )
            res = await session.execute(stmt)
            appt = res.scalar_one_or_none()
            if appt:
                await notification_service.notify_appointment_completed(session, appt, clinical_notes=clinical_notes)
                logger.info(f"[Background Queue] Successfully delivered completion notification for appt: {appointment_id}")
            else:
                logger.warning(f"[Background Queue] Appointment {appointment_id} not found for completion notification.")
    except Exception as e:
        logger.error(f"[Background Queue] Failed to send completion notification for {appointment_id}: {e}")


async def bg_notify_appointment_confirmed(appointment_id: str) -> None:
    """Dispatches patient confirmation slip and assistant email in background queue."""
    try:
        async with AsyncSessionLocal() as session:
            stmt = (
                select(Appointment)
                .options(
                    selectinload(Appointment.doctor).selectinload(Doctor.user),
                    selectinload(Appointment.slot),
                    selectinload(Appointment.patient),
                    selectinload(Appointment.payment)
                )
                .where(Appointment.id == appointment_id)
            )
            res = await session.execute(stmt)
            appt = res.scalar_one_or_none()
            if appt:
                await notification_service.notify_appointment_confirmed(session, appt)
                logger.info(f"[Background Queue] Successfully delivered confirmation notification for appt: {appointment_id}")
            else:
                logger.warning(f"[Background Queue] Appointment {appointment_id} not found for confirmation notification.")
    except Exception as e:
        logger.error(f"[Background Queue] Failed to send confirmation notification for {appointment_id}: {e}")


async def bg_notify_appointment_cancelled(appointment_id: str, reason: str = "") -> None:
    """Dispatches cancellation notice in background queue."""
    try:
        async with AsyncSessionLocal() as session:
            stmt = (
                select(Appointment)
                .options(
                    selectinload(Appointment.doctor).selectinload(Doctor.user),
                    selectinload(Appointment.slot),
                    selectinload(Appointment.patient),
                    selectinload(Appointment.payment)
                )
                .where(Appointment.id == appointment_id)
            )
            res = await session.execute(stmt)
            appt = res.scalar_one_or_none()
            if appt:
                await notification_service.notify_appointment_cancelled(session, appt, reason=reason)
                logger.info(f"[Background Queue] Successfully delivered cancellation notification for appt: {appointment_id}")
    except Exception as e:
        logger.error(f"[Background Queue] Failed to send cancellation notification for {appointment_id}: {e}")


async def bg_notify_appointment_rescheduled(appointment_id: str, reason: str = "") -> None:
    """Dispatches rescheduled notice in background queue."""
    try:
        async with AsyncSessionLocal() as session:
            stmt = (
                select(Appointment)
                .options(
                    selectinload(Appointment.doctor).selectinload(Doctor.user),
                    selectinload(Appointment.slot),
                    selectinload(Appointment.patient),
                    selectinload(Appointment.payment)
                )
                .where(Appointment.id == appointment_id)
            )
            res = await session.execute(stmt)
            appt = res.scalar_one_or_none()
            if appt:
                await notification_service.notify_appointment_rescheduled(session, appt, reason=reason)
                logger.info(f"[Background Queue] Successfully delivered rescheduled notification for appt: {appointment_id}")
    except Exception as e:
        logger.error(f"[Background Queue] Failed to send rescheduled notification for {appointment_id}: {e}")


async def bg_notify_appointment_requested(appointment_id: str) -> None:
    """Dispatches booking received notification in background queue."""
    try:
        async with AsyncSessionLocal() as session:
            stmt = (
                select(Appointment)
                .options(
                    selectinload(Appointment.doctor).selectinload(Doctor.user),
                    selectinload(Appointment.slot),
                    selectinload(Appointment.patient),
                    selectinload(Appointment.payment)
                )
                .where(Appointment.id == appointment_id)
            )
            res = await session.execute(stmt)
            appt = res.scalar_one_or_none()
            if appt:
                await notification_service.notify_appointment_requested(session, appt)
                logger.info(f"[Background Queue] Successfully delivered booking request notification for appt: {appointment_id}")
    except Exception as e:
        logger.error(f"[Background Queue] Failed to send booking request notification for {appointment_id}: {e}")

