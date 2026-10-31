import io
import json
import re
import os
from typing import Dict, Any
from google import genai
from PIL import Image

def analyze_loyalty_card_image(image_bytes: bytes) -> Dict[str, Any]:
    """
    Analyzes an uploaded doctor loyalty card image using Gemini Vision to autodetect:
    - Consultation discount percentage (e.g. 10.0, 20.0) from the card's fee section.
    - Card Title or Clinic Branding name.
    """
    default_res = {
        "consultation_discount_percent": 20.0,
        "card_title": "RK Loyalty Card"
    }

    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not image_bytes or not gemini_key:
        return default_res

    try:
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
            model="gemini-3.5-flash",
            contents=[img, prompt]
        )

        text = response.text.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"^```\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

        data = json.loads(text)
        detected_discount = float(data.get("consultation_discount_percent", 20.0))
        detected_title = str(data.get("card_title", "RK Loyalty Card")).strip()

        return {
            "consultation_discount_percent": detected_discount,
            "card_title": detected_title or "RK Loyalty Card"
        }
    except Exception as e:
        print(f"[VisionService] Warning: Failed to autodetect loyalty card info: {e}")
        return default_res
