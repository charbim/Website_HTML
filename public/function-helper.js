(() => {
  const ROOT_ID = 'function-helper-root';
  const STYLE_ID = 'function-helper-styles';

  function isEligibleElement(element) {
    if (!element || !(element instanceof HTMLElement)) return false;
    if (element.isContentEditable === true) return true;
    if (element.tagName !== 'INPUT' && element.tagName !== 'TEXTAREA') return false;
    if (element.tagName === 'TEXTAREA') return true;
    const type = (element.getAttribute('type') || 'text').toLowerCase();
    return ['text', 'search', 'url', 'tel', 'email', 'password', 'number'].includes(type);
  }

  function isAllowedForNumberInput(text) {
    // Allow digits, decimal, minus, plus, exponent markers for number inputs
    return /^[0-9eE+\-.\s]+$/.test(text);
  }

  function insertAtCursor(target, text) {
    if (!target) return;
    if (target.tagName === 'INPUT') {
      const type = (target.getAttribute('type') || 'text').toLowerCase();
      if (type === 'number' && !isAllowedForNumberInput(text)) {
        return; // Skip inserting function text into numeric inputs
      }
    }
    try {
      if (typeof target.selectionStart === 'number' && typeof target.selectionEnd === 'number') {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const value = target.value || '';
        target.value = value.slice(0, start) + text + value.slice(end);
        const newPos = start + text.length;
        target.selectionStart = newPos;
        target.selectionEnd = newPos;
        target.focus();
        // Bubble input event so listeners (e.g., graph redraw) react
        target.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
    } catch (_) {}
    if (target.isContentEditable === true) {
      document.execCommand('insertText', false, text);
      return;
    }
    // Fallback: append
    if ('value' in target) {
      target.value += text;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
#${ROOT_ID} {
  position: fixed;
  top: 50%;
  right: 0;
  transform: translateY(-50%) translateX(calc(100% - 36px));
  z-index: 2147483000;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  transition: transform 0.25s ease;
}
#${ROOT_ID}.fh-open {
  transform: translateY(-50%) translateX(0);
}
#${ROOT_ID}.fh-closed {
  transform: translateY(-50%) translateX(calc(100% - 36px));
}
#${ROOT_ID}.fh-closed .fh-panel {
  pointer-events: none;
}
#${ROOT_ID} .fh-panel {
  width: 240px;
  max-height: 280px;
  background: rgba(32, 32, 37, 0.95);
  color: #ffffff;
  border-radius: 10px 0 0 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  backdrop-filter: blur(6px);
}
#${ROOT_ID} .fh-handle {
  position: absolute;
  left: -36px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  min-height: 150px; /* ensure full label is visible vertically */
  border: 0;
  border-radius: 8px 0 0 8px;
  background: rgba(32, 32, 37, 0.95);
  color: #ffffff;
  cursor: pointer;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.05em;
  padding: 8px 6px;
  white-space: nowrap;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
#${ROOT_ID} .fh-handle:focus {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}
#${ROOT_ID} .fh-header {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  opacity: 0.85;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
#${ROOT_ID} .fh-content {
  padding: 8px;
  max-height: 220px;
  overflow: auto;
}
#${ROOT_ID} .fh-section {
  margin-bottom: 8px;
}
#${ROOT_ID} .fh-section-title {
  font-size: 11px;
  opacity: 0.7;
  margin: 4px 4px 6px;
}
#${ROOT_ID} .fh-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
#${ROOT_ID} .fh-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  cursor: pointer;
  text-align: center;
  transition: background 0.15s ease, transform 0.05s ease;
}
#${ROOT_ID} .fh-btn:hover {
  background: rgba(255, 255, 255, 0.16);
}
#${ROOT_ID} .fh-btn:active {
  transform: translateY(1px);
}
@media (max-width: 640px) {
  #${ROOT_ID} .fh-panel { width: 200px; max-height: 240px; }
  #${ROOT_ID} .fh-handle { height: 80px; }
}
.dark-mode #${ROOT_ID} .fh-panel, body.dark-mode #${ROOT_ID} .fh-panel {
  background: rgba(25, 20, 29, 0.95);
}
.dark-mode #${ROOT_ID} .fh-handle, body.dark-mode #${ROOT_ID} .fh-handle {
  background: rgba(25, 20, 29, 0.95);
}
    `;
    document.head.appendChild(style);
  }

  function buildButton(label, value, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fh-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => onClick(value));
    return btn;
  }

  function buildSection(title, entries, onInsert) {
    const section = document.createElement('div');
    section.className = 'fh-section';
    const heading = document.createElement('div');
    heading.className = 'fh-section-title';
    heading.textContent = title;
    const grid = document.createElement('div');
    grid.className = 'fh-grid';
    entries.forEach(({ label, value }) => {
      grid.appendChild(buildButton(label, value, onInsert));
    });
    section.appendChild(heading);
    section.appendChild(grid);
    return section;
  }

  function renderHelper() {
    if (document.getElementById(ROOT_ID)) return;
    ensureStyles();

    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'fh-closed';
    root.setAttribute('aria-hidden', 'true');

    const panel = document.createElement('div');
    panel.className = 'fh-panel';

    const handle = document.createElement('button');
    handle.className = 'fh-handle';
    handle.setAttribute('aria-label', 'Toggle function helper');
    handle.textContent = 'Functions';
    handle.addEventListener('click', () => toggle());

    const header = document.createElement('div');
    header.className = 'fh-header';
    header.textContent = 'Function Helper';

    const content = document.createElement('div');
    content.className = 'fh-content';

    let lastFocused = null;
    document.addEventListener('focusin', (e) => {
      if (isEligibleElement(e.target)) {
        lastFocused = e.target;
      }
    });

    function getTargetInput() {
      const active = document.activeElement;
      if (isEligibleElement(active)) return active;
      if (isEligibleElement(lastFocused)) return lastFocused;
      return null;
    }

    function onInsert(value) {
      const target = getTargetInput();
      if (!target) {
        // Briefly wiggle the handle to hint interaction
        handle.style.transform = 'translateY(-50%) translateX(-2px)';
        setTimeout(() => { handle.style.transform = 'translateY(-50%)'; }, 120);
        return;
      }
      insertAtCursor(target, value);
    }

    const vars = [
      { label: 'θ', value: 'θ' },
      { label: 'r', value: 'r' },
      { label: 'x', value: 'x' },
      { label: 'π', value: 'π' }
    ];
    const funcs = [
      { label: 'sin', value: 'sin(' },
      { label: 'cos', value: 'cos(' },
      { label: 'tan', value: 'tan(' },
    { label: 'sin⁻¹', value: 'asin(' },
    { label: 'cos⁻¹', value: 'acos(' },
    { label: 'tan⁻¹', value: 'atan(' },
    { label: 'sec', value: 'sec(' },
    { label: 'csc', value: 'csc(' },
    { label: 'cot', value: 'cot(' },
      { label: '√', value: 'sqrt(' },
      { label: 'log', value: 'log(' },
      { label: 'exp', value: 'exp(' },
    { label: '|x|', value: 'abs(' }
    ];
  // Operators section not essential anymore; keep the panel focused on functions only.

  content.appendChild(buildSection('Variables', vars, onInsert));
  content.appendChild(buildSection('Functions', funcs, onInsert));

    panel.appendChild(header);
    panel.appendChild(content);
    root.appendChild(panel);
    root.appendChild(handle);
    document.body.appendChild(root);

    // Stick to viewport right; no container alignment to avoid mid-page overlap

    function open() {
      root.classList.remove('fh-closed');
      root.classList.add('fh-open');
      root.setAttribute('aria-hidden', 'false');
    }

    function close() {
      root.classList.remove('fh-open');
      root.classList.add('fh-closed');
      root.setAttribute('aria-hidden', 'true');
    }

    function toggle() {
      if (root.classList.contains('fh-open')) close();
      else open();
    }

    document.addEventListener('click', (e) => {
      const container = document.getElementById(ROOT_ID);
      if (!container) return;
      // Keep panel open when clicking into any eligible input/textarea/contenteditable
      if (isEligibleElement(e.target)) {
        // focus event will update lastFocused; do not close
        return;
      }
      if (!container.contains(e.target) && container.classList.contains('fh-open')) {
        close();
      }
    });

    window.FunctionHelper = {
      open,
      close,
      toggle,
      insert: (text) => onInsert(text)
    };
  }

  function initWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderHelper);
    } else {
      renderHelper();
    }
  }

  initWhenReady();
})();



