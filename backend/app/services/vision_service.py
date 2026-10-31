import io
import json
import re
import os
import math
import statistics
from typing import Dict, Any

def detect_loyalty_discount_cv(image_bytes: bytes) -> float:
    """
    Offline Computer Vision detector for clinic VIP loyalty cards.
    Examines the consultation fee discount box on the card layout.
    Distinguishes 10% vs 20% fee discounts reliably without external API dependencies.
    """
    if not image_bytes:
        return 20.0

    try:
        from PIL import Image
        im = Image.open(io.BytesIO(image_bytes)).convert('L')
        w, h = im.size
        # Box 1 is 'ON FEE (CONSULTATION)'
        b = im.crop((int(0.06 * w), int(0.58 * h), int(0.26 * w), int(0.86 * h)))
        bw, bh = b.size
        
        # Crop the first digit area of the percentage number
        d = b.crop((int(0.10 * bw), int(0.12 * bh), int(0.48 * bw), int(0.58 * bh))).resize((30, 30))
        
        # Check pixel values across rows 14-26
        pixels = list(d.getdata())
        sorted_px = sorted(pixels)
        th_val = sorted_px[int(len(sorted_px) * 0.75)]
        
        xs = []
        for y in range(14, 27):
            for x in range(30):
                val = d.getpixel((x, y))
                if val >= th_val:
                    xs.append(x)
                    
        if len(xs) < 2:
            return 20.0
            
        x_std = statistics.pstdev(xs)
        # Thin vertical stroke of '1' has low horizontal standard deviation (< 4.5)
        # Curved shape of '2' has wide horizontal spread (>= 4.5)
        return 10.0 if x_std < 4.5 else 20.0
    except Exception as e:
        print(f"[VisionService] CV fallback error: {e}")
        return 20.0

def analyze_loyalty_card_image(image_bytes: bytes) -> Dict[str, Any]:
    """
    Analyzes an uploaded doctor loyalty card image using Gemini Vision (or CV fallback) to autodetect:
    - Consultation discount percentage (e.g. 10.0, 20.0) from the card's fee section.
    - Card Title or Clinic Branding name.
    """
    cv_discount = detect_loyalty_discount_cv(image_bytes) if image_bytes else 20.0
    default_res = {
        "consultation_discount_percent": cv_discount,
        "card_title": "RK Loyalty Card"
    }

    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    # Only invoke Gemini if key looks like an official Google AI Studio key (starts with AIzaSy)
    if not image_bytes or not gemini_key or not gemini_key.startswith("AIzaSy"):
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
2. The Loyalty Card Title or Clinic Branding name (e.g. 'RK Loyalty Card', 'RK Clinic VIP Card').

Return ONLY a clean JSON object without markdown code blocks, with this exact schema:
{
  "consultation_discount_percent": 20.0,
  "card_title": "RK Loyalty Card"
}
If consultation discount is specifically mentioned (e.g. 10%, 15%, 20%), return that exact float number. If not found, return 20.0.
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

        return {
            "consultation_discount_percent": detected_discount,
            "card_title": detected_title or "RK Loyalty Card"
        }
    except Exception as e:
        print(f"[VisionService] Warning: Failed to autodetect with Gemini, using CV: {e}")
        return default_res
