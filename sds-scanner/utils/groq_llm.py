import os
import json
from groq import Groq

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# Best free Groq model for structured extraction
MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are an expert chemist and Safety Data Sheet (SDS/MSDS) analyst.
Your job is to carefully read SDS document text and extract specific fields.
Always return ONLY valid JSON — no markdown, no explanation, just the JSON object.
If a field is not found in the document, use null.
For list fields, return an empty array [] if nothing is found."""

EXTRACTION_PROMPT = """Extract the following fields from this Safety Data Sheet text and return as JSON.

REQUIRED JSON STRUCTURE:
{{
  "manufacturer_name": "string or null",
  "city": "string or null",
  "state": "string or null",
  "zip": "string or null",
  "email": "string or null",
  "contact": "string or null — main phone number",
  "emergency": "string or null — emergency contact number (CHEMTREC etc.)",
  "ghs_pictograms": ["list of GHS pictogram names found in Section 2 and Section 14"],
  "chemical_name": "string or null — primary chemical/product name",
  "product_number": "string or null — product/catalog/part number",
  "trade_names": ["list of trade names or synonyms, empty array if none"],
  "composition": [
    {{
      "name": "ingredient name",
      "cas": "CAS number or null",
      "percentage": "percentage or range or null"
    }}
  ],
  "voc_content": "string or null — VOC content value with units",
  "solid_content": "string or null — solid content value with units"
}}

IMPORTANT NOTES:
- GHS pictograms are found in Section 2 (Hazard Identification) and Section 14 (Transport).
  Common names: Flame, Corrosion, Skull and Crossbones, Exclamation Mark, Health Hazard,
  Exploding Bomb, Oxidizer (Flame over Circle), Compressed Gas, Environmental Hazard.
- Emergency numbers are often labeled CHEMTREC, INFOTRAC, or similar.
- Composition is in Section 3. Include ALL components listed.
- VOC and Solid Content may be in Section 9 (Physical/Chemical Properties).

SDS TEXT:
---
{text}
---

Return ONLY the JSON object."""


def extract_fields_with_groq(text: str, opencv_result: dict = None) -> dict:
    """
    Send extracted PDF text to Groq LLaMA and get structured template fields back.
    """
    if not GROQ_API_KEY:
        return {"error": "GROQ_API_KEY not set in environment."}

    if not text or len(text.strip()) < 200:
        return {
            "error": "PDF appears to be scanned (image-based). Insufficient text for extraction.",
            "is_scanned": True,
        }

    # Truncate to ~12 000 chars to stay within free tier context limits
    # SDS Section 1–3 + 9 + 14 are the key sections, usually in the first 8 pages
    truncated = text[:12000]

    # Mention OpenCV findings in the prompt so Groq can cross-reference
    opencv_note = ""
    if opencv_result and opencv_result.get("count", 0) > 0:
        opencv_note = (
            f"\n\nNote: Image analysis detected {opencv_result['count']} GHS pictogram "
            f"diamond shape(s) in the PDF. Use this as a cross-reference when listing pictograms."
        )
        if opencv_result.get("identified"):
            ids = ", ".join(f"{d['id']} ({d['label']})" for d in opencv_result["identified"])
            opencv_note += f" OpenCV tentatively identified: {ids}."

    prompt = EXTRACTION_PROMPT.format(text=truncated + opencv_note)

    client = Groq(api_key=GROQ_API_KEY)
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
        temperature=0.05,   # low temperature = more deterministic, better for extraction
        max_tokens=2048,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    # Extract JSON object boundaries
    start = raw.find("{")
    end   = raw.rfind("}") + 1
    if start >= 0 and end > start:
        raw = raw[start:end]

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse failed: {e}", "raw_response": raw}
