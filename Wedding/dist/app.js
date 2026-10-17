(() => {
  'use strict';

  const config = window.WEDDING || {};
  const clean = value => typeof value === 'string' ? value.trim() : '';
  const setText = (selector, value) => {
    const text = clean(value);
    if (!text) return;
    document.querySelectorAll(selector).forEach(element => {
      element.textContent = text;
      element.hidden = false;
    });
  };
  const webUrl = value => {
    if (!clean(value)) return null;
    try {
      const url = new URL(clean(value), window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  };
  const setLink = (selector, value) => {
    const element = document.querySelector(selector);
    const url = webUrl(value);
    if (!element || !url) return false;
    element.href = url;
    element.target = '_blank';
    element.rel = 'noopener noreferrer';
    element.hidden = false;
    return true;
  };
  const first = clean(config.names?.first) || 'David';
  const second = clean(config.names?.second) || 'Gypsy';
  for (const [key, name] of Object.entries({ first, second })) {
    setText(`[data-name="${key}"]`, name);
    setText(`[data-initial="${key}"]`, Array.from(name)[0]);
  }
  document.title = `${first} & ${second} — Our Wedding`;
  document.querySelector('.mobile-monogram')?.setAttribute('aria-label', `${first} and ${second}, home`);
  const titleMeta = document.querySelector('meta[property="og:title"]');
  if (titleMeta) titleMeta.content = document.title;
  const description = `Celebrate the wedding of ${first} and ${second}. ${clean(config.date) || 'Details to come'}.`;
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]']) {
    const meta = document.querySelector(selector);
    if (meta) meta.content = description;
  }
  for (const key of ['date', 'location', 'venue']) setText(`[data-field="${key}"]`, config[key]);

  for (const event of ['ceremony', 'reception']) {
    for (const key of ['time', 'venue', 'address']) {
      setText(`[data-event="${event}.${key}"]`, config[event]?.[key]);
    }
    setLink(`[data-event-link="${event}"]`, config[event]?.mapUrl);
  }
  setText('[data-event="reception.venue"]', clean(config.reception?.venue) || config.venue);
  if (['time', 'venue', 'address'].some(key => clean(config.ceremony?.[key])) || webUrl(config.ceremony?.mapUrl)) {
    const ceremony = document.getElementById('ceremony-event');
    if (ceremony) ceremony.hidden = false;
  }
  setText('#travel-copy', config.travel?.details);
  setText('#accommodation-copy', config.accommodation?.details);
  setText('#gifts-copy', config.gifts?.details);
  setText('#things-copy', config.thingsToDo?.details);
  setLink('#travel-link', config.travel?.mapUrl);
  setLink('#accommodation-link', config.accommodation?.bookingUrl);
  setLink('#registry-link', config.gifts?.registryUrl);
  setLink('#things-link', config.thingsToDo?.url);
  const email = clean(config.contactEmail);
  const contact = document.getElementById('contact-link');
  if (contact && /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)) {
    contact.href = `mailto:${email}`;
    contact.hidden = false;
  }
  const rsvpReady = setLink('#rsvp-link', config.rsvp?.url);
  const rsvpPending = document.getElementById('rsvp-pending');
  if (rsvpPending) rsvpPending.hidden = rsvpReady;
  if (rsvpReady) {
    setText('#rsvp-copy', clean(config.rsvp?.message) || 'We would love for you to be part of our day. Please let us know if you can join us.');
    if (clean(config.rsvp?.deadline)) setText('#rsvp-deadline', `Kindly reply by ${clean(config.rsvp.deadline)}`);
  } else {
    setText('#rsvp-copy', config.rsvp?.message);
  }
  const questionList = document.getElementById('questions-list');
  const appendAnswer = (element, value) => {
    const answer = clean(value);
    let cursor = 0;
    // Support simple [label](https://...) links; all other content stays text.
    for (const match of answer.matchAll(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gi)) {
      const href = webUrl(match[2]);
      if (!href) continue;
      element.append(document.createTextNode(answer.slice(cursor, match.index)));
      const link = document.createElement('a');
      link.textContent = match[1]; link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer';
      element.append(link); cursor = match.index + match[0].length;
    }
    element.append(document.createTextNode(answer.slice(cursor)));
  };
  const loadQuestions = async () => {
    if (!questionList) return;
    try {
      const response = await fetch('questions.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Could not load questions.json (${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data?.questions) || data.questions.some(item =>
        typeof item?.question !== 'string' || typeof item?.answer !== 'string'
      )) throw new Error('questions.json must contain a questions array with question and answer strings.');
      const questions = data.questions.filter(item => clean(item.question) && clean(item.answer));
      if (!questions.length) {
        const placeholder = document.createElement('p');
        placeholder.textContent = 'More answers will be shared here soon.';
        questionList.replaceChildren(placeholder);
        return;
      }
      questionList.replaceChildren(...questions.map(item => {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        const answer = document.createElement('p');
        const icon = document.createElement('span');
        summary.textContent = clean(item.question);
        icon.textContent = '+';
        icon.setAttribute('aria-hidden', 'true');
        summary.append(icon);
        appendAnswer(answer, item.answer);
        details.append(summary, answer);
        return details;
      }));
    } catch (error) {
      // Keep the generated HTML answers if the JSON is temporarily unavailable.
      console.warn('The Q + A could not be loaded.', error);
    }
  };
  // Direct-file previews use the HTML copy generated from questions.json.
  if (window.location.protocol !== 'file:') loadQuestions();

  const menu = document.querySelector('.menu-toggle');
  const navigation = document.getElementById('navigation');
  const closeMenu = () => {
    menu?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-label', 'Open navigation');
    navigation?.classList.remove('is-open');
  };
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    navigation?.classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menu.focus();
    }
  });
  document.addEventListener('click', event => {
    if (event.target instanceof Element && !event.target.closest('.site-header')) closeMenu();
  });
  window.matchMedia('(min-width: 768px)').addEventListener('change', closeMenu);

  const panels = Array.from(document.querySelectorAll('[data-page]'));
  const pageLinks = Array.from(document.querySelectorAll('[data-page-link]'));
  const requestedPage = () => {
    let id;
    try { id = decodeURIComponent(window.location.hash.slice(1).split('?')[0]); } catch { id = ''; }
    return panels.some(panel => panel.id === id) ? id : 'home';
  };
  let currentPage = requestedPage();
  let syncVideo = () => {};
  const showPage = (focus = false) => {
    currentPage = requestedPage();
    for (const panel of panels) panel.hidden = panel.id !== currentPage;
    for (const link of pageLinks) {
      if (link.getAttribute('href') === `#${currentPage}`) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    closeMenu();
    syncVideo();
    if (focus) {
      const panel = document.getElementById(currentPage);
      const heading = currentPage === 'home' ? document.getElementById('home-heading') : panel?.querySelector('h2');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };
  window.addEventListener('hashchange', () => showPage(true));
  document.querySelector('.skip-link[href="#main"]')?.addEventListener('click', event => {
    event.preventDefault();
    document.getElementById('main')?.focus();
  });
  for (const link of pageLinks) {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      closeMenu();
      if (link.getAttribute('href') === window.location.hash) {
        event.preventDefault();
        showPage(true);
      }
    });
  }

  const video = document.getElementById('wedding-video');
  const toggle = document.getElementById('video-toggle');
  const label = document.getElementById('video-label');
  const playToggle = document.getElementById('video-play-toggle');
  const playIcon = document.getElementById('play-icon');
  const status = document.getElementById('video-status');
  if (video) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let manuallyPaused = false;
    let mediaFailed = false;
    const canPlay = () => currentPage === 'home' && !document.hidden && !mediaFailed;
    const setStatus = message => { if (status) status.textContent = message; };
    const updateControl = () => {
      const soundOn = !video.muted && video.volume > 0;
      if (label) label.textContent = soundOn ? 'Sound on' : 'Sound off';
      toggle?.setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on');
      toggle?.setAttribute('aria-pressed', String(soundOn));
      if (playIcon) playIcon.textContent = video.paused ? '▷' : 'Ⅱ';
      playToggle?.setAttribute('aria-label', video.paused ? 'Play film' : 'Pause film');
    };
    const playVideo = async () => {
      if (!canPlay()) return;
      let playbackError = null;
      let resumedMuted = false;
      try {
        // Keep this call before the first await so a click supplies user activation.
        await video.play();
      } catch (error) {
        playbackError = error;
        if (error.name === 'NotAllowedError' && !video.muted && canPlay() && !manuallyPaused) {
          // Some browsers require another gesture before resuming audible playback.
          video.muted = true;
          updateControl();
          try {
            await video.play();
            playbackError = null;
            resumedMuted = true;
          } catch (retryError) {
            playbackError = retryError;
          }
        }
      }
      if (!playbackError) {
        setStatus(resumedMuted ? 'The film is playing without sound. Use the sound control to hear the film.' : '');
        if (!canPlay() || manuallyPaused) video.pause();
      } else if (playbackError.name !== 'AbortError' && !mediaFailed) {
        setStatus('The film is paused. Select Play film to watch.');
      }
      if (!mediaFailed) updateControl();
    };
    syncVideo = () => {
      const shouldPlay = canPlay() && !manuallyPaused && !reducedMotion.matches;
      video.autoplay = shouldPlay;
      if (shouldPlay) playVideo();
      else video.pause();
    };
    video.addEventListener('play', () => {
      if (!canPlay() || manuallyPaused) video.pause();
      updateControl();
    });
    video.addEventListener('pause', () => { if (!mediaFailed) updateControl(); });
    video.addEventListener('volumechange', updateControl);
    video.addEventListener('error', () => {
      if (mediaFailed) return;
      mediaFailed = true;
      video.autoplay = false;
      video.removeAttribute('src');
      video.load();
      if (toggle) toggle.hidden = true;
      if (playToggle) playToggle.hidden = true;
      setStatus('Our film is unavailable right now. A favourite moment is shown instead.');
    });
    toggle?.addEventListener('click', () => {
      const enableSound = video.muted || video.volume === 0;
      if (enableSound && video.volume === 0) video.volume = 1;
      video.muted = !enableSound;
      updateControl();
      if (video.paused) {
        manuallyPaused = false;
        playVideo();
      }
    });
    playToggle?.addEventListener('click', () => {
      if (video.paused) {
        manuallyPaused = false;
        playVideo();
      } else {
        manuallyPaused = true;
        video.pause();
      }
    });
    video.setAttribute('aria-label', `A film of ${first} and ${second} together`);
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = canPlay() && !reducedMotion.matches;
    if (clean(config.video?.poster)) video.poster = clean(config.video.poster);
    if (clean(config.video?.position)) video.style.objectPosition = clean(config.video.position);
    video.src = clean(config.video?.src) || 'assets/our-film.mp4';
    updateControl();
    reducedMotion.addEventListener('change', syncVideo);
    document.addEventListener('visibilitychange', syncVideo);
  }
  showPage();
})();
