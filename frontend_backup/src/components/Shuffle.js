import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import './Shuffle.css'; // optional styling

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

const Shuffle = ({
  text,
  className = '',
  style = {},
  shuffleDirection = 'right',
  duration = 0.35,
  maxDelay = 0,
  ease = 'power3.out',
  threshold = 0.1,
  rootMargin = '-100px',
  tag = 'p',
  textAlign = 'center',
  onShuffleComplete,
  shuffleTimes = 1,
  animationMode = 'evenodd',
  loop = false,
  loopDelay = 0,
  stagger = 0.03,
  scrambleCharset = '',
  colorFrom,
  colorTo,
  triggerOnce = true,
  respectReducedMotion = true,
  triggerOnHover = true
}) => {
  const ref = useRef(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [ready, setReady] = useState(false);

  const splitRef = useRef(null);
  const wrappersRef = useRef([]);
  const tlRef = useRef(null);
  const playingRef = useRef(false);
  const hoverHandlerRef = useRef(null);

  // wait for fonts
  useEffect(() => {
    if ('fonts' in document) {
      if (document.fonts.status === 'loaded') setFontsLoaded(true);
      else document.fonts.ready.then(() => setFontsLoaded(true));
    } else setFontsLoaded(true);
  }, []);

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return;

      if (
        respectReducedMotion &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        onShuffleComplete?.();
        return;
      }

      const el = ref.current;
      const startPct = (1 - threshold) * 100;
      const mm = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin || '');
      const mv = mm ? parseFloat(mm[1]) : 0;
      const mu = mm ? mm[2] || 'px' : 'px';
      const sign = mv === 0 ? '' : mv < 0 ? `-=${Math.abs(mv)}${mu}` : `+=${mv}${mu}`;
      const start = `top ${startPct}%${sign}`;

      const teardown = () => {
        if (tlRef.current) {
          tlRef.current.kill();
          tlRef.current = null;
        }
        if (wrappersRef.current.length) {
          wrappersRef.current.forEach(wrap => {
            const inner = wrap.firstElementChild;
            const orig = inner?.querySelector('[data-orig="1"]');
            if (orig && wrap.parentNode) wrap.parentNode.replaceChild(orig, wrap);
          });
          wrappersRef.current = [];
        }
        try {
          splitRef.current?.revert();
        } catch {}
        splitRef.current = null;
        playingRef.current = false;
      };

      const build = () => {
        teardown();
        splitRef.current = new GSAPSplitText(el, {
          type: 'chars',
          charsClass: 'shuffle-char'
        });
        const chars = splitRef.current.chars || [];
        wrappersRef.current = [];

        const rolls = Math.max(1, Math.floor(shuffleTimes));
        const rand = set => set.charAt(Math.floor(Math.random() * set.length)) || '';

        chars.forEach(ch => {
          const parent = ch.parentElement;
          if (!parent) return;
          const w = ch.getBoundingClientRect().width;
          if (!w) return;

          const wrap = document.createElement('span');
          Object.assign(wrap.style, {
            display: 'inline-block',
            overflow: 'hidden',
            width: w + 'px',
            verticalAlign: 'baseline'
          });

          const inner = document.createElement('span');
          Object.assign(inner.style, {
            display: 'inline-block',
            whiteSpace: 'nowrap',
            willChange: 'transform'
          });

          parent.insertBefore(wrap, ch);
          wrap.appendChild(inner);

          const firstOrig = ch.cloneNode(true);
          Object.assign(firstOrig.style, {
            display: 'inline-block',
            width: w + 'px',
            textAlign: 'center'
          });

          ch.setAttribute('data-orig', '1');
          Object.assign(ch.style, {
            display: 'inline-block',
            width: w + 'px',
            textAlign: 'center'
          });

          inner.appendChild(firstOrig);
          for (let k = 0; k < rolls; k++) {
            const c = ch.cloneNode(true);
            if (scrambleCharset) c.textContent = rand(scrambleCharset);
            Object.assign(c.style, {
              display: 'inline-block',
              width: w + 'px',
              textAlign: 'center'
            });
            inner.appendChild(c);
          }
          inner.appendChild(ch);

          let startX = 0;
          let finalX = -((rolls + 1) * w);
          if (shuffleDirection === 'right') {
            const firstCopy = inner.firstElementChild;
            const real = inner.lastElementChild;
            if (real) inner.insertBefore(real, inner.firstChild);
            if (firstCopy) inner.appendChild(firstCopy);
            startX = -((rolls + 1) * w);
            finalX = 0;
          }

          gsap.set(inner, { x: startX, force3D: true });
          if (colorFrom) inner.style.color = colorFrom;
          inner.setAttribute('data-final-x', String(finalX));
          inner.setAttribute('data-start-x', String(startX));

          wrappersRef.current.push(wrap);
        });
      };

      const play = () => {
        const strips = wrappersRef.current.map(w => w.firstElementChild);
        if (!strips.length) return;

        playingRef.current = true;
        const tl = gsap.timeline({
          smoothChildTiming: true,
          repeat: loop ? -1 : 0,
          repeatDelay: loop ? loopDelay : 0,
          onComplete: () => {
            playingRef.current = false;
            if (!loop) {
              wrappersRef.current.forEach(w => {
                const strip = w.firstElementChild;
                const real = strip.querySelector('[data-orig="1"]');
                if (real) {
                  strip.replaceChildren(real);
                  strip.style.transform = 'none';
                  strip.style.willChange = 'auto';
                }
              });
              if (colorTo) gsap.set(strips, { color: colorTo });
              onShuffleComplete?.();
            }
          }
        });

        tl.to(strips, {
          x: i => parseFloat(strips[i].getAttribute('data-final-x') || '0'),
          duration,
          ease,
          force3D: true,
          stagger: animationMode === 'evenodd' ? stagger : 0
        });

        if (colorFrom && colorTo) {
          tl.to(strips, { color: colorTo, duration, ease }, 0);
        }

        tlRef.current = tl;
      };

      const create = () => {
        build();
        play();
        setReady(true);
      };

      const st = ScrollTrigger.create({
        trigger: el,
        start,
        once: triggerOnce,
        onEnter: create
      });

      return () => {
        st.kill();
        teardown();
        setReady(false);
      };
    },
    {
      dependencies: [
        text,
        duration,
        maxDelay,
        ease,
        threshold,
        rootMargin,
        fontsLoaded,
        shuffleDirection,
        shuffleTimes,
        animationMode,
        loop,
        loopDelay,
        stagger,
        scrambleCharset,
        colorFrom,
        colorTo,
        triggerOnce,
        respectReducedMotion,
        triggerOnHover
      ],
      scope: ref
    }
  );

  const commonStyle = { textAlign, ...style };
  const classes = `shuffle-parent ${ready ? 'is-ready' : ''} ${className}`;
  const Tag = tag || 'p';
  return React.createElement(Tag, { ref, className: classes, style: commonStyle }, text);
};

export default Shuffle;
