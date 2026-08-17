"""Modeles de donnees pour AXON-TERRA (contact + suivi des messages)."""
from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

STATUS_NEW = "nouveau"
STATUS_READ = "lu"
STATUS_PROCESSED = "traite"

STATUS_CHOICES = [STATUS_NEW, STATUS_READ, STATUS_PROCESSED]

STATUS_LABELS = {
    STATUS_NEW: "Nouveau",
    STATUS_READ: "Lu",
    STATUS_PROCESSED: "Traité",
}


class ContactMessage(db.Model):
    """Message envoyé depuis le formulaire de contact public."""

    __tablename__ = "contact_messages"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    organization = db.Column(db.String(150), nullable=True)
    email = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(40), nullable=True)
    subject = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default=STATUS_NEW)
    ip_address = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    @property
    def status_label(self):
        return STATUS_LABELS.get(self.status, self.status)


MEDIA_TYPE_IMAGE = "image"
MEDIA_TYPE_VIDEO = "video"
MEDIA_TYPES = [MEDIA_TYPE_IMAGE, MEDIA_TYPE_VIDEO]

MEDIA_SECTION_REALISATIONS = "realisations"
MEDIA_SECTION_TERRAIN = "terrain"
MEDIA_SECTIONS = [MEDIA_SECTION_REALISATIONS, MEDIA_SECTION_TERRAIN]

MEDIA_SECTION_LABELS = {
    MEDIA_SECTION_REALISATIONS: "Missions & réalisations",
    MEDIA_SECTION_TERRAIN: "AXONTERRA sur le terrain",
}


class MediaItem(db.Model):
    """Photo ou vidéo ajoutée par un administrateur, affichée dans une galerie du site."""

    __tablename__ = "media_items"

    id = db.Column(db.Integer, primary_key=True)
    media_type = db.Column(db.String(10), nullable=False, default=MEDIA_TYPE_IMAGE)
    section = db.Column(db.String(30), nullable=False, default=MEDIA_SECTION_REALISATIONS)
    title = db.Column(db.String(150), nullable=True)
    filename = db.Column(db.String(255), nullable=False)
    display_order = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    @property
    def section_label(self):
        return MEDIA_SECTION_LABELS.get(self.section, self.section)
