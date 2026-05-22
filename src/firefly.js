(() => {
  "use strict";

  const FIREFLY_ATTR = "data-firefly";
  const DEBOUNCE_MS = 400;

  let keywords = [];
  let enabled = true;
  let observer = null;
  let debounceTimer = null;

  loadFromStorage();
  setupMessageListener();
  setupObserver();

  function loadFromStorage() {
    try {
      chrome.storage.sync.get(["fireflyKeywords", "fireflyEnabled"], (data) => {
        if (chrome.runtime.lastError) return;
        keywords = normalize(data && data.fireflyKeywords ? data.fireflyKeywords : []);
        enabled = !(data && data.fireflyEnabled === false);
        runScan();
      });
    } catch (_) {
      // Extension context invalidated; nothing to do.
    }
  }

  function setupMessageListener() {
    try {
      chrome.runtime.onMessage.addListener((msg) => {
        if (!msg || msg.type !== "fireflyUpdate") return;
        keywords = normalize(msg.keywords || []);
        enabled = msg.enabled !== false;
        runScan();
      });
    } catch (_) {}
  }

  function normalize(arr) {
    return arr.map((k) => ({
      word: k.word,
      color: k.color || "#ffeb3b",
      bold: k.bold !== undefined ? k.bold : true,
      highlight: k.highlight !== undefined ? k.highlight : true,
    }));
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function buildLookup() {
    const map = new Map();
    keywords.forEach((k) => {
      if (!k.bold && !k.highlight) return;
      map.set(k.word.toLowerCase(), k);
    });
    return map;
  }

  function buildRegex(lookup) {
    if (lookup.size === 0) return null;
    const words = Array.from(lookup.values())
      .map((k) => k.word)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegex);
    return new RegExp(`\\b(?:${words.join("|")})\\b`, "gi");
  }

  function unmarkAll() {
    const marks = document.querySelectorAll(`mark[${FIREFLY_ATTR}]`);
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
  }

  function runScan() {
    unmarkAll();
    if (!enabled) return;

    const lookup = buildLookup();
    if (lookup.size === 0) return;

    const re = buildRegex(lookup);
    if (!re) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.nodeName;
        if (
          tag === "SCRIPT" ||
          tag === "STYLE" ||
          tag === "NOSCRIPT" ||
          tag === "TEXTAREA" ||
          tag === "INPUT" ||
          tag === "SELECT"
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        if (p.nodeName === "MARK" && p.hasAttribute(FIREFLY_ATTR)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const targets = [];
    let node;
    while ((node = walker.nextNode())) targets.push(node);

    targets.forEach((textNode) => wrapMatches(textNode, re, lookup));
  }

  function wrapMatches(textNode, re, lookup) {
    const text = textNode.nodeValue;
    re.lastIndex = 0;
    const matches = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
      if (m[0].length === 0) re.lastIndex++;
    }
    if (matches.length === 0) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    matches.forEach((match) => {
      if (match.start > cursor) {
        frag.appendChild(document.createTextNode(text.slice(cursor, match.start)));
      }
      const kw = lookup.get(match.text.toLowerCase());
      if (!kw) {
        frag.appendChild(document.createTextNode(match.text));
      } else {
        const mark = document.createElement("mark");
        mark.setAttribute(FIREFLY_ATTR, "1");
        mark.style.backgroundColor = kw.highlight ? kw.color : "transparent";
        mark.style.fontWeight = kw.bold ? "bold" : "inherit";
        mark.style.padding = "0 1px";
        mark.style.borderRadius = "2px";
        mark.style.color = "inherit";
        mark.textContent = match.text;
        frag.appendChild(mark);
      }
      cursor = match.end;
    });
    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
    }

    const parent = textNode.parentNode;
    if (parent) parent.replaceChild(frag, textNode);
  }

  function setupObserver() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", setupObserver, { once: true });
      return;
    }
    observer = new MutationObserver((mutations) => {
      let interesting = false;
      for (const mut of mutations) {
        for (const added of mut.addedNodes) {
          if (added.nodeType === Node.ELEMENT_NODE && added.nodeName === "MARK" && added.hasAttribute && added.hasAttribute(FIREFLY_ATTR)) {
            continue;
          }
          interesting = true;
          break;
        }
        if (interesting) break;
      }
      if (!interesting) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runScan, DEBOUNCE_MS);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
