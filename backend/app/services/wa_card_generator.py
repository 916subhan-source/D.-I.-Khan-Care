"""
WhatsApp Visual Card Generator for D.I. Khan Care
Renders high-definition, pixel-perfect notification cards matching official clinic templates:
1. OTP Verification
2. Appointment Request Received (Pending Confirmation)
3. Appointment Confirmed
4. Appointment Reminder
5. Appointment Rescheduled
6. Appointment Cancelled

Uses custom vector rendering for all icons (no missing glyph boxes or unsupported emojis).
"""

import os
import io
import re
import math
from PIL import Image, ImageDraw, ImageFont
from typing import Optional, Tuple, Any

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets")
FONTS_DIR = os.path.join(ASSETS_DIR, "fonts")
FONT_BOLD = os.path.join(FONTS_DIR, "font_bold.ttf")
FONT_REGULAR = os.path.join(FONTS_DIR, "font_regular.ttf")

def _get_font(bold: bool, size: int):
    path = FONT_BOLD if bold else FONT_REGULAR
    if os.path.exists(path):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    try:
        win_path = r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf"
        if os.path.exists(win_path):
            return ImageFont.truetype(win_path, size)
    except Exception:
        pass
    return ImageFont.load_default()

def clean_doctor_display_name(raw: str) -> str:
    """Format doctor display name cleanly, stripping double 'Dr.' or lowercase prefixes."""
    if not raw:
        return "Doctor"
    s = str(raw).strip()
    s = re.sub(r'^(dr\.?|surgeon\.?|prof\.?)\s*', '', s, flags=re.IGNORECASE).strip()
    s = re.sub(r'^(dr\.?|surgeon\.?|prof\.?)\s*', '', s, flags=re.IGNORECASE).strip()
    s = s.replace('.', ' ')
    parts = s.split()
    formatted = " ".join(p.capitalize() for p in parts)
    return f"Dr. {formatted}" if formatted else "Doctor"

# -------------------------------------------------------------
# Vector Icon Drawing Helpers (Zero Missing Glyphs)
# -------------------------------------------------------------
def _draw_lock_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str = "#0d9488"):
    """Draws a crisp padlock icon."""
    draw.arc((cx - 16, cy - 24, cx + 16, cy + 2), start=180, end=0, fill=color, width=4)
    draw.rounded_rectangle((cx - 20, cy - 4, cx + 20, cy + 24), radius=6, fill=color)
    draw.ellipse((cx - 4, cy + 3, cx + 4, cy + 11), fill="#ffffff")
    draw.line([(cx, cy + 10), (cx, cy + 18)], fill="#ffffff", width=3)

def _draw_shield_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str = "#0d9488"):
    """Draws a security shield with inner check."""
    pts = [(cx - 20, cy - 22), (cx + 20, cy - 22), (cx + 20, cy + 4), (cx, cy + 24), (cx - 20, cy + 4)]
    draw.polygon(pts, fill=color)
    draw.line([(cx - 8, cy), (cx - 2, cy + 7), (cx + 10, cy - 7)], fill="#ffffff", width=3)

def _draw_check_badge(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int = 24, bg_color: str = "#10b981", fg_color: str = "#ffffff"):
    """Draws a circular checkmark badge."""
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=bg_color)
    draw.line([(cx - int(r*0.45), cy), (cx - int(r*0.1), cy + int(r*0.38)), (cx + int(r*0.5), cy - int(r*0.35))], fill=fg_color, width=4)

def _draw_cross_badge(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int = 24, bg_color: str = "#ef4444", fg_color: str = "#ffffff"):
    """Draws a circular red cross badge."""
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=bg_color)
    offset = int(r * 0.42)
    draw.line([(cx - offset, cy - offset), (cx + offset, cy + offset)], fill=fg_color, width=4)
    draw.line([(cx + offset, cy - offset), (cx - offset, cy + offset)], fill=fg_color, width=4)

def _draw_bell_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str = "#ea580c"):
    """Draws a clean notification bell icon."""
    draw.ellipse((cx - 4, cy - 24, cx + 4, cy - 16), outline=color, width=3)
    draw.polygon([(cx - 18, cy + 10), (cx + 18, cy + 10), (cx + 12, cy - 14), (cx - 12, cy - 14)], fill=color)
    draw.rounded_rectangle((cx - 22, cy + 10, cx + 22, cy + 16), radius=3, fill=color)
    draw.ellipse((cx - 6, cy + 16, cx + 6, cy + 22), fill=color)

def _draw_send_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str = "#0284c7"):
    """Draws an outgoing paper airplane / send icon."""
    pts = [(cx - 18, cy + 16), (cx + 20, cy - 2), (cx - 18, cy - 18), (cx - 8, cy - 2)]
    draw.polygon(pts, fill=color)
    draw.line([(cx - 8, cy - 2), (cx + 20, cy - 2)], fill="#ffffff", width=2)

def _draw_clock_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int = 18, color: str = "#0284c7"):
    """Draws a clock icon with hour and minute hands."""
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=color, width=3)
    draw.line([(cx, cy), (cx, cy - int(r * 0.65))], fill=color, width=3)
    draw.line([(cx, cy), (cx + int(r * 0.5), cy)], fill=color, width=3)

def _draw_calendar_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str = "#047857"):
    """Draws a calendar outline with binder rings."""
    draw.rounded_rectangle((cx - 18, cy - 18, cx + 18, cy + 18), radius=4, outline=color, width=3)
    draw.rectangle((cx - 18, cy - 18, cx + 18, cy - 7), fill=color)
    draw.line([(cx - 10, cy - 23), (cx - 10, cy - 17)], fill=color, width=3)
    draw.line([(cx + 10, cy - 23), (cx + 10, cy - 17)], fill=color, width=3)

def _draw_alert_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str = "#dc2626"):
    """Draws an alert warning triangle with exclamation mark."""
    draw.polygon([(cx, cy - 18), (cx + 18, cy + 14), (cx - 18, cy + 14)], outline=color, width=3)
    draw.line([(cx, cy - 7), (cx, cy + 4)], fill=color, width=3)
    draw.ellipse((cx - 2, cy + 8, cx + 2, cy + 12), fill=color)

def _draw_info_badge(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int = 16, color: str = "#0284c7"):
    """Draws an informative circle with letter i."""
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=color, width=2)
    draw.ellipse((cx - 2, cy - 9, cx + 2, cy - 5), fill=color)
    draw.line([(cx, cy - 2), (cx, cy + 8)], fill=color, width=3)

def _draw_star(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int = 14, color: str = "#f59e0b"):
    """Draws a crisp 5-pointed star."""
    points = []
    for i in range(10):
        angle = i * math.pi / 5 - math.pi / 2
        radius = r if i % 2 == 0 else r * 0.45
        points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    draw.polygon(points, fill=color)

def _draw_row_bullet(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str = "#64748b"):
    """Draws a subtle, sleek bullet point for detail rows."""
    draw.rounded_rectangle((cx - 5, cy - 5, cx + 5, cy + 5), radius=3, fill=color)


# -------------------------------------------------------------
# Base Layout Helpers
# -------------------------------------------------------------
def _draw_header(draw: ImageDraw.ImageDraw, W: int, title_sub: str = "CLINIC • APPOINTMENT NOTICE"):
    """Draws the top branded marine-teal banner with official DI Khan Care logo badge."""
    draw.rounded_rectangle((20, 20, W - 20, 160), radius=28, fill="#0c3a4f")
    draw.rectangle((20, 90, W - 20, 160), fill="#0c3a4f")

    # Circular medical logo badge
    badge_x, badge_y, badge_r = 75, 90, 42
    draw.ellipse((badge_x - badge_r, badge_y - badge_r, badge_x + badge_r, badge_y + badge_r), fill="#ffffff")
    
    # Teal/Cyan cross inside logo
    cw, cl = 10, 24
    draw.rectangle((badge_x - cw, badge_y - cl, badge_x + cw, badge_y + cl), fill="#0d9488")
    draw.rectangle((badge_x - cl, badge_y - cw, badge_x + cl, badge_y + cw), fill="#0d9488")

    # Main Brand Title
    f_brand = _get_font(bold=True, size=46)
    draw.text((140, 52), "DI Khan Care", fill="#ffffff", font=f_brand)

    # Subtitle
    f_sub = _get_font(bold=True, size=18)
    draw.text((142, 108), title_sub.upper(), fill="#7dd3fc", font=f_sub)

def _draw_footer(draw: ImageDraw.ImageDraw, W: int, H: int, text: str = "DI Khan Care Clinic • Dera Ismail Khan"):
    """Draws bottom branding strip."""
    draw.rounded_rectangle((20, H - 75, W - 20, H - 20), radius=24, fill="#0c3a4f")
    draw.rectangle((20, H - 75, W - 20, H - 50), fill="#0c3a4f")
    f_foot = _get_font(bold=True, size=20)
    bbox = f_foot.getbbox(text)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, H - 56), text, fill="#e2e8f0", font=f_foot)

def _create_base_canvas(W: int = 850, H: int = 1020) -> Tuple[Image.Image, ImageDraw.ImageDraw]:
    """Initializes the smooth card canvas."""
    img = Image.new("RGB", (W, H), "#f8fafc")
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((18, 18, W - 18, H - 18), radius=28, fill="#ffffff", outline="#cbd5e1", width=2)
    return img, draw


# -------------------------------------------------------------
# TEMPLATE 1: OTP Verification Card
# -------------------------------------------------------------
def generate_otp_card(patient_name: str, otp_code: str, slip_number: str, doctor_name: str) -> bytes:
    """Template 1: OTP Verification Card."""
    W, H = 850, 1020
    img, draw = _create_base_canvas(W, H)
    _draw_header(draw, W, "CLINIC • SECURITY VERIFICATION")

    # Top Lock & Shield Badges
    draw.ellipse(((W // 2) - 80, 195, (W // 2) - 10, 265), fill="#ecfdf5", outline="#10b981", width=2)
    _draw_lock_icon(draw, (W // 2) - 45, 230, "#0d9488")

    draw.ellipse(((W // 2) + 10, 195, (W // 2) + 80, 265), fill="#ecfdf5", outline="#10b981", width=2)
    _draw_shield_icon(draw, (W // 2) + 45, 230, "#0d9488")

    # Heading
    f_h1 = _get_font(bold=True, size=42)
    draw.text(((W - f_h1.getbbox("OTP Verification")[2]) // 2, 285), "OTP Verification", fill="#0f172a", font=f_h1)

    # Subheading
    f_sub = _get_font(bold=False, size=24)
    sub_txt = f"Your OTP for {patient_name.title()}"
    draw.text(((W - f_sub.getbbox(sub_txt)[2]) // 2, 340), sub_txt, fill="#475569", font=f_sub)

    # Big 6-digit OTP cards
    otp_digits = list(str(otp_code).strip()[:6])
    box_w, box_h, spacing = 95, 120, 20
    total_w = (6 * box_w) + (5 * spacing)
    start_x = (W - total_w) // 2
    box_y = 395

    f_otp = _get_font(bold=True, size=68)
    for i, d in enumerate(otp_digits):
        bx = start_x + (i * (box_w + spacing))
        draw.rounded_rectangle((bx, box_y, bx + box_w, box_y + box_h), radius=16, fill="#f0f9ff", outline="#0284c7", width=3)
        dbbox = f_otp.getbbox(d)
        dw = dbbox[2] - dbbox[0]
        dh = dbbox[3] - dbbox[1]
        draw.text((bx + (box_w - dw) // 2, box_y + (box_h - dh) // 2 - 8), d, fill="#0369a1", font=f_otp)

    # Meta Fields
    f_lbl = _get_font(bold=True, size=26)
    f_val = _get_font(bold=False, size=26)
    
    y = 560
    _draw_row_bullet(draw, 110, y + 16, "#0369a1")
    draw.text((130, y), "Slip No:", fill="#0f172a", font=f_lbl)
    draw.text((270, y), slip_number, fill="#0369a1", font=_get_font(bold=True, size=26))

    y += 52
    _draw_row_bullet(draw, 110, y + 16, "#0d9488")
    draw.text((130, y), "Doctor:", fill="#0f172a", font=f_lbl)
    doc_display = clean_doctor_display_name(doctor_name)
    draw.text((270, y), doc_display[:32], fill="#334155", font=f_val)

    y += 52
    _draw_clock_icon(draw, 110, y + 16, r=12, color="#0d9488")
    draw.text((130, y), "Valid for:", fill="#0f172a", font=f_lbl)
    draw.text((270, y), "5 minutes", fill="#0d9488", font=_get_font(bold=True, size=26))

    # Warning Box
    wy = 735
    draw.rounded_rectangle((70, wy, W - 70, wy + 85), radius=16, fill="#fef2f2", outline="#fca5a5", width=2)
    _draw_alert_icon(draw, 115, wy + 42, color="#dc2626")
    f_warn = _get_font(bold=True, size=24)
    draw.text((150, wy + 26), "Do not share this code with anyone.", fill="#991b1b", font=f_warn)

    _draw_footer(draw, W, H)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


# -------------------------------------------------------------
# TEMPLATE 2A: Appointment Request Sent (For Patient)
# -------------------------------------------------------------
def generate_request_sent_card(patient_name: str, doctor_name: str, slip_number: str, visit_date: str, slot_time: str) -> bytes:
    """Template 2A: Appointment Request Sent (Delivered to Patient who booked)."""
    W, H = 850, 1020
    img, draw = _create_base_canvas(W, H)
    _draw_header(draw, W, "CLINIC • APPOINTMENT NOTICE")

    # Icon: Blue / Cyan circle with paper-plane / send icon
    draw.ellipse(((W // 2) - 45, 190, (W // 2) + 45, 280), fill="#f0f9ff", outline="#0284c7", width=3)
    _draw_send_icon(draw, W // 2, 235, "#0284c7")

    # Heading: Appointment Request Sent
    f_h1 = _get_font(bold=True, size=38)
    h_txt = "Appointment Request Sent"
    draw.text(((W - f_h1.getbbox(h_txt)[2]) // 2, 295), h_txt, fill="#0f172a", font=f_h1)

    # Subheading: Submitted for {patient_name}
    f_sub = _get_font(bold=True, size=26)
    sub_txt = f"Submitted for {patient_name.title()}"
    draw.text(((W - f_sub.getbbox(sub_txt)[2]) // 2, 345), sub_txt, fill="#0369a1", font=f_sub)

    # Details Box
    bx, by, bw, bh = 60, 400, W - 120, 320
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=20, fill="#f8fafc", outline="#e2e8f0", width=2)

    f_lbl = _get_font(bold=True, size=26)

    rows = [
        ("Doctor:", clean_doctor_display_name(doctor_name), "#1e293b", False),
        ("Slip No:", slip_number, "#0c3a4f", True),
        ("Date:", visit_date, "#1e293b", False),
        ("Time:", slot_time, "#1e293b", True),
    ]

    ry = by + 28
    for label, val, color, is_bold in rows:
        _draw_row_bullet(draw, bx + 35, ry + 16, "#0284c7")
        draw.text((bx + 55, ry), label, fill="#475569", font=f_lbl)
        vf = _get_font(bold=is_bold, size=26)
        draw.text((bx + 210, ry), val[:34], fill=color, font=vf)
        ry += 52

    # Status Pill: Pending Confirmation
    py = ry + 8
    _draw_row_bullet(draw, bx + 35, py + 16, "#f97316")
    draw.text((bx + 55, py), "Status:", fill="#475569", font=f_lbl)
    draw.rounded_rectangle((bx + 210, py - 4, bx + 490, py + 40), radius=14, fill="#f97316")
    draw.text((bx + 240, py + 5), "Pending Confirmation", fill="#ffffff", font=_get_font(bold=True, size=20))

    # Advisory Box: Our team will confirm shortly
    ny = 750
    draw.rounded_rectangle((60, ny, W - 60, ny + 95), radius=16, fill="#f0f9ff", outline="#bae6fd", width=2)
    _draw_info_badge(draw, 95, ny + 46, r=18, color="#0284c7")
    draw.text((130, ny + 20), "Our team will confirm shortly.", fill="#0369a1", font=_get_font(bold=True, size=22))
    draw.text((130, ny + 52), "Please wait for your confirmation message.", fill="#0369a1", font=_get_font(bold=False, size=20))

    _draw_footer(draw, W, H, "DI Khan Care Clinic • Dera Ismail Khan")

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


# -------------------------------------------------------------
# TEMPLATE 2B: Appointment Request Received (For Assistant/Staff)
# -------------------------------------------------------------
def generate_request_received_card(patient_name: str, doctor_name: str, slip_number: str, visit_date: str, slot_time: str, patient_phone: str = "") -> bytes:
    """Template 2B: Appointment Request Received (Delivered to Assistant & Clinic Staff)."""
    W, H = 850, 1020
    img, draw = _create_base_canvas(W, H)
    _draw_header(draw, W, "CLINIC • STAFF ALERT")

    # Icon: Orange Bell circle
    draw.ellipse(((W // 2) - 45, 190, (W // 2) + 45, 280), fill="#fff7ed", outline="#f97316", width=3)
    _draw_bell_icon(draw, W // 2, 235, "#ea580c")

    # Heading: Appointment Request Received
    f_h1 = _get_font(bold=True, size=38)
    h_txt = "Appointment Request Received"
    draw.text(((W - f_h1.getbbox(h_txt)[2]) // 2, 295), h_txt, fill="#0f172a", font=f_h1)

    # Subheading: New Request from {patient_name}
    f_sub = _get_font(bold=True, size=26)
    sub_txt = f"New Request from {patient_name.title()}"
    draw.text(((W - f_sub.getbbox(sub_txt)[2]) // 2, 345), sub_txt, fill="#c2410c", font=f_sub)

    # Details Box
    bx, by, bw, bh = 60, 400, W - 120, 320
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=20, fill="#fffbeb", outline="#fde68a", width=2)

    f_lbl = _get_font(bold=True, size=26)

    rows = [
        ("Patient:", patient_name.title(), "#0f172a", True),
        ("Doctor:", clean_doctor_display_name(doctor_name), "#1e293b", False),
        ("Slip No:", slip_number, "#0c3a4f", True),
        ("Date & Time:", f"{visit_date} ({slot_time})", "#1e293b", True),
    ]

    ry = by + 28
    for label, val, color, is_bold in rows:
        _draw_row_bullet(draw, bx + 35, ry + 16, "#ea580c")
        draw.text((bx + 55, ry), label, fill="#78350f", font=f_lbl)
        vf = _get_font(bold=is_bold, size=24 if len(val) > 26 else 26)
        draw.text((bx + 210, ry), val[:34], fill=color, font=vf)
        ry += 52

    # Status Pill: Needs Confirmation
    py = ry + 8
    _draw_row_bullet(draw, bx + 35, py + 16, "#ea580c")
    draw.text((bx + 55, py), "Status:", fill="#78350f", font=f_lbl)
    draw.rounded_rectangle((bx + 210, py - 4, bx + 480, py + 40), radius=14, fill="#ea580c")
    draw.text((bx + 240, py + 5), "Needs Confirmation", fill="#ffffff", font=_get_font(bold=True, size=20))

    # Advisory Box: Staff Action
    ny = 750
    draw.rounded_rectangle((60, ny, W - 60, ny + 95), radius=16, fill="#fef3c7", outline="#f59e0b", width=2)
    _draw_info_badge(draw, 95, ny + 46, r=18, color="#d97706")
    draw.text((130, ny + 20), "Action Required: Open Assistant Desk", fill="#92400e", font=_get_font(bold=True, size=22))
    draw.text((130, ny + 52), "Review inbox to approve, call or reschedule.", fill="#b45309", font=_get_font(bold=False, size=20))

    _draw_footer(draw, W, H, "DI Khan Care • Clinic Desk Notification")

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


# -------------------------------------------------------------
# TEMPLATE 3: Appointment Confirmed
# -------------------------------------------------------------
def generate_confirmed_card(patient_name: str, doctor_name: str, visit_date: str, slot_time: str, slip_number: str, token_number: Optional[Any] = None) -> bytes:
    """Template 3: Appointment Confirmed Card."""
    W, H = 850, 1020
    img, draw = _create_base_canvas(W, H)
    _draw_header(draw, W, "CLINIC • APPOINTMENT CONFIRMATION")

    # Big Green Confirmed Banner
    cy = 190
    draw.rounded_rectangle((70, cy, W - 70, cy + 85), radius=22, fill="#ecfdf5", outline="#10b981", width=3)
    _draw_check_badge(draw, 140, cy + 42, r=22, bg_color="#10b981", fg_color="#ffffff")
    f_conf = _get_font(bold=True, size=36)
    draw.text((185, cy + 20), "Appointment Confirmed", fill="#047857", font=f_conf)

    # Details Box
    bx, by, bw, bh = 60, 310, W - 120, 420
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=20, fill="#ffffff", outline="#cbd5e1", width=2)

    f_lbl = _get_font(bold=True, size=26)

    rows = [
        ("Patient:", patient_name.title(), "#1e293b", True),
        ("Doctor:", f"Dr. {doctor_name.replace('Dr. ', '').strip()}", "#1e293b", False),
        ("Date:", visit_date, "#1e293b", False),
        ("Time:", slot_time, "#1e293b", True),
        ("Slip No:", slip_number, "#0c3a4f", True),
    ]

    if token_number:
        rows.append(("Token No:", f"#{token_number}", "#047857", True))

    ry = by + 30
    for label, val, color, is_bold in rows:
        _draw_row_bullet(draw, bx + 35, ry + 16, "#10b981")
        draw.text((bx + 55, ry), label, fill="#475569", font=f_lbl)
        vf = _get_font(bold=is_bold, size=26)
        draw.text((bx + 220, ry), str(val)[:34], fill=color, font=vf)
        ry += 54

    # Advisory Box
    ny = 760
    draw.rounded_rectangle((60, ny, W - 60, ny + 85), radius=16, fill="#f0fdf4", outline="#86efac", width=2)
    _draw_info_badge(draw, 95, ny + 42, r=18, color="#166534")
    f_note = _get_font(bold=True, size=22)
    draw.text((130, ny + 28), "Please arrive 15 minutes early • Bring CNIC and Slip", fill="#166534", font=f_note)

    _draw_footer(draw, W, H)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


# -------------------------------------------------------------
# TEMPLATE 4: Appointment Reminder
# -------------------------------------------------------------
def generate_reminder_card(patient_name: str, doctor_name: str, visit_date: str, slot_time: str, slip_number: str) -> bytes:
    """Template 4: Appointment Reminder Card."""
    W, H = 850, 1020
    img, draw = _create_base_canvas(W, H)
    _draw_header(draw, W, "CLINIC • APPOINTMENT REMINDER")

    # Bell & Clock Badges
    draw.ellipse(((W // 2) - 80, 190, (W // 2) - 10, 260), fill="#eff6ff", outline="#3b82f6", width=2)
    _draw_bell_icon(draw, (W // 2) - 45, 225, "#1d4ed8")

    draw.ellipse(((W // 2) + 10, 190, (W // 2) + 80, 260), fill="#eff6ff", outline="#3b82f6", width=2)
    _draw_clock_icon(draw, (W // 2) + 45, 225, r=16, color="#1d4ed8")

    # Heading
    f_h1 = _get_font(bold=True, size=40)
    h_txt = "Appointment Reminder"
    draw.text(((W - f_h1.getbbox(h_txt)[2]) // 2, 280), h_txt, fill="#0f172a", font=f_h1)

    # Details Box
    bx, by, bw, bh = 60, 350, W - 120, 290
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=20, fill="#f8fafc", outline="#e2e8f0", width=2)

    f_lbl = _get_font(bold=True, size=26)

    rows = [
        ("Patient:", patient_name.title(), "#1e293b", True),
        ("Doctor:", f"Dr. {doctor_name.replace('Dr. ', '').strip()}", "#1e293b", False),
        ("Slip No:", slip_number, "#0c3a4f", True),
        ("Date:", visit_date, "#1e293b", False),
        ("Time:", slot_time, "#1e293b", True),
    ]

    ry = by + 26
    for label, val, color, is_bold in rows:
        _draw_row_bullet(draw, bx + 35, ry + 16, "#3b82f6")
        draw.text((bx + 55, ry), label, fill="#475569", font=f_lbl)
        vf = _get_font(bold=is_bold, size=26)
        draw.text((bx + 210, ry), val[:34], fill=color, font=vf)
        ry += 48

    # Highlight Pill: Reminder
    hy = 665
    draw.rounded_rectangle((60, hy, W - 60, hy + 75), radius=16, fill="#fef3c7", outline="#f59e0b", width=2)
    _draw_clock_icon(draw, 100, hy + 37, r=16, color="#d97706")
    f_high = _get_font(bold=True, size=24)
    draw.text((135, hy + 24), f"Reminder: Scheduled for {slot_time} ({visit_date})", fill="#92400e", font=f_high)

    # Advisory Box
    ny = 760
    draw.rounded_rectangle((60, ny, W - 60, ny + 85), radius=16, fill="#eff6ff", outline="#bfdbfe", width=2)
    _draw_info_badge(draw, 95, ny + 42, r=18, color="#1e40af")
    f_note = _get_font(bold=False, size=22)
    draw.text((130, ny + 26), "Please arrive 15 mins early • Bring CNIC and Slip", fill="#1e40af", font=f_note)

    _draw_footer(draw, W, H)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


# -------------------------------------------------------------
# TEMPLATE 5: Appointment Rescheduled
# -------------------------------------------------------------
def generate_rescheduled_card(patient_name: str, doctor_name: str, slip_number: str, old_date: str, old_time: str, new_date: str, new_time: str) -> bytes:
    """Template 5: Appointment Rescheduled Card."""
    W, H = 850, 1020
    img, draw = _create_base_canvas(W, H)
    _draw_header(draw, W, "CLINIC • APPOINTMENT UPDATE")

    # Calendar icon circle
    draw.ellipse(((W // 2) - 45, 190, (W // 2) + 45, 280), fill="#f0fdf4", outline="#10b981", width=3)
    _draw_calendar_icon(draw, W // 2, 235, "#047857")

    # Heading
    f_h1 = _get_font(bold=True, size=40)
    h_txt = "Appointment Rescheduled"
    draw.text(((W - f_h1.getbbox(h_txt)[2]) // 2, 295), h_txt, fill="#0f172a", font=f_h1)

    # Details Box
    bx, by, bw, bh = 60, 365, W - 120, 190
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=20, fill="#f8fafc", outline="#e2e8f0", width=2)

    f_lbl = _get_font(bold=True, size=26)
    f_val = _get_font(bold=False, size=26)

    _draw_row_bullet(draw, bx + 35, by + 44, "#047857")
    draw.text((bx + 55, by + 28), "Patient:", fill="#475569", font=f_lbl)
    draw.text((bx + 210, by + 28), patient_name.title(), fill="#0f172a", font=_get_font(bold=True, size=26))

    _draw_row_bullet(draw, bx + 35, by + 96, "#047857")
    draw.text((bx + 55, by + 80), "Doctor:", fill="#475569", font=f_lbl)
    draw.text((bx + 210, by + 80), f"Dr. {doctor_name.replace('Dr. ', '').strip()}", fill="#334155", font=f_val)

    _draw_row_bullet(draw, bx + 35, by + 148, "#047857")
    draw.text((bx + 55, by + 132), "Slip No:", fill="#475569", font=f_lbl)
    draw.text((bx + 210, by + 132), slip_number, fill="#0c3a4f", font=_get_font(bold=True, size=26))

    # Old Date vs New Date Cards side by side
    cy = 580
    card_w = (W - 140) // 2
    
    # Old Date Box (Slate)
    draw.rounded_rectangle((60, cy, 60 + card_w, cy + 140), radius=16, fill="#f1f5f9", outline="#cbd5e1", width=2)
    draw.text((85, cy + 18), "Old Date:", fill="#64748b", font=_get_font(bold=True, size=20))
    draw.text((85, cy + 50), old_date, fill="#334155", font=_get_font(bold=True, size=22))
    draw.text((85, cy + 82), old_time, fill="#64748b", font=_get_font(bold=False, size=20))

    # New Date Box (Orange)
    nx = 60 + card_w + 20
    draw.rounded_rectangle((nx, cy, nx + card_w, cy + 140), radius=16, fill="#fff7ed", outline="#f97316", width=2)
    draw.text((nx + 25, cy + 18), "New Date:", fill="#ea580c", font=_get_font(bold=True, size=20))
    draw.text((nx + 25, cy + 50), new_date, fill="#c2410c", font=_get_font(bold=True, size=22))
    draw.text((nx + 25, cy + 82), new_time, fill="#ea580c", font=_get_font(bold=True, size=20))

    # Advisory Box
    ny = 745
    draw.rounded_rectangle((60, ny, W - 60, ny + 95), radius=16, fill="#f0fdf4", outline="#86efac", width=2)
    _draw_info_badge(draw, 95, ny + 46, r=18, color="#166534")
    draw.text((130, ny + 20), "Your appointment has been moved to a new time.", fill="#166534", font=_get_font(bold=True, size=22))
    draw.text((130, ny + 52), "Please arrive 15 minutes early.", fill="#166534", font=_get_font(bold=False, size=20))

    _draw_footer(draw, W, H)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


# -------------------------------------------------------------
# TEMPLATE 6: Appointment Cancelled
# -------------------------------------------------------------
def generate_cancelled_card(patient_name: str, doctor_name: str, slip_number: str, visit_date: str, slot_time: str) -> bytes:
    """Template 6: Appointment Cancelled Card."""
    W, H = 850, 1020
    img, draw = _create_base_canvas(W, H)
    _draw_header(draw, W, "CLINIC • APPOINTMENT NOTICE")

    # Big Red Cross Badge
    draw.ellipse(((W // 2) - 45, 190, (W // 2) + 45, 280), fill="#fef2f2", outline="#ef4444", width=3)
    _draw_cross_badge(draw, W // 2, 235, r=26, bg_color="#ef4444", fg_color="#ffffff")

    # Heading
    f_h1 = _get_font(bold=True, size=40)
    h_txt = "Appointment Cancelled"
    draw.text(((W - f_h1.getbbox(h_txt)[2]) // 2, 295), h_txt, fill="#0f172a", font=f_h1)

    # Details Box
    bx, by, bw, bh = 60, 365, W - 120, 310
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=20, fill="#f8fafc", outline="#e2e8f0", width=2)

    f_lbl = _get_font(bold=True, size=26)
    f_val = _get_font(bold=False, size=26)

    rows = [
        ("Patient:", patient_name.title(), "#1e293b", True),
        ("Doctor:", f"Dr. {doctor_name.replace('Dr. ', '').strip()}", "#1e293b", False),
        ("Slip No:", slip_number, "#0c3a4f", True),
        ("Date:", visit_date, "#1e293b", False),
        ("Time:", slot_time, "#1e293b", True),
    ]

    ry = by + 24
    for label, val, color, is_bold in rows:
        _draw_row_bullet(draw, bx + 35, ry + 16, "#ef4444")
        draw.text((bx + 55, ry), label, fill="#475569", font=f_lbl)
        vf = _get_font(bold=is_bold, size=26)
        draw.text((bx + 210, ry), val[:34], fill=color, font=vf)
        ry += 48

    # Status Pill: Cancelled
    py = ry + 8
    _draw_row_bullet(draw, bx + 35, py + 16, "#ef4444")
    draw.text((bx + 55, py), "Status:", fill="#475569", font=f_lbl)
    draw.rounded_rectangle((bx + 210, py - 4, bx + 370, py + 38), radius=14, fill="#ef4444")
    draw.text((bx + 240, py + 5), "Cancelled", fill="#ffffff", font=_get_font(bold=True, size=20))

    # Advisory Box
    ny = 745
    draw.rounded_rectangle((60, ny, W - 60, ny + 95), radius=16, fill="#fef2f2", outline="#fca5a5", width=2)
    _draw_info_badge(draw, 95, ny + 46, r=18, color="#dc2626")
    draw.text((130, ny + 20), "Your appointment has been cancelled.", fill="#991b1b", font=_get_font(bold=True, size=22))
    draw.text((130, ny + 52), "To book again, please visit dikhancare.io", fill="#991b1b", font=_get_font(bold=False, size=20))

    _draw_footer(draw, W, H)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


# -------------------------------------------------------------
# TEMPLATE 7: Consultation / Appointment Completed
# -------------------------------------------------------------
def generate_completed_card(patient_name: str, doctor_name: str, slip_number: str, visit_date: str, slot_time: str) -> bytes:
    """Template 7: Consultation / Appointment Completed Card."""
    W, H = 850, 1020
    img, draw = _create_base_canvas(W, H)
    _draw_header(draw, W, "CLINIC • CONSULTATION COMPLETED")

    # Big Green Check Badge
    draw.ellipse(((W // 2) - 45, 190, (W // 2) + 45, 280), fill="#ecfdf5", outline="#10b981", width=3)
    _draw_check_badge(draw, W // 2, 235, r=26, bg_color="#10b981", fg_color="#ffffff")

    # Heading
    f_h1 = _get_font(bold=True, size=40)
    h_txt = "Consultation Completed"
    draw.text(((W - f_h1.getbbox(h_txt)[2]) // 2, 295), h_txt, fill="#0f172a", font=f_h1)

    # Subheading
    f_sub = _get_font(bold=True, size=24)
    sub_txt = f"Check-up Completed for {patient_name.title()}"
    draw.text(((W - f_sub.getbbox(sub_txt)[2]) // 2, 345), sub_txt, fill="#047857", font=f_sub)

    # Details Box
    bx, by, bw, bh = 60, 390, W - 120, 270
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=20, fill="#f8fafc", outline="#e2e8f0", width=2)

    f_lbl = _get_font(bold=True, size=26)
    f_val = _get_font(bold=False, size=26)

    rows = [
        ("Doctor:", f"Dr. {doctor_name.replace('Dr. ', '').strip()}", "#1e293b", False),
        ("Slip No:", slip_number, "#0c3a4f", True),
        ("Date:", visit_date, "#1e293b", False),
        ("Time:", slot_time, "#1e293b", True),
    ]

    ry = by + 22
    for label, val, color, is_bold in rows:
        _draw_row_bullet(draw, bx + 35, ry + 16, "#10b981")
        draw.text((bx + 55, ry), label, fill="#475569", font=f_lbl)
        vf = _get_font(bold=is_bold, size=26)
        draw.text((bx + 210, ry), val[:34], fill=color, font=vf)
        ry += 46

    # Status Pill: Completed
    py = ry + 6
    _draw_row_bullet(draw, bx + 35, py + 16, "#10b981")
    draw.text((bx + 55, py), "Status:", fill="#475569", font=f_lbl)
    draw.rounded_rectangle((bx + 210, py - 4, bx + 380, py + 38), radius=14, fill="#10b981")
    draw.text((bx + 240, py + 5), "Completed", fill="#ffffff", font=_get_font(bold=True, size=20))

    # Rating & Feedback Callout Box
    fy = 675
    draw.rounded_rectangle((60, fy, W - 60, fy + 145), radius=18, fill="#fffbeb", outline="#fde68a", width=2)

    # 5 Vector Gold Stars in Center
    star_start_x = (W - (5 * 34)) // 2 + 17
    for idx in range(5):
        _draw_star(draw, star_start_x + (idx * 34), fy + 32, r=13, color="#f59e0b")

    f_rate = _get_font(bold=True, size=24)
    r_txt = "Rate Your Doctor & Experience"
    draw.text(((W - f_rate.getbbox(r_txt)[2]) // 2, fy + 58), r_txt, fill="#92400e", font=f_rate)

    f_rate_sub = _get_font(bold=False, size=20)
    rs_txt = "Aapka tajurba kaisa raha? 30 sec mein review darj karein."
    draw.text(((W - f_rate_sub.getbbox(rs_txt)[2]) // 2, fy + 95), rs_txt, fill="#78350f", font=f_rate_sub)

    # Blessing / Note Box
    ny = 835
    draw.rounded_rectangle((60, ny, W - 60, ny + 70), radius=14, fill="#f0fdf4", outline="#86efac", width=2)
    _draw_info_badge(draw, 95, ny + 35, r=16, color="#166534")
    f_bless = _get_font(bold=True, size=20)
    draw.text((125, ny + 23), "Allah Ta'ala aapko mukammal sehat aur tandrusti ata farmaye.", fill="#166534", font=f_bless)

    _draw_footer(draw, W, H)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()
