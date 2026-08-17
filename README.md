# AXON-TERRA — Site vitrine + gestion des contacts

Landing page GovTech pour AXON-TERRA (GeoTech · DataTech · GovTech, Sénégal).
Produit phare : **SICOFIL** — plateforme SIG pour la fiscalité locale.

## Stack
- **Backend** : Flask / Jinja2 (Python), SQLAlchemy (SQLite), Flask-WTF (CSRF + formulaires)
- **Frontend** : HTML + Tailwind CSS (CDN), Three.js (globe 3D), Leaflet (carte interactive)
- **Design** : palette vert territoire + ocre terre, typo Sora/Inter, animations sobres (200–300 ms, `prefers-reduced-motion` respecté)

## Lancer en local
```bash
pip install -r requirements.txt
python app.py
```
Puis ouvrir http://127.0.0.1:5000

## Configuration (optionnel)

Copier `.env.example` en `.env` et adapter :

- `SECRET_KEY` — clé secrète Flask (sessions, CSRF)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` — identifiants admin
- `SMTP_*` / `ADMIN_NOTIFY_EMAIL` — notification email à l'administrateur

Sans fichier `.env`, les valeurs par défaut sont utilisées (contact@axonterra.org / admin123).

## Structure

```text
app.py                          # serveur Flask (routes publiques + admin)
models.py                       # modèle ContactMessage (SQLAlchemy)
forms.py                        # formulaires ContactForm + LoginForm (WTForms)
templates/index.html            # page publique (toutes sections)
templates/admin/login.html      # page de connexion admin
templates/admin/dashboard.html  # liste des messages (recherche, filtre, compteur)
templates/admin/detail.html     # détail d'un message (statut, suppression, réponse)
static/css/custom.css           # design system & animations
static/js/main.js               # scroll reveal, compteurs, carte Leaflet, menu
static/js/globe3d.js            # globe 3D Three.js (continents, drag, orbite texte)
instance/axonterra.db           # base SQLite (créée automatiquement)
```

## Fonctionnalités

### Formulaire de contact (public)

- Champs : nom, organisation, email, téléphone, sujet, message
- Validation côté serveur (WTForms)
- Protection CSRF (Flask-WTF)
- Piège anti-spam (honeypot)
- Limitation des soumissions par IP (5 / 15 min)
- Enregistrement en base de données avec date/heure et statut
- Message de confirmation affiché à l'utilisateur
- Notification email optionnelle à l'administrateur

### Administration (`/admin`)

- Connexion sécurisée (username + mot de passe hashé)
- **Dashboard** : liste de tous les messages reçus
  - Compteur de messages non lus
  - Recherche par nom, email, organisation, sujet
  - Filtre par statut (Nouveau / Lu / Traité)
- **Détail d'un message** : toutes les informations + message complet
  - Changement de statut (Nouveau → Lu → Traité)
  - Suppression d'un message
  - Répondre par email (lien mailto pré-rempli)
- Contrôle d'accès : toutes les routes admin nécessitent une session authentifiée

### Globe 3D (Hero)

- Rendu Three.js avec continents réels (carte terre/mer)
- Texte "AxonTerra" en orbite autour du globe
- Rotation automatique lente + interaction tactile/souris (drag)
- Halo lumineux, points lumineux, lignes de connexion
- Cartes statistiques flottantes autour du globe
