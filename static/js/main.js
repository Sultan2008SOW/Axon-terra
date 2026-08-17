(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Utils -------------------------------------------------------- */
  function onReady(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  function supportsIntersectionObserver() {
    return "IntersectionObserver" in window;
  }

  /* ---------- Buttons feedback -------------------------------------------- */
  function initButtons() {
    document.querySelectorAll("a, button").forEach(function (el) {
      var cls = el.classList;
      var isBtn =
        cls.contains("bg-axo-green") ||
        cls.contains("bg-white/10") ||
        cls.contains("bg-axo-blue");
      if (isBtn && !cls.contains("btn-axo")) {
        cls.add("btn-axo");
      }
    });
  }

  /* ---------- Card classes ------------------------------------------------ */
  function initCardClasses() {
    var map = {
      "#qualite .reveal": "principle-card",
      "#sicofil .grid .reveal": "module-card",
      "#solutions .grid .reveal": "solution-card",
      "#secteurs .grid .reveal": "sector-card",
      "#methode .grid .reveal": "method-card",
      "#equipe .grid .reveal": "team-card",
    };
    Object.keys(map).forEach(function (sel) {
      var c = map[sel];
      document.querySelectorAll(sel).forEach(function (el) { el.classList.add(c); });
    });
  }

  /* ---------- Stagger & inner cascades ------------------------------------ */
  function initStagger() {
    // Team inner cascade
    document.querySelectorAll(".team-card").forEach(function (card, i) {
      var avatar = card.querySelector(".w-28, .w-24");
      var name = card.querySelector("h3");
      var parts = card.querySelectorAll("p");
      if (avatar) {
        avatar.classList.add("reveal-scale");
        avatar.style.transitionDelay = "0ms";
      }
      [name].concat([].slice.call(parts)).forEach(function (el, idx) {
        if (el) {
          el.classList.add("reveal");
          el.style.transitionDelay = ((idx + 1) * 100) + "ms";
        }
      });
    });

    // Grid stagger (auto for any .reveal in .grid without explicit delay)
    document.querySelectorAll(".grid, .flex").forEach(function (grid) {
      var items = grid.querySelectorAll(":scope > .reveal");
      items.forEach(function (item, index) {
        if (!/(reveal-delay-)/.test(item.className) && !item.style.transitionDelay) {
          item.style.transitionDelay = (index * 80) + "ms";
        }
      });
    });
  }

  /* ---------- Hero scroll parallax ---------------------------------------- */
  function initHeroScroll() {
    if (reducedMotion) return;
    var hero = document.getElementById("hero");
    if (!hero) return;
    var ticking = false;
    function update() {
      var y = window.scrollY;
      var h = hero.offsetHeight || 1;
      var p = Math.min(Math.max(y / (h * 0.7), 0), 1);
      hero.style.setProperty("--hero-scroll", p.toFixed(3));
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
  }

  /* ---------- Navbar ------------------------------------------------------ */
  function initNavbar() {
    var navbar = document.getElementById("navbar");
    var progressBar = document.getElementById("scroll-progress");
    var scrollTopBtn = document.getElementById("scroll-top");

    function onScroll() {
      var y = window.scrollY;
      if (navbar) {
        navbar.classList.toggle("scrolled", y > 10);
      }
      if (progressBar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        progressBar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
      }
      if (scrollTopBtn) {
        scrollTopBtn.classList.toggle("visible", y > 600);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (scrollTopBtn) {
      scrollTopBtn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      });
    }

    var heroSection = document.getElementById("hero");
    if (heroSection && navbar && supportsIntersectionObserver()) {
      var heroObserver = new IntersectionObserver(
        function (entries) {
          navbar.classList.toggle("on-hero", entries[0].isIntersecting);
        },
        { threshold: 0, rootMargin: "-64px 0px 0px 0px" }
      );
      heroObserver.observe(heroSection);
    }
  }

  /* ---------- Active nav link --------------------------------------------- */
  function initActiveNav() {
    var navLinks = document.querySelectorAll(".nav-link");
    if (!supportsIntersectionObserver() || !navLinks.length) return;

    var sections = [];
    navLinks.forEach(function (link) {
      var id = link.getAttribute("href");
      if (id && id.charAt(0) === "#") {
        var section = document.querySelector(id);
        if (section) sections.push({ el: section, link: link });
      }
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            navLinks.forEach(function (l) { l.classList.remove("active"); });
            var match = sections.find(function (s) { return s.el === entry.target; });
            if (match) match.link.classList.add("active");
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach(function (s) { observer.observe(s.el); });
  }

  /* ---------- Smooth scroll with offset ----------------------------------- */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function (e) {
        var href = link.getAttribute("href");
        if (href.length < 2) return;
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();

        var navbar = document.getElementById("navbar");
        var offset = navbar ? navbar.offsetHeight + 16 : 84;
        var y = target.getBoundingClientRect().top + window.scrollY - offset;

        window.scrollTo({
          top: y,
          behavior: reducedMotion ? "auto" : "smooth",
        });
      });
    });
  }

  /* ---------- Mobile menu ------------------------------------------------- */
  function initMobileMenu() {
    var menuBtn = document.getElementById("menu-btn");
    var mobileMenu = document.getElementById("mobile-menu");
    if (!menuBtn || !mobileMenu) return;

    menuBtn.addEventListener("click", function () {
      var open = mobileMenu.classList.toggle("hidden");
      menuBtn.setAttribute("aria-expanded", String(!open));
    });

    mobileMenu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mobileMenu.classList.add("hidden");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Scroll reveal ----------------------------------------------- */
  function initReveal() {
    var all = [].slice.call(document.querySelectorAll(
      ".reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-line, .method-line, .map-line"
    ));

    if (reducedMotion || !supportsIntersectionObserver()) {
      all.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            el.classList.add("is-visible");
            observer.unobserve(el);
            el.addEventListener("transitionend", function removeWillChange() {
              el.style.willChange = "auto";
              el.removeEventListener("transitionend", removeWillChange);
            });
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
    );

    all.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Counters ---------------------------------------------------- */
  function initCounters() {
    var counters = document.querySelectorAll(".counter");
    if (!counters.length) return;

    function animateCounter(el) {
      var target = parseInt(el.dataset.target, 10);
      if (isNaN(target)) return;
      if (reducedMotion) { el.textContent = target; return; }

      var duration = 1400;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (supportsIntersectionObserver() && !reducedMotion) {
      var counterObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              counterObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach(function (el) { counterObserver.observe(el); });
    } else {
      counters.forEach(function (el) { el.textContent = el.dataset.target; });
    }
  }

  /* ---------- Form micro-interactions ------------------------------------ */
  function initForm() {
    // Add flash slide-in animation to messages
    document.querySelectorAll("div[class*='bg-green-100'], div[class*='bg-red-100']").forEach(function (el) {
      el.classList.add("flash-slide");
    });
  }

  /* ---------- Avant/Après interaction ------------------------------------ */
  function initCompareCards() {
    var before = document.querySelector("#avant-apres .before-card");
    var after = document.querySelector("#avant-apres .after-card");
    if (before && after) {
      var hoverState = false;
      [before, after].forEach(function (card) {
        card.addEventListener("mouseenter", function () {
          if (hoverState) return;
          hoverState = true;
          before.classList.add("before-active");
          after.classList.add("after-active");
        });
        card.addEventListener("mouseleave", function () {
          hoverState = false;
          before.classList.remove("before-active");
          after.classList.remove("after-active");
        });
      });
    }
  }

  /* ---------- Jarvis AI chatbot widget (UI facade) ------------------------ */
  function initChatbot() {
    var widget = document.getElementById("jarvis-widget");
    var toggleBtn = document.getElementById("jarvis-toggle");
    var closeBtn = document.getElementById("jarvis-close");
    var panel = document.getElementById("jarvis-panel");
    var form = document.getElementById("jarvis-form");
    var input = document.getElementById("jarvis-input");
    var messages = document.getElementById("jarvis-messages");
    if (!widget || !toggleBtn || !panel || !form || !input || !messages) return;

    var knowledgeBase = [
      { keywords: ["bonjour", "salut", "bonsoir", "hello", "coucou", "hey"],
        reply: "Bonjour, je suis ravi de vous accueillir. Je suis l'assistant virtuel d'AXONTERRA. Comment puis-je vous renseigner aujourd'hui : nos solutions, SICOFIL, ou une mise en relation avec notre équipe ?" },
      { keywords: ["sicofil"],
        reply: "SICOFIL est notre plateforme SIG intelligente dédiée à la fiscalité locale : cartographie du foncier, recensement des unités commerciales et suivi des paiements. Vous pouvez en découvrir le détail dans la section « SICOFIL » du site." },
      { keywords: ["prix", "tarif", "coût", "cout", "devis", "budget"],
        reply: "Nos tarifs sont établis sur mesure selon la taille de la collectivité et le périmètre du projet. Je vous invite à remplir le formulaire de contact afin qu'un membre de notre équipe vous transmette un devis personnalisé." },
      { keywords: ["contact", "joindre", "téléphone", "telephone", "email", "mail", "appeler"],
        reply: "Vous pouvez nous joindre par email à contact@axonterra.org, par téléphone au +221 76 800 97 60, ou directement via le formulaire de la section Contact de ce site." },
      { keywords: ["sandiara", "pilote"],
        reply: "Le projet pilote d'AXONTERRA est actuellement déployé à Sandiara, avec pour ambition de servir de référence avant une extension à d'autres communes du Sénégal et d'Afrique de l'Ouest." },
      { keywords: ["service", "solution", "offre", "propose", "proposez"],
        reply: "AXONTERRA propose des solutions en GeoTech, DataTech et GovTech : cartographie et SIG, collecte de données territoriales, plateforme SICOFIL pour la fiscalité locale, et accompagnement à la transformation numérique des collectivités." },
      { keywords: ["équipe", "equipe", "dirigeant", "pdg", "directeur"],
        reply: "Notre équipe est présentée dans la section « Notre équipe » du site, avec la direction et les profils clés d'AXONTERRA." },
      { keywords: ["merci", "parfait", "super", "top"],
        reply: "Avec plaisir. N'hésitez pas si vous avez d'autres questions, je reste à votre disposition." },
      { keywords: ["au revoir", "bye", "adieu"],
        reply: "Au revoir, et merci pour votre visite sur le site d'AXONTERRA. À très bientôt." }
    ];

    var fallbackReplies = [
      "Merci pour votre message. Je transmets votre demande à notre équipe, qui vous répondra rapidement. Pour un contact immédiat : contact@axonterra.org.",
      "C'est une excellente question. Pour vous apporter une réponse précise, je vous invite à la poser via notre formulaire de contact ; notre équipe reviendra vers vous sous peu.",
      "Je prends bonne note de votre demande. En attendant l'activation complète de l'assistant, n'hésitez pas à consulter nos sections SICOFIL, Solutions ou Contact."
    ];
    var fallbackIndex = 0;

    function getReply(userText) {
      var text = userText.toLowerCase();
      for (var i = 0; i < knowledgeBase.length; i++) {
        var entry = knowledgeBase[i];
        for (var j = 0; j < entry.keywords.length; j++) {
          if (text.indexOf(entry.keywords[j]) !== -1) {
            return entry.reply;
          }
        }
      }
      var reply = fallbackReplies[fallbackIndex % fallbackReplies.length];
      fallbackIndex++;
      return reply;
    }

    function isOpen() {
      return panel.classList.contains("jarvis-open");
    }

    function openPanel() {
      panel.classList.add("jarvis-open");
      panel.setAttribute("aria-hidden", "false");
      toggleBtn.setAttribute("aria-expanded", "true");
      setTimeout(function () { input.focus(); }, 200);
    }

    function closePanel() {
      panel.classList.remove("jarvis-open");
      panel.setAttribute("aria-hidden", "true");
      toggleBtn.setAttribute("aria-expanded", "false");
    }

    toggleBtn.addEventListener("click", function () {
      isOpen() ? closePanel() : openPanel();
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", closePanel);
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) closePanel();
    });

    document.addEventListener("click", function (e) {
      if (isOpen() && !widget.contains(e.target)) closePanel();
    });

    function addMessage(text, who) {
      var bubble = document.createElement("div");
      bubble.className = "jarvis-msg " + (who === "user" ? "jarvis-msg-user" : "jarvis-msg-bot");
      bubble.textContent = text;
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;
    }

    function showTyping() {
      var typing = document.createElement("div");
      typing.className = "jarvis-typing";
      typing.id = "jarvis-typing-indicator";
      typing.innerHTML = "<span></span><span></span><span></span>";
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;
    }

    function hideTyping() {
      var typing = document.getElementById("jarvis-typing-indicator");
      if (typing) typing.remove();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      addMessage(text, "user");
      var reply = getReply(text);
      input.value = "";

      showTyping();
      var delay = reducedMotion ? 200 : 700 + Math.random() * 500;
      setTimeout(function () {
        hideTyping();
        addMessage(reply, "bot");
      }, delay);
    });
  }

  /* ---------- Hero typewriter (character cascade reveal) ----------------- */
  function initHeroTypewriter() {
    var h1 = document.querySelector('[data-hero-typewriter]');
    if (!h1) return;

    var fullText = h1.textContent.trim();
    if (!fullText) return;

    if (reducedMotion) {
      h1.textContent = fullText;
      return;
    }

    var startDelay = 1800;
    var charDelay = 40;
    var globalIdx = 0;

    h1.setAttribute('aria-label', fullText);
    h1.innerHTML = '';

    var words = fullText.split(' ');
    words.forEach(function (word, wordIdx) {
      var wordSpan = document.createElement('span');
      wordSpan.className = 'hero-typewriter-word';

      word.split('').forEach(function (ch) {
        var charSpan = document.createElement('span');
        charSpan.className = 'hero-typewriter-char';
        charSpan.textContent = ch;
        charSpan.style.animationDelay = (startDelay + globalIdx * charDelay) + 'ms';
        wordSpan.appendChild(charSpan);
        globalIdx++;
      });

      h1.appendChild(wordSpan);

      if (wordIdx < words.length - 1) {
        var space = document.createElement('span');
        space.className = 'hero-typewriter-space';
        space.innerHTML = '&nbsp;';
        h1.appendChild(space);
        globalIdx++;
      }
    });

    var cursor = document.createElement('span');
    cursor.className = 'hero-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    h1.appendChild(cursor);
  }

  /* ---------- Init -------------------------------------------------------- */
  onReady(function () {
    initButtons();
    initCardClasses();
    initStagger();
    initHeroScroll();
    initNavbar();
    initActiveNav();
    initSmoothScroll();
    initMobileMenu();
    initReveal();
    initCounters();
    initForm();
    initCompareCards();
    initChatbot();
    initHeroTypewriter();

    document.addEventListener('axo:i18n-applied', function () {
      initHeroTypewriter();
    });
  });
})();
