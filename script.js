const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');

if (menuButton && mobileNav) {
  const closeMenu = () => {
    mobileNav.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Открыть меню');
  };

  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    mobileNav.hidden = isOpen;
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Открыть меню' : 'Закрыть меню');
  });

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeMenu();
  });
}

// Start music only after a visitor interacts with the page; never on page load.
const ambientAudio = document.createElement('audio');
ambientAudio.src = 'assets/gold-ambient-suno.mp3';
ambientAudio.preload = 'none';
ambientAudio.loop = true;
ambientAudio.volume = 0.18;
const ambientButton = document.createElement('button');
ambientButton.type = 'button';
ambientButton.className = 'ambient-audio-toggle';
ambientButton.setAttribute('aria-pressed', 'false');
ambientButton.setAttribute('aria-label', 'Включить фоновую музыку');
ambientButton.innerHTML = '<span class="ambient-audio-icon" aria-hidden="true">♫</span><span class="ambient-audio-label">Включить музыку</span>';
document.body.append(ambientAudio, ambientButton);
const musicPreference = {
  get disabled() {
    try { return sessionStorage.getItem('ambientAudioDisabled') === '1'; }
    catch { return false; }
  },
  setDisabled(value) {
    try {
      if (value) sessionStorage.setItem('ambientAudioDisabled', '1');
      else sessionStorage.removeItem('ambientAudioDisabled');
    } catch { /* Music still works if storage is unavailable. */ }
  }
};
const syncAmbientButton = () => {
  const playing = !ambientAudio.paused;
  ambientButton.setAttribute('aria-pressed', String(playing));
  ambientButton.setAttribute('aria-label', playing ? 'Выключить фоновую музыку' : 'Включить фоновую музыку');
  ambientButton.querySelector('.ambient-audio-label').textContent = playing ? 'Выключить музыку' : 'Включить музыку';
};
const removeFirstInteractionListeners = () => {
  document.removeEventListener('touchend', onFirstInteraction, true);
  document.removeEventListener('click', onFirstInteraction, true);
};
const onFirstInteraction = (event) => {
  removeFirstInteractionListeners();
  if (ambientButton.contains(event.target)) return;
  ambientAudio.play().catch(() => {
    ambientButton.querySelector('.ambient-audio-label').textContent = 'Включить музыку';
  });
};
if (!musicPreference.disabled) {
  document.addEventListener('touchend', onFirstInteraction, true);
  document.addEventListener('click', onFirstInteraction, true);
}
ambientButton.addEventListener('click', async () => {
  removeFirstInteractionListeners();
  if (!ambientAudio.paused) {
    ambientAudio.pause();
    musicPreference.setDisabled(true);
  } else {
    try {
      await ambientAudio.play();
      musicPreference.setDisabled(false);
    } catch {
      ambientButton.querySelector('.ambient-audio-label').textContent = 'Звук недоступен';
      return;
    }
  }
  syncAmbientButton();
});
ambientAudio.addEventListener('play', syncAmbientButton);
ambientAudio.addEventListener('pause', syncAmbientButton);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) ambientAudio.pause();
});

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = document.querySelector('.scene-backdrop');
const heroVideo = document.querySelector('.hero-video');
if (heroVideo) {
  const hero = heroVideo.closest('.hero');
  const mobile = window.matchMedia('(max-width: 760px)');
  const syncHeroVideo = () => {
    if (reduceMotion || mobile.matches) {
      heroVideo.pause();
      hero.classList.remove('video-ready');
    } else if (heroVideo.readyState >= 2) {
      hero.classList.add('video-ready');
      heroVideo.play().catch(() => hero.classList.remove('video-ready'));
    }
  };
  heroVideo.addEventListener('loadeddata', syncHeroVideo);
  heroVideo.addEventListener('error', () => hero.classList.remove('video-ready'));
  mobile.addEventListener('change', syncHeroVideo);
  syncHeroVideo();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) syncHeroVideo();
      else heroVideo.pause();
    }, { threshold: 0.01 }).observe(hero);
  }
}

const motionClips = [...document.querySelectorAll('[data-motion-clip]')];
const network = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const shouldLoadHdVideo = !reduceMotion && !network?.saveData;
if (motionClips.length && shouldLoadHdVideo) {
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const loadClip = (video) => {
    if (!video.getAttribute('src') && video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    }
  };
  const playClip = (video) => {
    if (document.hidden) return;
    loadClip(video);
    video.play().catch(() => video.parentElement.classList.remove('motion-active'));
  };
  const pauseClip = (video) => {
    video.pause();
    video.parentElement.classList.remove('motion-active');
  };

  motionClips.forEach((video) => {
    video.addEventListener('playing', () => video.parentElement.classList.add('motion-active'));
    video.addEventListener('error', () => pauseClip(video));
    if (fineHover && video.dataset.autoplay !== 'in-view') {
      video.parentElement.addEventListener('pointerenter', () => playClip(video));
      video.parentElement.addEventListener('pointerleave', () => pauseClip(video));
    }
  });

  if ('IntersectionObserver' in window) {
    const preloadObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadClip(entry.target);
          preloadObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '300px' });
    const playbackObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting && (!fineHover || video.dataset.autoplay === 'in-view')) playClip(video);
        else if (!entry.isIntersecting) pauseClip(video);
      });
    }, { threshold: .45 });
    motionClips.forEach((video) => {
      preloadObserver.observe(video);
      playbackObserver.observe(video);
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) motionClips.forEach(pauseClip);
  });
}

if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
  const photoStage = document.querySelector('.hero-image-wrap');
  if (photoStage) {
    photoStage.addEventListener('pointermove', (event) => {
      const rect = photoStage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      photoStage.style.setProperty('--hero-rotate-y', `${(x * 7).toFixed(2)}deg`);
      photoStage.style.setProperty('--hero-rotate-x', `${(-y * 5).toFixed(2)}deg`);
    });
    photoStage.addEventListener('pointerleave', () => {
      photoStage.style.setProperty('--hero-rotate-y', '0deg');
      photoStage.style.setProperty('--hero-rotate-x', '0deg');
    });
  }

  document.querySelectorAll('.chapter-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      card.style.setProperty('--card-rotate-y', `${(x * 7).toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave', () => card.style.setProperty('--card-rotate-y', '0deg'));
  });
}

if (scene && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
  const hero = scene.closest('.page-hero');
  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    scene.style.setProperty('--scene-x', `${(-x * 18).toFixed(1)}px`);
    scene.style.setProperty('--scene-y', `${(-y * 14).toFixed(1)}px`);
  });
  hero.addEventListener('pointerleave', () => {
    scene.style.setProperty('--scene-x', '0px');
    scene.style.setProperty('--scene-y', '0px');
  });
}

const revealItems = document.querySelectorAll('.reveal');
if (reduceMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  revealItems.forEach((item) => observer.observe(item));
}

const pathGrid = document.querySelector('.path-grid');
if (pathGrid) {
  const svg = pathGrid.querySelector('.path-route');
  const line = svg?.querySelector('.path-route-line');
  const glow = svg?.querySelector('.path-route-glow');
  const numbers = [...pathGrid.querySelectorAll('.path-number')];
  const drawPath = () => {
    if (!svg || !line || !glow || numbers.length < 2) return;
    const gridRect = pathGrid.getBoundingClientRect();
    if (!gridRect.width || !gridRect.height) return;
    const points = numbers.map((number) => {
      const rect = number.getBoundingClientRect();
      return { x: rect.left + rect.width / 2 - gridRect.left, y: rect.top + rect.height / 2 - gridRect.top };
    });
    let shape = `M ${points[0].x} ${points[0].y}`;
    points.slice(1).forEach((point, index) => {
      const previous = points[index];
      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      const sway = Math.abs(dx) < 20 ? (index % 2 ? -26 : 26) : dx * .43;
      shape += ` C ${previous.x + sway} ${previous.y + dy * .18}, ${point.x - sway} ${point.y - dy * .18}, ${point.x} ${point.y}`;
    });
    svg.setAttribute('viewBox', `0 0 ${gridRect.width} ${gridRect.height}`);
    line.setAttribute('d', shape);
    glow.setAttribute('d', shape);
    pathGrid.style.setProperty('--route-length', `${Math.ceil(line.getTotalLength()) + 2}px`);
  };
  drawPath();
  if ('ResizeObserver' in window) new ResizeObserver(drawPath).observe(pathGrid);
  else window.addEventListener('resize', drawPath);
  if (reduceMotion || !('IntersectionObserver' in window)) pathGrid.classList.add('is-visible');
  else new IntersectionObserver(([entry], observer) => {
    if (entry.isIntersecting) {
      pathGrid.classList.add('is-visible');
      observer.disconnect();
    }
  }, { threshold: .2 }).observe(pathGrid);
}
