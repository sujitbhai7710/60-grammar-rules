// ===== Grammar Rules Website - Lazy-Loaded Script =====
// Performance: questions loaded from JSON, rendered on-scroll via IntersectionObserver

(function() {
  'use strict';

  let body, progressBar, themeToggle, searchInput, searchClear, menuToggle,
      sidebar, sidebarOverlay, backToTop, noResults;
  let questionsData = null;
  let questionsLoading = null;
  let ruleCards = null, navLinks = null;
  let scrollTicking = false;
  let searchTimeout;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    body = document.body;
    progressBar = document.querySelector('.progress-bar');
    themeToggle = document.querySelector('.theme-toggle');
    searchInput = document.querySelector('.search-input');
    searchClear = document.querySelector('.search-clear');
    menuToggle = document.querySelector('.menu-toggle');
    sidebar = document.querySelector('.sidebar');
    sidebarOverlay = document.querySelector('.sidebar-overlay');
    backToTop = document.querySelector('.back-to-top');
    noResults = document.querySelector('.no-results');
    ruleCards = document.querySelectorAll('.rule-card');
    navLinks = document.querySelectorAll('.nav-link[data-target]');

    initTheme();
    initMCQ();
    initNavigation();
    initSearch();
    initScrollReveal();
    initCounters();
    initKeyboardShortcuts();
    initLazyQuestions();
    // Reveal rule cards on scroll (this is what was missing!)
    initCardReveal();
    updateActiveNav();
  }

  // ===== Theme =====
  function initTheme() {
    const savedTheme = localStorage.getItem('grammar-theme') || 'light';
    body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    themeToggle.addEventListener('click', () => {
      const current = body.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      body.setAttribute('data-theme', next);
      localStorage.setItem('grammar-theme', next);
      updateThemeIcon(next);
    });
  }
  function updateThemeIcon(theme) {
    themeToggle.innerHTML = theme === 'dark' ? '☀️ <span>Light</span>' : '🌙 <span>Dark</span>';
  }

  // ===== Card Reveal (CRITICAL — adds .visible class so opacity goes from 0 to 1) =====
  function initCardReveal() {
    const observerOptions = {
      root: null,
      rootMargin: '200px 0px -50px 0px',
      threshold: 0
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    ruleCards.forEach((card, i) => {
      card.style.transitionDelay = Math.min(i * 30, 300) + 'ms';
      observer.observe(card);
    });
  }

  // ===== Lazy-Load Questions =====
  function initLazyQuestions() {
    // Start fetching questions.json immediately
    questionsLoading = fetch('questions.json').then(r => r.json()).then(data => {
      questionsData = data;
    }).catch(err => {
      console.error('Failed to load questions:', err);
    });

    // Set up IntersectionObserver to render questions when rule card is near viewport
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          renderQuestionsForRule(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '500px 0px' });

    ruleCards.forEach(card => io.observe(card));
  }

  function renderQuestionsForRule(card) {
    const placeholder = card.querySelector('.examples-list.prev-year-questions[data-rule]');
    if (!placeholder) return;
    const ruleNum = placeholder.getAttribute('data-rule');
    questionsLoading.then(() => {
      if (!questionsData || !questionsData[ruleNum]) {
        placeholder.innerHTML = '<div class="example neutral"><div class="example-icon">→</div><div class="example-content"><div class="example-text"><em>Questions could not be loaded. Please refresh the page.</em></div></div></div>';
        return;
      }
      const questions = questionsData[ruleNum];
      const html = questions.map(q => renderQuestionHTML(q)).join('');
      placeholder.innerHTML = html;
    });
  }

  function renderQuestionHTML(q) {
    const qnum = q[0], year = q[1], exam = q[2], qtext = q[3], options = q[4], ca = q[5], explanation = q[6];
    let html = '<div class="example prev-year" data-qnum="' + qnum + '"';
    if (year) html += ' data-year="' + escapeAttr(year) + '"';
    if (exam) html += ' data-exam="' + escapeAttr(exam) + '"';
    html += '>';
    html += '<div class="example-icon">📝</div>';
    html += '<div class="example-content">';
    html += '<div class="example-meta">';
    if (exam) html += '<span class="exam-badge">' + escapeHtml(exam) + '</span>';
    if (year) html += '<span class="year-badge">' + escapeHtml(year) + '</span>';
    html += '</div>';
    html += '<div class="example-text">' + qtext + '</div>';
    html += '<div class="options-grid">';
    options.forEach(opt => {
      const text = opt[0], isCorrect = opt[1];
      html += '<div class="option" data-correct="' + (isCorrect ? 'true' : 'false') + '">' + text + '</div>';
    });
    html += '</div>';
    html += '<div class="correct-answer" hidden>' + ca + '</div>';
    html += '<div class="explanation-detail" hidden>' + explanation + '</div>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeAttr(s) {
    if (!s) return '';
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  // ===== MCQ Interaction =====
  function initMCQ() {
    document.addEventListener('click', onOptionClick);
  }

  function onOptionClick(e) {
    const opt = e.target.closest('.option');
    if (!opt) return;
    const grid = opt.closest('.options-grid');
    if (!grid || grid.hasAttribute('data-processed')) return;
    grid.setAttribute('data-processed', 'true');
    const allOpts = grid.querySelectorAll('.option');
    const clickedCorrect = opt.getAttribute('data-correct') === 'true';
    if (clickedCorrect) {
      opt.classList.add('option-correct');
    } else {
      opt.classList.add('option-wrong');
      allOpts.forEach(o => {
        if (o.getAttribute('data-correct') === 'true') {
          o.classList.add('option-correct');
        }
      });
    }
    grid.style.pointerEvents = 'none';
    const card = opt.closest('.example-content');
    if (card) {
      const ca = card.querySelector('.correct-answer');
      const ex = card.querySelector('.explanation-detail');
      if (ca) ca.hidden = false;
      if (ex) ex.hidden = false;
    }
  }

  // ===== Navigation =====
  function initNavigation() {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('visible');
    });
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('visible');
    });
    sidebar.addEventListener('click', (e) => {
      const link = e.target.closest('.nav-link');
      if (!link) return;
      const targetId = link.getAttribute('data-target');
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (target) {
        const headerOffset = 90;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('visible');
    });
  }

  // ===== Scroll =====
  function initScrollReveal() {
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  function onScroll() {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = progress + '%';
        if (scrollTop > 500) {
          backToTop.classList.add('visible');
        } else {
          backToTop.classList.remove('visible');
        }
        updateActiveNav();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('.back-to-top')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  function updateActiveNav() {
    let current = '';
    ruleCards.forEach(card => {
      const rect = card.getBoundingClientRect();
      if (rect.top <= 150) {
        current = card.id;
      }
    });
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-target') === current) {
        link.classList.add('active');
      }
    });
  }

  // ===== Search =====
  function initSearch() {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => performSearch(searchInput.value), 200);
      searchClear.classList.toggle('visible', searchInput.value.length > 0);
    });
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      performSearch('');
      searchClear.classList.remove('visible');
      searchInput.focus();
    });
  }

  function performSearch(query) {
    const q = query.toLowerCase().trim();
    let visibleCount = 0;
    ruleCards.forEach(card => {
      if (!q) {
        card.style.display = '';
        card.classList.add('visible');
        visibleCount++;
        return;
      }
      const title = card.querySelector('.rule-title');
      const subtitle = card.querySelector('.rule-subtitle');
      const searchText = ((title ? title.textContent : '') + ' ' + (subtitle ? subtitle.textContent : '')).toLowerCase();
      if (searchText.includes(q)) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });
    noResults.classList.toggle('visible', visibleCount === 0 && q.length > 0);
  }

  // ===== Keyboard =====
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
      if (e.key === 'Escape') {
        searchInput.value = '';
        performSearch('');
        searchClear.classList.remove('visible');
        searchInput.blur();
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('visible');
      }
    });
  }

  // ===== Counters =====
  function initCounters() {
    const statNumbers = document.querySelectorAll('.hero-stat-number');
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-count'));
          animateCounter(el, target);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    statNumbers.forEach(el => counterObserver.observe(el));
  }

  function animateCounter(el, target) {
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = current;
    }, 30);
  }
})();
