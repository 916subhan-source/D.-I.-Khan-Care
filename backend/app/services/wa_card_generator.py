"""
WhatsApp Visual Card Generator for D.I. Khan Care
Renders high-definition, pixel-perfect notification cards matching official clinic templates:
1. OTP Verification
2. Appointment Request Received (Pending Confirmation)
3. Appointment Confirmed
4. Appointment Reminder
5. Appointment Rescheduled
6. Appointment Cancelled
"""

import os
import io
from PIL import Image, ImageDraw, ImageFont
from typing import Optional, Tuple, Any

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets")
FONTS_DIR = os.path.join(ASSETS_DIR, "fonts")
FONT_BOLD = os.path.join(FONTS_DIR, "font_bold.ttf")
FONT_REGULAR = os.path.join(FONTS_DIR, "font_regular.ttf")

# Fallback fonts if bundled TTF is not found
def _get_font(bold: bool, size: int):
    path = FONT_BOLD if bold else FONT_REGULAR
    if os.path.exists(path):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    try:
        # Windows fallback
        win_path = r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf"
        if os.path.exists(win_path):
            return ImageFont.truetype(win_path, size)
    except Exception:
        pass
    return ImageFont.load_default()

def _draw_header(draw: ImageDraw.ImageDraw, W: int, title_sub: str = "CLINIC • APPOINTMENT NOTICE"):
    """Draws the top branded marine-teal banner."""
    # Top header bar
    draw.rounded_rectangle((20, 20, W - 20, 160), radius=28, fill="#0c3a4f")
    draw.rectangle((20, 90, W - 20, 160), fill="#0c3a4f")

    # Draw circular medical logo badge on left
    badge_x, badge_y, badge_r = 75, 90, 42
    draw.ellipse((badge_x - badge_r, badge_y - badge_r, badge_x + badge_r, badge_y + badge_r), fill="#ffffff")
    
    # Draw green/teal cross inside logo
    cw, cl = 10, 24
    draw.rectangle((badge_x - cw, badge_y - cl, badge_x + cw, badge_y + cl), fill="#0d9488")
    draw.rectangle((badge_x - cl, badge_y - cw, badge_x + cl, badge_y + cw), fill="#0d9488")

    # DI Khan Care main title
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

def _create_base_canvas(W: int = 850, H: int = 1050) -> Tuple[Image.Image, ImageDraw.ImageDraw]:
    """Initializes the smooth card canvas."""
    img = Image.new("RGB", (W, H), "#f8fafc")
    draw = ImageDraw.Draw(img)
    # White card border
    draw.rounded_rectangle((18, 18, W - 18, H - 18), radius=28, fill="#ffffff", outline="#cbd5e1", width=2)
    return img, draw


def generate_otp_card(patient_name: str, otp_code: str, slip_number: str, doctor_name: str) -> bytes:
    """Template 1: OTP Verification Card."""
    W, H = 850, 1020
    img, draw = _create_base_canvas(W, H)
    _draw_header(draw, W, "CLINIC • SECURITY VERIFICATION")

    # Lock / Shield icon placeholder circle
    draw.ellipse(((W // 2) - 45, 195, (W // 2) + 45, 285), fill="#ecfdf5", outline="#10b981", width=3)
    f_icon = _get_font(bold=True, size=40)
    draw.text(((W // 2) - 22, 218), "🔒", fill="#0d9488", font=f_icon)

    # Heading
    f_h1 = _get_font(bold=True, size=42)
    draw.text(((W - f_h1.getbbox("OTP Verification")[2]) // 2, 305), "OTP Verification", fill="#0f172a", font=f_h1)

    # Subheading
    f_sub = _get_font(bold=False, size=24)
    sub_txt = f"Your OTP for {patient_name.title()}"
    draw.text(((W - f_sub.getbbox(sub_txt)[2]) // 2, 355), sub_txt, fill="#475569", font=f_sub)

    # Big 6-digit OTP cards
    otp_digits = list(str(otp_code).strip()[:6])
    box_w, box_h, spacing = 95, 120, 20
    total_w = (6 * box_w) + (5 * spacing)
    start_x = (W - total_w) // 2
    box_y = 410

    f_otp = _get_font(bold=True, size=68)
    for i, d in enumerate(otp_digits):
        bx = start_x + (i * (box_w + spacing))
        # Shadow / outer
        draw.rounded_rectangle((bx, box_y, bx + box_w, box_y + box_h), radius=16, fill="#f0f9ff", outline="#0284c7", width=3)
        # Digit
        dbbox = f_otp.getbbox(d)
        dw = dbbox[2] - dbbox[0]
        dh = dbbox[3] - dbbox[1]
        draw.text((bx + (box_w - dw) // 2, box_y + (box_h - dh) // 2 - 8), d, fill="#0369a1", font=f_otp)

    # Meta Fields
    f_lbl = _get_font(bold=True, size=26)
    f_val = _get_font(bold=False, size=26)
    
    y = 575
    draw.text((100, y), "📋 Slip No:", fill="#0f172a", font=f_lbl)
    draw.text((260, y), slip_number, fill="#0369a1", font=_get_font(bold=True, size=26))

    y += 50
    draw.text((100, y), "👨‍⚕️ Doctor:", fill="#0f172a", font=f_lbl)
    doc_display = f"Dr. {doctor_name.replace('Dr. ', '').strip()}"
    draw.text((260, y), doc_display[:32], fill="#334155", font=f_val)

    y += 50
    draw.text((100, y), "⏱️ Valid for:", fill="#0f172a", font=f_lbl)
    draw.text((260, y), "5 minutes", fill="#0d9488", font=_get_font(bold=True, size=26))

    # Warning Box
    wy = 740
    draw.rounded_rectangle((70, wy, W - 70, wy + 90), radius=16, fill="#fef2f2", outline="#fca5a5", width=2)
    f_warn = _get_font(bold=True, size=24)
    draw.text((105, wy + 28), "⚠️  Do not share this code with anyone.", fill="#991b1b", font=f_warn)

    _draw_footer(draw, W, H)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


def generate_request_received_card(patient_name: str, doctor_name: str, slip_number: str, visit_date: str, slot_time: str) -> bytes:
    """Template 2: Appointment Request Received (Pending Confirmation)."""
    W, H = 850, 1020
    img, draw = _create_base_canvas(W, H)
    _draw_header(draw, W, "CLINIC • APPOINTMENT NOTICE")

    # Icon: Bell with check badge
    draw.ellipse(((W // 2) - 45, 195, (W // 2) + 45, 285), fill="#fff7ed", outline="#f97316", width=3)
    f_icon = _get_font(bold=True, size=40)
    draw.text(((W // 2) - 22, 218), "🔔", fill="#ea580c", font=f_icon)

    # Heading
    f_h1 = _get_font(bold=True, size=38)
    h_txt = "Appointment Request Received"
    draw.text(((W - f_h1.getbbox(h_txt)[2]) // 2, 305), h_txt, fill="#0f172a", font=f_h1)

    # Subheading
    f_sub = _get_font(bold=True, size=26)
    sub_txt = f"New Request from {patient_name.title()}"
    draw.text(((W - f_sub.getbbox(sub_txt)[2]) // 2, 355), sub_txt, fill="#0369a1", font=f_sub)

    # Details Box
    bx, by, bw, bh = 60, 410, W - 120, 310
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=20, fill="#f8fafc", outline="#e2e8f0", width=2)

    f_lbl = _get_font(bold=True, size=26)
    f_val = _get_font(bold=False, size=26)

    rows = [
        ("👨‍⚕️ Doctor:", f"Dr. {doctor_name.replace('Dr. ', '').strip()}", "#1e293b", False),
        ("📋 Slip No:", slip_number, "#0c3a4f", True),
        ("📅 Date:", visit_date, "#1e293b", False),
        ("⏰ Time:", slot_time, "#1e293b", True),
    ]

    ry = by + 28
    for label, val, color, is_bold in rows:
        draw.text((bx + 35, ry), label, fill="#475569", font=f_lbl)
        vf = _get_font(bold=is_bold, size=26)
        draw.text((bx + 210, ry), val[:34], fill=color, font=vf)
        ry += 52

    # Status Pill: Pending Confirmation
    py = ry + 8
    draw.text((bx + 35, py), "📌 Status:", fill="#475569", font=f_lbl)
    draw.rounded_rectangle((bx + 210, py - 4, bx + 490, py + 40), radius=14, fill="#f97316")
    draw.text((bx + 230, py + 4), "⏳ Pending Confirmation", fill="#ffffff", font=_get_font(bold=True, size=20))

    # Advisory Box
    ny = 755
    draw.rounded_rectangle((60, ny, W - 60, ny + 95), radius=16, fill="#f0f9ff", outline="#bae6fd", width=2)
    f_note = _get_font(bold=False, size=22)
    draw.text((95, ny + 20), "ℹ️  Our team will confirm shortly.", fill="#0369a1", font=_get_font(bold=True, size=22))
    draw.text((130, ny + 52), "Please wait for your official confirmation message.", fill="#0369a1", font=f_note)

    _draw_footer(draw, W, H)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


def generate_confirmed_card(patient_name: str, doctor_name: str, visit_date: str, slot_time: str, slip_number: str, token_number: Optional[Any] = None) -> bytes:
    """Template 3: Appointment Confirmed Card."""
    W, H = 850, 1020
    img, draw = _create_base_canvas(W, H)
    _draw_header(draw, W, "CLINIC • APPOINTMENT CONFIRMATION")

    # Big Green Confirmed Banner
    cy = 190
    draw.rounded_rectangle((70, cy, W - 70, cy + 85), radius=22, fill="#ecfdf5", outline="#10b981", width=3)
    f_conf = _get_font(bold=True, size=36)
    c_txt = "✅  Appointment Confirmed"
    draw.text(((W - f_conf.getbbox(c_txt)[2]) // 2, cy + 20), c_txt, fill="#047857", font=f_conf)

    # Details Box
    bx, by, bw, bh = 60, 310, W - 120, 420
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=20, fill="#ffffff", outline="#cbd5e1", width=2)

    f_lbl = _get_font(bold=True, size=26)

    rows = [
        ("👤 Patient:", patient_name.title(), "#1e293b", True),
        ("👨‍⚕️ Doctor:", f"Dr. {doctor_name.replace('Dr. ', '').strip()}", "#1e293b", False),
        ("📅 Date:", visit_date, "#1e293b", False),
        ("⏰ Time:", slot_time, "#1e293b", True),
        ("📋 Slip No:", slip_number, "#0c3a4f", True),
    ]

    if token_number:
        rows.append(("🎫 Token No:", f"#{token_number}", "#047857", True))

    ry = by + 30
    for label, val, color, is_bold in rows:
        draw.text((bx + 35, ry), label, fill="#475569", font=f_lbl)
        vf = _get_font(bold=is_bold, size=26)
        draw.text((bx + 220, ry), str(val)[:34], fill=color, font=vf)
        ry += 54

    # Advisory Box
    ny = 760
    draw.rounded_rectangle((60, ny, W - 60, ny + 85), radius=16, fill="#f0fdf4", outline="#86efac", width=2)
    f_note = _get_font(bold=True, size=22)
    draw.text((95, ny + 28), "ℹ️  Please arrive 15 minutes early • Bring CNIC and Slip", fill="#166534", font=f_note)

    _draw_footer(draw, W, H)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


def generate_reminder_card(patient_name: str, doctor_name: str, visit_date: str, slot_time: str, slip_number: str) -> bytes:
    """Template 4: Appointment Reminder Card."""
    W, H = 850, 1020
    img, draw = _create_base_canvas(W, H)
    _draw_header(draw, W, "CLINIC • APPOINTMENT REMINDER")

    # Bell & Clock Icon
    draw.ellipse(((W // 2) - 45, 195, (W // 2) + 45, 285), fill="#eff6ff", outline="#3b82f6", width=3)
    f_icon = _get_font(bold=True, size=40)
    draw.text(((W // 2) - 22, 218), "🔔", fill="#1d4ed8", font=f_icon)

    # Heading
    f_h1 = _get_font(bold=True, size=40)
    h_txt = "Appointment Reminder"
    draw.text(((W - f_h1.getbbox(h_txt)[2]) // 2, 305), h_txt, fill="#0f172a", font=f_h1)

    # Details Box
    bx, by, bw, bh = 60, 375, W - 120, 275
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=20, fill="#f8fafc", outline="#e2e8f0", width=2)

    f_lbl = _get_font(bold=True, size=26)

    rows = [
        ("👤 Patient:", patient_name.title(), "#1e293b", True),
        ("👨‍⚕️ Doctor:", f"Dr. {doctor_name.replace('Dr. ', '').strip()}", "#1e293b", False),
        ("📋 Slip No:", slip_number, "#0c3a4f", True),
        ("📅 Date:", visit_date, "#1e293b", False),
        ("⏰ Time:", slot_time, "#1e293b", True),
    ]

    ry = by + 26
    for label, val, color, is_bold in rows:
        draw.text((bx + 35, ry), label, fill="#475569", font=f_lbl)
        vf = _get_font(bold=is_bold, size=26)
        draw.text((bx + 210, ry), val[:34], fill=color, font=vf)
        ry += 48

    # Highlight Pill: Reminder: Tomorrow at ...
    hy = 675
    draw.rounded_rectangle((60, hy, W - 60, hy + 75), radius=16, fill="#fef3c7", outline="#f59e0b", width=2)
    f_high = _get_font(bold=True, size=24)
    draw.text((105, hy + 24), f"⏰  Reminder: Scheduled for {slot_time} ({visit_date})", fill="#92400e", font=f_high)

    # Advisory Box
    ny = 770
    draw.rounded_rectangle((60, ny, W - 60, ny + 85), radius=16, fill="#eff6ff", outline="#bfdbfe", width=2)
    f_note = _get_font(bold=False, size=22)
    draw.text((95, ny + 26), "ℹ️  Note: Please arrive 15 mins early. Bring CNIC and Slip.", fill="#1e40af", font=f_note)

    _draw_footer(draw, W, H)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


def generate_rescheduled_card(patient_name: str, doctor_name: str, slip_number: str, old_date: str, old_time: str, new_date: str, new_time: str) -> bytes:
    """Template 5: Appointment Rescheduled Card."""
    W, H = 850, 1020
    img, draw = _create_base_canvas(W, H)
    _draw_header(draw, W, "CLINIC • APPOINTMENT UPDATE")

    # Calendar icon with arrow
    draw.ellipse(((W // 2) - 45, 195, (W // 2) + 45, 285), fill="#f0fdf4", outline="#10b981", width=3)
    f_icon = _get_font(bold=True, size=40)
    draw.text(((W // 2) - 22, 218), "📅", fill="#047857", font=f_icon)

    # Heading
    f_h1 = _get_font(bold=True, size=40)
    h_txt = "Appointment Rescheduled"
    draw.text(((W - f_h1.getbbox(h_txt)[2]) // 2, 305), h_txt, fill="#0f172a", font=f_h1)

    # Details Box
    bx, by, bw, bh = 60, 375, W - 120, 190
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=20, fill="#f8fafc", outline="#e2e8f0", width=2)

    f_lbl = _get_font(bold=True, size=26)
    f_val = _get_font(bold=False, size=26)

    draw.text((bx + 35, by + 28), "👤 Patient:", fill="#475569", font=f_lbl)
    draw.text((bx + 210, by + 28), patient_name.title(), fill="#0f172a", font=_get_font(bold=True, size=26))

    draw.text((bx + 35, by + 80), "👨‍⚕️ Doctor:", fill="#475569", font=f_lbl)
    draw.text((bx + 210, by + 80), f"Dr. {doctor_name.replace('Dr. ', '').strip()}", fill="#334155", font=f_val)

    draw.text((bx + 35, by + 132), "📋 Slip No:", fill="#475569", font=f_lbl)
    draw.text((bx + 210, by + 132), slip_number, fill="#0c3a4f", font=_get_font(bold=True, size=26))

    # Old Date vs New Date Cards side by side
    cy = 585
    card_w = (W - 140) // 2
    # Old Date Box (Slate)
    draw.rounded_rectangle((60, cy, 60 + card_w, cy + 140), radius=16, fill="#f1f5f9", outline="#cbd5e1", width=2)
    draw.text((80, cy + 18), "Old Date:", fill="#64748b", font=_get_font(bold=True, size=20))
    draw.text((80, cy + 50), old_date, fill="#334155", font=_get_font(bold=True, size=22))
    draw.text((80, cy + 82), old_time, fill="#64748b", font=_get_font(bold=False, size=20))

    # New Date Box (Orange)
    nx = 60 + card_w + 20
    draw.rounded_rectangle((nx, cy, nx + card_w, cy + 140), radius=16, fill="#fff7ed", outline="#f97316", width=2)
    draw.text((nx + 20, cy + 18), "New Date:", fill="#ea580c", font=_get_font(bold=True, size=20))
    draw.text((nx + 20, cy + 50), new_date, fill="#c2410c", font=_get_font(bold=True, size=22))
    draw.text((nx + 20, cy + 82), new_time, fill="#ea580c", font=_get_font(bold=True, size=20))

    # Advisory Box
    ny = 750
    draw.rounded_rectangle((60, ny, W - 60, ny + 95), radius=16, fill="#f0fdf4", outline="#86efac", width=2)
    f_note = _get_font(bold=False, size=22)
    draw.text((95, ny + 20), "ℹ️  Note: Your appointment has been moved to a new time.", fill="#166534", font=_get_font(bold=True, size=22))
    draw.text((130, ny + 52), "Please arrive 15 minutes early.", fill="#166534", font=f_note)

    _draw_footer(draw, W, H)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


def generate_cancelled_card(patient_name: str, doctor_name: str, slip_number: str, visit_date: str, slot_time: str) -> bytes:
    """Template 6: Appointment Cancelled Card."""
    W, H = 850, 1020
    img, draw = _create_base_canvas(W, H)
    _draw_header(draw, W, "CLINIC • APPOINTMENT NOTICE")

    # Big Red Cross Badge
    draw.ellipse(((W // 2) - 45, 195, (W // 2) + 45, 285), fill="#fef2f2", outline="#ef4444", width=3)
    f_icon = _get_font(bold=True, size=40)
    draw.text(((W // 2) - 22, 218), "❌", fill="#dc2626", font=f_icon)

    # Heading
    f_h1 = _get_font(bold=True, size=40)
    h_txt = "Appointment Cancelled"
    draw.text(((W - f_h1.getbbox(h_txt)[2]) // 2, 305), h_txt, fill="#0f172a", font=f_h1)

    # Details Box
    bx, by, bw, bh = 60, 375, W - 120, 310
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=20, fill="#f8fafc", outline="#e2e8f0", width=2)

    f_lbl = _get_font(bold=True, size=26)
    f_val = _get_font(bold=False, size=26)

    rows = [
        ("👤 Patient:", patient_name.title(), "#1e293b", True),
        ("👨‍⚕️ Doctor:", f"Dr. {doctor_name.replace('Dr. ', '').strip()}", "#1e293b", False),
        ("📋 Slip No:", slip_number, "#0c3a4f", True),
        ("📅 Date:", visit_date, "#1e293b", False),
        ("⏰ Time:", slot_time, "#1e293b", True),
    ]

    ry = by + 24
    for label, val, color, is_bold in rows:
        draw.text((bx + 35, ry), label, fill="#475569", font=f_lbl)
        vf = _get_font(bold=is_bold, size=26)
        draw.text((bx + 210, ry), val[:34], fill=color, font=vf)
        ry += 48

    # Status Pill: Cancelled
    py = ry + 8
    draw.text((bx + 35, py), "📌 Status:", fill="#475569", font=f_lbl)
    draw.rounded_rectangle((bx + 210, py - 4, bx + 370, py + 38), radius=14, fill="#ef4444")
    draw.text((bx + 235, py + 4), "🛑 Cancelled", fill="#ffffff", font=_get_font(bold=True, size=20))

    # Advisory Box
    ny = 750
    draw.rounded_rectangle((60, ny, W - 60, ny + 95), radius=16, fill="#fef2f2", outline="#fca5a5", width=2)
    f_note = _get_font(bold=False, size=22)
    draw.text((95, ny + 20), "ℹ️  Your appointment has been cancelled.", fill="#991b1b", font=_get_font(bold=True, size=22))
    draw.text((130, ny + 52), "To book a new appointment, please visit dikhancare.io", fill="#991b1b", font=f_note)

    _draw_footer(draw, W, H)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()
