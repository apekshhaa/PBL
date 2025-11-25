import { useRef, useState, useEffect } from 'react';
import './FallingText.css';

const FallingText = ({
  className = '',
  text = '',
  highlightWords = [],
  highlightClass = 'highlighted',
  trigger = 'auto',
  backgroundColor = 'transparent',
  wireframes = false,
  gravity = 1,
  mouseConstraintStiffness = 0.2,
  fontSize = '1rem',
  fontFamily = 'Compressa VF',
  fontUrl = 'https://res.cloudinary.com/dr6lvwubh/raw/upload/v1529908256/CompressaPRO-GX.woff2',
  textColor = '#e6d9ff'
}) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const canvasContainerRef = useRef(null);

  const [effectStarted, setEffectStarted] = useState(false);

  useEffect(() => {
    if (!textRef.current) return;
    const words = text.split(' ');
    const newHTML = words
      .map(word => {
        const isHighlighted = highlightWords.some(hw => word.startsWith(hw));
        // inline style to ensure color and font match theme even without global font-face
        const style = `color: ${textColor}; font-family: ${fontFamily}, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial`;
        return `<span class="word ${isHighlighted ? highlightClass : ''}" style="${style}">${word}</span>`;
      })
      .join(' ');
    textRef.current.innerHTML = newHTML;
  }, [text, highlightWords, highlightClass, textColor, fontFamily]);

  useEffect(() => {
    if (trigger === 'auto') {
      setEffectStarted(true);
      return;
    }
    if (trigger === 'scroll' && containerRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setEffectStarted(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [trigger]);

  useEffect(() => {
    if (!effectStarted) return;

    let mounted = true;
    let cleanupFns = [];

    // attempt to require matter-js at runtime. use eval('require') so bundlers
    // don't attempt to resolve this module at build time when it's not installed.
    let Matter;
    let matterAvailable = true;
    try {
      // eslint-disable-next-line no-eval
      const req = eval('require');
      Matter = req('matter-js');
    } catch (err) {
      matterAvailable = false;
      // eslint-disable-next-line no-console
      console.warn('FallingText: matter-js not installed. Falling-text will use a lightweight CSS/WAAPI fallback animation. Install with `npm install matter-js` to enable physics-driven effect.');
    }

    if (!matterAvailable) {
      // Fallback: simple falling animation using Web Animations API so the effect still runs
      const containerRect = containerRef.current.getBoundingClientRect();
      const height = containerRect.height || 300;
      const wordSpans = textRef.current.querySelectorAll('.word');
      const animations = [];

      [...wordSpans].forEach(elem => {
        const rect = elem.getBoundingClientRect();
        const startTop = rect.top - containerRect.top;
        const fallDistance = (height - startTop) + 60 + Math.random() * 120;
        const rotate = (Math.random() - 0.5) * 60; // degrees

        // ensure absolute positioning so we can animate freely
        elem.style.position = 'absolute';
        elem.style.left = `${rect.left - containerRect.left}px`;
        elem.style.top = `${startTop}px`;
        elem.style.transform = 'translate(0, 0)';

        const duration = 1200 + Math.random() * 900;
        const anim = elem.animate([
          { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
          { transform: `translateY(${fallDistance}px) rotate(${rotate}deg)`, opacity: 0.92 }
        ], {
          duration,
          easing: 'cubic-bezier(.17,.67,.83,.67)',
          fill: 'forwards'
        });

        animations.push(anim);
      });

      cleanupFns.push(() => {
        animations.forEach(a => { try { a.cancel(); } catch (e) {} });
      });

      // nothing more to do for full physics fallback
      return () => {
        cleanupFns.forEach(fn => { try { fn(); } catch (e) {} });
      };
    }

    if (!mounted) return;

    const { Engine, Render, World, Bodies, Runner, Mouse, MouseConstraint } = Matter;

      const containerRect = containerRef.current.getBoundingClientRect();
      const width = containerRect.width;
      const height = containerRect.height;

      if (width <= 0 || height <= 0) {
        return;
      }

      const engine = Engine.create();
      engine.world.gravity.y = gravity;

      const render = Render.create({
        element: canvasContainerRef.current,
        engine,
        options: {
          width,
          height,
          background: backgroundColor,
          wireframes
        }
      });

      const boundaryOptions = {
        isStatic: true,
        render: { fillStyle: 'transparent' }
      };
      const floor = Bodies.rectangle(width / 2, height + 25, width, 50, boundaryOptions);
      const leftWall = Bodies.rectangle(-25, height / 2, 50, height, boundaryOptions);
      const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height, boundaryOptions);
      const ceiling = Bodies.rectangle(width / 2, -25, width, 50, boundaryOptions);

      const wordSpans = textRef.current.querySelectorAll('.word');
      const wordBodies = [...wordSpans].map(elem => {
        const rect = elem.getBoundingClientRect();

        const x = rect.left - containerRect.left + rect.width / 2;
        const y = rect.top - containerRect.top + rect.height / 2;

        const body = Bodies.rectangle(x, y, rect.width, rect.height, {
          render: { fillStyle: 'transparent' },
          restitution: 0.8,
          frictionAir: 0.01,
          friction: 0.2
        });

        Matter.Body.setVelocity(body, {
          x: (Math.random() - 0.5) * 5,
          y: 0
        });
        Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);
        return { elem, body };
      });

      wordBodies.forEach(({ elem, body }) => {
        elem.style.position = 'absolute';
        elem.style.left = `${body.position.x - body.bounds.max.x + body.bounds.min.x / 2}px`;
        elem.style.top = `${body.position.y - body.bounds.max.y + body.bounds.min.y / 2}px`;
        elem.style.transform = 'none';
      });

      const mouse = Mouse.create(containerRef.current);
      const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: {
          stiffness: mouseConstraintStiffness,
          render: { visible: false }
        }
      });
      render.mouse = mouse;

      World.add(engine.world, [floor, leftWall, rightWall, ceiling, mouseConstraint, ...wordBodies.map(wb => wb.body)]);

      const runner = Runner.create();
      Runner.run(runner, engine);
      Render.run(render);

      let rafId;
      const updateLoop = () => {
        wordBodies.forEach(({ body, elem }) => {
          const { x, y } = body.position;
          elem.style.left = `${x}px`;
          elem.style.top = `${y}px`;
          elem.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
        });
        Matter.Engine.update(engine);
        rafId = requestAnimationFrame(updateLoop);
      };
      updateLoop();

      cleanupFns.push(() => {
        if (rafId) cancelAnimationFrame(rafId);
        Render.stop(render);
        Runner.stop(runner);
        if (render.canvas && canvasContainerRef.current) {
          try { canvasContainerRef.current.removeChild(render.canvas); } catch (e) {}
        }
        World.clear(engine.world);
        Engine.clear(engine);
      });

    return () => {
      mounted = false;
      cleanupFns.forEach(fn => {
        try { fn(); } catch (e) {}
      });
    };
  }, [effectStarted, gravity, wireframes, backgroundColor, mouseConstraintStiffness]);

  const handleTrigger = () => {
    if (!effectStarted && (trigger === 'click' || trigger === 'hover')) {
      setEffectStarted(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`falling-text-container ${className}`}
      onClick={trigger === 'click' ? handleTrigger : undefined}
      onMouseEnter={trigger === 'hover' ? handleTrigger : undefined}
      style={{
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {fontUrl ? (
        <style>{`@font-face { font-family: '${fontFamily}'; src: url('${fontUrl}'); font-style: normal; }`}</style>
      ) : null}
      <div
        ref={textRef}
        className="falling-text-target"
        style={{
          fontSize: fontSize,
          lineHeight: 1.4
        }}
      />
      <div ref={canvasContainerRef} className="falling-text-canvas" />
    </div>
  );
};

export default FallingText;
