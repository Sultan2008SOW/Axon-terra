import os
import smtplib
import uuid
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from functools import wraps

from dotenv import load_dotenv
from flask import (
    Flask,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
    make_response,
    send_from_directory,
)
from flask_wtf import CSRFProtect
from werkzeug.exceptions import NotFound
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from forms import ContactForm, LoginForm, MediaForm, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS
from models import (
    STATUS_CHOICES,
    STATUS_NEW,
    STATUS_READ,
    ContactMessage,
    MediaItem,
    MEDIA_TYPE_IMAGE,
    MEDIA_TYPE_VIDEO,
    db,
)

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "axonterra-dev-secret-change-me")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///" + os.path.join(BASE_DIR, "instance", "axonterra.db")
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

os.makedirs(os.path.join(BASE_DIR, "instance"), exist_ok=True)

UPLOAD_FOLDER = os.path.join(BASE_DIR, "instance", "uploads", "media")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 60 * 1024 * 1024  # 60 Mo max par fichier

db.init_app(app)
csrf = CSRFProtect(app)

with app.app_context():
    db.create_all()

# ---------------------------------------------------------------------------
# Admin credentials (via variables d'environnement — voir .env.example)
# ---------------------------------------------------------------------------
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "contact@axonterra.org")
ADMIN_PASSWORD_HASH = os.environ.get("ADMIN_PASSWORD_HASH")
if not ADMIN_PASSWORD_HASH:
    if os.environ.get("RENDER"):
        raise RuntimeError("ADMIN_PASSWORD_HASH doit être configuré sur Render.")
    # Identifiants de développement par défaut : contact@axonterra.org / admin123
    # À changer impérativement en production via ADMIN_PASSWORD_HASH.
    ADMIN_PASSWORD_HASH = generate_password_hash("admin123")

# ---------------------------------------------------------------------------
# Anti-spam : limitation simple des soumissions par IP (en mémoire)
# ---------------------------------------------------------------------------
RATE_LIMIT_WINDOW = timedelta(minutes=15)
RATE_LIMIT_MAX = 5
_submission_log = {}


def is_rate_limited(ip_address):
    now = datetime.utcnow()
    timestamps = [t for t in _submission_log.get(ip_address, []) if now - t < RATE_LIMIT_WINDOW]
    _submission_log[ip_address] = timestamps
    if len(timestamps) >= RATE_LIMIT_MAX:
        return True
    timestamps.append(now)
    _submission_log[ip_address] = timestamps
    return False


def get_client_ip():
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


def notify_admin_by_email(contact_message):
    """Envoie une notification email si les variables SMTP sont configurées.
    Échoue silencieusement (avec log console) si l'email n'est pas configurable —
    l'enregistrement en base de données reste la source de vérité."""
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    notify_to = os.environ.get("ADMIN_NOTIFY_EMAIL")
    if not (smtp_host and smtp_user and smtp_password and notify_to):
        return
    try:
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        body = (
            f"Nouveau message de contact reçu sur AxonTerra.\n\n"
            f"Nom : {contact_message.name}\n"
            f"Organisation : {contact_message.organization or '—'}\n"
            f"Email : {contact_message.email}\n"
            f"Téléphone : {contact_message.phone or '—'}\n"
            f"Sujet : {contact_message.subject}\n\n"
            f"Message :\n{contact_message.message}\n"
        )
        mail = MIMEText(body, "plain", "utf-8")
        mail["Subject"] = f"[AxonTerra] Nouveau contact : {contact_message.subject}"
        mail["From"] = smtp_user
        mail["To"] = notify_to
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, [notify_to], mail.as_string())
    except Exception as exc:  # pragma: no cover - ne doit jamais casser le formulaire
        app.logger.warning("Échec de l'envoi de la notification email : %s", exc)


def login_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("admin_login", next=request.path))
        return view_func(*args, **kwargs)

    return wrapped


# ---------------------------------------------------------------------------
# Site public
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    form = ContactForm()
    media_by_section = {}
    for item in MediaItem.query.order_by(MediaItem.display_order, MediaItem.created_at).all():
        media_by_section.setdefault(item.section, []).append(item)
    return render_template("index.html", form=form, media_by_section=media_by_section)


@app.route("/contact", methods=["POST"])
def contact():
    form = ContactForm()

    if form.hp_check.data:
        # Honeypot rempli => bot. On répond succès (silencieux) sans rien enregistrer.
        flash("Votre message a été envoyé. Merci !", "success")
        return redirect(url_for("index") + "#contact")

    ip_address = get_client_ip()
    if is_rate_limited(ip_address):
        flash(
            "Trop de tentatives d'envoi. Merci de réessayer dans quelques minutes.",
            "error",
        )
        return redirect(url_for("index") + "#contact")

    if not form.validate_on_submit():
        for field_errors in form.errors.values():
            for err in field_errors:
                flash(err, "error")
        flash("Merci de corriger les champs indiqués et de réessayer.", "error")
        return redirect(url_for("index") + "#contact")

    contact_message = ContactMessage(
        name=form.name.data.strip(),
        organization=(form.organization.data or "").strip() or None,
        email=form.email.data.strip(),
        phone=(form.phone.data or "").strip() or None,
        subject=form.subject.data.strip(),
        message=form.message.data.strip(),
        status=STATUS_NEW,
        ip_address=ip_address,
    )
    db.session.add(contact_message)
    db.session.commit()

    notify_admin_by_email(contact_message)

    flash(
        "Merci ! Votre message a bien été envoyé. Notre équipe vous répondra rapidement.",
        "success",
    )
    return redirect(url_for("index") + "#contact")


@app.route("/robots.txt")
def robots_txt():
    content = """User-agent: *
Allow: /
Sitemap: https://www.axonterra.org/sitemap.xml
"""
    resp = make_response(content)
    resp.headers["Content-Type"] = "text/plain; charset=utf-8"
    return resp


@app.route("/sitemap.xml")
def sitemap_xml():
    content = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.axonterra.org/</loc>
    <lastmod>2026-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
"""
    resp = make_response(content)
    resp.headers["Content-Type"] = "application/xml; charset=utf-8"
    return resp


@app.route("/uploads/media/<filename>")
def uploaded_media(filename):
    try:
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)
    except NotFound:
        legacy_folder = os.path.join(BASE_DIR, "static", "uploads", "media")
        return send_from_directory(legacy_folder, filename)


# ---------------------------------------------------------------------------
# Administration
# ---------------------------------------------------------------------------
@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if session.get("admin_logged_in"):
        return redirect(url_for("admin_dashboard"))

    form = LoginForm()
    if form.validate_on_submit():
        username_ok = form.username.data.strip() == ADMIN_USERNAME
        password_ok = check_password_hash(ADMIN_PASSWORD_HASH, form.password.data)
        if username_ok and password_ok:
            session["admin_logged_in"] = True
            session["admin_username"] = ADMIN_USERNAME
            next_url = request.args.get("next") or url_for("admin_dashboard")
            return redirect(next_url)
        flash("Identifiant ou mot de passe incorrect.", "error")

    return render_template("admin/login.html", form=form)


@app.route("/admin/logout")
def admin_logout():
    session.clear()
    return redirect(url_for("admin_login"))


@app.route("/admin")
@login_required
def admin_dashboard():
    status_filter = request.args.get("status", "").strip()
    query_text = request.args.get("q", "").strip()

    query = ContactMessage.query
    if status_filter in STATUS_CHOICES:
        query = query.filter(ContactMessage.status == status_filter)
    if query_text:
        like = f"%{query_text}%"
        query = query.filter(
            db.or_(
                ContactMessage.name.ilike(like),
                ContactMessage.organization.ilike(like),
                ContactMessage.email.ilike(like),
                ContactMessage.subject.ilike(like),
            )
        )
    messages = query.order_by(ContactMessage.created_at.desc()).all()
    unread_count = ContactMessage.query.filter_by(status=STATUS_NEW).count()

    return render_template(
        "admin/dashboard.html",
        messages=messages,
        unread_count=unread_count,
        status_filter=status_filter,
        query_text=query_text,
        status_choices=STATUS_CHOICES,
    )


@app.route("/admin/messages/<int:message_id>")
@login_required
def admin_message_detail(message_id):
    contact_message = ContactMessage.query.get_or_404(message_id)
    if contact_message.status == STATUS_NEW:
        contact_message.status = STATUS_READ
        db.session.commit()
    return render_template("admin/detail.html", message=contact_message)


@app.route("/admin/messages/<int:message_id>/status", methods=["POST"])
@login_required
def admin_message_status(message_id):
    contact_message = ContactMessage.query.get_or_404(message_id)
    new_status = request.form.get("status")
    if new_status in STATUS_CHOICES:
        contact_message.status = new_status
        db.session.commit()
        flash("Statut mis à jour.", "success")
    return redirect(url_for("admin_message_detail", message_id=message_id))


@app.route("/admin/messages/<int:message_id>/delete", methods=["POST"])
@login_required
def admin_message_delete(message_id):
    contact_message = ContactMessage.query.get_or_404(message_id)
    db.session.delete(contact_message)
    db.session.commit()
    flash("Message supprimé.", "success")
    return redirect(url_for("admin_dashboard"))


# ---------------------------------------------------------------------------
# Administration — Médias (images / vidéos)
# ---------------------------------------------------------------------------
def _guess_media_type(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in VIDEO_EXTENSIONS:
        return MEDIA_TYPE_VIDEO
    return MEDIA_TYPE_IMAGE


@app.route("/admin/media", methods=["GET", "POST"])
@login_required
def admin_media():
    form = MediaForm()

    if form.validate_on_submit():
        uploaded_file = form.file.data
        original_name = secure_filename(uploaded_file.filename)
        ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
        unique_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
        uploaded_file.save(os.path.join(app.config["UPLOAD_FOLDER"], unique_name))

        media_item = MediaItem(
            media_type=_guess_media_type(original_name),
            section=form.section.data,
            title=(form.title.data or "").strip() or None,
            filename=unique_name,
        )
        db.session.add(media_item)
        db.session.commit()
        flash("Média ajouté avec succès.", "success")
        return redirect(url_for("admin_media"))

    items = MediaItem.query.order_by(MediaItem.section, MediaItem.display_order, MediaItem.created_at.desc()).all()
    return render_template("admin/media.html", form=form, items=items)


@app.route("/admin/media/<int:media_id>/delete", methods=["POST"])
@login_required
def admin_media_delete(media_id):
    media_item = MediaItem.query.get_or_404(media_id)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], media_item.filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            app.logger.warning("Impossible de supprimer le fichier média : %s", file_path)
    db.session.delete(media_item)
    db.session.commit()
    flash("Média supprimé.", "success")
    return redirect(url_for("admin_media"))


if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
