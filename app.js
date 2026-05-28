/**
 * REVUCI — Fashion Brand Website
 * Interactive behaviors: scroll animations, navbar state, newsletter form
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ============================
     SECURITY — Image & content protection
     ============================ */

  // Block right-click context menu on image containers (CSS backgrounds)
  const protectedEls = document.querySelectorAll(
    '.hero__image, .about__image, .about__image-wrapper, .club__bg'
  );
  protectedEls.forEach((el) => {
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('dragstart',   (e) => e.preventDefault());
    el.addEventListener('mousedown',   (e) => { if (e.button === 2) e.preventDefault(); });
  });

  // Block keyboard shortcuts that can expose source / trigger DevTools
  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    // Ctrl+S (save page), Ctrl+U (view source), Ctrl+Shift+I/J (DevTools)
    if (
      (ctrl && (e.key === 's' || e.key === 'S')) ||
      (ctrl && (e.key === 'u' || e.key === 'U')) ||
      (ctrl && e.shiftKey && (e.key === 'i' || e.key === 'I')) ||
      (ctrl && e.shiftKey && (e.key === 'j' || e.key === 'J')) ||
      e.key === 'F12'
    ) {
      e.preventDefault();
    }
  });

  // Prevent drag-to-desktop of ANY element on the page
  document.addEventListener('dragstart', (e) => {
    if (
      e.target.tagName === 'IMG' ||
      e.target.classList.contains('hero__image') ||
      e.target.classList.contains('about__image') ||
      e.target.classList.contains('club__bg')
    ) {
      e.preventDefault();
    }
  });

  /* ============================
     NAVBAR — Scroll-based style
     ============================ */
  const navbar = document.getElementById('navbar');

  const handleNavScroll = () => {
    if (window.scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleNavScroll, { passive: true });

  /* ============================
     SCROLL REVEAL — IntersectionObserver
     ============================ */
  const revealSections = document.querySelectorAll('.about, .club, .connect');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Stop observing once revealed for performance
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    }
  );

  revealSections.forEach((section) => revealObserver.observe(section));

  /* ============================
     SMOOTH ANCHOR SCROLLING
     ============================ */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ============================
     NEWSLETTER FORM — Local storage
     ============================ */
  const form = document.getElementById('newsletter-form');
  const input = document.getElementById('email-input');
  const button = document.getElementById('join-button');

  if (!form || !input || !button) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = input.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      showButtonStatus('INVALID', 2000);
      return;
    }

    // Loading state
    button.textContent = 'JOINING...';
    button.disabled = true;
    input.disabled = true;

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      if (response.status === 409) {
        showButtonStatus('ALREADY JOINED', 2500, true);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to subscribe');
      }

      // Success state
      window.location.href = 'success.html';

    } catch (err) {
      console.error('Subscription error:', err);
      showButtonStatus('ERROR', 2000);
    }
  });

  function showButtonStatus(text, duration, resetInput = false) {
    button.textContent = text;
    button.disabled = true;

    if (resetInput) {
      input.disabled = true;
    }

    setTimeout(() => {
      button.textContent = 'JOIN';
      button.style.color = '';
      button.disabled = false;
      input.disabled = false;
      if (resetInput) {
        input.value = '';
        input.placeholder = 'Enter your email';
      }
    }, duration);
  }

  /* ============================
     PARALLAX — Subtle hero parallax
     ============================ */
  const heroImage = document.querySelector('.hero__image');

  if (heroImage) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      const heroHeight = window.innerHeight;

      if (scrolled < heroHeight) {
        heroImage.style.transform = `translateY(${scrolled * 0.3}px) scale(1.02)`;
      }
    }, { passive: true });
  }
});
