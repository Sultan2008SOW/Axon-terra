(function () {
  "use strict";

  /* ---------- Dark / light theme -------------------------------------------------- */
  function initTheme() {
    var root = document.documentElement;
    var toggle = document.getElementById("theme-toggle");
    var stored = null;
    try { stored = localStorage.getItem("axo-theme"); } catch (e) {}

    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = stored ? stored === "dark" : prefersDark;
    root.classList.toggle("dark", isDark);

    if (!toggle) return;
    toggle.addEventListener("click", function () {
      var nowDark = !root.classList.contains("dark");
      root.classList.toggle("dark", nowDark);
      try { localStorage.setItem("axo-theme", nowDark ? "dark" : "light"); } catch (e) {}
    });
  }

  /* ---------- FR / EN translations ------------------------------------------------ */
  var translations = {
    fr: {
      "nav.about": "À propos",
      "nav.solutions": "Solutions",
      "nav.sectors": "Secteurs",
      "nav.team": "Équipe",
      "nav.projects": "Missions &amp; réalisations",
      "nav.contact": "Contact",
      "nav.cta": "Parlons de votre projet",
      "hero.title": "Connecter le territoire aux données",
      "hero.subtitle": "Pour la transformation numérique des collectivités territoriales.",
      "hero.sicofilTag": "SICOFIL — plateforme SIG intelligente pour la fiscalité locale",
      "hero.quote": "« Nous ne gagnons que si la commune gagne. »",
      "hero.ctaDiscover": "Découvrir SICOFIL",
      "about.title": "Une startup sénégalaise au service des territoires",
      "origin.title": "Une solution née du terrain : Sandiara",
      "field.title": "AXONTERRA sur le terrain",
      "field.subtitle": "De la donnée au terrain, nous accompagnons les territoires au plus près de leurs réalités.",
      "sicofil.subtitle": "Système d'Information Commerciale pour la Fiscalité Locale",
      "compare.title": "Avant / Après SICOFIL",
      "solutions.title": "Nos solutions",
      "solutions.subtitle": "Des solutions complètes pour la digitalisation des territoires et des services publics.",
      "sectors.title": "Secteurs d'intervention",
      "sectors.subtitle": "Nous accompagnons des secteurs clés pour un développement local structuré et durable.",
      "method.title": "Notre méthode",
      "method.subtitle": "Une approche itérative et collaborative pour des résultats concrets.",
      "quality.title": "Nos principes qualité",
      "quality.subtitle": "Des engagements concrets pour livrer des solutions utiles et durables.",
      "team.title": "Notre équipe",
      "team.subtitle": "Une équipe sénégalaise passionnée par la tech au service du territoire.",
      "recognition.title": "Reconnaissance &amp; soutien",
      "recognition.subtitle": "AXONTERRA est reconnu et accompagné par des acteurs institutionnels et partenaires.",
      "why.title": "Pourquoi AXONTERRA ?",
      "why.subtitle": "Une approche sénégalaise, pragmatique et tournée vers l'impact local.",
      "ambition.title": "Notre ambition",
      "pilot.title": "Pilote proposé — Sandiara",
      "projects.title": "Nos missions &amp; réalisations",
      "projects.subtitle": "Chaque projet est une opportunité d'apprentissage et d'amélioration. Notre référence actuelle : SICOFIL à Sandiara.",
      "contact.title": "Parlons de votre territoire"
    },
    en: {
      "nav.about": "About",
      "nav.solutions": "Solutions",
      "nav.sectors": "Sectors",
      "nav.team": "Team",
      "nav.projects": "Projects &amp; achievements",
      "nav.contact": "Contact",
      "nav.cta": "Let's talk about your project",
      "hero.title": "Connecting territories through data",
      "hero.subtitle": "For the digital transformation of local governments.",
      "hero.sicofilTag": "SICOFIL — smart GIS platform for local taxation",
      "hero.quote": "\u201cWe only win if the municipality wins.\u201d",
      "hero.ctaDiscover": "Discover SICOFIL",
      "about.title": "A Senegalese startup serving local territories",
      "origin.title": "A solution born in the field: Sandiara",
      "field.title": "AXONTERRA in the field",
      "field.subtitle": "From data to the ground, we support territories close to their realities.",
      "sicofil.subtitle": "Commercial Information System for Local Taxation",
      "compare.title": "Before / After SICOFIL",
      "solutions.title": "Our solutions",
      "solutions.subtitle": "Complete solutions for the digitalization of territories and public services.",
      "sectors.title": "Sectors of intervention",
      "sectors.subtitle": "We support key sectors for structured, sustainable local development.",
      "method.title": "Our method",
      "method.subtitle": "An iterative, collaborative approach delivering concrete results.",
      "quality.title": "Our quality principles",
      "quality.subtitle": "Concrete commitments to deliver useful, lasting solutions.",
      "team.title": "Our team",
      "team.subtitle": "A Senegalese team passionate about tech serving local territories.",
      "recognition.title": "Recognition &amp; support",
      "recognition.subtitle": "AXONTERRA is recognized and supported by institutional actors and partners.",
      "why.title": "Why AXONTERRA?",
      "why.subtitle": "A Senegalese, pragmatic approach focused on local impact.",
      "ambition.title": "Our ambition",
      "pilot.title": "Proposed pilot — Sandiara",
      "projects.title": "Our projects &amp; achievements",
      "projects.subtitle": "Every project is an opportunity to learn and improve. Our current reference: SICOFIL in Sandiara.",
      "contact.title": "Let's talk about your territory"
    }
  };

  function applyLang(lang) {
    var dict = translations[lang] || translations.fr;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key]) el.textContent = dict[key].replace(/&amp;/g, "&");
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (dict[key]) el.innerHTML = dict[key];
    });
    document.documentElement.setAttribute("lang", lang === "en" ? "en" : "fr");
    document.dispatchEvent(new CustomEvent("axo:i18n-applied", { detail: { lang: lang } }));
  }

  function initI18n() {
    var toggle = document.getElementById("lang-toggle");
    var stored = null;
    try { stored = localStorage.getItem("axo-lang"); } catch (e) {}
    var lang = stored === "en" ? "en" : "fr";
    applyLang(lang);
    if (toggle) toggle.textContent = lang === "en" ? "EN / FR" : "FR / EN";

    if (!toggle) return;
    toggle.addEventListener("click", function () {
      lang = lang === "en" ? "fr" : "en";
      applyLang(lang);
      toggle.textContent = lang === "en" ? "EN / FR" : "FR / EN";
      try { localStorage.setItem("axo-lang", lang); } catch (e) {}
    });
  }

  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  onReady(function () {
    initTheme();
    initI18n();
  });
})();
