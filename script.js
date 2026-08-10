// ===== Grammar Rules Website - Main Script =====

document.addEventListener('DOMContentLoaded', () => {
  // ===== Elements =====
  const body = document.body;
  const progressBar = document.querySelector('.progress-bar');
  const themeToggle = document.querySelector('.theme-toggle');
  const searchInput = document.querySelector('.search-input');
  const searchClear = document.querySelector('.search-clear');
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.querySelector('.sidebar-overlay');
  const backToTop = document.querySelector('.back-to-top');
  const ruleCards = document.querySelectorAll('.rule-card');
  const navLinks = document.querySelectorAll('.nav-link');
  const noResults = document.querySelector('.no-results');

  // ===== Theme Toggle =====
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

  function updateThemeIcon(theme) {
    themeToggle.innerHTML = theme === 'dark' ? '☀️ <span>Light</span>' : '🌙 <span>Dark</span>';
  }

  // ===== Progress Bar =====
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = progress + '%';

    // Back to top
    if (scrollTop > 500) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }

    // Active nav
    updateActiveNav();
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ===== Sidebar Navigation =====
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('visible');
  });

  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const targetId = link.getAttribute('data-target');
      const target = document.getElementById(targetId);
      if (target) {
        const headerOffset = 90;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
      // Close mobile sidebar
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('visible');
    });
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
        // Scroll nav item into view
        link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  // ===== Search =====
  let searchTimeout;
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
      const text = card.textContent.toLowerCase();
      if (text.includes(q)) {
        card.style.display = '';
        visibleCount++;
        // Highlight matching nav
        const navLink = document.querySelector(`.nav-link[data-target="${card.id}"]`);
        if (navLink) navLink.style.display = '';
      } else {
        card.style.display = 'none';
        const navLink = document.querySelector(`.nav-link[data-target="${card.id}"]`);
        if (navLink) navLink.style.display = 'none';
      }
    });

    noResults.classList.toggle('visible', visibleCount === 0 && q.length > 0);
  }

  // ===== Scroll Reveal =====
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
    card.style.transitionDelay = `${Math.min(i * 30, 300)}ms`;
    observer.observe(card);
  });

  // ===== Keyboard Shortcuts =====
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
    // Escape to clear search
    if (e.key === 'Escape') {
      searchInput.value = '';
      performSearch('');
      searchClear.classList.remove('visible');
      searchInput.blur();
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('visible');
    }
  });

  // ===== Counter Animation for Hero Stats =====
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

  // Initial state
  updateActiveNav();
});
