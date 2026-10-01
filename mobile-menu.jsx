const { useState, useRef, useLayoutEffect, useCallback, useEffect } = React;

function StaggeredMenu({
  position = 'right',
  colors = ['#ff5e3a', '#ec407a'],
  items = [],
  socialItems = [],
  displaySocials = false,
  displayItemNumbering = true,
  logoText = 'AffilixNova',
  menuButtonColor = '#fff',
  openMenuButtonColor = '#fff',
  accentColor = '#ff9f43',
  changeMenuColorOnOpen = true,
  closeOnClickAway = true
}) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const preLayerElsRef = useRef([]);
  const plusHRef = useRef(null);
  const plusVRef = useRef(null);
  const iconRef = useRef(null);
  const textInnerRef = useRef(null);
  const [textLines, setTextLines] = useState(['Menu', 'Close']);
  const toggleBtnRef = useRef(null);
  const busyRef = useRef(false);
  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const preContainer = preLayersRef.current;
    const layers = preContainer ? Array.from(preContainer.querySelectorAll('.sm-prelayer')) : [];
    preLayerElsRef.current = layers;

    const offscreen = position === 'left' ? -100 : 100;
    gsap.set([panel, ...layers], { xPercent: offscreen, opacity: 1 });
    if (preLayersRef.current) gsap.set(preLayersRef.current, { opacity: 1 });
    gsap.set(plusHRef.current, { rotate: 0 });
    gsap.set(plusVRef.current, { rotate: 90 });
    gsap.set(toggleBtnRef.current, { color: menuButtonColor });
  }, [menuButtonColor, position]);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
    const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
    const socialTitle = panel.querySelector('.sm-socials-title');
    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

    const offscreen = position === 'left' ? -100 : 100;

    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

    const tl = gsap.timeline({ paused: true });
    layers.forEach((el, i) => {
      tl.fromTo(el, { xPercent: offscreen }, { xPercent: 0, duration: .5, ease: 'power4.out' }, i * .07);
    });
    const panelInsertTime = layers.length ? (layers.length - 1) * .07 + .08 : 0;
    tl.fromTo(panel, { xPercent: offscreen }, { xPercent: 0, duration: .65, ease: 'power4.out' }, panelInsertTime);

    if (itemEls.length) {
      const itemsStart = panelInsertTime + .65 * .15;
      tl.to(itemEls, { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: { each: .1 } }, itemsStart);
      if (numberEls.length) {
        tl.to(numberEls, { duration: .6, ease: 'power2.out', '--sm-num-opacity': 1, stagger: { each: .08 } }, itemsStart + .1);
      }
    }
    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + .65 * .4;
      if (socialTitle) tl.to(socialTitle, { opacity: 1, duration: .5, ease: 'power2.out' }, socialsStart);
      if (socialLinks.length) {
        tl.to(socialLinks, { y: 0, opacity: 1, duration: .55, ease: 'power3.out', stagger: { each: .08 } }, socialsStart + .04);
      }
    }
    openTlRef.current = tl;
    return tl;
  }, [position]);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    closeTweenRef.current?.kill();
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => { busyRef.current = false; });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;
    const offscreen = position === 'left' ? -100 : 100;
    closeTweenRef.current = gsap.to([...layers, panel], {
      xPercent: offscreen, duration: .32, ease: 'power3.in', overwrite: 'auto',
      onComplete: () => { busyRef.current = false; }
    });
  }, [position]);

  const animateIcon = opening => {
    gsap.to(iconRef.current, { rotate: opening ? 225 : 0, duration: opening ? .8 : .35, ease: 'power4.out', overwrite: 'auto' });
  };

  const animateColor = opening => {
    if (!changeMenuColorOnOpen) return;
    gsap.to(toggleBtnRef.current, { color: opening ? openMenuButtonColor : menuButtonColor, delay: .18, duration: .3, ease: 'power2.out' });
  };

  const animateText = opening => {
    const inner = textInnerRef.current;
    const current = opening ? 'Menu' : 'Close';
    const target = opening ? 'Close' : 'Menu';
    setTextLines([current, target]);
    gsap.set(inner, { yPercent: 0 });
    gsap.to(inner, { yPercent: -50, duration: .5, ease: 'power4.out' });
  };

  const toggleMenu = () => {
    const target = !openRef.current;
    openRef.current = target;
    setOpen(target);
    target ? playOpen() : playClose();
    animateIcon(target);
    animateColor(target);
    animateText(target);
  };

  useEffect(() => {
    if (!closeOnClickAway || !open) return;
    const onClick = e => {
      if (panelRef.current && !panelRef.current.contains(e.target) && toggleBtnRef.current && !toggleBtnRef.current.contains(e.target)) {
        openRef.current = false;
        setOpen(false);
        playClose();
        animateIcon(false);
        animateColor(false);
        animateText(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [closeOnClickAway, open, playClose]);

  return (
    <div className="staggered-menu-wrapper" data-position={position} data-open={open || undefined}>
      <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
        {colors.map((c, i) => <div key={i} className="sm-prelayer" style={{ background: c }} />)}
      </div>

      <header className="staggered-menu-header">
  <div className="sm-header-left">
    <img src="assets/afflixnova-logo.png" alt="AfflixNova" className="sm-logo-img-small" />
<span className="sm-logo-text">AfflixNova</span>
    <a href="/signup" className="sm-header-signup">Sign Up</a>
  </div>
  <button
          ref={toggleBtnRef}
          className="sm-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={toggleMenu}
          type="button"
        >
          <span className="sm-toggle-textWrap">
            <span ref={textInnerRef} className="sm-toggle-textInner">
              {textLines.map((l, i) => <span className="sm-toggle-line" key={i}>{l}</span>)}
            </span>
          </span>
          <span ref={iconRef} className="sm-icon" aria-hidden="true">
            <span ref={plusHRef} className="sm-icon-line" />
            <span ref={plusVRef} className="sm-icon-line sm-icon-line-v" />
          </span>
        </button>
      </header>

          <aside ref={panelRef} className="staggered-menu-panel" style={{ ['--sm-accent']: accentColor }} aria-hidden={!open}>
        <div className="sm-panel-inner">
          <div className="sm-panel-auth-row">
            <a href="/login" className="sm-panel-login">Login</a>
            <a href="/signup" className="sm-panel-signup">Sign Up</a>
          </div>
          <ul className="sm-panel-list" data-numbering={displayItemNumbering || undefined}>
            {items.map((it, i) => (
              <li className="sm-panel-itemWrap" key={it.label}>
                <a className="sm-panel-item" href={it.link} data-index={i + 1}>
                  <span className="sm-panel-itemLabel">{it.label}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="sm-panel-footer">
  <p className="sm-footer-label">Join our community</p>
  <div className="sm-footer-links">
    <a href="https://wa.me/YOUR_CHANNEL_LINK" target="_blank" rel="noopener noreferrer" className="sm-footer-link">
      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.8 14.3c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3.1s.8-2.2 1.1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.2.1.3 0 .5-.1.2-.2.3-.3.5-.2.2-.3.3-.5.5-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.3 1.2 2.4 1.6 2.8 1.7.3.1.5.1.7-.1.2-.2.8-.9 1-1.2.2-.3.4-.2.7-.1.3.1 1.7.8 2 1 .3.1.5.2.5.3.1.2.1.7-.1 1.2z"/></svg>
      WhatsApp
    </a>
    <a href="https://t.me/YOUR_CHANNEL_LINK" target="_blank" rel="noopener noreferrer" className="sm-footer-link">
      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M21.9 4.5 18.6 20c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.4-5 9-8.2c.4-.4-.1-.6-.6-.2L6.8 13 2 11.5c-1-.3-1-1 .2-1.5l19-7.3c.8-.3 1.6.2 1.3 1.8z"/></svg>
      Telegram
    </a>
  </div>
</div>
        </div>
      </aside>
    </div>
  );
}

const items = [
  { label: 'Features', link: '#features' },
  { label: 'Cases', link: '#cases' },
  { label: 'Monetize', link: '#monetize' },
  { label: 'Blog', link: '#blog' }
];
ReactDOM.createRoot(document.getElementById('staggered-menu-root'))
  .render(<StaggeredMenu items={items} openMenuButtonColor="#fff" displayItemNumbering={false} />);