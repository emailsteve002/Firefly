(() => {
  "use strict";

  const DEFAULT_COLOR = "#ffeb3b";

  const els = {
    wrapper: document.getElementById("wrapper"),
    keywords: document.getElementById("keywords"),
    newColor: document.getElementById("newColor"),
    addBtn: document.getElementById("addBtn"),
    listTitle: document.getElementById("listTitle"),
    toggleBtn: document.getElementById("toggleBtn"),
    clearBtn: document.getElementById("clearBtn"),
    keywordList: document.getElementById("keywordList"),
    emptyState: document.getElementById("emptyState"),
    sidePanel: document.getElementById("sidePanel"),
    panelApply: document.getElementById("panelApply"),
    panelClose: document.getElementById("panelClose"),
    panelColor: document.getElementById("panelColor"),
    panelNoHighlight: document.getElementById("panelNoHighlight"),
  };

  let keywords = [];
  let enabled = true;
  let editingIndex = -1;

  init();

  function init() {
    chrome.storage.sync.get(["fireflyKeywords", "fireflyEnabled"], (data) => {
      keywords = normalizeKeywords(data.fireflyKeywords || []);
      enabled = data.fireflyEnabled !== false;
      renderList();
      renderToggle();
    });

    els.addBtn.addEventListener("click", onAdd);
    els.toggleBtn.addEventListener("click", onToggle);
    els.clearBtn.addEventListener("click", onClearAll);
    els.panelApply.addEventListener("click", onPanelApply);
    els.panelClose.addEventListener("click", closePanel);
    els.panelNoHighlight.addEventListener("change", () => {
      els.panelColor.disabled = els.panelNoHighlight.checked;
    });
  }

  function normalizeKeywords(arr) {
    return arr.map((k) => ({
      word: k.word,
      color: k.color || DEFAULT_COLOR,
      bold: k.bold !== undefined ? k.bold : true,
      highlight: k.highlight !== undefined ? k.highlight : true,
    }));
  }

  function onAdd() {
    const raw = els.keywords.value;
    const color = els.newColor.value || DEFAULT_COLOR;
    const candidates = raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const existing = new Set(keywords.map((k) => k.word.toLowerCase()));
    let added = 0;
    candidates.forEach((word) => {
      if (existing.has(word.toLowerCase())) return;
      keywords.push({ word, color, bold: true, highlight: true });
      existing.add(word.toLowerCase());
      added++;
    });

    if (added > 0) {
      els.keywords.value = "";
      saveAndBroadcast();
      renderList();
    }
  }

  function onToggle() {
    enabled = !enabled;
    renderToggle();
    saveAndBroadcast();
  }

  function onClearAll() {
    keywords = [];
    closePanel();
    saveAndBroadcast();
    renderList();
  }

  function renderToggle() {
    els.toggleBtn.textContent = enabled ? "On" : "Off";
    els.toggleBtn.classList.toggle("on", enabled);
    els.toggleBtn.classList.toggle("off", !enabled);
  }

  function renderList() {
    els.listTitle.textContent = `Keywords (${keywords.length})`;
    els.keywordList.innerHTML = "";

    keywords.forEach((kw, i) => {
      const row = document.createElement("div");
      row.className = "kw-item";

      const swatch = document.createElement("div");
      swatch.className = "kw-swatch" + (kw.highlight ? "" : " no-color");
      if (kw.highlight) swatch.style.backgroundColor = kw.color;
      swatch.title = "Edit color";
      swatch.addEventListener("click", () => openPanel(i));

      const bold = document.createElement("button");
      bold.className = "kw-bold" + (kw.bold ? " active" : "");
      bold.textContent = "B";
      bold.title = "Toggle bold";
      bold.addEventListener("click", () => toggleBold(i));

      const text = document.createElement("div");
      text.className = "kw-text";
      text.textContent = kw.word;
      text.title = kw.word;

      const del = document.createElement("button");
      del.className = "kw-delete";
      del.textContent = "✕";
      del.title = "Delete";
      del.addEventListener("click", () => deleteKeyword(i));

      row.appendChild(swatch);
      row.appendChild(bold);
      row.appendChild(text);
      row.appendChild(del);
      els.keywordList.appendChild(row);
    });

    els.emptyState.style.display = keywords.length === 0 ? "block" : "none";
  }

  function toggleBold(i) {
    keywords[i].bold = !keywords[i].bold;
    saveAndBroadcast();
    renderList();
  }

  function deleteKeyword(i) {
    keywords.splice(i, 1);
    if (editingIndex === i) closePanel();
    else if (editingIndex > i) editingIndex--;
    saveAndBroadcast();
    renderList();
  }

  function openPanel(i) {
    if (editingIndex === i) {
      closePanel();
      return;
    }
    editingIndex = i;
    const kw = keywords[i];
    els.panelColor.value = kw.color || DEFAULT_COLOR;
    els.panelNoHighlight.checked = !kw.highlight;
    els.panelColor.disabled = !kw.highlight;
    els.wrapper.classList.add("expanded");
  }

  function closePanel() {
    editingIndex = -1;
    els.wrapper.classList.remove("expanded");
  }

  function onPanelApply() {
    if (editingIndex < 0 || editingIndex >= keywords.length) {
      closePanel();
      return;
    }
    const kw = keywords[editingIndex];
    kw.highlight = !els.panelNoHighlight.checked;
    if (kw.highlight) kw.color = els.panelColor.value;
    closePanel();
    saveAndBroadcast();
    renderList();
  }

  function saveAndBroadcast() {
    try {
      chrome.storage.sync.set({
        fireflyKeywords: keywords,
        fireflyEnabled: enabled,
      });
    } catch (_) {}

    try {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((t) => {
          if (t.id == null) return;
          chrome.tabs.sendMessage(
            t.id,
            { type: "fireflyUpdate", keywords, enabled },
            () => void chrome.runtime.lastError
          );
        });
      });
    } catch (_) {}
  }
})();
