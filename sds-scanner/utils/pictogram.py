import cv2
import numpy as np
import os

# All 9 standard GHS pictogram labels
GHS_LABELS = {
    "GHS01": "Exploding Bomb",
    "GHS02": "Flame",
    "GHS03": "Flame Over Circle (Oxidizer)",
    "GHS04": "Compressed Gas",
    "GHS05": "Corrosion",
    "GHS06": "Skull and Crossbones (Toxic)",
    "GHS07": "Exclamation Mark (Harmful/Irritant)",
    "GHS08": "Health Hazard (Serious)",
    "GHS09": "Environmental Hazard",
}

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "..", "ghs_templates")


def _load_templates() -> dict:
    """
    Load GHS reference PNG/JPG images from ghs_templates/ folder.
    Files should be named: ghs01.png, ghs02.png ... ghs09.png
    If the folder is empty the app still runs in shape-detection-only mode.
    """
    templates = {}
    if not os.path.isdir(TEMPLATE_DIR):
        return templates
    for ghs_id in GHS_LABELS:
        for ext in (".png", ".jpg", ".jpeg"):
            path = os.path.join(TEMPLATE_DIR, f"{ghs_id.lower()}{ext}")
            if os.path.exists(path):
                img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
                if img is not None:
                    templates[ghs_id] = cv2.resize(img, (80, 80))
                break
    return templates


def _detect_red_diamonds(img_bgr: np.ndarray) -> list:
    """
    Detect red-bordered diamond shapes in a BGR image.
    GHS pictograms always have a thick red diamond border.
    Returns list of (x, y, w, h) bounding boxes.
    """
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

    # Red wraps around in HSV — two ranges needed
    lo1, hi1 = np.array([0,   100, 80]),  np.array([10,  255, 255])
    lo2, hi2 = np.array([160, 100, 80]),  np.array([180, 255, 255])
    red_mask = cv2.bitwise_or(
        cv2.inRange(hsv, lo1, hi1),
        cv2.inRange(hsv, lo2, hi2),
    )

    # Close small gaps in the red border
    k = np.ones((5, 5), np.uint8)
    red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, k)
    red_mask = cv2.dilate(red_mask, k, iterations=2)

    contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    diamonds = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 600:
            continue

        peri   = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.05 * peri, True)

        # Diamond = 4 vertices, roughly square bounding box
        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(cnt)
            aspect = w / h if h > 0 else 0
            if 0.5 < aspect < 2.0 and area > 600:
                diamonds.append((x, y, w, h))

    return diamonds


def _match_against_templates(roi_gray: np.ndarray, templates: dict) -> tuple:
    """
    Template-match a cropped diamond region against known GHS templates.
    Returns (ghs_id, confidence_pct) or (None, 0).
    """
    roi = cv2.resize(roi_gray, (80, 80))
    best_id    = None
    best_score = 0.0

    for ghs_id, tmpl in templates.items():
        res   = cv2.matchTemplate(roi, tmpl, cv2.TM_CCOEFF_NORMED)
        score = float(res.max())
        if score > best_score:
            best_score = score
            best_id    = ghs_id

    # Only accept matches above 35% confidence (lower = too many false positives)
    if best_score >= 0.35:
        return best_id, round(best_score * 100, 1)
    return None, round(best_score * 100, 1)


def detect_pictograms(page_images: list) -> dict:
    """
    Main entry point.  Runs on a list of numpy RGB page images.

    Mode A — shape detection only (no templates in ghs_templates/):
      Finds and counts red diamonds, reports their page + position.

    Mode B — template matching (PNG files present in ghs_templates/):
      Also identifies WHICH GHS symbol each diamond contains.
    """
    templates     = _load_templates()
    has_templates = len(templates) > 0
    detections    = []
    identified_ids = set()

    for page_num, img_rgb in enumerate(page_images):
        # Convert to BGR for OpenCV
        img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
        gray    = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

        diamonds = _detect_red_diamonds(img_bgr)

        for (x, y, w, h) in diamonds:
            entry = {
                "page":     page_num + 1,
                "position": f"x={x} y={y}  {w}×{h}px",
                "ghs_id":   None,
                "label":    None,
                "confidence": None,
            }

            if has_templates:
                roi = gray[max(0, y):y + h, max(0, x):x + w]
                if roi.size > 0:
                    ghs_id, conf = _match_against_templates(roi, templates)
                    if ghs_id:
                        entry["ghs_id"]     = ghs_id
                        entry["label"]      = GHS_LABELS[ghs_id]
                        entry["confidence"] = f"{conf}%"
                        identified_ids.add(ghs_id)

            detections.append(entry)

    mode = "template_matching" if has_templates else "shape_detection_only"

    return {
        "count":          len(detections),
        "mode":           mode,
        "has_templates":  has_templates,
        "detections":     detections,
        "identified":     [
            {"id": gid, "label": GHS_LABELS[gid]}
            for gid in sorted(identified_ids)
        ],
        "template_tip": (
            None if has_templates
            else (
                "Place GHS reference images (ghs01.png … ghs09.png) in the "
                "ghs_templates/ folder to enable full pictogram identification. "
                "Download from: https://unece.org/transport/dangerous-goods/ghs-pictograms"
            )
        ),
    }
