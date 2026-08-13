// ===== Grammar Rules Website - Paginated Script =====
// Performance: questions loaded from JSON, paginated 5 per page per rule

(function() {
  'use strict';

  let body, progressBar, themeToggle, searchInput, searchClear, menuToggle,
      sidebar, sidebarOverlay, backToTop, noResults;
  let questionsData = null;
  let questionsLoading = null;
  let ruleCards = null, navLinks = null;
  let scrollTicking = false;
  let searchTimeout;
  const QUESTIONS_PER_PAGE = 5;

  // Pagination state: { ruleNum: currentPage }
  let paginationState = {};

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

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

  // ===== Card Reveal =====
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
      card.style.transitionDelay = Math.min(i * 20, 200) + 'ms';
      observer.observe(card);
    });
    setTimeout(() => {
      ruleCards.forEach(card => {
        const rect = card.getBoundingClientRect();
        if (rect.top < window.innerHeight + 200 && rect.bottom > -200) {
          card.classList.add('visible');
        }
      });
    }, 100);
  }

  // ===== Lazy-Load Questions with Pagination =====
  function initLazyQuestions() {
    questionsLoading = fetch('questions.json').then(r => r.json()).then(data => {
      questionsData = data;
      console.log('Questions loaded:', Object.keys(data).length, 'rules');
      ruleCards.forEach(card => {
        renderQuestionsForRule(card);
      });
    }).catch(err => {
      console.error('Failed to load questions:', err);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          renderQuestionsForRule(entry.target);
        }
      });
    }, { rootMargin: '500px 0px' });

    ruleCards.forEach(card => io.observe(card));
  }

  function renderQuestionsForRule(card) {
    const placeholder = card.querySelector('.examples-list.prev-year-questions[data-rule]');
    if (!placeholder) return;
    if (placeholder.querySelector('.pagination-controls')) return; // Already rendered
    const ruleNum = placeholder.getAttribute('data-rule');
    questionsLoading.then(() => {
      if (!questionsData || !questionsData[ruleNum]) {
        placeholder.innerHTML = '<div class="example neutral"><div class="example-icon">→</div><div class="example-content"><div class="example-text"><em>No questions available for this rule yet.</em></div></div></div>';
        return;
      }
      const questions = questionsData[ruleNum];
      if (questions.length === 0) {
        placeholder.innerHTML = '<div class="example neutral"><div class="example-icon">→</div><div class="example-content"><div class="example-text"><em>No questions available for this rule yet.</em></div></div></div>';
        return;
      }
      paginationState[ruleNum] = 1;
      renderPage(placeholder, ruleNum, questions, 1);
    });
  }

  function renderPage(placeholder, ruleNum, questions, pageNum) {
    const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
    const start = (pageNum - 1) * QUESTIONS_PER_PAGE;
    const end = Math.min(start + QUESTIONS_PER_PAGE, questions.length);
    const pageQuestions = questions.slice(start, end);

    let html = '';
    // Render questions
    pageQuestions.forEach((q, idx) => {
      html += renderQuestionHTML(q, start + idx + 1);
    });

    // Pagination controls
    html += renderPaginationControls(ruleNum, pageNum, totalPages, questions.length);

    placeholder.innerHTML = html;
    paginationState[ruleNum] = pageNum;

    // Attach pagination event listeners
    attachPaginationListeners(placeholder, ruleNum, questions);
  }

  function renderPaginationControls(ruleNum, currentPage, totalPages, totalQuestions) {
    if (totalPages <= 1) {
      return `<div class="pagination-controls">
        <div class="pagination-info">Showing all ${totalQuestions} questions</div>
      </div>`;
    }

    let html = '<div class="pagination-controls">';
    html += '<div class="pagination-info">';

    // Prev button
    if (currentPage > 1) {
      html += `<button class="page-btn page-prev" data-rule="${ruleNum}" data-page="${currentPage - 1}">← Prev</button>`;
    }

    // Page numbers (show max 7 pages around current)
    const maxVisible = 7;
    let startPage = Math.max(1, currentPage - 3);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      html += `<button class="page-btn page-num" data-rule="${ruleNum}" data-page="1">1</button>`;
      if (startPage > 2) html += '<span class="page-ellipsis">…</span>';
    }

    for (let i = startPage; i <= endPage; i++) {
      if (i === currentPage) {
        html += `<button class="page-btn page-num active" data-rule="${ruleNum}" data-page="${i}">${i}</button>`;
      } else {
        html += `<button class="page-btn page-num" data-rule="${ruleNum}" data-page="${i}">${i}</button>`;
      }
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += '<span class="page-ellipsis">…</span>';
      html += `<button class="page-btn page-num" data-rule="${ruleNum}" data-page="${totalPages}">${totalPages}</button>`;
    }

    // Next button
    if (currentPage < totalPages) {
      html += `<button class="page-btn page-next" data-rule="${ruleNum}" data-page="${currentPage + 1}">Next →</button>`;
    }

    html += `</div>`;
    html += `<div class="page-count-info">Page ${currentPage} of ${totalPages} · ${totalQuestions} questions total</div>`;
    html += '</div>';
    return html;
  }

  function attachPaginationListeners(placeholder, ruleNum, questions) {
    const buttons = placeholder.querySelectorAll('.page-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const newPage = parseInt(btn.getAttribute('data-page'));
        if (newPage === paginationState[ruleNum]) return;

        // Re-render with new page
        renderPage(placeholder, ruleNum, questions, newPage);

        // Scroll to the rule header (so user sees the new questions)
        const card = placeholder.closest('.rule-card');
        if (card) {
          const headerOffset = 90;
          const elementPosition = card.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          // Only scroll if the rule is above viewport
          if (elementPosition < 0 || elementPosition > window.innerHeight) {
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
          }
        }
      });
    });
  }

  function renderQuestionHTML(q, displayNum) {
    const qnum = q[0], year = q[1], exam = q[2], qtext = q[3], options = q[4], ca = q[5], explanation = q[6];
    let html = '<div class="example prev-year" data-qnum="' + displayNum + '"';
    if (year) html += ' data-year="' + escapeAttr(year) + '"';
    if (exam) html += ' data-exam="' + escapeAttr(exam) + '"';
    html += '>';
    html += '<div class="example-icon">📝</div>';
    html += '<div class="example-content">';
    html += '<div class="example-meta">';
    if (exam) html += '<span class="exam-badge">' + escapeHtml(exam) + '</span>';
    if (year) html += '<span class="year-badge">' + escapeHtml(year) + '</span>';
    html += '<span class="q-num-badge">Q' + displayNum + '</span>';
    html += '</div>';
    html += '<div class="example-text">' + qtext + '</div>';
    html += '<div class="options-grid">';
    options.forEach((opt, i) => {
      const text = opt[0], isCorrect = opt[1];
      const letter = String.fromCharCode(97 + i); // a, b, c, d, e
      html += '<div class="option" data-correct="' + (isCorrect ? 'true' : 'false') + '">';
      html += '<span class="option-letter">' + letter + '</span>';
      html += '<span class="option-text">' + text + '</span>';
      html += '</div>';
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
