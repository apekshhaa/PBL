import React from 'react';
import { useState, useEffect } from 'react';
import { gsap } from 'gsap';
import Folder from './Folder';

import './FlowingMenu.css';

function FlowingMenu({ items = [], onSelect }) {
  return (
    <div className="menu-wrap">
      <nav className="menu">
        {items.map((item, idx) => (
          <MenuItem key={idx} {...item} onSelect={onSelect} />
        ))}
      </nav>
    </div>
  );
}

function MenuItem({ link = '#', text = '', image = '', onSelect, subItems }) {
  const itemRef = React.useRef(null);
  const marqueeRef = React.useRef(null);
  const marqueeInnerRef = React.useRef(null);

  const animationDefaults = { duration: 0.6, ease: 'expo' };

  const findClosestEdge = (mouseX, mouseY, width, height) => {
    const topEdgeDist = distMetric(mouseX, mouseY, width / 2, 0);
    const bottomEdgeDist = distMetric(mouseX, mouseY, width / 2, height);
    return topEdgeDist < bottomEdgeDist ? 'top' : 'bottom';
  };

  const distMetric = (x, y, x2, y2) => {
    const xDiff = x - x2;
    const yDiff = y - y2;
    return xDiff * xDiff + yDiff * yDiff;
  };

  const handleMouseEnter = ev => {
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const edge = findClosestEdge(x, y, rect.width, rect.height);

    gsap
      .timeline({ defaults: animationDefaults })
      .set(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .set(marqueeInnerRef.current, { y: edge === 'top' ? '101%' : '-101%' }, 0)
      .to([marqueeRef.current, marqueeInnerRef.current], { y: '0%' }, 0);
  };

  const handleMouseLeave = ev => {
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const edge = findClosestEdge(x, y, rect.width, rect.height);

    gsap
      .timeline({ defaults: animationDefaults })
      .to(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .to(marqueeInnerRef.current, { y: edge === 'top' ? '101%' : '-101%' }, 0);
  };

  const repeatedMarqueeContent = Array.from({ length: 4 }).map((_, idx) => (
    <React.Fragment key={idx}>
      <span>{text}</span>
      <div className="marquee__img" style={{ backgroundImage: `url(${image})` }} />
    </React.Fragment>
  ));

  const [showFolder, setShowFolder] = useState(false);
  const popoverRef = React.useRef(null);

  const handleClick = (e) => {
    e.preventDefault();
    console.log('MenuItem clicked:', text);
    if (subItems && subItems.length) {
      // toggle folder visibility for items that provide subItems
      setShowFolder(prev => !prev);
      return;
    }
    if (onSelect) onSelect(text);
  };

  // Close on outside click
  useEffect(() => {
    const onDocClick = (ev) => {
      if (!showFolder) return;
      const pop = popoverRef.current;
      const item = itemRef.current;
      if (!pop || !item) return;
      if (pop.contains(ev.target) || item.contains(ev.target)) return;
      // animate out then close
      gsap.to(pop, { duration: 0.12, scale: 0.96, opacity: 0, y: -6, ease: 'power2.out', onComplete: () => setShowFolder(false) });
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [showFolder]);

  return (
    <div className="menu__item" ref={itemRef}>
      <a
        className="menu__item-link"
        href="#"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {text}
      </a>
      <div className="marquee" ref={marqueeRef} aria-hidden>
        <div className="marquee__inner-wrap" ref={marqueeInnerRef}>
          <div className="marquee__inner" aria-hidden="true">
            {repeatedMarqueeContent}
          </div>
        </div>
      </div>
      {subItems && subItems.length ? (
        <div className={`menu__folder-popover ${showFolder ? 'visible' : ''}`} ref={popoverRef} aria-hidden={!showFolder}>
          {showFolder && (
            <Folder items={subItems} onItemClick={(item) => { if (onSelect) onSelect(item); setShowFolder(false); }} />
          )}
        </div>
      ) : null}
    </div>
  );
}

export default FlowingMenu;