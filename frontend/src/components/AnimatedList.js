import React, { useRef, useState, useEffect } from 'react';
import './AnimatedList.css';

const AnimatedList = ({
  items = [],
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = '',
  itemClassName = '',
  displayScrollbar = true,
  initialSelectedIndex = -1,
  horizontal = false
}) => {
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);

  const handleScroll = e => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1));
  };

  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKeyDown = e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          if (onItemSelect) onItemSelect(items[selectedIndex], selectedIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

  useEffect(() => {
    // horizontal pill list: reveal all items quickly. Add a small transitionDelay per item
    // but add the visible class immediately so hover/state changes won't hide them.
    if (horizontal) {
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        // give each element a small CSS transition delay to preserve staggered feel
        try { el.style.transitionDelay = `${i * 40}ms`; } catch (err) {}
        el.classList.add('visible');
      });
      return;
    }

    // vertical list: use intersection observer to reveal when scrolled into view
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.2 }
    );
    itemRefs.current.forEach((el) => {
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [items]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    const container = listRef.current;
    const selectedItem = itemRefs.current[selectedIndex];
    if (selectedItem) {
      const extraMargin = 16;
      const containerScrollLeft = container.scrollLeft;
      const containerScrollTop = container.scrollTop;
      const containerSize = horizontal ? container.clientWidth : container.clientHeight;
      const itemStart = horizontal ? selectedItem.offsetLeft : selectedItem.offsetTop;
      const itemEnd = itemStart + (horizontal ? selectedItem.offsetWidth : selectedItem.offsetHeight);
      if (itemStart < (horizontal ? containerScrollLeft + extraMargin : containerScrollTop + extraMargin)) {
        if (horizontal) container.scrollTo({ left: itemStart - extraMargin, behavior: 'smooth' });
        else container.scrollTo({ top: itemStart - extraMargin, behavior: 'smooth' });
      } else if (itemEnd > (horizontal ? containerScrollLeft + containerSize - extraMargin : containerScrollTop + containerSize - extraMargin)) {
        if (horizontal) container.scrollTo({ left: itemEnd - containerSize + extraMargin, behavior: 'smooth' });
        else container.scrollTo({ top: itemEnd - containerSize + extraMargin, behavior: 'smooth' });
      }
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav, horizontal]);

  return (
    <div className={`scroll-list-container ${className}`}>
      {horizontal ? (
        <div className={`pill-list ${!displayScrollbar ? 'no-scrollbar' : ''}`} ref={listRef} onScroll={handleScroll}>
          {items.map((item, index) => (
            <div
              key={index}
              ref={(el) => (itemRefs.current[index] = el)}
              data-index={index}
              /* Don't change React state on simple hover for horizontal lists —
                 this avoids re-renders that can interfere with the reveal animation. */
              onClick={() => { setSelectedIndex(index); if (onItemSelect) onItemSelect(item, index); }}
              className={`pill fade-up ${selectedIndex === index ? 'selected' : ''} ${itemClassName}`}
              role="button"
            >
              <p className="pill-text">{item}</p>
            </div>
          ))}
        </div>
      ) : (
        <div ref={listRef} className={`scroll-list ${!displayScrollbar ? 'no-scrollbar' : ''}`} onScroll={handleScroll}>
          {items.map((item, index) => (
            <div
              key={index}
              ref={(el) => (itemRefs.current[index] = el)}
              data-index={index}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => { setSelectedIndex(index); if (onItemSelect) onItemSelect(item, index); }}
            >
              <div className={`item fade-up ${selectedIndex === index ? 'selected' : ''} ${itemClassName}`}>
                <p className="item-text">{item}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {showGradients && !horizontal && (
        <>
          <div className="top-gradient" style={{ opacity: topGradientOpacity }}></div>
          <div className="bottom-gradient" style={{ opacity: bottomGradientOpacity }}></div>
        </>
      )}
    </div>
  );
};

export default AnimatedList;
