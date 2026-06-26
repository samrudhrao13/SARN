import os
import tempfile
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load from sds-scanner/.env first, fall back to backend/.env
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"), override=False)

from utils.pdf_text   import extract_text, is_scanned_pdf
from utils.pdf_images import render_pages_to_images
from utils.pictogram  import detect_pictograms
from utils.groq_llm   import extract_fields_with_groq

app = Flask(__name__)
# Allow requests from the Vite dev server and any localhost origin
CORS(app, origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5050"])
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB max upload


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/scan", methods=["POST"])
def scan():
    if "pdf" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    f = request.files["pdf"]
    if not f or f.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not f.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are accepted"}), 400

    # Save to a temp file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    f.save(tmp.name)
    tmp.close()

    try:
        # ── Step 1: Text extraction ──────────────────────────────────────
        text    = extract_text(tmp.name)
        scanned = is_scanned_pdf(text)

        # ── Step 2: OpenCV pictogram detection ───────────────────────────
        pages          = render_pages_to_images(tmp.name, dpi=150)
        opencv_result  = detect_pictograms(pages)

        # ── Step 3: Groq LLM field extraction ────────────────────────────
        if scanned:
            groq_result = {
                "error": (
                    "This appears to be a scanned (image-only) PDF. "
                    "Text extraction returned fewer than 200 characters. "
                    "A vision-capable API is required for full extraction."
                ),
                "is_scanned": True,
            }
        else:
            groq_result = extract_fields_with_groq(text, opencv_result)

        return jsonify({
            "ok":          True,
            "filename":    f.filename,
            "is_scanned":  scanned,
            "text_chars":  len(text),
            "page_count":  len(pages),
            "opencv":      opencv_result,
            "fields":      groq_result,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


if __name__ == "__main__":
    print("SDS Scanner running at http://localhost:5050")
    app.run(debug=True, port=5050)
