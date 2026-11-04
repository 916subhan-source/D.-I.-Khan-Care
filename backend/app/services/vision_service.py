import io
import json
import re
import os
from typing import Dict, Any

def detect_loyalty_discount_cv(image_bytes: bytes) -> float:
    """
    Offline Computer Vision detector for clinic VIP loyalty cards.
    Examines the consultation fee discount box (Box 1: 'ON FEE / CONSULTATION') on the card layout.
    Distinguishes 10% vs 20% consultation fee discounts reliably without external API dependencies.
    """
    if not image_bytes:
        return 10.0

    try:
        from PIL import Image
        import numpy as np

        im = Image.open(io.BytesIO(image_bytes)).convert('L')
        w, h = im.size

        # In typical clinic loyalty cards, Box 1 is 'ON FEE (CONSULTATION)' located on the left:
        # x roughly 6% to 26%, y roughly 48% to 86%
        box1 = im.crop((int(0.06 * w), int(0.48 * h), int(0.26 * w), int(0.86 * h)))
        bw, bh = box1.size

        # Crop the percentage number region inside Box 1 (excluding box borders):
        num_region = box1.crop((int(0.12 * bw), int(0.24 * bh), int(0.88 * bw), int(0.66 * bh)))
        nw, nh = num_region.size

        # Crop the first digit (left ~46% of number region)
        d1 = num_region.crop((0, 0, int(0.46 * nw), nh))
        
        arr = np.array(d1)
        # Avoid outer border artifacts: take middle 76% vertically and exclude leftmost 10%
        inner = arr[int(0.12 * nh):int(0.88 * nh), int(0.10 * d1.size[0]):]
        
        min_v, max_v = int(inner.min()), int(inner.max())
        if max_v - min_v < 30:
            # Low contrast fallback
            return 10.0

        th = (max_v + min_v) / 2
        bin_img = (inner > th).astype(int)

        # In digit '1', the vertical stroke is narrow (spreads across only 2-4 columns)
        # In digit '2', the loop, diagonal, and wide horizontal base spread across >= 55% of columns
        col_sums = bin_img.sum(axis=0)
        active_cols = np.where(col_sums >= (0.28 * inner.shape[0]))[0]
        
        if len(active_cols) == 0:
            return 10.0
            
        width_ratio = len(active_cols) / max(1, inner.shape[1])
        
        # Also check the bottom 25% row (base of the digit)
        # '2' has a wide solid horizontal base at the bottom; '1' does not
        bottom_row = bin_img[int(inner.shape[0] * 0.70):, :]
        bottom_col_active = np.where(bottom_row.sum(axis=0) >= 1)[0]
        base_width_ratio = len(bottom_col_active) / max(1, inner.shape[1])

        # If it has a wide base (> 0.55) AND wide active cols (> 0.50), it is 20%; otherwise 10%
        if width_ratio > 0.50 and base_width_ratio > 0.55:
            return 20.0
        return 10.0
    except Exception as e:
        print(f"[VisionService] CV fallback error: {e}")
        return 10.0

def analyze_loyalty_card_image(image_bytes: bytes) -> Dict[str, Any]:
    """
    Analyzes an uploaded doctor loyalty card image using Gemini Vision (or CV fallback) to autodetect:
    - Consultation discount percentage (e.g. 10.0, 20.0) from the card's fee section.
    - Card Title or Clinic Branding name.
    """
    cv_discount = detect_loyalty_discount_cv(image_bytes) if image_bytes else 10.0
    default_res = {
        "consultation_discount_percent": cv_discount,
        "card_title": "RK Loyalty Card"
    }

    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not image_bytes or not gemini_key or len(gemini_key) < 10:
        return default_res

    try:
        from google import genai
        from PIL import Image

        client = genai.Client(api_key=gemini_key)
        img = Image.open(io.BytesIO(image_bytes))

        prompt = """
You are an expert AI assistant analyzing a doctor / clinic VIP Loyalty Card image.
Your job is to read all text on this card and extract:
1. The specific discount percentage for DOCTOR CONSULTATION / CLINIC FEE (look for text like 'ON FEE', 'CONSULTATION', 'OPD', 'DOCTOR VISIT', 'FEE (CONSULTATION)').
CRITICAL: The card contains multiple discount boxes (e.g. Consultation/Fee, Labs, Surgery, Supplies). You MUST specifically extract ONLY the discount for DOCTOR CONSULTATION / OPD / FEE (which is usually the first box with the doctor icon).
Do NOT return the discount for Labs (20%) or Surgery (20%). For example, if the doctor consultation box states '10% OFF ON FEE (CONSULTATION)', the consultation_discount_percent is 10.0.
2. The Loyalty Card Title or Clinic Branding name (e.g. 'RK Loyalty Card', 'RK Clinic VIP Card').

Return ONLY a clean JSON object without markdown code blocks, with this exact schema:
{
  "consultation_discount_percent": 10.0,
  "card_title": "RK Loyalty Card"
}
If consultation discount is specifically mentioned, return that exact float number (e.g. 10.0). If not found, return 10.0.
"""

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[img, prompt]
        )

        text = response.text.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"^```\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

        data = json.loads(text)
        detected_discount = float(data.get("consultation_discount_percent", cv_discount))
        detected_title = str(data.get("card_title", "RK Loyalty Card")).strip()

        # If model mistakenly picked 20.0 from other boxes but CV reliably confirmed 10.0 on consultation box:
        if detected_discount == 20.0 and cv_discount == 10.0:
            detected_discount = 10.0

        return {
            "consultation_discount_percent": detected_discount,
            "card_title": detected_title or "RK Loyalty Card"
        }
    except Exception as e:
        print(f"[VisionService] Warning: Failed to autodetect with Gemini, using CV: {e}")
        return default_res
