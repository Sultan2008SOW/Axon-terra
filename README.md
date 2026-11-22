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

Sans fichier `.env`, les valeurs par défaut sont utilisées en local (contact@axonterra.org / admin123).
Sur Render, `ADMIN_PASSWORD_HASH` est obligatoire pour éviter le mot de passe de développement.

## Déploiement Render

Le fichier `render.yaml` configure le service web, le domaine `axonterra.org` (avec redirection de `www.axonterra.org` vers l’apex), le certificat HTTPS et un disque persistant pour la base SQLite et les médias uploadés.

Avant le déploiement :

1. Générer le hash du mot de passe admin :
   ```bash
   python -c "from werkzeug.security import generate_password_hash as g; print(g('VOTRE_MOT_DE_PASSE'))"
   ```
2. Dans Render, renseigner `ADMIN_PASSWORD_HASH` avec ce hash.
3. Configurer le DNS chez le registrar :
   - `axonterra.org` → enregistrement `A` vers `216.24.57.1`
   - `www.axonterra.org` → `CNAME` vers le sous-domaine `*.onrender.com` du service
   - Supprimer tout enregistrement `AAAA` pour ce domaine
4. Le plan `0.5c-512mb` et le disque persistent sont payants ; adapter `plan` dans `render.yaml` si nécessaire.

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
instance/                       # base SQLite + uploads médias (persistant sur Render)
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
