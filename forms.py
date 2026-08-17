"""Formulaires (avec protection CSRF automatique via Flask-WTF)."""
from flask_wtf import FlaskForm
from flask_wtf.file import FileAllowed, FileField, FileRequired
from wtforms import SelectField, StringField, TextAreaField, PasswordField
from wtforms.validators import DataRequired, Email, Length, Optional, EqualTo

IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg"]
VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "ogg"]


class ContactForm(FlaskForm):
    name = StringField(
        "Nom complet", validators=[DataRequired(message="Le nom est requis."), Length(max=150)]
    )
    organization = StringField("Organisation / entreprise", validators=[Optional(), Length(max=150)])
    email = StringField(
        "Email",
        validators=[DataRequired(message="L'email est requis."), Email(message="Email invalide."), Length(max=150)],
    )
    phone = StringField("Téléphone", validators=[Optional(), Length(max=40)])
    subject = StringField(
        "Sujet", validators=[DataRequired(message="Le sujet est requis."), Length(max=200)]
    )
    message = TextAreaField(
        "Message",
        validators=[DataRequired(message="Le message est requis."), Length(min=10, max=5000)],
    )
    # Champ "piège à spam" (honeypot) : doit rester vide, invisible pour un humain.
    # Nom volontairement générique pour éviter l'auto-remplissage par les navigateurs
    # (les champs nommés "website"/"url" sont souvent auto-complétés, ce qui déclenchait
    # à tort la détection anti-spam et empêchait l'enregistrement de messages légitimes).
    hp_check = StringField("Ne pas remplir", validators=[Optional(), Length(max=0, message="Spam détecté.")])


class LoginForm(FlaskForm):
    username = StringField(
        "Email", validators=[DataRequired(message="L'email est requis."), Email(message="Email invalide.")]
    )
    password = PasswordField("Mot de passe", validators=[DataRequired()])


class MediaForm(FlaskForm):
    title = StringField("Titre / légende", validators=[Optional(), Length(max=150)])
    section = SelectField(
        "Section du site",
        choices=[
            ("realisations", "Missions & réalisations"),
            ("terrain", "AXONTERRA sur le terrain"),
        ],
    )
    file = FileField(
        "Fichier (image ou vidéo)",
        validators=[
            FileRequired(message="Veuillez sélectionner un fichier."),
            FileAllowed(
                IMAGE_EXTENSIONS + VIDEO_EXTENSIONS,
                message="Formats acceptés : images (jpg, png, gif, webp, svg) ou vidéos (mp4, webm, mov, ogg).",
            ),
        ],
    )
