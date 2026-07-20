// ── Hide broken Figma CDN images (URLs expire after 7 days) ──────────────────
document.addEventListener('error', function(e) {
  if (e.target.tagName === 'IMG' && e.target.src.includes('figma.com/api/mcp')) {
    e.target.style.display = 'none';
  }
}, true);

// ── Add Products → product row ────────────────────────────────────────────────
const PRODUCT_DATA = {
  'Search':           { name: 'Product Search Result', sku: 'General Device, Standard Model\n2-wire, Default Config', price: '$1,200 - $2,400', lead: 'Ships in 30-60 days' },
  'Lighting':         { name: 'Paddle Dimmer',          sku: 'Lutron Diva, 600W\nSatin Nickel, Single Pole\nP-PKG1W-WH-R',               price: '$180 - $240',      lead: 'Ships in 14-21 days' },
  'Window Treatment': { name: 'Shade 1',                sku: 'Sivoia QS Wired, Roller 100\n40 1/2 in x 123 in, Inside Mount\nAnderson 3% Bright White (RF-AND3-08)\n4" Square Fascia', price: '$10,500 - $20,400', lead: 'Ships in 100-150 days' },
  'Controls':         { name: 'Alisse Keypad',          sku: 'RRST-W5RL-SW, 5-Button\nWhite, Satin\nSoft White Engraving',              price: '$320 - $480',      lead: 'Ships in 21-30 days' },
  'Equipment':        { name: 'HWQS Processor',         sku: 'HQP7, Main Repeater\n120V, Wall Mount\nHQP7-KIT-WH',                        price: '$2,800 - $3,200',  lead: 'Ships in 45-60 days' },
};

let _productRowCounter = 0;

// ── Toast ──────────────────────────────────────────────────────────────────────
// opts: { type, action: { label, fn } }
function _showToast(header, desc, typeOrOpts) {
  const opts   = (typeOrOpts && typeof typeOrOpts === 'object') ? typeOrOpts : {};
  const type   = (typeof typeOrOpts === 'string' ? typeOrOpts : opts.type) || 'success';
  const action = opts.action || null;   // { label, fn }

  const container = document.getElementById('toast-container');
  if (!container) return;

  const iconSVG = type === 'success'
    ? '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="rgba(60,125,54,0.15)"/><circle cx="10" cy="10" r="7" fill="#3c7d36"/><path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="rgba(180,30,30,0.12)"/><circle cx="10" cy="10" r="7" fill="#b41e1e"/><path d="M7 7l6 6M13 7l-6 6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>';

  const actionHTML = action
    ? `<button class="toast-action-btn">${action.label}</button>`
    : '';

  const toast = document.createElement('div');
  toast.className = 'toast toast--' + type;
  toast.innerHTML = `
    <div class="toast-body">
      <div class="toast-icon">${iconSVG}</div>
      <div class="toast-text">
        <p class="toast-header">${header}</p>
        ${desc ? `<p class="toast-desc">${desc}</p>` : ''}
      </div>
      ${actionHTML}
      <button class="toast-close" aria-label="Dismiss">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>`;

  if (action) {
    toast.querySelector('.toast-action-btn').addEventListener('click', function () {
      _dismissToast(toast);
      action.fn();
    });
  }
  toast.querySelector('.toast-close').addEventListener('click', function () { _dismissToast(toast); });
  container.appendChild(toast);

  // Dismiss on any click outside the toast
  function _onDocClick(e) {
    if (!toast.contains(e.target)) {
      _dismissToast(toast);
      document.removeEventListener('click', _onDocClick, true);
    }
  }
  setTimeout(function () {
    document.addEventListener('click', _onDocClick, true);
  }, 300);
  toast._docClickHandler = _onDocClick;

  requestAnimationFrame(function () {
    requestAnimationFrame(function () { toast.classList.add('show'); });
  });

  const timer = setTimeout(function () { _dismissToast(toast); }, 7000);
  toast._timer = timer;
}

function _dismissToast(toast) {
  clearTimeout(toast._timer);
  if (toast._docClickHandler) document.removeEventListener('click', toast._docClickHandler, true);
  toast.classList.remove('show');
  toast.classList.add('hide');
  toast.addEventListener('transitionend', function () { toast.remove(); }, { once: true });
}

// ── Undo / Redo ────────────────────────────────────────────────────────────────
const _undoStack = [];
let _undoIndex = -1;

function _saveSnapshot() {
  const table = document.getElementById('cd-product-table');
  if (!table) return;
  // Trim any forward history when a new action is taken
  if (_undoIndex < _undoStack.length - 1) _undoStack.splice(_undoIndex + 1);
  _undoStack.push(table.innerHTML);
  _undoIndex = _undoStack.length - 1;
  _syncUndoRedo();
}

function _syncUndoRedo() {
  const undoBtn = document.querySelector('.cd-bottom-btn[data-tip="Undo"]');
  const redoBtn = document.querySelector('.cd-bottom-btn[data-tip="Redo"]');
  if (undoBtn) undoBtn.disabled = _undoIndex <= 0;
  if (redoBtn) redoBtn.disabled = _undoIndex >= _undoStack.length - 1;
}

function _applySnapshot(html) {
  const table = document.getElementById('cd-product-table');
  if (!table) return;
  table.innerHTML = html;
  // Re-apply area filtering after restoring snapshot
  _filterProductsByArea(_getSelectedAreaId());
}

function _makeThumbnailSVG(category) {
  const icons = {
    'Lighting': '<circle cx="11" cy="9" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M8 15h6M9 17h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    'Window Treatment': '<rect x="3" y="3" width="16" height="2" rx="1" fill="currentColor"/><path d="M5 5v13M17 5v13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5 8h12M5 11h12M5 14h12" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>',
    'Controls': '<rect x="6" y="3" width="10" height="15" rx="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="11" cy="8" r="1.2" fill="currentColor"/><circle cx="11" cy="12" r="1.2" fill="currentColor"/>',
    'Equipment': '<rect x="3" y="6" width="16" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="7" cy="11" r="1.2" fill="currentColor"/><path d="M10 9h6M10 13h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
    'Search': '<circle cx="10" cy="10" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M14 14l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  };
  return `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" style="color:var(--text-secondary)">${icons[category] || icons['Search']}</svg>`;
}

const STATUS_CYCLE = ['valid', 'draft', 'invalid', 'unknown'];
const STATUS_CONFIG = {
  valid:   { label: 'Valid',   tip: 'This item is valid and ready to order.',                                              icon: '<path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' },
  draft:   { label: 'Draft',   tip: 'Additional action required. Save as non-draft to order this item.',                  icon: '<path d="M4 2h5l3 3v7H4V2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M9 2v3h3" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>' },
  invalid: { label: 'Invalid', tip: 'This item is invalid. Complete configuration before ordering.',                      icon: '<circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2"/><path d="M6 4v2.5M6 8.2v.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' },
  unknown: { label: 'Unknown', icon: '<circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 4.5C4.5 3.7 5.2 3 6 3s1.5.7 1.5 1.5C7.5 5.5 6 6 6 7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="6" cy="8.5" r=".5" fill="currentColor"/>' },
};

function _renderStatusBadge(status) {
  const s = STATUS_CONFIG[status];
  return `<span class="cd-status-badge cd-status-badge--${status}" data-status="${status}" title="${s.tip}">
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">${s.icon}</svg>
    ${s.label}
  </span>`;
}

function _makeProductRow(category) {
  const d = PRODUCT_DATA[category] || PRODUCT_DATA['Search'];
  _productRowCounter++;
  const row = document.createElement('div');
  row.className = 'cd-product-row';
  row.dataset.rowId = _productRowCounter;
  const metaLines = d.sku.split('\n').map(l => `<div>${l}</div>`).join('');
  row.innerHTML = `
    <div class="cd-prod-check"><button class="cd-checkbox" aria-label="Select row"></button></div>
    <div class="cd-prod-name-col">
      <div class="cd-prod-thumb">${_makeThumbnailSVG(category)}</div>
      <div class="cd-prod-info">
        <div class="cd-prod-title">${d.name}</div>
        <div class="cd-prod-meta">${metaLines}</div>
      </div>
    </div>
    <div class="cd-prod-price-col">
      <div class="cd-prod-price">${d.price}</div>
      <div class="cd-prod-leadtime">${d.lead}</div>
    </div>
    <div class="cd-prod-qty-col">
      <div class="cd-prod-qty-input">
        <span class="cd-prod-qty-num">1</span>
        <div class="cd-prod-qty-controls">
          <button class="cd-qty-btn" title="Decrease" data-qty-dec>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </button>
          <button class="cd-qty-btn" title="Increase" data-qty-inc>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 3v6M3 6h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    </div>
    <div class="cd-prod-status-col">
      ${_renderStatusBadge('valid')}
    </div>
    <div class="cd-prod-actions-col">
      <button class="cd-icon-btn cd-icon-btn-sm" data-tip="Duplicate" data-action-dup>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M3 11V3a1 1 0 0 1 1-1h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="cd-icon-btn cd-icon-btn-sm cd-icon-btn--danger" data-tip="Delete" data-action-del>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 5h10M6 5V3h4v2M6 8v4M10 8v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="5" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>
      </button>
      <button class="cd-icon-btn cd-icon-btn-sm" data-tip="More options">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="4" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="12" r="1.2" fill="currentColor"/></svg>
      </button>
    </div>`;
  return row;
}

(function () {
  const addProductsList = document.querySelector('#cd-home .cd-addproducts-list');
  const productTable = document.getElementById('cd-product-table');
  const emptyState = document.getElementById('cd-empty-state');

  if (addProductsList && productTable && emptyState) {
    addProductsList.addEventListener('click', function (e) {
      const item = e.target.closest('.cd-addproduct-item');
      if (!item) return;
      const category = item.querySelector('.cd-addproduct-label').textContent.trim();
      const row = _makeProductRow(category);
      productTable.appendChild(row);
      emptyState.style.display = 'none';
      productTable.style.display = 'block';
      _saveSnapshot();
    });

    // Status badge cycle via delegation
    productTable.addEventListener('click', function (e) {
      const badge = e.target.closest('.cd-status-badge[data-status]');
      if (badge) {
        const cur = badge.dataset.status;
        const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
        badge.outerHTML = _renderStatusBadge(next);
        _saveSnapshot();
        return;
      }
    });

    // Click on non-template product row → open configure screen
    productTable.addEventListener('click', function (e) {
      if (e.target.closest('[data-qty-dec],[data-qty-inc],.cd-status-badge,.cd-prod-actions-col,.cd-checkbox')) return;
      const row = e.target.closest('.cd-product-row');
      if (!row || row.querySelector('.cd-prod-thumb--template')) return; // skip template rows

      const name   = row.querySelector('.cd-prod-title span, .cd-prod-title')?.textContent.trim() || 'Product';
      const imgSrc = row.querySelector('.cd-prod-thumb img')?.src || '';
      const desc   = row.querySelector('.cd-prod-meta div')?.textContent.trim() || '';

      const nameEl = document.getElementById('cd-cfg-product-name');
      const imgEl  = document.getElementById('cd-cfg-product-img');
      const descEl = document.getElementById('cd-cfg-desc');
      const bcEl   = document.getElementById('cd-cfg-breadcrumb');
      const bdg    = document.getElementById('cd-cfg-template-badge');
      const saveBtnEl  = document.getElementById('cd-cfg-save-template-btn');
      const savedRight = document.getElementById('cd-cfg-saved-right');

      if (nameEl) nameEl.textContent = name;
      if (imgEl && imgSrc) imgEl.src = imgSrc;
      if (descEl) descEl.textContent = desc;
      // Format: "Product Name | Area Path"
      const areaPath = _getAreaPath();
      if (bcEl)   bcEl.textContent   = areaPath ? name + ' | ' + areaPath : name;
      if (bdg)    bdg.style.display  = 'none';
      if (nameEl) nameEl.classList.remove('cd-cfg-product-name--saved');
      if (saveBtnEl)  saveBtnEl.style.display  = '';
      if (savedRight) savedRight.style.display = 'none';

      var cfgEl2 = document.getElementById('cd-configure');
      cfgEl2.dataset.sourceRowId = row.dataset.rowId;
      // Restore correct panel for this row's product type
      var _rowProdType = row.dataset.productType || 'key';
      var _cfgPanels = {
        key:     document.getElementById('cd-cfg-right-scroll'),
        fixture: document.getElementById('cd-cfg-right-fixture'),
        shade:   document.getElementById('cd-cfg-right-shade'),
      };
      Object.keys(_cfgPanels).forEach(function (k) {
        if (_cfgPanels[k]) _cfgPanels[k].style.display =
          (k === _rowProdType || (_rowProdType !== 'fixture' && _rowProdType !== 'shade' && k === 'key')) ? '' : 'none';
      });
      var _imgWrap = document.querySelector('#cd-configure .cd-cfg-img-wrap');
      if (_imgWrap) _imgWrap.style.display = (_rowProdType === 'shade') ? 'none' : '';
      // Restore saved configure state
      var _savedState = window._rowConfigs[row.dataset.rowId];
      if (_savedState) {
        var _activePanel = _getActiveCfgPanel();
        _applyCfgState(_activePanel, _savedState);
      }
      _setCfgFooterMode('save');
      goTo('cd-configure');
    });

    // Click on linked product row → open template configure in "linked product" mode
    productTable.addEventListener('click', function (e) {
      if (e.target.closest('[data-qty-dec],[data-qty-inc],.cd-status-badge,.cd-prod-actions-col,.cd-checkbox')) return;
      const row = e.target.closest('.cd-product-row');
      if (!row || !row.querySelector('.cd-prod-thumb--template')) return;

      const productName = row.querySelector('.cd-prod-title-template')?.textContent.trim() || 'Product';
      const imgSrc      = row.querySelector('.cd-prod-thumb img')?.src || '';
      const templateName = document.getElementById('cd-tmpl-cfg-name')?.textContent.trim() || 'Template';

      // Populate configurator
      const nameEl = document.getElementById('cd-tmpl-cfg-name');
      const imgEl  = document.getElementById('cd-tmpl-cfg-product-img');
      if (nameEl) nameEl.textContent = productName;
      if (imgEl && imgSrc) { imgEl.src = imgSrc; imgEl.style.display = ''; }

      // Set mode: "linked" — show linked chip, hide template library chrome
      const screen = document.getElementById('cd-tmpl-configure');
      if (screen) screen.dataset.sourceRowId = row.dataset.rowId;
      _setTmplConfigureMode('linked');

      // Toggle panel based on template's product type (scalable)
      var tmplProductType = document.getElementById('cd-template')?.dataset.productType || row.dataset.productType || '';
      _applyPanelToggle('cd-tmplcfg-right-scroll', 'cd-tmplcfg-right-fixture', 'cd-tmplcfg-right-shade', tmplProductType);

      // Reflect template draft/valid status in header
      var _rowStatus = row.querySelector('.cd-status-badge')?.dataset.status || 'valid';
      _setTmplHdrStatusBadge(_rowStatus);

      goTo('cd-tmpl-configure');
    });

    // Qty +/- via delegation
    productTable.addEventListener('click', function (e) {
      const dec = e.target.closest('[data-qty-dec]');
      const inc = e.target.closest('[data-qty-inc]');
      if (!dec && !inc) return;
      const numEl = (dec || inc).closest('.cd-prod-qty-input').querySelector('.cd-prod-qty-num');
      let val = parseInt(numEl.textContent) || 1;
      if (inc) val++;
      if (dec && val > 1) val--;
      numEl.textContent = val;
      _saveSnapshot();
    });

    // Duplicate row button
    productTable.addEventListener('click', function (e) {
      const dupBtn = e.target.closest('[data-action-dup]');
      if (!dupBtn) return;
      e.stopPropagation();
      const row = dupBtn.closest('.cd-product-row');
      if (!row) return;
      const clone = row.cloneNode(true);
      // Give the clone a unique row ID
      clone.dataset.rowId = 'row-' + Date.now();
      row.after(clone);
      _saveSnapshot();
      clone.scrollIntoView({ block: 'nearest' });
    });

    // Delete row button
    productTable.addEventListener('click', function (e) {
      const delBtn = e.target.closest('[data-action-del]');
      if (!delBtn) return;
      e.stopPropagation();
      const row = delBtn.closest('.cd-product-row');
      if (!row) return;
      const name = row.querySelector('.cd-prod-title span, .cd-prod-title')?.textContent.trim() || 'this product';
      const overlay = document.getElementById('cd-delete-row-overlay');
      const nameEl  = document.getElementById('cd-delete-row-name');
      const titleEl = document.getElementById('cd-delete-row-title');
      if (nameEl)  nameEl.textContent  = name;
      if (titleEl) titleEl.textContent = 'Delete ' + name;
      overlay._targetRow = row;
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
    });
  }
}());

// Delete row modal wiring
(function () {
  var overlay   = document.getElementById('cd-delete-row-overlay');
  var cancelBtn = document.getElementById('cd-delete-row-cancel');
  var closeBtn  = document.getElementById('cd-delete-row-close');
  var confirmBtn= document.getElementById('cd-delete-row-confirm');
  if (!overlay) return;
  function closeModal() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    overlay._targetRow = null;
  }
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (closeBtn)  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });
  if (confirmBtn) confirmBtn.addEventListener('click', function () {
    var row = overlay._targetRow;
    if (row) {
      row.remove();
      _saveSnapshot();
    }
    closeModal();
  });
}());

// Templates panel toggle
(function () {
  const btn = document.querySelector('.cd-addproduct-item--template');
  const panel = document.getElementById('cd-templates-panel');
  const closeBtn = document.getElementById('cd-templates-close');
  if (!btn || !panel) return;

  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    btn.classList.add('active');
    // Clear alert dot when panel is opened
    document.getElementById('cd-template-alert-dot')?.classList.remove('visible');
  }
  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    btn.classList.remove('active');
  }

  btn.addEventListener('click', function () {
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // Card interaction now delegated globally — see _initTemplateCardDelegation() below
}());

// Template card interaction — delegated on document so clones in cd-tmpl-sorted-body are covered
function _initTemplateCardDelegation() {
  document.addEventListener('click', function (e) {
    // Only act on clicks inside the templates panel
    const panel = document.getElementById('cd-templates-panel');
    if (!panel || !panel.contains(e.target)) return;

    const card = e.target.closest('.template-card');
    if (!card) return;

    const name   = card.querySelector('.template-card-name')?.textContent.trim() || 'Template';
    const imgEl  = card.querySelector('.template-card-img-wrap img');
    const imgSrc = imgEl?.src || '';

    // More-btn → handled by the global menu handler
    if (e.target.closest('.template-card-more-btn')) return;

    // − / + qty buttons
    if (e.target.closest('[data-qty-dec]')) {
      const numEl = card.querySelector('.template-card-qty-num');
      if (numEl) numEl.textContent = Math.max(1, parseInt(numEl.textContent) - 1);
      return;
    }
    if (e.target.closest('[data-qty-inc]')) {
      const numEl = card.querySelector('.template-card-qty-num');
      if (numEl) numEl.textContent = parseInt(numEl.textContent) + 1;
      return;
    }

    // Add button → add rows with the selected quantity
    if (e.target.closest('.template-card-add-btn')) {
      const qty = parseInt(card.querySelector('.template-card-qty-num')?.textContent) || 1;
      const table      = document.getElementById('cd-product-table');
      const emptyState = document.getElementById('cd-empty-state');
      if (!table) return;
      if (emptyState) emptyState.style.display = 'none';
      table.style.display = 'block';
      const productType = card.dataset.productType || '';
      const badge = card.querySelector('.template-card-valid-badge, .template-card-draft-badge, .template-card-invalid-badge');
      const tmplStatus = badge ? (badge.className.includes('invalid') ? 'invalid' : badge.className.includes('draft') ? 'draft' : 'valid') : 'valid';
      const row = _makeProductRowFromConfigure(name, imgSrc, tmplStatus, true, productType);
      row.dataset.areaId = _getSelectedAreaId();
      if (qty > 1) {
        const qtyEl = row.querySelector('.cd-prod-qty-num');
        if (qtyEl) qtyEl.textContent = qty;
      }
      table.appendChild(row);
      _adjustTemplateCardCount(name, qty);
      if (window._renderTemplateSort) window._renderTemplateSort();
      _saveSnapshot();
      return;
    }

    // Card body click → open template configure screen (library mode)
    const nameEl = document.getElementById('cd-tmpl-cfg-name');
    const imgCfgEl = document.getElementById('cd-tmpl-cfg-product-img');
    if (nameEl) nameEl.textContent = name;
    if (imgCfgEl && imgSrc) { imgCfgEl.src = imgSrc; imgCfgEl.style.display = ''; }
    const _panel = document.getElementById('cd-templates-panel');
    const _btn   = document.querySelector('.cd-addproduct-item--template');
    if (_panel) { _panel.classList.remove('open'); _panel.setAttribute('aria-hidden', 'true'); }
    if (_btn)   _btn.classList.remove('active');
    // Store SOURCE card ref (from hidden list, not visible clone) so badge updates persist across re-renders
    var _tmplScreen = document.getElementById('cd-template');
    if (_tmplScreen) {
      var _sourceCard = null;
      var _recentList = document.getElementById('cd-templates-recent-list');
      if (_recentList) {
        Array.from(_recentList.querySelectorAll('.template-card')).forEach(function (c) {
          if (c.querySelector('.template-card-name')?.textContent.trim() === name) _sourceCard = c;
        });
      }
      _tmplScreen._editSourceCard = _sourceCard || card;
      _tmplScreen.dataset.templateName = name;
    }
    _setTmplConfigureMode('library');

    // Reflect template draft/valid status in header
    var _srcCard = (_tmplScreen && _tmplScreen._editSourceCard) || null;
    var _srcBadge = _srcCard ? _srcCard.querySelector('.template-card-draft-badge, .template-card-valid-badge') : null;
    var _srcStatus = _srcBadge && _srcBadge.classList.contains('template-card-draft-badge') ? 'draft' : 'valid';
    _setTmplHdrStatusBadge(_srcStatus);

    goTo('cd-tmpl-configure');
  });
}
_initTemplateCardDelegation();

// Cut/Copy/Paste/Delete toolbar collapse
(function () {
  const toggle = document.getElementById('cd-ccp-toggle');
  const toolbar = document.getElementById('cd-ccp-toolbar');
  if (toggle && toolbar) {
    toggle.addEventListener('click', function () {
      toolbar.classList.toggle('collapsed');
      toggle.title = toolbar.classList.contains('collapsed') ? 'Expand toolbar' : 'Collapse toolbar';
    });
  }
}());

// Build area tree path for the selected area
// Walks up through parent rows (lower depth) to construct full hierarchy
function _getAreaPath() {
  const selected = document.querySelector('#cd-home .cd-area-row.selected');
  if (!selected) return null;

  const segments = [];
  let current = selected;

  while (current && current.classList.contains('cd-area-row')) {
    const name = current.querySelector('.cd-area-name')?.textContent.trim();
    if (name) segments.unshift(name);
    const depth = parseInt(current.dataset.depth || '0');
    if (depth === 0) break;
    // Walk backwards to find the nearest row with depth - 1
    let prev = current.previousElementSibling;
    while (prev) {
      if (prev.classList.contains('cd-area-row') && parseInt(prev.dataset.depth || '0') === depth - 1) {
        current = prev;
        break;
      }
      prev = prev.previousElementSibling;
    }
    if (!prev) break;
  }

  return segments.join(' > ') || null;
}

// Set the template breadcrumb: "[Product] | [Area Path]"
function _setTemplateBreadcrumb(productName) {
  const bcEl = document.getElementById('cd-tmpl-breadcrumb');
  if (!bcEl) return;
  const areaPath = _getAreaPath();
  if (productName && areaPath) {
    bcEl.textContent = productName + ' | ' + areaPath;
  } else if (areaPath) {
    bcEl.textContent = areaPath;
  } else if (productName) {
    bcEl.textContent = productName;
  }
}

// Count template-linked rows in the product table
function _countLinkedProducts() {
  var total = 0;
  document.querySelectorAll('#cd-product-table .cd-prod-thumb--template').forEach(function (thumb) {
    var row = thumb.closest('.cd-product-row');
    var qtyEl = row ? row.querySelector('.cd-prod-qty-num') : null;
    total += qtyEl ? (parseInt(qtyEl.textContent) || 1) : 1;
  });
  return total;
}

// Find a template card in the library by name
function _findTemplateCard(name) {
  return Array.from(document.querySelectorAll('.template-card')).find(function (c) {
    return c.querySelector('.template-card-linked') && c.querySelector('.template-card-name')?.textContent.trim() === name;
  }) || null;
}

// Find the VISIBLE rendered clone of a template card by name.
// The sorted panel and ab-tmpl-panel hold cloneNode(true) copies; the hidden
// source cards live in #cd-templates-recent-list. Highlighting must target the
// visible clone so the animation is actually seen.
function _findVisibleCard(name) {
  var containers = ['cd-tmpl-sorted-body', 'ab-tmpl-panel'];
  for (var i = 0; i < containers.length; i++) {
    var container = document.getElementById(containers[i]);
    if (!container) continue;
    var found = Array.from(container.querySelectorAll('.template-card')).find(function (c) {
      return c.querySelector('.template-card-name')?.textContent.trim() === name;
    });
    if (found) return found;
  }
  return _findTemplateCard(name); // fallback to hidden source card
}

function _highlightTemplateCard(cardEl) {
  if (!cardEl) return;
  cardEl.classList.remove('template-card--updated');
  void cardEl.offsetWidth; // restart animation
  cardEl.classList.add('template-card--updated');
  setTimeout(function () { cardEl.classList.remove('template-card--updated'); }, 1700);
}

function _resolveHighlightCard(editSourceCard) {
  if (editSourceCard) return editSourceCard;
  // Fallback: find by template name (covers cd-tmpl-configure path where _editSourceCard is null)
  var tmplScreen = document.getElementById('cd-template');
  var name = (tmplScreen && tmplScreen.dataset.templateName) ||
             document.getElementById('cd-tmpl-cfg-name')?.textContent.trim() || '';
  return name ? _findTemplateCard(name) : null;
}

// Increment or decrement a template card's linked-product count
function _adjustTemplateCardCount(name, delta) {
  var card = _findTemplateCard(name);
  if (!card) return;
  var linkedEl = card.querySelector('.template-card-linked');
  if (!linkedEl) return;
  var strong = linkedEl.querySelector('strong');
  var n = Math.max(0, (strong ? parseInt(strong.textContent) || 0 : 0) + delta);
  linkedEl.innerHTML = 'Template linked to <strong>' + n + '</strong> product' + (n === 1 ? '' : 's');
}

// ── Update Linked Products confirmation modal ──────────────────────────────
(function () {
  const overlay   = document.getElementById('cd-update-linked-overlay');
  const closeBtn  = document.getElementById('cd-update-linked-close');
  const cancelBtn = document.getElementById('cd-update-linked-cancel');
  const saveBtn   = document.getElementById('cd-update-linked-save');

  function closeModal() {
    if (overlay) { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); }
  }

  if (closeBtn)  closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (saveBtn)   saveBtn.addEventListener('click', function () {
    closeModal();
    _doTmplSave();
    _showToast('Template updated', 'Changes applied to all linked products.');
  });
  if (overlay) overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay?.classList.contains('open')) closeModal();
  });
}());

// Update linked product count with singular/plural
function _setLinkedCount(n) {
  const countEl = document.getElementById('cd-tmpl-chip-count');
  const unitEl  = document.getElementById('cd-tmpl-chip-unit');
  if (countEl) countEl.textContent = n;
  if (unitEl)  unitEl.textContent  = n === 1 ? 'product' : 'products';
}

// Sync linked count from actual product table state
function _syncLinkedCount() {
  _setLinkedCount(_countLinkedProducts());
}

// Toggle #cd-tmpl-configure between 'library' and 'linked' modes
// library: no breadcrumb, no Detach
// linked:  show breadcrumb (area path), show Detach
function _setTmplConfigureMode(mode) {
  const isLinked   = mode === 'linked';
  const breadcrumb = document.getElementById('cd-tmpl-cfg-breadcrumb-linked');
  const detachBtn  = document.getElementById('cd-tmpl-detach-btn');

  if (breadcrumb) {
    breadcrumb.style.display = isLinked ? '' : 'none';
    if (isLinked) {
      const productName = document.getElementById('cd-tmpl-cfg-name')?.textContent.trim() || '';
      const areaPath    = _getAreaPath();
      breadcrumb.textContent = areaPath ? productName + ' | ' + areaPath : productName;
    }
  }
  if (detachBtn) detachBtn.style.display = isLinked ? '' : 'none';
}

// Screen navigation
function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
  }
  // Hide home
  document.getElementById('home').style.display = id === 'home' ? 'flex' : 'none';
  // Sync linked count from actual product table when opening template configure
  if (id === 'cd-tmpl-configure') _syncLinkedCount();
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Bottom toolbar save status cycle
const STATUS_STATES = [
  { label: 'Saved',    cls: '' },
  { label: 'Saving…',  cls: 'saving' },
  { label: 'Offline',  cls: 'offline' },
];
let _statusIdx = 0;
function cycleStatus() {
  _statusIdx = (_statusIdx + 1) % STATUS_STATES.length;
  const el = document.getElementById('cd-save-status');
  if (!el) return;
  const s = STATUS_STATES[_statusIdx];
  el.textContent = s.label;
  el.className = 'cd-save-status ' + s.cls;
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// Product list data
const products = [
  { name: 'Paddle Dimmer', meta: 'Satin Nickel · 600W', badge: null },
  { name: 'Keypad', meta: 'White · 5-button', badge: null },
  { name: 'Fan Control', meta: 'White · 3-speed', badge: null },
  { name: 'Plug-in Dimmer', meta: 'White · 300W', badge: null },
  { name: 'Occupancy Sensor', meta: 'White · Ceiling', badge: null },
];

const productsLinked = [
  { name: 'Paddle Dimmer', meta: 'Satin Nickel · Linked', badge: 'linked' },
  { name: 'Keypad', meta: 'White · 5-button', badge: null },
  { name: 'Fan Control', meta: 'White · 3-speed', badge: null },
];

function renderProductList(containerId, items, selectedIndex = 0) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items.map((p, i) => `
    <div class="product-row ${i === selectedIndex ? 'selected' : ''}">
      <div class="product-thumb"><div class="thumb-checker"></div></div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-meta">${p.meta}</div>
      </div>
      ${p.badge === 'linked' ? '<span class="product-badge badge-linked">Linked</span>' : ''}
      ${p.badge === 'template' ? '<span class="product-badge badge-template">Template</span>' : ''}
    </div>
  `).join('');
}

// Populate lists on load
renderProductList('list-a1', products);
renderProductList('list-a2', products);
renderProductList('list-a3', products);
renderProductList('list-a5', products);
renderProductList('list-b1', productsLinked);

// Wire area tree via event delegation (handles both static and dynamic rows)
// Script is at bottom of body so DOM is already available — no DOMContentLoaded needed
(function () {
  const addAreaBtn = document.getElementById('cd-add-area-btn');
  if (addAreaBtn) addAreaBtn.addEventListener('click', cdAddArea);

  const collapseAllBtn = document.getElementById('cd-collapse-all-btn');
  if (collapseAllBtn) collapseAllBtn.addEventListener('click', _collapseAllAreas);

  const areaList = document.querySelector('#cd-home .cd-area-list');
  if (areaList) {
    areaList.addEventListener('click', function (e) {
      const addChildBtn = e.target.closest('button[title="Add child area"], button[data-tip="Add child area"]');
      if (addChildBtn) { cdAddChildArea(addChildBtn); return; }
      const row = e.target.closest('.cd-area-row');
      if (row && !e.target.closest('button') && !e.target.closest('.cd-area-drag-handle')) {
        _selectArea(row);
        _toggleCollapse(row);
      }
    });

    // ── Drag and drop ──────────────────────────────────────────
    let _dragSrc = null;

    // Remove any stale indicators and create exactly one, always hidden
    areaList.querySelectorAll('.cd-area-drop-indicator').forEach(el => el.remove());
    const _dropIndicator = document.createElement('div');
    _dropIndicator.className = 'cd-area-drop-indicator';
    _dropIndicator.style.display = 'none';
    areaList.appendChild(_dropIndicator);

    function _hideIndicator() { _dropIndicator.style.display = 'none'; }

    // Make each row draggable only via its handle
    areaList.addEventListener('mousedown', function (e) {
      const handle = e.target.closest('.cd-area-drag-handle');
      if (handle) {
        const row = handle.closest('.cd-area-row');
        if (row) row.setAttribute('draggable', 'true');
      }
    });
    areaList.addEventListener('mouseup', function () {
      areaList.querySelectorAll('.cd-area-row[draggable]').forEach(r => r.removeAttribute('draggable'));
    });

    areaList.addEventListener('dragstart', function (e) {
      const row = e.target.closest('.cd-area-row[draggable]');
      if (!row) { e.preventDefault(); return; }
      _dragSrc = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', row.dataset.areaId);
    });

    areaList.addEventListener('dragover', function (e) {
      e.preventDefault();
      if (!_dragSrc) return;
      const row = e.target.closest('.cd-area-row');
      if (!row || row === _dragSrc) return;
      const indicator = _dropIndicator;
      const rect = row.getBoundingClientRect();
      const listRect = areaList.getBoundingClientRect();
      const insertBefore = e.clientY < rect.top + rect.height / 2;
      const top = (insertBefore ? rect.top : rect.bottom) - listRect.top + areaList.scrollTop;
      indicator.style.display = 'block';
      indicator.style.top = (top - 1) + 'px';
      indicator.dataset.targetId = row.dataset.areaId;
      indicator.dataset.before = insertBefore;
    });

    areaList.addEventListener('dragleave', function (e) {
      if (!areaList.contains(e.relatedTarget)) {
        const indicator = _dropIndicator;
        indicator.style.display = 'none';
      }
    });

    areaList.addEventListener('dragend', function () {
      if (_dragSrc) {
        _dragSrc.classList.remove('dragging');
        _dragSrc.removeAttribute('draggable');
        _dragSrc = null;
      }
      const indicator = _dropIndicator;
      indicator.style.display = 'none';
    });

    areaList.addEventListener('drop', function (e) {
      e.preventDefault();
      if (!_dragSrc) return;
      const indicator = _dropIndicator;
      const targetId = indicator.dataset.targetId;
      const insertBefore = indicator.dataset.before === 'true';
      const targetRow = areaList.querySelector('[data-area-id="' + targetId + '"]');
      if (targetRow && targetRow !== _dragSrc) {
        if (insertBefore) {
          areaList.insertBefore(_dragSrc, targetRow);
        } else {
          targetRow.insertAdjacentElement('afterend', _dragSrc);
        }
      }
      indicator.style.display = 'none';
    });
  }
}());

// Start on home
document.getElementById('home').style.display = 'flex';

// ── Area tree ──────────────────────────────────────────────────────────────
let _areaIdCounter = 2; // Area 001 is id=1

const DRAG_HANDLE_SVG = `<div class="cd-area-drag-handle" title="Drag to reorder"><svg width="12" height="16" viewBox="0 0 12 16" fill="none"><circle cx="4" cy="3.5" r="1.2" fill="currentColor"/><circle cx="8" cy="3.5" r="1.2" fill="currentColor"/><circle cx="4" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="4" cy="12.5" r="1.2" fill="currentColor"/><circle cx="8" cy="12.5" r="1.2" fill="currentColor"/></svg></div>`;

const ADD_CHILD_BTN_SVG = `
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2"/>
    <path d="M8 5.5V10.5M5.5 8H10.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
  </svg>`;

const MORE_BTN_SVG = `
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="3" r="1" fill="currentColor"/>
    <circle cx="7" cy="7" r="1" fill="currentColor"/>
    <circle cx="7" cy="11" r="1" fill="currentColor"/>
  </svg>`;

const CHEVRON_SVG = `
  <svg class="cd-area-expand" width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M4 3L7 6L4 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

function _areaLabel(n) {
  return 'Area ' + String(n).padStart(3, '0');
}

function _makeAreaRow(id, depth, label) {
  const indent = depth * 16;
  const row = document.createElement('div');
  row.className = 'cd-area-row';
  row.dataset.areaId = id;
  row.dataset.depth = depth;
  row.innerHTML = `
    ${DRAG_HANDLE_SVG}
    <div class="cd-area-indent" style="width:${8 + indent}px"></div>
    <svg class="cd-area-expand cd-area-expand--hidden" width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M4 3L7 6L4 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="cd-area-name">${label}</span>
    <div class="cd-area-row-actions">
      <button class="cd-icon-btn cd-icon-btn-sm" title="Add child area">${ADD_CHILD_BTN_SVG}</button>
      <button class="cd-icon-btn cd-icon-btn-sm" title="More">${MORE_BTN_SVG}</button>
    </div>`;
  return row;
}

// Returns true if a row has child rows (is a parent/container)
function _isParentArea(row) {
  const depth = parseInt(row.dataset.depth || '0');
  const next = row.nextElementSibling;
  return next && next.classList.contains('cd-area-row') && parseInt(next.dataset.depth || '0') > depth;
}

// Walk down and find the first leaf descendant (no children of its own)
function _findFirstLeaf(row) {
  let current = row.nextElementSibling;
  const baseDepth = parseInt(row.dataset.depth || '0');
  while (current && current.classList.contains('cd-area-row')) {
    const d = parseInt(current.dataset.depth || '0');
    if (d <= baseDepth) break;
    if (!_isParentArea(current)) return current; // first leaf found
    current = current.nextElementSibling;
  }
  return row; // fallback to self if no leaf found
}

function _getSelectedAreaId() {
  const sel = document.querySelector('#cd-home .cd-area-row.selected');
  return sel ? (sel.dataset.areaId || 'default') : 'default';
}

function _filterProductsByArea(areaId) {
  const table = document.getElementById('cd-product-table');
  const emptyState = document.getElementById('cd-empty-state');
  if (!table) return;
  let visibleCount = 0;
  table.querySelectorAll('.cd-product-row').forEach(function (row) {
    const rowArea = row.dataset.areaId || 'default';
    if (rowArea === areaId) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });
  if (emptyState) emptyState.style.display = visibleCount === 0 ? '' : 'none';
  table.style.display = visibleCount === 0 ? 'none' : 'block';
}

function _selectArea(row) {
  // If parent area, auto-select first leaf child instead
  const target = _isParentArea(row) ? _findFirstLeaf(row) : row;
  document.querySelectorAll('#cd-home .cd-area-row').forEach(r => r.classList.remove('selected'));
  target.classList.add('selected');
  const name = target.querySelector('.cd-area-name').textContent;
  const titleEl = document.querySelector('#cd-home .cd-area-view-title');
  if (titleEl) titleEl.textContent = name;
  _filterProductsByArea(_getSelectedAreaId());
}

function _getChildren(parentRow) {
  const depth = parseInt(parentRow.dataset.depth);
  const children = [];
  let next = parentRow.nextElementSibling;
  while (next && next.classList.contains('cd-area-row') && parseInt(next.dataset.depth) > depth) {
    children.push(next);
    next = next.nextElementSibling;
  }
  return children;
}

function _collapseAllAreas() {
  const btn = document.getElementById('cd-collapse-all-btn');
  const rows = document.querySelectorAll('#cd-home .cd-area-row');
  const isAllCollapsed = btn && btn.classList.contains('all-collapsed');

  rows.forEach(row => {
    const chevron = row.querySelector('.cd-area-expand');
    if (!chevron || chevron.classList.contains('cd-area-expand--hidden')) return;
    if (isAllCollapsed) {
      // Expand: restore direct children only
      if (!row.classList.contains('cd-area-row')) return;
      row.classList.remove('collapsed');
      const depth = parseInt(row.dataset.depth);
      let next = row.nextElementSibling;
      while (next && next.classList.contains('cd-area-row') && parseInt(next.dataset.depth) > depth) {
        if (next.dataset.hiddenBy === row.dataset.areaId) {
          delete next.dataset.hiddenBy;
          next.style.display = '';
        }
        next = next.nextElementSibling;
      }
    } else {
      // Collapse: hide all descendants
      if (!row.classList.contains('collapsed')) {
        row.classList.add('collapsed');
        const allDesc = _getChildren(row);
        allDesc.forEach(child => {
          child.dataset.hiddenBy = row.dataset.areaId;
          child.style.display = 'none';
        });
      }
    }
  });

  if (btn) btn.classList.toggle('all-collapsed', !isAllCollapsed);
}

function _toggleCollapse(row) {
  const chevron = row.querySelector('.cd-area-expand');
  if (!chevron || chevron.classList.contains('cd-area-expand--hidden')) return;
  const isCollapsed = row.classList.toggle('collapsed');
  // Hide/show all descendants; when re-expanding, only show direct children
  // (grandchildren stay hidden if their parent is also collapsed)
  const allDescendants = _getChildren(row);
  allDescendants.forEach(child => {
    if (isCollapsed) {
      child.dataset.hiddenBy = row.dataset.areaId;
      child.style.display = 'none';
    } else {
      if (child.dataset.hiddenBy === row.dataset.areaId) {
        delete child.dataset.hiddenBy;
        child.style.display = '';
        // Keep collapsed if this child itself is collapsed
        if (child.classList.contains('collapsed')) {
          _getChildren(child).forEach(gc => {
            gc.dataset.hiddenBy = child.dataset.areaId;
            gc.style.display = 'none';
          });
        }
      }
    }
  });
}

function _showChevron(parentRow) {
  const chevron = parentRow.querySelector('.cd-area-expand');
  if (chevron) chevron.classList.remove('cd-area-expand--hidden');
}

// Find the last row that belongs to the subtree of parentRow (same or deeper depth)
function _lastDescendant(parentRow) {
  const depth = parseInt(parentRow.dataset.depth);
  let last = parentRow;
  let next = parentRow.nextElementSibling;
  while (next && next.classList.contains('cd-area-row') && parseInt(next.dataset.depth) > depth) {
    last = next;
    next = next.nextElementSibling;
  }
  return last;
}

function cdAddArea() {
  const list = document.querySelector('#cd-home .cd-area-list');
  const label = _areaLabel(_areaIdCounter);
  const row = _makeAreaRow(_areaIdCounter, 0, label);
  _areaIdCounter++;
  list.appendChild(row);
  _selectArea(row);
  row.scrollIntoView({ block: 'nearest' });
}

// ── Search panel toggle ────────────────────────────────────────────────────────
(function () {
  const btn = document.querySelector('.cd-addproduct-item--search');
  const panel = document.getElementById('cd-search-panel');
  const closeBtn = document.getElementById('cd-search-close');
  if (!btn || !panel) return;
  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    btn.classList.add('active');
    setTimeout(() => panel.querySelector('.cd-search-panel-input').focus(), 200);
  }
  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    btn.classList.remove('active');
  }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  if (closeBtn) closeBtn.addEventListener('click', closePanel);
}());

// ── Search results interaction ─────────────────────────────────────────────────
(function () {
  const inputField = document.getElementById('cd-search-input-field');
  const inputWrap = document.getElementById('cd-search-input-wrap');
  const clearBtn = document.getElementById('cd-search-clear');
  const hint = document.getElementById('cd-search-hint');
  const results = document.getElementById('cd-search-results');
  if (!inputField) return;

  function updateState() {
    const val = inputField.value;
    const hasFocus = document.activeElement === inputField;
    inputWrap.classList.toggle('focused', hasFocus || val.length > 0);
    clearBtn.style.display = val.length > 0 ? 'flex' : 'none';
    if (val.length >= 2) {
      hint.style.display = 'none';
      results.style.display = 'flex';
      // Update the highlighted match text in all result cards
      results.querySelectorAll('.cd-search-match').forEach(el => el.textContent = val.slice(0, 3).toUpperCase());
    } else if (hasFocus) {
      hint.style.display = 'block';
      results.style.display = 'none';
    } else {
      hint.style.display = 'none';
      results.style.display = 'none';
    }
  }

  inputField.addEventListener('input', updateState);
  inputField.addEventListener('focus', updateState);
  inputField.addEventListener('blur', updateState);

  clearBtn.addEventListener('click', function () {
    inputField.value = '';
    inputField.focus();
    updateState();
  });

  // Qty +/- and Add in search results
  results.addEventListener('click', function (e) {
    // Qty buttons
    const qtyBtn = e.target.closest('.cd-search-qty-btn');
    if (qtyBtn) {
      const card = qtyBtn.closest('.cd-search-result-card');
      const valEl = card.querySelector('.cd-search-qty-val');
      let v = parseInt(valEl.textContent) || 1;
      if (qtyBtn.dataset.action === 'inc') v = Math.min(v + 1, 99);
      if (qtyBtn.dataset.action === 'dec') v = Math.max(v - 1, 1);
      valEl.textContent = v;
      return;
    }
    // Add button
    const addBtn = e.target.closest('.cd-search-add-btn');
    if (addBtn) {
      const card = addBtn.closest('.cd-search-result-card');
      const modelEl = card.querySelector('.cd-search-result-model');
      const descEl = card.querySelector('.cd-search-result-desc');
      const qty = parseInt(card.querySelector('.cd-search-qty-val').textContent) || 1;
      const productTable = document.getElementById('cd-product-table');
      const emptyState = document.getElementById('cd-empty-state');
      // Build a custom product row using Search data but with actual model/desc
      const modelText = modelEl ? modelEl.textContent.trim() : 'Search Result';
      const descText = descEl ? descEl.textContent.trim() : '';
      for (let i = 0; i < qty; i++) {
        const row = _makeProductRowFromSearch(modelText, descText);
        productTable.appendChild(row);
      }
      if (emptyState) emptyState.style.display = 'none';
      // Brief visual feedback then reset search
      addBtn.textContent = 'Added';
      addBtn.style.background = '#2a7a2a';
      setTimeout(() => {
        const inputField = document.getElementById('cd-search-input-field');
        const inputWrap = document.getElementById('cd-search-input-wrap');
        const clearBtn = document.getElementById('cd-search-clear');
        const hint = document.getElementById('cd-search-hint');
        if (inputField) inputField.value = '';
        if (inputWrap) inputWrap.classList.remove('focused');
        if (clearBtn) clearBtn.style.display = 'none';
        if (hint) hint.style.display = 'none';
        results.style.display = 'none';
      }, 800);
    }
  });
}());

function _makeProductRowFromConfigure(name, imgSrc, status, isTemplate, productType) {
  _productRowCounter++;
  const row = document.createElement('div');
  row.className = 'cd-product-row';
  row.dataset.rowId = _productRowCounter;
  if (isTemplate) row.dataset.templateName = name;
  if (productType) row.dataset.productType = productType;
  const thumbImg = imgSrc
    ? `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:contain;border-radius:3px;" alt="">`
    : _makeThumbnailSVG('Search');
  const bookmarkOverlay = isTemplate
    ? `<div class="cd-prod-thumb-bookmark">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 1h8a.5.5 0 0 1 .5.5v9.5L6 9 1.5 11V1.5A.5.5 0 0 1 2 1z" fill="#006dcc"/></svg>
       </div>`
    : '';
  const thumb = `<div class="cd-prod-thumb${isTemplate ? ' cd-prod-thumb--template' : ''}">${thumbImg}${bookmarkOverlay}</div>`;
  row.innerHTML = `
    <div class="cd-prod-check"><button class="cd-checkbox" aria-label="Select row"></button></div>
    <div class="cd-prod-name-col">
      ${thumb}
      <div class="cd-prod-info">
        <div class="cd-prod-title"><span class="${isTemplate ? 'cd-prod-title-template' : ''}">${name}</span></div>
        <div class="cd-prod-meta"><div>HomeWorks(QSX), Keypad and Closure Interface</div></div>
      </div>
    </div>
    <div class="cd-prod-price-col">
      <div class="cd-prod-price">${status === 'draft' ? '$800 - $1,200' : '$1,000'}</div>
      <div class="cd-prod-leadtime">${status === 'draft' ? 'Ships in 15-25 business days' : 'Ships in 20 business days'}</div>
    </div>
    <div class="cd-prod-qty-col">
      <div class="cd-prod-qty-input">
        <span class="cd-prod-qty-num">1</span>
        <div class="cd-prod-qty-controls">
          <button class="cd-qty-btn" data-tip="Decrease" data-qty-dec>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </button>
          <button class="cd-qty-btn" data-tip="Increase" data-qty-inc>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 3v6M3 6h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    </div>
    <div class="cd-prod-status-col">
      ${_renderStatusBadge(status)}
    </div>
    <div class="cd-prod-actions-col">
      <button class="cd-icon-btn cd-icon-btn-sm" data-tip="Duplicate" data-action-dup>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M3 11V3a1 1 0 0 1 1-1h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="cd-icon-btn cd-icon-btn-sm cd-icon-btn--danger" data-tip="Delete" data-action-del>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 5h10M6 5V3h4v2M6 8v4M10 8v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="5" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>
      </button>
      <button class="cd-icon-btn cd-icon-btn-sm" data-tip="More options">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="4" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="12" r="1.2" fill="currentColor"/></svg>
      </button>
    </div>`;
  return row;
}

function _addFromConfigure(status) {
  const nameEl = document.querySelector('#cd-configure #cd-cfg-product-name');
  const imgEl  = document.querySelector('#cd-configure #cd-cfg-product-img');
  const name   = nameEl?.textContent.trim() || 'Product';
  const imgSrc = imgEl?.src || '';
  const cfg    = document.getElementById('cd-configure');
  const sourceRowId = cfg ? cfg.dataset.sourceRowId : '';

  // Edit-existing-row mode: update status badge in place
  if (sourceRowId) {
    const existingRow = document.querySelector('.cd-product-row[data-row-id="' + sourceRowId + '"]');
    if (existingRow) {
      // Save configure state for this row
      var _activePanel = _getActiveCfgPanel();
      if (_activePanel) window._rowConfigs[sourceRowId] = _collectCfgState(_activePanel);
      const badgeEl = existingRow.querySelector('.cd-prod-status-col');
      if (badgeEl) badgeEl.innerHTML = _renderStatusBadge(status);
      _saveSnapshot();
      goTo('cd-home');
      if (cfg) cfg.dataset.sourceRowId = '';
      return;
    }
    if (cfg) cfg.dataset.sourceRowId = '';
  }

  const table  = document.getElementById('cd-product-table');
  if (!table) return;
  const emptyState = document.getElementById('cd-empty-state');
  if (emptyState) emptyState.style.display = 'none';
  const productType = cfg?.dataset.productType || '';
  const row = _makeProductRowFromConfigure(name, imgSrc, status, false, productType);
  row.dataset.areaId = _getSelectedAreaId();
  table.appendChild(row);
  _saveSnapshot();
  goTo('cd-home');
  requestAnimationFrame(function () { row.scrollIntoView({ block: 'nearest' }); });
}

function _addTemplateCard(templateName, productImg, productName) {
  var emptyState  = document.getElementById('cd-templates-empty-state');
  var recentLabel = document.getElementById('cd-templates-recent-label');
  var recentList  = document.getElementById('cd-templates-recent-list');
  if (emptyState)  emptyState.style.display  = 'none';
  if (recentLabel) recentLabel.style.display = '';
  if (recentList)  recentList.style.display  = '';
  if (!recentList) return;
  var card = document.createElement('div');
  card.className = 'template-card';
  card.innerHTML = `
    <div class="template-card-img-wrap">
      ${productImg
        ? `<img src="${productImg}" style="width:100%;height:100%;object-fit:contain;padding:8px;" alt="">`
        : '<div class="checker-wide"></div>'}
      <div class="template-card-bookmark-badge">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 1h7a.5.5 0 0 1 .5.5v8L5 7.5 1 9.5V1.5A.5.5 0 0 1 1.5 1z" fill="#006dcc"/></svg>
      </div>
    </div>
    <div class="template-card-info">
      <div class="template-card-row1">
        <span class="template-card-name">${templateName}</span>
        <div class="template-card-row1-right">
          <span class="template-card-valid-badge">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Valid
          </span>
          <button class="template-card-more-btn" aria-label="More options">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="3.5" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="12.5" r="1.2" fill="currentColor"/></svg>
          </button>
        </div>
      </div>
      <div class="template-card-desc">HomeWorks(QSX), ${productName || templateName}</div>
      <div class="template-card-bottom">
        <div class="template-card-linked">Template linked to <strong>0</strong> products</div>
        <div class="template-card-hover-row">
          <div class="template-card-qty">
            <span class="template-card-qty-num">1</span>
            <div class="template-card-qty-divider"></div>
            <div class="template-card-qty-actions">
              <button class="template-card-qty-btn" data-qty-dec aria-label="Decrease">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              </button>
              <div class="template-card-qty-divider"></div>
              <button class="template-card-qty-btn" data-qty-inc aria-label="Increase">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>
          <button class="template-card-add-btn">Add</button>
        </div>
      </div>
    </div>`;
  recentList.insertBefore(card, recentList.firstChild);
  // Stamp with product type (read from configure screen at save time)
  var productType = document.getElementById('cd-configure')?.dataset.productType || '';
  if (window._stampTemplateCard) window._stampTemplateCard(card, productType);
  if (window._renderTemplateSort) window._renderTemplateSort();
  document.getElementById('cd-template-alert-dot')?.classList.add('visible');
}

function _addFromTemplate(status) {
  const tmplScreen = document.getElementById('cd-template');
  const templateName = tmplScreen?.dataset.templateName || 'Template';
  // Save template panel state
  var _saveTmplPanel = _getActiveTmplPanel();
  if (_saveTmplPanel) window._tmplConfigs[templateName] = _collectCfgState(_saveTmplPanel);
  const imgSrc = document.getElementById('cd-tmpl-product-img')?.src || '';
  const isDraft   = status === 'draft';
  const isInvalid = status === 'invalid';

  const table      = document.getElementById('cd-product-table');
  const emptyState = document.getElementById('cd-empty-state');
  if (table) {
    if (emptyState) emptyState.style.display = 'none';
    table.style.display = 'block';
    const row = _makeProductRowFromConfigure(templateName, imgSrc, status || 'valid', true);
    row.dataset.areaId = _getSelectedAreaId();
    table.appendChild(row);
    _adjustTemplateCardCount(templateName, 1);
    _saveSnapshot();
  }

  // Update template card badge based on save status
  if (isDraft || isInvalid) {
    const recentList = document.getElementById('cd-templates-recent-list');
    if (recentList) {
      const cards = recentList.querySelectorAll('.template-card');
      for (let i = 0; i < cards.length; i++) {
        const nameEl = cards[i].querySelector('.template-card-name');
        if (nameEl && nameEl.textContent.trim() === templateName) {
          const badge = cards[i].querySelector('.template-card-valid-badge, .template-card-draft-badge, .template-card-invalid-badge');
          if (badge) {
            if (isDraft) {
              badge.className = 'template-card-draft-badge';
              badge.title = 'Additional action required. Save as non-draft to order this item.';
              badge.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 2.5h5.5l3 3v7H4.5V2.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M10 2.5v3h3" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg> Draft';
            } else {
              badge.className = 'template-card-invalid-badge';
              badge.title = 'This item is invalid. Complete configuration before ordering.';
              badge.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#900" stroke-width="1.2"/><path d="M7 4.5v2.5M7 8.5v.5" stroke="#900" stroke-width="1.3" stroke-linecap="round"/></svg> Invalid';
            }
          }
          break;
        }
      }
    }
  }

  _showToast(
    isDraft   ? 'Template saved as draft'  :
    isInvalid ? 'Product added as invalid' : 'Template saved and added',
    isDraft   ? 'Your template has been saved as a draft. Click the Draft badge to complete configuration.' :
    isInvalid ? '"' + templateName + '" was added to the area with an Invalid configuration. Open it to complete setup.' :
                'Your template has been saved and added to the product list.'
  );
  goTo('cd-home');
  const _tmplPanel = document.getElementById('cd-templates-panel');
  const _tmplBtn   = document.querySelector('.cd-addproduct-item--template');
  if (_tmplPanel) { _tmplPanel.classList.add('open'); _tmplPanel.setAttribute('aria-hidden', 'false'); }
  if (_tmplBtn)   { _tmplBtn.classList.add('active'); document.getElementById('cd-template-alert-dot')?.classList.remove('visible'); }
  if (window._renderTemplateSort) window._renderTemplateSort();
  _highlightTemplateCard(_findVisibleCard(templateName));
}

function _makeProductRowFromSearch(modelName, desc) {
  _productRowCounter++;
  const row = document.createElement('div');
  row.className = 'cd-product-row';
  row.dataset.rowId = _productRowCounter;
  const skuLines = desc ? `<div>${desc}</div>` : '<div>Search Result</div>';
  row.innerHTML = `
    <div class="cd-prod-check"><button class="cd-checkbox" aria-label="Select row"></button></div>
    <div class="cd-prod-name-col">
      <div class="cd-prod-thumb">${_makeThumbnailSVG('Search')}</div>
      <div class="cd-prod-info">
        <div class="cd-prod-title">${modelName}</div>
        <div class="cd-prod-meta">${skuLines}</div>
      </div>
    </div>
    <div class="cd-prod-price-col">
      <div class="cd-prod-price">$1,200 - $2,400</div>
      <div class="cd-prod-leadtime">Ships in 30-60 days</div>
    </div>
    <div class="cd-prod-qty-col">
      <div class="cd-prod-qty-input">
        <span class="cd-prod-qty-num">1</span>
        <div class="cd-prod-qty-controls">
          <button class="cd-qty-btn" title="Decrease" data-qty-dec>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </button>
          <button class="cd-qty-btn" title="Increase" data-qty-inc>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 3v6M3 6h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    </div>
    <div class="cd-prod-status-col">
      ${_renderStatusBadge('valid')}
    </div>
    <div class="cd-prod-actions-col">
      <button class="cd-icon-btn cd-icon-btn-sm" data-tip="Duplicate" data-action-dup>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M3 11V3a1 1 0 0 1 1-1h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="cd-icon-btn cd-icon-btn-sm cd-icon-btn--danger" data-tip="Delete" data-action-del>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 5h10M6 5V3h4v2M6 8v4M10 8v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="5" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>
      </button>
      <button class="cd-icon-btn cd-icon-btn-sm" data-tip="More options">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="4" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="12" r="1.2" fill="currentColor"/></svg>
      </button>
    </div>`;
  return row;
}

// ── Controls panel toggle ──────────────────────────────────────────────────────
(function () {
  const btn = document.querySelector('.cd-addproduct-item--controls');
  const panel = document.getElementById('cd-controls-panel');
  const closeBtn = document.getElementById('cd-controls-close');
  if (!btn || !panel) return;
  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    btn.classList.add('active');
  }
  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    btn.classList.remove('active');
  }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    const selectedRow = document.querySelector('#cd-home .cd-area-row.selected');
    if (selectedRow && _isParentArea(selectedRow)) {
      _showToast('Select a room first', 'Products can only be added to individual rooms, not to area groups.');
      return;
    }
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // Navigate to configure screen on ctrl card click
  if (panel) {
    panel.addEventListener('click', function (e) {
      const card = e.target.closest('.cd-ctrl-card');
      if (!card) return;
      // If card has inline onclick, let it handle navigation; just close panel
      if (typeof card.onclick === 'function') { closePanel(); return; }
      const name = card.querySelector('.cd-ctrl-card-name')?.textContent.trim() || 'Product';
      const img  = card.querySelector('img')?.src || '';
      // Close panel first
      closePanel();
      // Populate configure screen
      const nameEl = document.getElementById('cd-cfg-product-name');
      const imgEl  = document.getElementById('cd-cfg-product-img');
      const descEl = document.getElementById('cd-cfg-desc');
      if (nameEl) nameEl.textContent = name;
      if (imgEl && img) imgEl.src = img;
      if (descEl) descEl.textContent = 'HomeWorks(QSX), ' + name;
      // Reset template badge + post-save state
      const bc = document.getElementById('cd-cfg-breadcrumb');
      const bdg = document.getElementById('cd-cfg-template-badge');
      if (bc) bc.style.display = '';
      if (bdg) bdg.style.display = 'none';
      const nameEl2    = document.getElementById('cd-cfg-product-name');
      const saveBtnEl  = document.getElementById('cd-cfg-save-template-btn');
      const savedRight = document.getElementById('cd-cfg-saved-right');
      if (nameEl2)    nameEl2.classList.remove('cd-cfg-product-name--saved');
      if (saveBtnEl)  saveBtnEl.style.display = '';
      if (savedRight) savedRight.style.display = 'none';
      var _cfg = document.getElementById('cd-configure'); if (_cfg) _cfg.dataset.sourceRowId = '';
      _setCfgFooterMode('add');
      goTo('cd-configure');
    });
  }
}());

// ── Window Treatment panel toggle ─────────────────────────────────────────────
(function () {
  const btn = document.querySelector('.cd-addproduct-item--window');
  const panel = document.getElementById('cd-window-panel');
  const closeBtn = document.getElementById('cd-window-close');
  if (!btn || !panel) return;
  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    btn.classList.add('active');
  }
  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    btn.classList.remove('active');
  }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // Accordion toggle
  panel.querySelectorAll('.cd-wt-accordion-header').forEach(function (hdr) {
    hdr.addEventListener('click', function () {
      hdr.closest('.cd-wt-accordion').classList.toggle('open');
    });
  });

  // Navigate to configure screen on product card click (always type='shade')
  panel.addEventListener('click', function (e) {
    const card = e.target.closest('.cd-ctrl-card');
    if (!card) return;
    // If card has an inline onclick, _openConfigure was already called — just close panel
    if (typeof card.onclick === 'function') { closePanel(); return; }
    const name = card.querySelector('.cd-ctrl-card-name')?.textContent.trim() || 'Product';
    const img  = card.querySelector('img')?.src || '';
    closePanel();
    _openConfigure(name, img, 'shade');
  });
}());

// ── Lighting panel toggle ──────────────────────────────────────────────────────
(function () {
  const btn = document.querySelector('.cd-addproduct-item--lighting');
  const panel = document.getElementById('cd-lighting-panel');
  const closeBtn = document.getElementById('cd-lighting-close');
  if (!btn || !panel) return;
  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    btn.classList.add('active');
  }
  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    btn.classList.remove('active');
  }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // Navigate to configure screen on lighting card click
  panel.addEventListener('click', function (e) {
    const card = e.target.closest('.cd-ctrl-card');
    if (!card) return;
    const name = card.querySelector('.cd-ctrl-card-name')?.textContent.trim() || 'Product';
    const img  = card.querySelector('img')?.src || '';
    closePanel();
    const nameEl = document.getElementById('cd-cfg-product-name');
    const imgEl  = document.getElementById('cd-cfg-product-img');
    const descEl = document.getElementById('cd-cfg-desc');
    if (nameEl) nameEl.textContent = name;
    if (imgEl && img) imgEl.src = img;
    if (descEl) descEl.textContent = 'HomeWorks(QSX), ' + name;
    const bc = document.getElementById('cd-cfg-breadcrumb');
    const bdg = document.getElementById('cd-cfg-template-badge');
    if (bc) bc.style.display = '';
    if (bdg) bdg.style.display = 'none';
    const saveBtnEl  = document.getElementById('cd-cfg-save-template-btn');
    const savedRight = document.getElementById('cd-cfg-saved-right');
    if (nameEl)     nameEl.classList.remove('cd-cfg-product-name--saved');
    if (saveBtnEl)  saveBtnEl.style.display = '';
    if (savedRight) savedRight.style.display = 'none';
    var _cfg = document.getElementById('cd-configure'); if (_cfg) _cfg.dataset.sourceRowId = '';
    _setCfgFooterMode('add');
    goTo('cd-configure');
  });
}());

// ── Equipment panel toggle ─────────────────────────────────────────────────────
(function () {
  const btn = document.querySelector('.cd-addproduct-item--equipment');
  const panel = document.getElementById('cd-equipment-panel');
  const closeBtn = document.getElementById('cd-equipment-close');
  if (!btn || !panel) return;
  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    btn.classList.add('active');
  }
  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    btn.classList.remove('active');
  }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  if (closeBtn) closeBtn.addEventListener('click', closePanel);
}());

// Visual picker toggle (configure screen)
document.addEventListener('click', function (e) {
  const opt = e.target.closest('.cd-cfg-visual-option');
  if (!opt) return;
  const group = opt.dataset.group;
  if (!group) return;
  document.querySelectorAll('.cd-cfg-visual-option[data-group="' + group + '"]').forEach(function (o) {
    o.classList.remove('selected');
  });
  opt.classList.add('selected');
});

// Radio toggle (configure screen)
document.addEventListener('change', function (e) {
  if (e.target.name !== 'backbox') return;
  document.querySelectorAll('.cd-cfg-radio-circle').forEach(function (c) { c.classList.remove('cd-cfg-radio-circle--selected'); });
  const label = e.target.closest('.cd-cfg-radio');
  if (label) label.querySelector('.cd-cfg-radio-circle')?.classList.add('cd-cfg-radio-circle--selected');
});

function cdAddChildArea(btn) {
  const parentRow = btn.closest('.cd-area-row');
  const parentDepth = parseInt(parentRow.dataset.depth);
  const label = _areaLabel(_areaIdCounter);
  const row = _makeAreaRow(_areaIdCounter, parentDepth + 1, label);
  _areaIdCounter++;
  // Insert after last descendant of parent
  const insertAfter = _lastDescendant(parentRow);
  insertAfter.insertAdjacentElement('afterend', row);
  _showChevron(parentRow);
  _selectArea(row);
  row.scrollIntoView({ block: 'nearest' });
}

// ── Initialize area tree from property listing ────────────────────────────────
(function () {
  const areaList = document.querySelector('#cd-home .cd-area-list');
  if (!areaList) return;
  // Remove the default "Area 001" placeholder row
  areaList.querySelectorAll('.cd-area-row').forEach(r => r.remove());
  _areaIdCounter = 1;

  function _addTop(label) {
    const row = _makeAreaRow(_areaIdCounter++, 0, label);
    areaList.insertBefore(row, areaList.querySelector('.cd-area-drop-indicator'));
    return row;
  }
  function _addKid(parentRow, label) {
    const row = _makeAreaRow(_areaIdCounter++, parseInt(parentRow.dataset.depth) + 1, label);
    _showChevron(parentRow);
    _lastDescendant(parentRow).insertAdjacentElement('afterend', row);
    return row;
  }

  // ── Main Level ──────────────────────────────────────────────
  const main = _addTop('Main Level');
    _addKid(main, 'Entry & Foyer');
    _addKid(main, 'Kitchen & Breakfast');
    _addKid(main, 'Formal Dining Room');
    _addKid(main, 'Great Room');
    _addKid(main, 'Study');
    const guestSuite = _addKid(main, 'Guest Suite');
      _addKid(guestSuite, 'Guest Bedroom');
      _addKid(guestSuite, 'Guest Bath');
    _addKid(main, 'Powder Room 1');
    _addKid(main, 'Powder Room 2');
    _addKid(main, 'Laundry');

  // ── 2nd Floor - South Wing ───────────────────────────────────
  const upper1 = _addTop('2nd Floor - South Wing');
    const master = _addKid(upper1, 'Master Suite');
      _addKid(master, 'Master Bedroom');
      _addKid(master, 'Master Bath');
      _addKid(master, 'Walk-In Closet');
    const suiteA = _addKid(upper1, 'Bedroom Suite A');
      _addKid(suiteA, 'Bedroom A');
      _addKid(suiteA, 'Ensuite Bath A');
    const suiteB = _addKid(upper1, 'Bedroom Suite B');
      _addKid(suiteB, 'Bedroom B');
      _addKid(suiteB, 'Ensuite Bath B');
    const suiteC = _addKid(upper1, 'Bedroom Suite C');
      _addKid(suiteC, 'Bedroom C');
    const suiteD = _addKid(upper1, 'Bedroom Suite D');
      _addKid(suiteD, 'Bedroom D');
    _addKid(upper1, 'Jack & Jill Bath');
    _addKid(upper1, 'Upper Laundry');

  // ── 2nd Floor - North Wing ───────────────────────────────────
  const upper2 = _addTop('2nd Floor - North Wing');
    const suiteE = _addKid(upper2, 'Bedroom Suite E');
      _addKid(suiteE, 'Bedroom E');
      _addKid(suiteE, 'Ensuite Bath E');

  // ── Lower Level ──────────────────────────────────────────────
  const lower = _addTop('Lower Level');
    const entZone = _addKid(lower, 'Entertainment Zone');
      _addKid(entZone, 'Media & Family Room');
      _addKid(entZone, 'Bar & Lounge');
      _addKid(entZone, 'Wine Cellar');
    _addKid(lower, 'Catering Kitchen');
    _addKid(lower, 'Lower Bath');
    _addKid(lower, 'Lower Laundry');

  // ── Exterior (last) ──────────────────────────────────────────
  const exterior = _addTop('Exterior');
    _addKid(exterior, 'Motor Court & Driveway');
    _addKid(exterior, 'Entry Landscape');
    const garage = _addKid(exterior, 'Garage');
      _addKid(garage, 'Bay 1');
      _addKid(garage, 'Bay 2');
      _addKid(garage, 'Bay 3');

  // Select "Entry & Foyer" by default (first leaf under Main Level)
  const defaultArea = areaList.querySelector('.cd-area-row[data-depth="1"]');
  const defaultTarget = defaultArea || main;
  defaultTarget.classList.add('selected');
  const titleEl = document.querySelector('#cd-home .cd-area-view-title');
  if (titleEl) titleEl.textContent = defaultTarget.querySelector('.cd-area-name').textContent;
}());

// ── Click-outside to close panels ─────────────────────────────────────────────
(function () {
  const panels = [
    { panelId: 'cd-templates-panel', btnSel: '.cd-addproduct-item--template' },
    { panelId: 'cd-search-panel',    btnSel: '.cd-addproduct-item--search' },
    { panelId: 'cd-controls-panel',  btnSel: '.cd-addproduct-item--controls' },
    { panelId: 'cd-lighting-panel',  btnSel: '.cd-addproduct-item--lighting' },
    { panelId: 'cd-window-panel',    btnSel: '.cd-addproduct-item--window' },
    { panelId: 'cd-equipment-panel', btnSel: '.cd-addproduct-item--equipment' },
  ];

  document.addEventListener('click', function (e) {
    // Ignore clicks on the template card context menu (it lives outside the panel in the DOM)
    if (e.target.closest('#tmpl-card-menu')) return;
    // Ignore clicks on modals that are triggered from the templates panel
    if (e.target.closest('#cd-duplicate-template-overlay')) return;
    if (e.target.closest('#cd-delete-tmpl-overlay')) return;
    panels.forEach(function (cfg) {
      const panel = document.getElementById(cfg.panelId);
      const btn   = document.querySelector(cfg.btnSel);
      if (!panel || !panel.classList.contains('open')) return;
      if (panel.contains(e.target)) return;
      if (btn && btn.contains(e.target)) return;
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      if (btn) btn.classList.remove('active');
    });
  }, true);
}());

// ── Custom tooltips (fast, 150ms delay) ───────────────────────────────────────
(function () {
  const tip = document.createElement('div');
  tip.id = 'cd-tooltip';
  document.body.appendChild(tip);

  let timer = null;

  // Strip title attributes and store as data-tip to prevent native tooltips
  document.querySelectorAll('[title]').forEach(el => {
    el.dataset.tip = el.title;
    el.removeAttribute('title');
  });

  // Also intercept dynamically added elements via a MutationObserver
  new MutationObserver(mutations => {
    mutations.forEach(m => m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      [node, ...node.querySelectorAll('[title]')].forEach(el => {
        if (el.hasAttribute && el.hasAttribute('title')) {
          el.dataset.tip = el.title;
          el.removeAttribute('title');
        }
      });
    }));
  }).observe(document.body, { childList: true, subtree: true });

  document.addEventListener('mouseover', function (e) {
    const target = e.target.closest('[data-tip]');
    if (!target) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      tip.textContent = target.dataset.tip;
      tip.classList.add('visible');
      positionTip(e);
    }, 150);
  });

  document.addEventListener('mousemove', function (e) {
    if (tip.classList.contains('visible')) positionTip(e);
  });

  document.addEventListener('mouseout', function (e) {
    const target = e.target.closest('[data-tip]');
    if (!target) return;
    clearTimeout(timer);
    tip.classList.remove('visible');
  });

  function positionTip(e) {
    const offset = 14;
    let x = e.clientX + offset;
    let y = e.clientY + offset;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    if (x + tw > window.innerWidth - 8) x = e.clientX - tw - offset;
    if (y + th > window.innerHeight - 8) y = e.clientY - th - offset;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
}());

// ── Save as Template modal (configure screen) ─────────────────────────────
(function () {
  const overlay   = document.getElementById('cd-save-template-overlay');
  const input     = document.getElementById('cd-stm-input');
  const closeBtn  = document.getElementById('cd-save-template-close');
  const cancelBtn = document.getElementById('cd-save-template-cancel');
  const saveBtn   = document.getElementById('cd-save-template-save');
  const triggerBtn = document.querySelector('.cd-cfg-save-template-btn');

  var _modalOpts = null;

  function openModal(opts) {
    _modalOpts = opts || null;
    const productName = (opts && opts.name) || document.querySelector('#cd-configure #cd-cfg-product-name')?.textContent.trim() || 'Template';
    const productImg  = (opts && opts.imgSrc) || document.querySelector('#cd-configure #cd-cfg-product-img')?.src || '';
    const descEl      = document.querySelector('#cd-configure #cd-cfg-desc')?.textContent.trim() || '';

    // Pre-fill: "Copy of …" for duplicates, product name otherwise
    if (input) input.value = (opts && opts.isDuplicate) ? 'Copy of ' + productName : productName;

    // Clear description
    const descInput = document.getElementById('cd-stm-desc-input');
    if (descInput) descInput.value = '';

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');

    // Populate preview immediately (values are ready before overlay opens)
    const previewName  = document.getElementById('cd-stm-product-name-display');
    const previewAttrs = document.getElementById('cd-stm-product-attrs-display');
    const previewImg   = document.getElementById('cd-stm-preview-img');
    const previewSvg   = document.getElementById('cd-stm-preview-svg');
    if (previewName)  previewName.textContent  = productName;
    if (previewAttrs) previewAttrs.textContent = descEl || 'No configuration details available';
    if (previewImg && productImg) {
      previewImg.src = productImg;
      previewImg.style.display = 'block';
      if (previewSvg) previewSvg.style.display = 'none';
    } else {
      if (previewImg) previewImg.style.display = 'none';
      if (previewSvg) previewSvg.style.display = '';
    }

    // Focus input after transition starts
    setTimeout(function () { if (input) { input.focus(); input.select(); } }, 50);
  }
  function closeModal() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  if (triggerBtn) triggerBtn.addEventListener('click', function () { openModal(); });

  window._openSaveTemplateFromRow = function (name, imgSrc, extraOpts) {
    openModal(Object.assign({ name: name, imgSrc: imgSrc, fromRow: true }, extraOpts || {}));
  };
  if (closeBtn)  closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (saveBtn)   saveBtn.addEventListener('click', function () {
    closeModal();

    const productName  = (_modalOpts && _modalOpts.name) || document.querySelector('#cd-configure #cd-cfg-product-name')?.textContent.trim() || 'Product';
    const productImg   = (_modalOpts && _modalOpts.imgSrc) || document.querySelector('#cd-configure #cd-cfg-product-img')?.src || '';
    const templateName = (input && input.value.trim()) || productName || 'Template';
    const isDuplicate  = _modalOpts && _modalOpts.isDuplicate;

    // Detect context: from a product row, from the configure screen, or from a product panel
    const fromProductRow = (_modalOpts && _modalOpts.fromRow) || !!document.getElementById('cd-configure')?.dataset.sourceRowId;

    // ── Helper: build a template card element ────────────────────────────────
    function _buildTemplateCard(name, img, desc) {
      const c = document.createElement('div');
      c.className = 'template-card';
      c.innerHTML = `
        <div class="template-card-img-wrap">
          ${img ? `<img src="${img}" style="width:100%;height:100%;object-fit:contain;padding:8px;" alt="">` : '<div class="checker-wide"></div>'}
          <div class="template-card-bookmark-badge">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 1h7a.5.5 0 0 1 .5.5v8L5 7.5 1 9.5V1.5A.5.5 0 0 1 1.5 1z" fill="#006dcc"/></svg>
          </div>
        </div>
        <div class="template-card-info">
          <div class="template-card-row1">
            <span class="template-card-name">${name}</span>
            <div class="template-card-row1-right">
              <span class="template-card-valid-badge">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Valid
              </span>
              <button class="template-card-more-btn" aria-label="More options">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="3.5" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="12.5" r="1.2" fill="currentColor"/></svg>
              </button>
            </div>
          </div>
          <div class="template-card-desc">HomeWorks(QSX), ${desc || name}</div>
          <div class="template-card-bottom">
            <div class="template-card-linked">Template linked to <strong>0</strong> products</div>
            <div class="template-card-hover-row">
              <div class="template-card-qty">
                <span class="template-card-qty-num">1</span>
                <div class="template-card-qty-divider"></div>
                <div class="template-card-qty-actions">
                  <button class="template-card-qty-btn" data-qty-dec aria-label="Decrease">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                  </button>
                  <div class="template-card-qty-divider"></div>
                  <button class="template-card-qty-btn" data-qty-inc aria-label="Increase">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                  </button>
                </div>
              </div>
              <button class="template-card-add-btn">Add</button>
            </div>
          </div>
        </div>`;
      return c;
    }

    // Show alert dot on the Templates button
    document.getElementById('cd-template-alert-dot')?.classList.add('visible');

    // Ensure library list is visible
    const emptyState   = document.getElementById('cd-templates-empty-state');
    const recentLabel  = document.getElementById('cd-templates-recent-label');
    const recentList   = document.getElementById('cd-templates-recent-list');
    if (emptyState)  emptyState.style.display  = 'none';
    if (recentLabel) recentLabel.style.display = '';
    if (recentList)  recentList.style.display  = '';

    // ── Duplicate flow: create card, open drawer, toast with Edit CTA ────────
    if (isDuplicate) {
      const newCard = _buildTemplateCard(templateName, productImg, productName);
      if (recentList) {
        recentList.insertBefore(newCard, recentList.firstChild);
        var _ptDup = document.getElementById('cd-configure')?.dataset.productType || '';
        if (window._stampTemplateCard) window._stampTemplateCard(newCard, _ptDup);
        if (window._renderTemplateSort) window._renderTemplateSort();
      }

      // Open template drawer on home screen
      const panel   = document.getElementById('cd-templates-panel');
      const tmplBtn = document.querySelector('.cd-addproduct-item--template');
      if (panel)   { panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); }
      if (tmplBtn) tmplBtn.classList.add('active');

      _showToast(
        '“' + templateName + '” duplicated',
        'The new template has been added to your library.',
        { action: { label: 'Edit', fn: function () { _openTemplateEditMode(newCard); } } }
      );
      return;
    }

    // ── Regular flow ──────────────────────────────────────────────────────────
    var _newCard = null;
    if (recentList) {
      _newCard = _buildTemplateCard(templateName, productImg, productName);
      recentList.insertBefore(_newCard, recentList.firstChild);
      var _ptReg = document.getElementById('cd-configure')?.dataset.productType || '';
      if (window._stampTemplateCard) window._stampTemplateCard(_newCard, _ptReg);
      if (window._renderTemplateSort) window._renderTemplateSort();
    }

    {
      // Always navigate to #cd-template so user can review/edit before closing
      const cfgEl = document.getElementById('cd-configure');
      // Save configure state before clearing sourceRowId
      var _tmplRowId = cfgEl ? cfgEl.dataset.sourceRowId : '';
      if (_tmplRowId) {
        var _tmplPanel = _getActiveCfgPanel();
        if (_tmplPanel) window._rowConfigs[_tmplRowId] = _collectCfgState(_tmplPanel);
      }
      if (cfgEl) cfgEl.dataset.sourceRowId = '';
      const tmplName = document.getElementById('cd-tmpl-product-name');
      const tmplImg  = document.getElementById('cd-tmpl-product-img');
      const tmplDesc = document.getElementById('cd-tmpl-desc');
      if (tmplName) tmplName.textContent = templateName;
      if (tmplImg && productImg) tmplImg.src = productImg;
      if (tmplDesc) tmplDesc.textContent = 'HomeWorks(QSX), ' + productName;

      const tmplScreen = document.getElementById('cd-template');
      if (tmplScreen) tmplScreen.dataset.templateName = templateName;
      // Store card ref so Save/Save as Draft can update its badge
      if (tmplScreen && _newCard) tmplScreen._editSourceCard = _newCard;

      var cfgProductType = document.getElementById('cd-configure')?.dataset.productType || '';
      if (tmplScreen) tmplScreen.dataset.productType = cfgProductType;
      _applyPanelToggle('cd-tmpl-right-scroll', 'cd-tmpl-right-fixture', 'cd-tmpl-right-shade', cfgProductType);

      goTo('cd-template');
      _setTmplFooterMode(fromProductRow ? 'save' : 'create');
      _setTemplateBreadcrumb(productName);
      // Transfer configure values into the template panel, then overlay any previously saved template state
      var _srcCfgPanel = _getActiveCfgPanel();
      var _dstTmplPanel = _getActiveTmplPanel();
      _transferPanelState(_srcCfgPanel, _dstTmplPanel);
      var _savedTmpl = window._tmplConfigs[templateName];
      if (_savedTmpl) _applyCfgState(_dstTmplPanel, _savedTmpl);
    }

    _showToast(
      'Template saved',
      'Your template has been saved. View it in the Templates section.'
    );
  });

  // Close on overlay backdrop click
  if (overlay) overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });
  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });
}());

// Discard-changes modal (template screen back button)
function _tmplBackBtn() {
  const overlay = document.getElementById('cd-discard-overlay');
  if (!overlay) { goTo('cd-configure'); return; }
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}

(function () {
  const overlay   = document.getElementById('cd-discard-overlay');
  const closeBtn  = document.getElementById('cd-discard-close');
  const cancelBtn = document.getElementById('cd-discard-cancel');
  const confirmBtn = document.getElementById('cd-discard-confirm');

  function closeModal() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function doDiscard() {
    closeModal();
    // Mark template card as invalid but do not add a product row to the area
    var tmplScreen = document.getElementById('cd-template');
    var cardEl = tmplScreen ? tmplScreen._editSourceCard : null;
    if (!cardEl) {
      // fresh creation — find the card by name
      var templateName = tmplScreen ? (tmplScreen.dataset.templateName || '') : '';
      var recentList = document.getElementById('cd-templates-recent-list');
      if (recentList && templateName) {
        var cards = recentList.querySelectorAll('.template-card');
        for (var i = 0; i < cards.length; i++) {
          var nameEl = cards[i].querySelector('.template-card-name');
          if (nameEl && nameEl.textContent.trim() === templateName) { cardEl = cards[i]; break; }
        }
      }
    }
    if (cardEl) {
      var badge = cardEl.querySelector('.template-card-valid-badge, .template-card-draft-badge, .template-card-invalid-badge');
      if (badge) {
        badge.className = 'template-card-invalid-badge';
        badge.title = 'This item is invalid. Complete configuration before ordering.';
        badge.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#900" stroke-width="1.2"/><path d="M7 4.5v2.5M7 8.5v.5" stroke="#900" stroke-width="1.3" stroke-linecap="round"/></svg> Invalid';
      }
    }
    var _discardTmplName = cardEl ? (cardEl.querySelector('.template-card-name')?.textContent.trim() || '') : (tmplScreen ? tmplScreen.dataset.templateName : '');
    _syncLinkedProductsToTemplateStatus(_discardTmplName, 'invalid');
    if (tmplScreen) { tmplScreen.dataset.editMode = ''; tmplScreen._editSourceCard = null; }
    _setTmplFooterMode('create');
    _showToast('Template saved as invalid', 'Open the template to complete configuration and validate it.');
    goTo('cd-home');
    var _p = document.getElementById('cd-templates-panel');
    var _b = document.querySelector('.cd-addproduct-item--template');
    if (_p) { _p.classList.add('open'); _p.setAttribute('aria-hidden', 'false'); }
    if (_b) _b.classList.add('active');
    if (window._renderTemplateSort) window._renderTemplateSort();
  }

  if (closeBtn)   closeBtn.addEventListener('click', closeModal);
  if (cancelBtn)  cancelBtn.addEventListener('click', doDiscard);  // "Discard" — go back
  if (confirmBtn) confirmBtn.addEventListener('click', closeModal); // "Keep Editing" — stay
  if (overlay) overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) closeModal();
  });
}());

// ── Detach this Product ────────────────────────────────────────────────────
// _detachSourceRowId: row being detached (set before opening modal)
var _tmplCfgReturnScreen = 'cd-home';
var _tmplCfgLinkedCount  = -1; // -1 = use live count from #cd-product-table
var _detachSourceRowId = null;
var _detachOrigin = 'configure'; // 'configure' | 'list'

var _detachOriginalName = '';

function _openDetachModal(rowId, origin) {
  const overlay = document.getElementById('cd-detach-overlay');
  const input   = document.getElementById('cd-detach-input');
  const errEl   = document.getElementById('cd-detach-error');
  if (!overlay) return;
  _detachSourceRowId = rowId || null;
  _detachOrigin = origin || 'configure';

  // Pre-fill with current product/template name
  const nameEl = _detachOrigin === 'configure'
    ? document.getElementById('cd-tmpl-cfg-name')
    : document.querySelector(`.cd-product-row[data-row-id="${rowId}"] .cd-prod-title-template`);
  const currentName = nameEl ? nameEl.textContent.trim() : '';
  _detachOriginalName = currentName;

  // Pre-fill input with "[name] Copy 01"
  if (input) {
    input.value = currentName ? currentName + ' Copy 01' : '';
    input.classList.remove('cd-detach-input--error');
  }
  if (errEl) errEl.style.display = 'none';

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  if (input) setTimeout(function () { input.focus(); input.select(); }, 50);
}

function _showDetachError(msg, input, errEl) {
  if (input)  { input.classList.add('cd-detach-input--error'); input.focus(); }
  if (errEl)  { errEl.textContent = msg; errEl.style.display = 'block'; }
}

function _closeDetachModal() {
  const overlay = document.getElementById('cd-detach-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

function _confirmDetach() {
  const input = document.getElementById('cd-detach-input');
  const errEl = document.getElementById('cd-detach-error');
  const newName = input ? input.value.trim() : _detachOriginalName || '';
  if (!newName) {
    if (input)  { input.classList.add('cd-detach-input--error'); input.focus(); }
    if (errEl)  { errEl.textContent = 'Name is required'; errEl.style.display = 'block'; }
    return;
  }
  _closeDetachModal();

  // Update the product row in the design
  const rowId = _detachSourceRowId
    || document.getElementById('cd-tmpl-configure')?.dataset.sourceRowId;

  if (rowId) {
    const row = document.querySelector(`.cd-product-row[data-row-id="${rowId}"]`);
    if (row) {
      const tmplName = row.dataset.templateName || '';
      const thumb = row.querySelector('.cd-prod-thumb');
      if (thumb) {
        thumb.classList.remove('cd-prod-thumb--template');
        thumb.querySelector('.cd-prod-thumb-bookmark')?.remove();
      }
      const titleSpan = row.querySelector('.cd-prod-title-template');
      if (titleSpan) {
        titleSpan.classList.remove('cd-prod-title-template');
        if (newName) titleSpan.textContent = newName;
      }
      if (tmplName) _adjustTemplateCardCount(tmplName, -1);
      // Brief highlight to show which row was detached
      row.style.transition = 'background 0.3s';
      row.style.background = 'rgba(0,137,123,0.08)';
      setTimeout(function () { row.style.background = ''; }, 1200);
    }
  }
  _saveSnapshot();
  _syncLinkedCount();

  const displayName = newName || 'Product';

  const toastMsg = displayName + ' detached';

  if (_detachOrigin === 'configure' || _detachOrigin === 'template-screen') {
    // Navigate to the standard configure screen (actual MFE experience)
    const imgSrc = document.getElementById('cd-tmpl-cfg-product-img')?.src
                || document.getElementById('cd-tmpl-product-img')?.src || '';
    const desc   = 'HomeWorks(QSX), ' + displayName;

    const nameEl = document.getElementById('cd-cfg-product-name');
    const imgEl  = document.getElementById('cd-cfg-product-img');
    const descEl = document.getElementById('cd-cfg-desc');
    const bcEl   = document.getElementById('cd-cfg-breadcrumb');
    const bdg    = document.getElementById('cd-cfg-template-badge');
    const saveBtnEl  = document.getElementById('cd-cfg-save-template-btn');
    const savedRight = document.getElementById('cd-cfg-saved-right');

    if (nameEl) { nameEl.textContent = displayName; nameEl.classList.remove('cd-cfg-product-name--saved'); }
    if (imgEl && imgSrc) imgEl.src = imgSrc;
    if (descEl) descEl.textContent = desc;
    if (bcEl) { const ap = _getAreaPath(); bcEl.textContent = ap ? displayName + ' | ' + ap : displayName; }
    if (bdg)    bdg.style.display  = 'none';
    if (saveBtnEl)  saveBtnEl.style.display  = '';
    if (savedRight) savedRight.style.display = 'none';

    // Store source row so Save can highlight it, then switch footer to save mode
    const cfgEl = document.getElementById('cd-configure');
    if (cfgEl && rowId) cfgEl.dataset.sourceRowId = rowId;
    _setCfgFooterMode('save');

    goTo('cd-configure');
    _showToast(toastMsg, 'This product can now be edited independently.');

  } else {
    // Path B: from product list — go back to home
    goTo('cd-home');
    _showToast(toastMsg, 'This product can now be edited independently.');
  }
}

function _setTmplCfgIndependentMode(productName) {
  // Transform #cd-tmpl-configure header to independent product state
  const nameEl    = document.getElementById('cd-tmpl-cfg-name');
  const leftItems = document.querySelector('#cd-tmpl-configure .cd-tmpl-cfg-left-items');
  const countEl   = document.querySelector('#cd-tmpl-configure .cd-tmpl-cfg-count-right');
  const detachBtn = document.getElementById('cd-tmpl-detach-btn');
  const dupBtn    = document.getElementById('cd-tmpl-duplicate-btn');

  if (nameEl && productName) {
    nameEl.textContent = productName;
    nameEl.classList.add('cd-tmpl-cfg-name--independent');
  }
  // Show only the breadcrumb in left items — no Template badge
  if (leftItems) leftItems.innerHTML = '<span class="cd-tmpl-cfg-breadcrumb-linked">' + (_getAreaPath() || '') + '</span>';
  // Hide linked count — product is no longer linked to anything
  if (countEl)  countEl.style.display  = 'none';
  if (detachBtn) detachBtn.style.display = 'none';
  if (dupBtn)    dupBtn.style.display    = 'none';

  // Add "Save as Template" button back so user can re-template if desired
  const header = document.querySelector('#cd-tmpl-configure .cd-tmpl-cfg-header');
  if (header && !header.querySelector('.cd-tmpl-independent-save')) {
    const saveBtn = document.createElement('button');
    saveBtn.className = 'cd-tmpl-cfg-action-btn cd-tmpl-independent-save';
    saveBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2h10a1 1 0 0 1 1 1v11l-5-3-5 3V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg> Save as Template';
    header.appendChild(saveBtn);
  }
}

(function () {
  // Wire Detach button on #cd-tmpl-configure (linked mode)
  document.getElementById('cd-tmpl-detach-btn')
    ?.addEventListener('click', function () {
      const screen = document.getElementById('cd-tmpl-configure');
      _openDetachModal(screen?.dataset.sourceRowId, 'configure');
    });

  // Wire Detach button on #cd-template (post-save template screen)
  // Targets the most recently added linked row in the design
  document.getElementById('cd-tmpl-screen-detach-btn')
    ?.addEventListener('click', function () {
      // Find the last template-linked row in the product table
      const rows = document.querySelectorAll('#cd-product-table .cd-product-row');
      let lastLinkedRow = null;
      rows.forEach(function (r) { if (r.querySelector('.cd-prod-thumb--template')) lastLinkedRow = r; });
      _openDetachModal(lastLinkedRow?.dataset.rowId || null, 'template-screen');
    });

  // Modal controls
  document.getElementById('cd-detach-close')  ?.addEventListener('click', _closeDetachModal);
  document.getElementById('cd-detach-cancel') ?.addEventListener('click', _closeDetachModal);
  document.getElementById('cd-detach-confirm')?.addEventListener('click', _confirmDetach);

  const overlay = document.getElementById('cd-detach-overlay');
  if (overlay) overlay.addEventListener('click', function (e) {
    if (e.target === overlay) _closeDetachModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay?.classList.contains('open')) _closeDetachModal();
  });
}());

// ── Path B: Product row "…" context menu ──────────────────────────────────
(function () {
  var _menu    = null;
  var _menuRow = null;

  function _makeItem(label, action, danger) {
    const btn = document.createElement('button');
    btn.dataset.action = action;
    btn.textContent    = label;
    btn.style.cssText  = 'display:block;width:100%;text-align:left;background:none;border:none;cursor:pointer;font-size:14px;color:' + (danger ? '#c00000' : '#262626') + ';padding:12px 16px;white-space:nowrap;';
    btn.onmouseenter = function () { btn.style.background = 'rgba(0,0,0,0.05)'; };
    btn.onmouseleave = function () { btn.style.background = ''; };
    return btn;
  }

  function _buildMenu() {
    const m = document.createElement('div');
    m.id = 'cd-row-ctx-menu';
    m.style.cssText = 'position:fixed;z-index:9200;background:#fff;border-radius:12px;box-shadow:0 1.2px 3.6px rgba(0,0,0,0.11),0 6.4px 14.4px rgba(0,0,0,0.13),inset 0 0 0 0.4px rgba(0,0,0,0.2);min-width:220px;overflow:hidden;display:none;flex-direction:column;';
    document.body.appendChild(m);
    return m;
  }

  function _populateMenu(row) {
    _menu.innerHTML = '';
    const isTemplate = !!row.querySelector('.cd-prod-thumb--template');
    if (isTemplate) {
      _menu.appendChild(_makeItem('Detach from Template',      'detach',          true));
      _menu.appendChild(_makeItem('Duplicate as New Template', 'dup-template',    false));
      _menu.appendChild(_makeItem('Duplicate without Template','dup-independent', false));
    } else {
      _menu.appendChild(_makeItem('Save as Template', 'save-template', false));
    }
  }

  function _showRowMenu(btn, row) {
    if (!_menu) _menu = _buildMenu();
    _menuRow = row;
    _populateMenu(row);
    const rect = btn.getBoundingClientRect();
    _menu.style.display = 'flex';
    const left = Math.min(rect.right - _menu.offsetWidth, window.innerWidth - _menu.offsetWidth - 8);
    const top  = rect.bottom + 4;
    _menu.style.left = Math.max(8, left) + 'px';
    _menu.style.top  = top + 'px';
  }

  function _hideRowMenu() {
    if (_menu) _menu.style.display = 'none';
    _menuRow = null;
  }

  // Delegate clicks on product table
  document.addEventListener('click', function (e) {
    if (_menu && !_menu.contains(e.target)) _hideRowMenu();

    // "…" button on a row
    const moreBtn = e.target.closest('.cd-product-row .cd-icon-btn[data-tip="More options"]');
    if (moreBtn) {
      e.stopPropagation();
      const row = moreBtn.closest('.cd-product-row');
      if (!row) return;
      if (!_menu) _menu = _buildMenu();
      if (_menu.style.display !== 'none' && _menuRow === row) { _hideRowMenu(); return; }
      _showRowMenu(moreBtn, row);
      return;
    }

    // Menu item action
    if (_menu && _menu.contains(e.target)) {
      const action = e.target.closest('[data-action]')?.dataset.action;
      const row    = _menuRow;
      _hideRowMenu();
      if (!row) return;

      if (action === 'save-template') {
        const name   = row.querySelector('.cd-prod-title, .cd-prod-title-template')?.textContent.trim() || 'Product';
        const imgEl  = row.querySelector('.cd-prod-thumb img');
        const imgSrc = imgEl ? imgEl.src : '';
        window._openSaveTemplateFromRow(name, imgSrc);
      } else if (action === 'detach') {
        _openDetachModal(row.dataset.rowId, 'list');
      } else if (action === 'dup-template') {
        // Get template name from the linked product row title
        const tmplTitleEl = row.querySelector('.cd-prod-title-template');
        const tmplName    = tmplTitleEl ? tmplTitleEl.textContent.trim() : name;
        const imgEl2      = row.querySelector('.cd-prod-thumb-img');
        const imgSrc2     = imgEl2 ? imgEl2.src : '';
        window._openSaveTemplateFromRow(tmplName, imgSrc2, { isDuplicate: true });
      } else if (action === 'dup-independent') {
        // Clone row and strip template styling
        const clone = row.cloneNode(true);
        _productRowCounter++;
        clone.dataset.rowId = _productRowCounter;
        const thumb = clone.querySelector('.cd-prod-thumb');
        if (thumb) { thumb.classList.remove('cd-prod-thumb--template'); thumb.querySelector('.cd-prod-thumb-bookmark')?.remove(); }
        const title = clone.querySelector('.cd-prod-title-template');
        if (title) title.classList.remove('cd-prod-title-template');
        row.parentNode.insertBefore(clone, row.nextSibling);
        _saveSnapshot();
        _showToast('Product duplicated', 'A copy was added below as an independent product.');
      }
    }
  }, true);
}());

// ── Undo / Redo buttons ────────────────────────────────────────────────────────
(function () {
  const undoBtn = document.querySelector('.cd-bottom-btn[data-tip="Undo"]');
  const redoBtn = document.querySelector('.cd-bottom-btn[data-tip="Redo"]');

  if (undoBtn) undoBtn.addEventListener('click', function () {
    if (_undoIndex <= 0) return;
    _undoIndex--;
    _applySnapshot(_undoStack[_undoIndex]);
    _syncUndoRedo();
  });

  if (redoBtn) redoBtn.addEventListener('click', function () {
    if (_undoIndex >= _undoStack.length - 1) return;
    _undoIndex++;
    _applySnapshot(_undoStack[_undoIndex]);
    _syncUndoRedo();
  });

  // Save initial empty state as snapshot[0]
  _saveSnapshot();
}());

// ── Areas panel resize ─────────────────────────────────────────────────────────
(function () {
  const handle = document.getElementById('cd-areas-resize-handle');
  const panel  = document.getElementById('cd-areas-panel');
  if (!handle || !panel) return;

  let startX, startWidth;

  handle.addEventListener('mousedown', function (e) {
    e.preventDefault();
    startX     = e.clientX;
    startWidth = panel.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMove(e) {
      const delta = e.clientX - startX;
      const newWidth = Math.min(520, Math.max(160, startWidth + delta));
      panel.style.width = newWidth + 'px';
    }

    function onUp() {
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}());

// Template card "more" menu
(function () {
  var menu = document.getElementById('tmpl-card-menu');
  var currentCard = null;
  if (!menu) return;

  function openMenu(btn, card) {
    currentCard = card;
    var rect = btn.getBoundingClientRect();
    menu.style.display = 'flex';
    var left = rect.right - menu.offsetWidth;
    var top  = rect.bottom + 4;
    if (left < 8) left = 8;
    if (top + menu.offsetHeight > window.innerHeight - 8) top = rect.top - menu.offsetHeight - 4;
    menu.style.left = left + 'px';
    menu.style.top  = top  + 'px';
  }

  function closeMenu() { menu.style.display = 'none'; currentCard = null; }

  document.addEventListener('click', function (e) {
    if (e.target.closest('.tmpl-card-menu')) return;
    var moreBtn = e.target.closest('.template-card-more-btn');
    if (moreBtn) {
      e.stopPropagation();
      var card = moreBtn.closest('.template-card');
      if (menu.style.display !== 'none' && currentCard === card) { closeMenu(); return; }
      openMenu(moreBtn, card);
      return;
    }
    closeMenu();
  });

  menu.addEventListener('click', function (e) {
    var item = e.target.closest('.tmpl-card-menu-item');
    if (!item) return;
    var action = item.dataset.action;
    var card = currentCard;
    closeMenu();
    if (!card) return;
    if (action === 'duplicate') window._openDupModal(card);
    else if (action === 'detach') window._openDetachAllModal(card);
    else if (action === 'delete') window._openDeleteTmplModal(card);
  });
}());

// Duplicate Template modal
(function () {
  var overlay   = document.getElementById('cd-duplicate-template-overlay');
  var input     = document.getElementById('cd-dup-input');
  var sourceEl  = document.getElementById('cd-dup-source-name');
  var errorEl   = document.getElementById('cd-dup-error');
  var closeBtn  = document.getElementById('cd-duplicate-close');
  var cancelBtn = document.getElementById('cd-duplicate-cancel');
  var saveBtn   = document.getElementById('cd-duplicate-save');
  if (!overlay) return;

  var _sourceCard = null;

  function _getExistingNames() {
    return Array.from(document.querySelectorAll('.template-card-name')).map(function (el) {
      return el.textContent.trim().toLowerCase();
    });
  }

  function _validate(val) {
    if (!val) return 'Template name is required.';
    var existing = _getExistingNames();
    if (existing.includes(val.toLowerCase())) return 'This name is already in use. Choose a different name.';
    return '';
  }

  function _setError(msg) {
    if (msg) {
      input.classList.add('cd-dup-input--error');
      errorEl.textContent = msg;
      errorEl.style.display = 'flex';
      saveBtn.disabled = true;
    } else {
      input.classList.remove('cd-dup-input--error');
      errorEl.style.display = 'none';
      saveBtn.disabled = false;
    }
  }

  function openDupModal(card) {
    _sourceCard = card || null;
    var currentName = (card && card.querySelector('.template-card-name')?.textContent.trim()) || 'Template';
    if (sourceEl) sourceEl.textContent = currentName;
    input.value = currentName + ' 01';
    _setError('');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    setTimeout(function () { input.focus(); input.select(); }, 50);
  }

  function closeDupModal() {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('open');
    _sourceCard = null;
  }

  input && input.addEventListener('input', function () { _setError(_validate(input.value.trim())); });
  input && input.addEventListener('blur',  function () { _setError(_validate(input.value.trim())); });

  closeBtn  && closeBtn.addEventListener('click', closeDupModal);
  cancelBtn && cancelBtn.addEventListener('click', closeDupModal);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeDupModal(); });
  overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDupModal(); });

  saveBtn && saveBtn.addEventListener('click', function () {
    var newName = input.value.trim();
    var err = _validate(newName);
    if (err) { _setError(err); return; }
    var imgSrc = (_sourceCard && _sourceCard.querySelector('img')?.src) || '';
    closeDupModal();
    _addTemplateCard(newName, imgSrc, newName);
    _showToast('Template duplicated', '“' + newName + '” added to your library.');
  });

  // Wire "Duplicate Template" buttons on configure/template screens
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.cd-tmpl-cfg-action-btn, .cd-cfg-duplicate-btn');
    if (!btn) return;
    var label = btn.textContent.trim();
    if (label !== 'Duplicate Template' && label !== 'Duplicate template') return;
    openDupModal(null);
    var name = document.getElementById('cd-tmpl-cfg-name')?.textContent.trim()
            || document.getElementById('cd-cfg-product-name')?.textContent.trim()
            || 'Template';
    if (sourceEl) sourceEl.textContent = name;
    input.value = name + ' 01';
    _setError('');
    setTimeout(function () { input.focus(); input.select(); }, 50);
  });

  window._openDupModal = openDupModal;
}());

// Detach All Linked Products modal
(function () {
  var overlay    = document.getElementById('cd-detach-all-overlay');
  if (!overlay) return;
  var nameEl     = document.getElementById('cd-detach-all-tmpl-name');
  var countEl    = document.getElementById('cd-detach-all-count');
  var normalEl   = document.getElementById('cd-detach-all-normal');
  var zeroEl     = document.getElementById('cd-detach-all-zero');
  var footerEl   = document.getElementById('cd-detach-all-footer');
  var footerZero = document.getElementById('cd-detach-all-footer-zero');
  var confirmBtn = document.getElementById('cd-detach-all-confirm');
  var closeBtn   = document.getElementById('cd-detach-all-close');
  var cancelBtn  = document.getElementById('cd-detach-all-cancel');
  var closeZero  = document.getElementById('cd-detach-all-close-zero');

  var _card = null;

  function _getCount(card) {
    var strong = card && card.querySelector('.template-card-linked strong');
    return strong ? parseInt(strong.textContent) || 0 : 0;
  }

  function open(card) {
    _card = card;
    var name  = card ? card.querySelector('.template-card-name')?.textContent.trim() : '—';
    var count = _getCount(card);
    if (nameEl)  nameEl.textContent  = name || '—';
    if (countEl) countEl.textContent = count;
    var isZero = count === 0;
    if (normalEl)   normalEl.style.display   = isZero ? 'none' : '';
    if (zeroEl)     zeroEl.style.display     = isZero ? '' : 'none';
    if (footerEl)   footerEl.style.display   = isZero ? 'none' : '';
    if (footerZero) footerZero.style.display = isZero ? '' : 'none';
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
  }

  function close() {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('open');
    _card = null;
  }

  closeBtn  && closeBtn.addEventListener('click', close);
  cancelBtn && cancelBtn.addEventListener('click', close);
  closeZero && closeZero.addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  confirmBtn && confirmBtn.addEventListener('click', function () {
    var count = _getCount(_card);
    var name  = _card ? (_card.querySelector('.template-card-name')?.textContent.trim() || '') : '';
    if (name && window._stripTmplFromRows) window._stripTmplFromRows(name);
    if (_card) {
      var strong = _card.querySelector('.template-card-linked strong');
      if (strong) strong.textContent = '0';
    }
    close();
    _showToast(count + ' product' + (count === 1 ? '' : 's') + ' detached', 'All configurations preserved. Products are now standalone.');
  });

  window._openDetachAllModal = open;
}());

// Delete Template modal
var _deleteTmplCard = null; // module-level so _execDeleteTemplate can access it
var _deleteTmplSelected = 'keep'; // set by _syncRadioState so _execDeleteTemplate can read it reliably

(function () {
  var overlay    = document.getElementById('cd-delete-tmpl-overlay');
  if (!overlay) return;
  var titleEl    = document.getElementById('cd-delete-tmpl-title');
  var scenarioA  = document.getElementById('cd-delete-scenario-a');
  var scenarioB  = document.getElementById('cd-delete-scenario-b');
  var cancelBtn  = document.getElementById('cd-delete-tmpl-cancel');
  var closeBtn   = document.getElementById('cd-delete-tmpl-close');
  var radios     = overlay.querySelectorAll('input[name="cd-delete-opt"]');
  var warnBanner = document.getElementById('cd-delete-warn');
  var delOptLabel = document.getElementById('cd-delete-opt-del-label');

  var _card = null;

  function _syncRadioState() {
    var selected = overlay.querySelector('input[name="cd-delete-opt"]:checked')?.value;
    _deleteTmplSelected = selected || 'keep';
    var isDel = selected === 'delete';
    if (warnBanner) warnBanner.style.display = isDel ? 'flex' : 'none';
    if (delOptLabel) delOptLabel.classList.toggle('cd-del-radio--danger', isDel);
    // Update warn count
    if (isDel && _card) {
      var c = _getCount(_card);
      var wc = document.getElementById('cd-delete-warn-count');
      var wp = document.getElementById('cd-delete-warn-plural');
      if (wc) wc.textContent = c;
      if (wp) wp.textContent = c === 1 ? '' : 's';
    }
  }

  function _getCount(card) {
    var strong = card && card.querySelector('.template-card-linked strong');
    return strong ? parseInt(strong.textContent) || 0 : 0;
  }

  function open(card) {
    _card = card;
    _deleteTmplCard = card;
    var name  = card ? card.querySelector('.template-card-name')?.textContent.trim() : 'template';
    var count = _getCount(card);
    // Dynamic title
    if (titleEl) titleEl.textContent = 'Delete ' + name;
    // Inline count
    var inlineCount = document.getElementById('cd-delete-count-inline');
    if (inlineCount) inlineCount.textContent = count;
    var pluralEl = document.getElementById('cd-delete-count-plural');
    if (pluralEl) pluralEl.textContent = count === 1 ? '' : 's';
    // Toggle scenarios
    var hasLinked = count > 0;
    if (scenarioA) scenarioA.style.display = hasLinked ? 'none' : '';
    if (scenarioB) scenarioB.style.display = hasLinked ? '' : 'none';
    // Reset radio to keep, clear danger state
    _deleteTmplSelected = 'keep';
    var keepRadio = overlay.querySelector('input[value="keep"]');
    if (keepRadio) keepRadio.checked = true;
    _syncRadioState();
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
  }

  function close() {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('open');
    _card = null;
    _deleteTmplCard = null;
  }

  radios.forEach(function (r) { r.addEventListener('change', _syncRadioState); });
  closeBtn  && closeBtn.addEventListener('click', close);
  cancelBtn && cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  function _stripTemplateFromRows(tmplName) {
    document.querySelectorAll('#cd-product-table .cd-product-row').forEach(function (row) {
      if (row.dataset.templateName !== tmplName) return;
      var thumb = row.querySelector('.cd-prod-thumb');
      if (thumb) {
        thumb.classList.remove('cd-prod-thumb--template');
        var bm = thumb.querySelector('.cd-prod-thumb-bookmark');
        if (bm) bm.remove();
      }
      var titleSpan = row.querySelector('.cd-prod-title-template');
      if (titleSpan) titleSpan.classList.remove('cd-prod-title-template');
      row.dataset.templateName = '';
    });
  }

  window._closeDeleteTmpl = close;
  window._openDeleteTmplModal = open;
  window._getDeleteTmplCount = _getCount;
  window._stripTmplFromRows = _stripTemplateFromRows;
}());

window._execDeleteTemplate = function () {
  var card     = _deleteTmplCard;
  var name     = card ? card.querySelector('.template-card-name')?.textContent.trim() : '';
  var count    = window._getDeleteTmplCount ? _getDeleteTmplCount(card) : 0;
  var selected = _deleteTmplSelected;

  function _removeSourceCard() {
    var src = document.getElementById('cd-templates-recent-list');
    if (!src) return;
    src.querySelectorAll('.template-card').forEach(function (c) {
      var n = c.querySelector('.template-card-name');
      if (n && n.textContent.trim() === name) c.remove();
    });
  }

  if (selected === 'delete') {
    document.querySelectorAll('#cd-product-table .cd-product-row').forEach(function (r) {
      if (r.dataset.templateName === name) r.remove();
    });
    _removeSourceCard();
    if (window._renderTemplateSort) window._renderTemplateSort();
    if (window._closeDeleteTmpl) window._closeDeleteTmpl();
    _showToast('Template deleted', '”' + name + '” and ' + count + ' linked product' + (count === 1 ? '' : 's') + ' were permanently removed.');
  } else {
    if (window._stripTmplFromRows) window._stripTmplFromRows(name);
    _removeSourceCard();
    if (window._renderTemplateSort) window._renderTemplateSort();
    if (window._closeDeleteTmpl) window._closeDeleteTmpl();
    if (count > 0) {
      _showToast('Template deleted', '”' + name + '” removed. ' + count + ' product' + (count === 1 ? '' : 's') + ' are now independent.');
    } else {
      _showToast('Template deleted', '”' + name + '” has been removed from your library.');
    }
  }
  var recentList = document.getElementById('cd-templates-recent-list');
  if (recentList && recentList.querySelectorAll('.template-card').length === 0) {
    var emptyState  = document.getElementById('cd-templates-empty-state');
    var recentLabel = document.getElementById('cd-templates-recent-label');
    if (emptyState)  emptyState.style.display  = '';
    if (recentLabel) recentLabel.style.display = 'none';
    recentList.style.display = 'none';
  }
};


/* ═══════════════════════════════════════════════════════
   Configure screen v2 – Aviena Keypads interactivity
   ═══════════════════════════════════════════════════════ */
(function() {
  function initConfigureScreen() {
    var cfg = document.getElementById('cd-configure');
    if (!cfg) return;

    // ── Custom selects ──────────────────────────────────
    cfg.querySelectorAll('.cd-cfg-custom-select').forEach(function(sel) {
      var trigger = sel.querySelector('.cd-cfg-select-trigger');
      var dropdown = sel.querySelector('.cd-cfg-select-dropdown');
      if (!trigger || !dropdown) return;

      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        var isOpen = sel.classList.contains('open');
        // close all others
        cfg.querySelectorAll('.cd-cfg-custom-select.open').forEach(function(s) { s.classList.remove('open'); });
        if (!isOpen) sel.classList.add('open');
      });

      dropdown.querySelectorAll('li').forEach(function(li) {
        li.addEventListener('click', function() {
          dropdown.querySelectorAll('li').forEach(function(l) { l.classList.remove('selected'); });
          li.classList.add('selected');
          var valueEl = trigger.querySelector('.cd-cfg-select-value');
          if (valueEl) valueEl.textContent = li.textContent.trim();
          // update color swatch if present
          var swatch = trigger.querySelector('.cd-cfg-color-swatch');
          if (swatch && li.dataset.swatch) swatch.style.background = li.dataset.swatch;
          sel.classList.remove('open');
        });
      });
    });

    // close selects on outside click
    document.addEventListener('click', function() {
      cfg.querySelectorAll('.cd-cfg-custom-select.open').forEach(function(s) { s.classList.remove('open'); });
    });

    // ── Visual pickers ──────────────────────────────────
    cfg.addEventListener('click', function(e) {
      var opt = e.target.closest('.cd-cfg-visual-option');
      if (!opt) return;
      var group = opt.dataset.group;
      if (!group) return;
      cfg.querySelectorAll('.cd-cfg-visual-option[data-group="' + group + '"]').forEach(function(o) {
        o.classList.remove('selected');
      });
      opt.classList.add('selected');
    });

    // ── Toggle ──────────────────────────────────────────
    var toggle = document.getElementById('cd-cfg-per-btn-toggle');
    if (toggle) {
      toggle.addEventListener('click', function() {
        var checked = toggle.getAttribute('aria-checked') === 'true';
        toggle.setAttribute('aria-checked', checked ? 'false' : 'true');
      });
    }

    // ── Engraving tabs ──────────────────────────────────
    cfg.querySelectorAll('.cd-cfg-eng-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        cfg.querySelectorAll('.cd-cfg-eng-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
      });
    });

    // ── Personalization layout grid ─────────────────────
    cfg.addEventListener('click', function(e) {
      var cell = e.target.closest('.cd-cfg-pers-cell');
      if (!cell) return;
      var grid = cell.closest('.cd-cfg-pers-grid');
      if (!grid) return;
      grid.querySelectorAll('.cd-cfg-pers-cell').forEach(function(c) { c.classList.remove('selected'); });
      cell.classList.add('selected');
    });

    // ── Icon grid ───────────────────────────────────────
    cfg.addEventListener('click', function(e) {
      var btn = e.target.closest('.cd-cfg-icon-cell');
      if (!btn) return;
      var grid = btn.closest('.cd-cfg-icon-grid');
      if (!grid) return;
      grid.querySelectorAll('.cd-cfg-icon-cell').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
    });

    // ── Radio pills ─────────────────────────────────────
    cfg.querySelectorAll('.cd-cfg-radio-pill input[type=radio]').forEach(function(radio) {
      radio.addEventListener('change', function() {}); // CSS handles via :checked
    });
  }

  // init on screen show
  var _origGoTo = window.goTo;
  if (typeof _origGoTo === 'function') {
    window.goTo = function(id) {
      _origGoTo(id);
      if (id === 'cd-configure') initConfigureScreen();
    };
  }
  // also init if already on configure screen
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConfigureScreen);
  } else {
    initConfigureScreen();
  }
})();

/* ═══════════════════════════════════════════════════════
   Template screen – edit mode (Draft badge → open in edit)
   ═══════════════════════════════════════════════════════ */

// Opens #cd-template in edit mode from a template card's Draft badge.
// cardEl = the .template-card element
function _openTemplateEditMode(cardEl) {
  if (!cardEl) return;
  var tmplScreen = document.getElementById('cd-template');
  if (!tmplScreen) return;

  // Mark screen as edit mode, store reference to card for badge update on save
  tmplScreen.dataset.editMode = 'true';
  tmplScreen._editSourceCard = cardEl;

  // Pull name from card
  var nameEl = cardEl.querySelector('.template-card-name');
  var tmplName = nameEl ? nameEl.textContent.trim() : 'Template';
  tmplScreen.dataset.templateName = tmplName;

  // Update header
  var tmplNameEl = document.getElementById('cd-tmpl-product-name');
  if (tmplNameEl) tmplNameEl.textContent = tmplName;

  // Swap footer to "Save Changes" only
  _setTmplFooterMode('edit');

  // Reflect current draft/valid status in the header badge
  var _hdrBadgeEl = cardEl.querySelector('.template-card-draft-badge, .template-card-valid-badge');
  _setTmplHdrStatusBadge(_hdrBadgeEl && _hdrBadgeEl.classList.contains('template-card-draft-badge') ? 'draft' : 'valid');

  goTo('cd-template');

  // Restore saved state for this template
  var _savedTmplState = window._tmplConfigs[tmplName];
  if (_savedTmplState) {
    var _tmplPanel = _getActiveTmplPanel();
    _applyCfgState(_tmplPanel, _savedTmplState);
  }
}

// Switch footer buttons between create mode and edit mode
function _setTmplFooterMode(mode) {
  var draftBtn = document.getElementById('cd-tmpl-footer-draft-btn');
  var saveBtn  = document.getElementById('cd-tmpl-footer-save-btn');
  if (!draftBtn || !saveBtn) return;

  if (mode === 'edit') {
    draftBtn.style.display = '';
    draftBtn.textContent = 'Save as Draft';
    draftBtn.onclick = function () { _onTmplSaveChangesAsDraft(); };
    saveBtn.textContent = 'Save Changes';
    saveBtn.onclick = function () { _onTmplSaveChanges(); };
  } else if (mode === 'save') {
    draftBtn.style.display = '';
    draftBtn.textContent = 'Save as Draft';
    draftBtn.onclick = function () { _onTmplSaveChangesAsDraft(); };
    saveBtn.textContent = 'Save';
    saveBtn.onclick = function () { _doTmplSave(); };
  } else {
    draftBtn.style.display = '';
    draftBtn.textContent = 'Save as Draft and Add to Area';
    saveBtn.textContent = 'Save and Add to Area';
    saveBtn.onclick = function () { _addFromTemplate('valid'); };
  }
}

// Save Changes handler — shows "Update linked products?" modal when products are linked,
// otherwise saves directly. Works for both #cd-template and #cd-tmpl-configure.
function _onTmplSaveChanges() {
  var _tmplScreen = document.getElementById('cd-template');
  var _stored = _tmplScreen ? parseInt(_tmplScreen.dataset.abLinkedCount) : NaN;
  var n = _tmplCfgLinkedCount >= 0 ? _tmplCfgLinkedCount : (!isNaN(_stored) ? _stored : _countLinkedProducts());
  if (_tmplCfgLinkedCount >= 0 && _tmplScreen) _tmplScreen.dataset.abLinkedCount = _tmplCfgLinkedCount;
  _tmplCfgLinkedCount = -1;
  if (n > 0) {
    var countEl = document.getElementById('cd-update-linked-count');
    var unitEl  = document.getElementById('cd-update-linked-unit');
    if (countEl) countEl.textContent = n;
    if (unitEl)  unitEl.textContent  = n === 1 ? 'product' : 'products';
    var overlay = document.getElementById('cd-update-linked-overlay');
    if (overlay) { overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); }
    return;
  }
  _doTmplSave();
}

function _syncLinkedProductsToTemplateStatus(templateName, status) {
  if (!templateName) return;
  var isDraft = status === 'draft';
  document.querySelectorAll('#cd-product-table .cd-product-row').forEach(function (row) {
    if (row.dataset.templateName !== templateName) return;
    var statusCol = row.querySelector('.cd-prod-status-col');
    if (statusCol) statusCol.innerHTML = _renderStatusBadge(status);
    var priceEl = row.querySelector('.cd-prod-price');
    var leadEl  = row.querySelector('.cd-prod-leadtime');
    if (priceEl) priceEl.textContent = isDraft ? '$800 - $1,200' : '$1,000';
    if (leadEl)  leadEl.textContent  = isDraft ? 'Ships in 15-25 business days' : 'Ships in 20 business days';
  });
}

var _VALID_BADGE_HTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Valid';
var _DRAFT_BADGE_HTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 2h6.5l3.5 3.5V14H5V2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M11.5 2v3.5H15" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg> Draft';

function _applyStatusBadge(el, status) {
  if (!el) return;
  var isDraft = status === 'draft';
  el.className = 'cd-tmpl-hdr-status-badge cd-tmpl-hdr-status-badge--' + (isDraft ? 'draft' : 'valid');
  el.innerHTML = isDraft ? _DRAFT_BADGE_HTML : _VALID_BADGE_HTML;
}

function _setTmplHdrStatusBadge(status) {
  _applyStatusBadge(document.getElementById('cd-tmpl-hdr-status-badge'), status);
}

function _setCfgStatusBadge(status) {
  _applyStatusBadge(document.getElementById('cd-cfg-status-badge'), status);
}

function _doTmplSave() {
  var tmplScreen = document.getElementById('cd-template');
  var cardEl = tmplScreen ? tmplScreen._editSourceCard : null;
  if (cardEl) {
    var badge = cardEl.querySelector('.template-card-draft-badge, .template-card-valid-badge');
    if (badge) {
      badge.className = 'template-card-valid-badge';
      badge.removeAttribute('data-tip');
      badge.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Valid';
    }
  }
  _syncLinkedProductsToTemplateStatus(tmplScreen ? tmplScreen.dataset.templateName : '', 'valid');
  var _savedCard = _resolveHighlightCard(tmplScreen ? tmplScreen._editSourceCard : null);
  var _savedName = _savedCard ? (_savedCard.querySelector('.template-card-name')?.textContent.trim() || '') : '';
  if (tmplScreen) { tmplScreen.dataset.editMode = ''; tmplScreen._editSourceCard = null; delete tmplScreen.dataset.abLinkedCount; }
  if (window._renderTemplateSort) window._renderTemplateSort();
  _setTmplFooterMode('create');
  _showToast('Template saved', 'Your changes have been saved.');
  var _ret = _tmplCfgReturnScreen; _tmplCfgReturnScreen = 'cd-home';
  goTo(_ret);
  if (_ret === 'cd-home') {
    var _p = document.getElementById('cd-templates-panel');
    var _b = document.querySelector('.cd-addproduct-item--template');
    if (_p) { _p.classList.add('open'); _p.setAttribute('aria-hidden', 'false'); }
    if (_b) _b.classList.add('active');
  } else if (_ret === 'ab-home') {
    var _abp = document.getElementById('ab-tmpl-panel');
    var _abb = document.getElementById('ab-tmpl-btn');
    if (_abp) { _abp.classList.add('open'); _abp.setAttribute('aria-hidden', 'false'); }
    if (_abb) _abb.classList.add('active');
  }
  _highlightTemplateCard(_savedName ? _findVisibleCard(_savedName) : _savedCard);
}

function _onTmplSaveChangesAsDraft() {
  var tmplScreen = document.getElementById('cd-template');
  var cardEl = tmplScreen ? tmplScreen._editSourceCard : null;
  if (cardEl) {
    var badge = cardEl.querySelector('.template-card-draft-badge, .template-card-valid-badge, .template-card-invalid-badge');
    if (badge) {
      badge.className = 'template-card-draft-badge';
      badge.title = 'Additional action required. Save as non-draft to order this item.';
      badge.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 2.5h5.5l3 3v7H4.5V2.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M10 2.5v3h3" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg> Draft';
    }
  }
  _syncLinkedProductsToTemplateStatus(tmplScreen ? tmplScreen.dataset.templateName : '', 'draft');
  _setTmplHdrStatusBadge('draft');
  var _savedCard2 = _resolveHighlightCard(tmplScreen ? tmplScreen._editSourceCard : null);
  var _savedName2 = _savedCard2 ? (_savedCard2.querySelector('.template-card-name')?.textContent.trim() || '') : '';
  if (tmplScreen) { tmplScreen.dataset.editMode = ''; tmplScreen._editSourceCard = null; }
  if (window._renderTemplateSort) window._renderTemplateSort();
  _setTmplFooterMode('create');
  _showToast('Template saved as draft', 'Your changes have been saved as a draft. Complete configuration to validate.');
  var _ret = _tmplCfgReturnScreen; _tmplCfgReturnScreen = 'cd-home';
  goTo(_ret);
  if (_ret === 'cd-home') {
    var _p = document.getElementById('cd-templates-panel');
    var _b = document.querySelector('.cd-addproduct-item--template');
    if (_p) { _p.classList.add('open'); _p.setAttribute('aria-hidden', 'false'); }
    if (_b) _b.classList.add('active');
  } else if (_ret === 'ab-home') {
    var _abp = document.getElementById('ab-tmpl-panel');
    var _abb = document.getElementById('ab-tmpl-btn');
    if (_abp) { _abp.classList.add('open'); _abp.setAttribute('aria-hidden', 'false'); }
    if (_abb) _abb.classList.add('active');
  }
  _highlightTemplateCard(_savedName2 ? _findVisibleCard(_savedName2) : _savedCard2);
}

// Reset footer to create mode whenever #cd-template opens fresh (non-edit)
// Patch into _addFromTemplate's preamble by resetting on goTo
(function () {
  var origGoTo = window.goTo;
  if (typeof origGoTo === 'function') {
    window.goTo = function (id) {
      if (id === 'cd-template') {
        var tmplScreen = document.getElementById('cd-template');
        if (tmplScreen && tmplScreen.dataset.editMode !== 'true') {
          _setTmplFooterMode('create');
        }
      }
      origGoTo(id);
      if (id === 'cd-configure') {
        _syncConfigureFooter();
      }
    };
  }
}());

function _syncConfigureFooter() {
  var cfg = document.getElementById('cd-configure');
  var isEdit = cfg && cfg.dataset.sourceRowId;
  _setCfgFooterMode(isEdit ? 'save' : 'add');
  var badge = document.getElementById('cd-cfg-status-badge');
  if (badge) badge.style.display = isEdit ? '' : 'none';
  if (isEdit) {
    var row = document.querySelector('#cd-product-table .cd-product-row[data-row-id="' + cfg.dataset.sourceRowId + '"]');
    _setCfgStatusBadge(row ? (row.querySelector('.cd-status-badge')?.dataset.status || 'valid') : 'valid');
  }
}

// Wire Draft badge clicks on dynamically-created template cards
// (cards are created in the DOM via innerHTML so we delegate from the panel)
document.addEventListener('click', function (e) {
  var badge = e.target.closest('.template-card-draft-badge');
  if (!badge) return;
  var card = badge.closest('.template-card');
  if (!card) return;
  e.stopPropagation();
  _openTemplateEditMode(card);
});

// Toggle configure right panels by product type.
// keyId/fixId/shadeId are element IDs; type is 'fixture'|'shade'|'' (key).
// Add new product types by extending this function.
function _applyPanelToggle(keyId, fixId, shadeId, type) {
  var ids = { '': keyId, fixture: fixId, shade: shadeId };
  var active = ids[type] !== undefined ? ids[type] : keyId;
  [keyId, fixId, shadeId].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = (id === active) ? '' : 'none';
  });
}

// Open configure screen from a product card with the given name and image
function _setCfgFooterMode(mode) {
  // mode: 'add' (new product from picker) | 'save' (editing existing row)
  var draft = document.getElementById('cd-cfg-btn-draft');
  var add   = document.getElementById('cd-cfg-btn-add');
  // Hide the legacy detach-mode save buttons — we handle both modes with draft/add
  var saveDraft = document.getElementById('cd-cfg-btn-save-draft');
  var save      = document.getElementById('cd-cfg-btn-save');
  if (saveDraft) saveDraft.style.display = 'none';
  if (save)      save.style.display      = 'none';
  var isSave = mode === 'save';
  if (draft) { draft.style.display = ''; draft.textContent = isSave ? 'Save as Draft' : 'Add as Draft'; }
  if (add)   { add.style.display   = ''; add.textContent   = isSave ? 'Save'          : 'Add'; }
}

// ── Configure & Template state persistence ─────────────────────────────────
window._rowConfigs  = {};
window._tmplConfigs = {};

function _getActiveCfgPanel() {
  var ids = ['cd-cfg-right-scroll', 'cd-cfg-right-fixture', 'cd-cfg-right-shade'];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el && el.style.display !== 'none') return el;
  }
  return document.getElementById('cd-cfg-right-scroll');
}

function _getActiveTmplPanel() {
  var ids = ['cd-tmpl-right-scroll', 'cd-tmpl-right-fixture', 'cd-tmpl-right-shade'];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el && el.style.display !== 'none') return el;
  }
  return document.getElementById('cd-tmpl-right-scroll');
}

function _collectCfgState(panelEl) {
  if (!panelEl) return {};
  var state = { selects: {}, visualGroups: {}, inputs: {}, checkboxes: {} };
  panelEl.querySelectorAll('.cd-cfg-custom-select[data-name]').forEach(function (sel) {
    var name = sel.dataset.name;
    var selected = sel.querySelector('li.selected');
    if (selected) state.selects[name] = selected.dataset.value || selected.textContent.trim();
  });
  panelEl.querySelectorAll('.cd-cfg-visual-option.selected[data-group]').forEach(function (opt) {
    state.visualGroups[opt.dataset.group] = opt.dataset.value;
  });
  panelEl.querySelectorAll('input[type="number"]').forEach(function (inp) {
    var key = inp.id || inp.name;
    if (key) state.inputs[key] = inp.value;
  });
  panelEl.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
    var key = cb.id || cb.name;
    if (key) state.checkboxes[key] = cb.checked;
  });
  return state;
}

// Transfer state from one panel to another by position (handles -2 suffix naming)
function _transferPanelState(srcPanel, dstPanel) {
  if (!srcPanel || !dstPanel) return;
  // Custom selects: match by index
  var srcSels = Array.from(srcPanel.querySelectorAll('.cd-cfg-custom-select[data-name]'));
  var dstSels = Array.from(dstPanel.querySelectorAll('.cd-cfg-custom-select[data-name]'));
  srcSels.forEach(function (src, i) {
    var dst = dstSels[i];
    if (!dst) return;
    var srcSelected = src.querySelector('li.selected');
    if (!srcSelected) return;
    var srcVal = srcSelected.dataset.value || srcSelected.textContent.trim();
    var dstItems = dst.querySelectorAll('li');
    var match = null;
    dstItems.forEach(function (li) {
      li.classList.remove('selected');
      if ((li.dataset.value && li.dataset.value === srcVal) || li.textContent.trim() === srcVal) match = li;
    });
    if (match) {
      match.classList.add('selected');
      var trigger = dst.querySelector('.cd-cfg-select-value');
      if (trigger) trigger.textContent = match.textContent.trim();
    }
  });
  // Visual groups: match by index
  var srcGroups = {};
  srcPanel.querySelectorAll('.cd-cfg-visual-option.selected[data-group]').forEach(function (opt) {
    srcGroups[opt.dataset.group] = opt.dataset.value;
  });
  var srcGroupNames = Object.keys(srcGroups);
  var dstGroupNames = [];
  dstPanel.querySelectorAll('.cd-cfg-visual-option[data-group]').forEach(function (opt) {
    if (dstGroupNames.indexOf(opt.dataset.group) === -1) dstGroupNames.push(opt.dataset.group);
  });
  srcGroupNames.forEach(function (srcGroup, i) {
    var dstGroup = dstGroupNames[i];
    if (!dstGroup) return;
    var val = srcGroups[srcGroup];
    dstPanel.querySelectorAll('.cd-cfg-visual-option[data-group="' + dstGroup + '"]').forEach(function (opt) {
      opt.classList.toggle('selected', opt.dataset.value === val);
    });
  });
  // Number inputs: match by index
  var srcInputs = Array.from(srcPanel.querySelectorAll('input[type="number"]'));
  var dstInputs = Array.from(dstPanel.querySelectorAll('input[type="number"]'));
  srcInputs.forEach(function (src, i) {
    var dst = dstInputs[i];
    if (dst) dst.value = src.value;
  });
  // Checkboxes: match by index
  var srcCbs = Array.from(srcPanel.querySelectorAll('input[type="checkbox"]'));
  var dstCbs = Array.from(dstPanel.querySelectorAll('input[type="checkbox"]'));
  srcCbs.forEach(function (src, i) {
    var dst = dstCbs[i];
    if (dst) dst.checked = src.checked;
  });
}

function _applyCfgState(panelEl, state) {
  if (!panelEl || !state) return;
  if (state.selects) {
    Object.keys(state.selects).forEach(function (name) {
      var val = state.selects[name];
      var sel = panelEl.querySelector('.cd-cfg-custom-select[data-name="' + name + '"]');
      if (!sel) return;
      var items = sel.querySelectorAll('li');
      var match = null;
      items.forEach(function (li) {
        li.classList.remove('selected');
        if ((li.dataset.value && li.dataset.value === val) || li.textContent.trim() === val) match = li;
      });
      if (match) {
        match.classList.add('selected');
        var trigger = sel.querySelector('.cd-cfg-select-value');
        if (trigger) trigger.textContent = match.textContent.trim();
      }
    });
  }
  if (state.visualGroups) {
    Object.keys(state.visualGroups).forEach(function (group) {
      var val = state.visualGroups[group];
      panelEl.querySelectorAll('.cd-cfg-visual-option[data-group="' + group + '"]').forEach(function (opt) {
        opt.classList.toggle('selected', opt.dataset.value === val);
      });
    });
  }
  if (state.inputs) {
    Object.keys(state.inputs).forEach(function (key) {
      var inp = panelEl.querySelector('#' + key);
      if (inp) inp.value = state.inputs[key];
    });
  }
  if (state.checkboxes) {
    Object.keys(state.checkboxes).forEach(function (key) {
      var cb = panelEl.querySelector('#' + key);
      if (cb) cb.checked = state.checkboxes[key];
    });
  }
}

window._saveDetachedConfigure = function (status) {
  var cfgEl = document.getElementById('cd-configure');
  var rowId = cfgEl ? cfgEl.dataset.sourceRowId : '';
  if (rowId) {
    var activePanel = _getActiveCfgPanel();
    if (activePanel) window._rowConfigs[rowId] = _collectCfgState(activePanel);
    var row = document.querySelector('.cd-product-row[data-row-id="' + rowId + '"]');
    if (row) {
      if (status === 'draft') {
        var badge = row.querySelector('.cd-prod-status-badge');
        if (badge) { badge.className = 'cd-prod-status-badge cd-prod-status-badge--draft'; badge.textContent = 'Draft'; }
      }
      row.style.transition = 'background 0.3s';
      row.style.background = 'rgba(0,137,123,0.08)';
      setTimeout(function () { row.style.background = ''; }, 1200);
    }
  }
  _saveSnapshot();
  _setCfgFooterMode('add');
  var label = status === 'draft' ? 'Saved as draft' : 'Changes saved';
  _showToast(label, 'Product configuration updated.');
  goTo('cd-home');
};

window._openConfigure = function (productName, imgSrc, type) {
  var nameEl = document.getElementById('cd-cfg-product-name');
  var imgEl  = document.getElementById('cd-cfg-product-img');
  if (nameEl) { nameEl.textContent = productName; nameEl.classList.remove('cd-cfg-product-name--saved'); }
  if (imgEl && imgSrc) { imgEl.src = imgSrc; imgEl.alt = productName; }
  // Set summary desc from selected component option (keypad default: Keypad and Closure Interface)
  var descEl = document.getElementById('cd-cfg-desc');
  if (descEl && type !== 'shade' && type !== 'fixture') {
    var selOpt = document.querySelector('#cd-cfg-right-scroll .cd-cfg-visual-option.selected .cd-cfg-visual-label');
    descEl.textContent = 'HomeWorks(QSX), ' + (selOpt ? selOpt.textContent.trim() : 'Keypad and Closure Interface');
  }
  // Show Palladiom-only fields only when productName contains 'Palladiom'
  var isPalladiom = productName.toLowerCase().indexOf('palladiom') !== -1;
  document.querySelectorAll('#cd-cfg-right-scroll .cd-cfg-palladiom-only').forEach(function(el) {
    el.style.display = isPalladiom ? '' : 'none';
  });
  var cfgEl = document.getElementById('cd-configure');
  cfgEl.dataset.sourceRowId = '';
  cfgEl.dataset.productType = type || '';
  _setCfgFooterMode('add');

  // Show correct right panel (scalable: add new types here)
  var panels = {
    key:     document.getElementById('cd-cfg-right-scroll'),
    fixture: document.getElementById('cd-cfg-right-fixture'),
    shade:   document.getElementById('cd-cfg-right-shade'),
  };
  var activeType = type || 'key';
  Object.keys(panels).forEach(function (k) {
    if (panels[k]) panels[k].style.display = (k === activeType || (activeType !== 'fixture' && activeType !== 'shade' && k === 'key')) ? '' : 'none';
  });
  // Hide product image for shade (no product image in configure screen)
  var imgWrapEl = document.querySelector('#cd-configure .cd-cfg-img-wrap');
  if (imgWrapEl) imgWrapEl.style.display = (type === 'shade') ? 'none' : '';

  // Update breadcrumb
  var bcEl = document.getElementById('cd-cfg-breadcrumb');
  if (bcEl) bcEl.textContent = productName + ' | First Floor > Bedroom > Closet';

  var _cfgEl = document.getElementById('cd-configure'); if (_cfgEl) _cfgEl.dataset.sourceRowId = '';
  _setCfgFooterMode('add');
  goTo('cd-configure');
};

/* ═══════════════════════════════════════════════════════
   Fixture configure panel interactivity
   ═══════════════════════════════════════════════════════ */
(function () {
  function initFixturePanel() {
    var fix = document.getElementById('cd-cfg-right-fixture');
    if (!fix) return;

    // Custom selects scoped to fixture panel
    fix.querySelectorAll('.cd-cfg-custom-select').forEach(function (sel) {
      var trigger  = sel.querySelector('.cd-cfg-select-trigger');
      var dropdown = sel.querySelector('.cd-cfg-select-dropdown');
      if (!trigger || !dropdown) return;

      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = sel.classList.contains('open');
        // close all open selects in the whole configure screen
        document.querySelectorAll('#cd-configure .cd-cfg-custom-select.open').forEach(function (s) { s.classList.remove('open'); });
        if (!isOpen) sel.classList.add('open');
      });

      dropdown.querySelectorAll('li').forEach(function (li) {
        li.addEventListener('click', function () {
          dropdown.querySelectorAll('li').forEach(function (l) { l.classList.remove('selected'); });
          li.classList.add('selected');
          var valueEl = trigger.querySelector('.cd-cfg-select-value');
          if (valueEl) valueEl.textContent = li.textContent.trim();
          var swatch = trigger.querySelector('.cd-cfg-color-swatch');
          if (swatch && li.dataset.swatch) swatch.style.background = li.dataset.swatch;
          sel.classList.remove('open');
        });
      });
    });

    // Visual pickers (delegated — handled by existing cfg handler, but also here for completeness)
    // The existing cfg.addEventListener('click') on #cd-configure already handles data-group clicks globally.
  }

  // Init once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFixturePanel);
  } else {
    initFixturePanel();
  }
}());

/* ═══════════════════════════════════════════════════════
   Template panel — sort & category grouping
   ═══════════════════════════════════════════════════════ */
(function () {
  var CATEGORIES = [
    { key: 'fixture', label: 'Lighting' },
    { key: 'shade',   label: 'Window Treatment' },
    { key: '',        label: 'Controls' },
  ];
  var _currentSort = 'name-asc'; // default: A → Z within each category
  var _collapseState = {}; // key → true if collapsed
  var _sortCounter = 0;

  // Assign product type to a newly created card (call after _addTemplateCard)
  window._stampTemplateCard = function (card, productType) {
    card.dataset.productType = productType || '';
    card.dataset.sortOrder   = ++_sortCounter;
  };

  function _allCards() {
    return Array.from(document.querySelectorAll('#cd-templates-recent-list .template-card'));
  }

  function _categoryFor(card) {
    var t = card.dataset.productType || '';
    if (t === 'fixture') return 'fixture';
    if (t === 'shade')   return 'shade';
    return '';
  }

  function _sortedCards(cards, sort) {
    var copy = cards.slice();
    if (sort === 'name-desc') {
      copy.sort(function (a, b) {
        var na = (a.querySelector('.template-card-name')?.textContent || '').trim().toLowerCase();
        var nb = (b.querySelector('.template-card-name')?.textContent || '').trim().toLowerCase();
        return na > nb ? -1 : na < nb ? 1 : 0;
      });
    } else if (sort === 'modified') {
      copy.sort(function (a, b) {
        return parseInt(b.dataset.sortOrder || 0) - parseInt(a.dataset.sortOrder || 0);
      });
    } else {
      // name-asc (default): A → Z
      copy.sort(function (a, b) {
        var na = (a.querySelector('.template-card-name')?.textContent || '').trim().toLowerCase();
        var nb = (b.querySelector('.template-card-name')?.textContent || '').trim().toLowerCase();
        return na < nb ? -1 : na > nb ? 1 : 0;
      });
    }
    return copy;
  }

  window._renderTemplateSort = function () {
    var body     = document.getElementById('cd-tmpl-sorted-body');
    var emptyEl  = document.getElementById('cd-templates-empty-state');
    if (!body) return;

    var cards = _allCards();
    if (cards.length === 0) {
      body.innerHTML = '';
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    body.innerHTML = '';
    var sorted = _sortedCards(cards, _currentSort);

    CATEGORIES.forEach(function (cat) {
      var group = sorted.filter(function (c) { return _categoryFor(c) === cat.key; });
      if (group.length === 0) return;

      var isCollapsed = !!_collapseState[cat.key];
      var section = document.createElement('div');
      section.className = 'cd-tmpl-category' + (isCollapsed ? ' collapsed' : '');
      section.dataset.catKey = cat.key;

      section.innerHTML =
        '<div class="cd-tmpl-category-header">' +
          '<span class="cd-tmpl-category-title">' + cat.label + '</span>' +
          '<svg class="cd-tmpl-category-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">' +
            '<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</div>' +
        '<div class="cd-tmpl-category-body"></div>';

      var catBody = section.querySelector('.cd-tmpl-category-body');
      group.forEach(function (c) { catBody.appendChild(c.cloneNode(true)); });

      section.querySelector('.cd-tmpl-category-header').addEventListener('click', function () {
        var collapsed = section.classList.toggle('collapsed');
        _collapseState[cat.key] = collapsed;
      });

      body.appendChild(section);
    });
  };

  // Wire sort dropdown
  document.addEventListener('DOMContentLoaded', function () {
    var btn      = document.getElementById('cd-tmpl-sort-btn');
    var dropdown = document.getElementById('cd-tmpl-sort-dropdown');
    var label    = document.getElementById('cd-tmpl-sort-label');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    dropdown.querySelectorAll('.cd-tmpl-sort-option').forEach(function (opt) {
      opt.addEventListener('click', function () {
        _currentSort = opt.dataset.sort;
        if (label) label.textContent = opt.textContent.trim();
        dropdown.querySelectorAll('.cd-tmpl-sort-option').forEach(function (o) { o.classList.remove('selected'); });
        opt.classList.add('selected');
        dropdown.classList.remove('open');
        window._renderTemplateSort();
      });
    });

    document.addEventListener('click', function () { dropdown.classList.remove('open'); });
  });
}());

// ── Onboarding ─────────────────────────────────────────────────────────────

function _resetAreaTreeToDefault() {
  var areaList = document.querySelector('#cd-home .cd-area-list');
  if (!areaList) return;
  areaList.querySelectorAll('.cd-area-row').forEach(function (r) { r.remove(); });
  _areaIdCounter = 1;
  var row = _makeAreaRow(_areaIdCounter++, 0, 'Area 001');
  areaList.insertBefore(row, areaList.querySelector('.cd-area-drop-indicator'));
  _selectArea(row);
}

function _startOnboarding() {
  // Navigate to cd-home first, then show announcement modal
  goTo('cd-home');

  // Start with a clean area tree — just "Area 001" (no pre-populated property)
  _resetAreaTreeToDefault();

  // Ensure at least one demo template card exists for tour steps 2-5
  _ensureDemoTemplateCard();

  // Start with templates panel CLOSED so Step 1 spotlights the tab button
  var panel = document.getElementById('cd-templates-panel');
  var btn   = document.querySelector('.cd-addproduct-item--template');
  if (panel) { panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); }
  if (btn)   btn.classList.remove('active');

  setTimeout(function() {
    var backdrop = document.getElementById('cd-onb-backdrop');
    if (backdrop) backdrop.style.display = 'flex';
  }, 200);
}

function _ensureDemoTemplateCard() {
  // Remove any existing demo card (re-inject fresh each time tour starts)
  var oldDemo = document.querySelector('.cd-tour-demo-card');
  if (oldDemo) oldDemo.closest('.cd-tour-demo-section') ? oldDemo.closest('.cd-tour-demo-section').remove() : oldDemo.remove();

  var emptyState = document.getElementById('cd-templates-empty-state');
  var sortedBody = document.getElementById('cd-tmpl-sorted-body');
  if (emptyState) emptyState.style.display = 'none';

  var card = document.createElement('div');
  card.className = 'template-card cd-tour-demo-card';
  card.setAttribute('data-product-type', '');
  card.setAttribute('data-sort-order', '1');
  card.innerHTML = [
    '<div class="template-card-img-wrap">',
      '<div style="width:100%;height:100%;background:#e8e8e8;border-radius:4px;"></div>',
      '<div class="template-card-bookmark-badge">',
        '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 1h7a.5.5 0 0 1 .5.5v8L5 7.5 1 9.5V1.5A.5.5 0 0 1 1.5 1z" fill="#006dcc"/></svg>',
      '</div>',
    '</div>',
    '<div class="template-card-info">',
      '<div class="template-card-row1">',
        '<span class="template-card-name">',
          '<span style="display:inline-block;width:120px;height:13px;background:#e0e0e0;border-radius:4px;"></span>',
        '</span>',
        '<div class="template-card-row1-right">',
          '<span class="template-card-valid-badge" title="This item is valid and ready to order." style="background:#f0f0f0;border-color:#e0e0e0;">',
            '<span style="display:inline-block;width:40px;height:10px;background:#e0e0e0;border-radius:3px;"></span>',
          '</span>',
          '<button class="template-card-more-btn" aria-label="More options">',
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="3.5" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="12.5" r="1.2" fill="currentColor"/></svg>',
          '</button>',
        '</div>',
      '</div>',
      '<div class="template-card-desc">',
        '<span style="display:inline-block;width:160px;height:11px;background:#e8e8e8;border-radius:3px;"></span>',
      '</div>',
      '<div class="template-card-bottom">',
        '<div class="template-card-linked">',
          '<span style="display:inline-block;width:130px;height:11px;background:#e8e8e8;border-radius:3px;"></span>',
        '</div>',
        '<div class="template-card-hover-row">',
          '<div class="template-card-qty">',
            '<span class="template-card-qty-num">1</span>',
            '<div class="template-card-qty-divider"></div>',
            '<div class="template-card-qty-actions">',
              '<button class="template-card-qty-btn" data-qty-dec aria-label="Decrease">',
                '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
              '</button>',
              '<button class="template-card-qty-btn" data-qty-inc aria-label="Increase">',
                '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
              '</button>',
            '</div>',
          '</div>',
          '<button class="template-card-add-btn">Add</button>',
        '</div>',
      '</div>',
    '</div>'
  ].join('');

  // Inject directly into sortedBody inside a category wrapper so it's always visible
  if (sortedBody) {
    var section = document.createElement('div');
    section.className = 'cd-tmpl-category cd-tour-demo-section';
    section.dataset.catKey = '';
    section.innerHTML = '<div class="cd-tmpl-category-header" style="pointer-events:none;">' +
      '<span class="cd-tmpl-category-title">Controls</span>' +
      '<svg class="cd-tmpl-category-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">' +
        '<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg></div>' +
      '<div class="cd-tmpl-category-body"></div>';
    section.querySelector('.cd-tmpl-category-body').appendChild(card);
    sortedBody.insertBefore(section, sortedBody.firstChild);
  }
}

var _tourStep = 0;
var _tourSteps = [
  {
    targetSelector: '.cd-addproduct-item--template',
    title: 'Your Template Library',
    body: 'This is where your reusable product templates are stored. Browse and manage templates, or add them to your design whenever you need them.',
    position: 'left',
    onEnter: null
  },
  {
    targetSelector: '#cd-cfg-save-template-btn',
    title: 'Save a Product as a Template',
    body: 'Once you\'ve configured a product, select Save as Template to reuse the same configuration in other areas instead of starting over.',
    position: 'left',
    onEnter: '_goToConfigure'
  },
  {
    targetSelector: '.cd-tour-ghost-product-row .cd-prod-actions-col button[data-tip="More options"]',
    title: 'Save from an Added Product',
    body: 'You can also save any product already in your area as a template using its options menu.',
    position: 'left',
    onEnter: '_showGhostProductRow'
  },
  {
    targetSelector: '.cd-tour-demo-card',
    title: 'Reuse & Manage Templates',
    body: 'Each card represents a reusable product template. Select Add to use it in your design, or open the More (•••) menu to duplicate, detach linked products, or delete the template.',
    position: 'left',
    onEnter: '_backToHomeAndOpenPanel'
  },
  {
    targetSelector: '.cd-tour-ghost-product-row',
    title: 'Linked Products Stay in Sync',
    body: 'Products added from a template remain linked. Update the template once, and every linked product updates automatically.',
    position: 'left',
    onEnter: '_addGhostLinkedProduct'
  }
];

function _launchTour() {
  var backdrop = document.getElementById('cd-onb-backdrop');
  if (backdrop) backdrop.style.display = 'none';
  _tourStep = 0;
  _showTourStep(_tourStep);
}

function _positionTourStep(index, _retries) {
  var steps = _tourSteps;
  var step = steps[index];

  var spotlight = document.getElementById('cd-tour-spotlight');
  var tooltip   = document.getElementById('cd-tour-tooltip');
  if (!spotlight || !tooltip) return;

  var target = document.querySelector(step.targetSelector);

  spotlight.style.display = 'block';
  tooltip.style.display = 'block';
  tooltip.style.transform = '';

  if (!target) {
    spotlight.style.display = 'none';
    tooltip.style.left = '50%';
    tooltip.style.top  = '50%';
    tooltip.style.transform = 'translate(-50%,-50%)';
    return;
  }

  var rect = target.getBoundingClientRect();
  var vw = window.innerWidth, vh = window.innerHeight;

  // If target is off-screen (panel still animating), retry up to 5 times
  var offScreen = rect.width === 0 || rect.height === 0 || rect.left >= vw || rect.right <= 0;
  if (offScreen && (_retries || 0) < 5) {
    setTimeout(function() { _positionTourStep(index, (_retries || 0) + 1); }, 80);
    return;
  }

  var pad = 6;
  var topOffset = (index === 0) ? -40 : 0;
  spotlight.style.top    = (rect.top  - pad + topOffset) + 'px';
  spotlight.style.left   = (rect.left - pad) + 'px';
  spotlight.style.width  = (rect.width  + pad*2) + 'px';
  spotlight.style.height = (rect.height + pad*2 + (index === 0 ? 40 : 0)) + 'px';

  var ttW = 320, ttH = 230;
  var margin = 16;
  var tLeft, tTop;

  // Try each direction: left → right → above → below
  if (rect.left - ttW - 16 >= margin) {
    // Fits to the left
    tLeft = rect.left - ttW - 16;
    tTop  = rect.top + rect.height / 2 - ttH / 2;
  } else if (rect.right + ttW + 16 <= vw - margin) {
    // Fits to the right
    tLeft = rect.right + 16;
    tTop  = rect.top + rect.height / 2 - ttH / 2;
  } else if (rect.top - ttH - 16 >= margin) {
    // Fits above
    tLeft = rect.left + rect.width / 2 - ttW / 2;
    tTop  = rect.top - ttH - 16;
  } else {
    // Fallback: below
    tLeft = rect.left + rect.width / 2 - ttW / 2;
    tTop  = rect.bottom + 16;
  }

  tLeft = Math.max(margin, Math.min(tLeft, vw - ttW - margin));
  tTop  = Math.max(margin, Math.min(tTop,  vh - ttH - margin));

  tooltip.style.left = tLeft + 'px';
  tooltip.style.top  = tTop  + 'px';
}

function _showTourStep(index) {
  var steps = _tourSteps;
  if (index < 0 || index >= steps.length) { _endTour(); return; }
  var step = steps[index];

  var spotlight = document.getElementById('cd-tour-spotlight');
  var tooltip   = document.getElementById('cd-tour-tooltip');
  if (!spotlight || !tooltip) return;

  // Update tooltip content
  document.getElementById('cd-tour-title').textContent    = step.title;
  document.getElementById('cd-tour-body').textContent     = step.body;
  document.getElementById('cd-tour-progress').textContent = (index+1) + ' of ' + steps.length;

  var prevBtn = document.getElementById('cd-tour-prev');
  var nextBtn = document.getElementById('cd-tour-next');
  if (prevBtn) prevBtn.style.visibility = index === 0 ? 'hidden' : '';
  if (nextBtn) nextBtn.textContent = index === steps.length - 1 ? 'Got it' : 'Next →';

  // Clean up ghost menu from step 3 whenever we change steps
  var _oldGhostMenu = document.getElementById('cd-tour-ghost-menu');
  if (_oldGhostMenu) _oldGhostMenu.remove();

  // Handle onEnter action
  if (step.onEnter === '_openTemplatesPanel') {
    var panel = document.getElementById('cd-templates-panel');
    var btn   = document.querySelector('.cd-addproduct-item--template');
    if (panel) { panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); }
    if (btn)   btn.classList.add('active');
    // Wait for CSS transform transition (200ms) to complete before positioning
    setTimeout(function() { _positionTourStep(index); }, 280);
    return;
  }
  if (step.onEnter === '_goToConfigure') {
    // Clean up ghost product row, then navigate to configure screen
    var ghostRow = document.querySelector('.cd-tour-ghost-product-row');
    if (ghostRow) {
      ghostRow.remove();
      var emptyState2 = document.getElementById('cd-empty-state');
      if (emptyState2) emptyState2.style.display = '';
    }
    goTo('cd-configure');
    setTimeout(function() { _positionTourStep(index); }, 150);
    return;
  }
  if (step.onEnter === '_showGhostProductRow') {
    goTo('cd-home');
    var panel3 = document.getElementById('cd-templates-panel');
    var btn3   = document.querySelector('.cd-addproduct-item--template');
    if (panel3) { panel3.classList.remove('open'); panel3.setAttribute('aria-hidden','true'); }
    if (btn3)   btn3.classList.remove('active');
    // Remove any existing ghost row then inject a fresh one with actions col
    var oldGhost = document.querySelector('.cd-tour-ghost-product-row');
    if (oldGhost) oldGhost.remove();
    var tbl = document.getElementById('cd-product-table');
    if (tbl) {
      tbl.style.display = 'block';
      var empSt = document.getElementById('cd-empty-state');
      if (empSt) empSt.style.display = 'none';
      var ghostR = document.createElement('div');
      ghostR.className = 'cd-product-row cd-tour-ghost-product-row';
      ghostR.dataset.areaId = _getSelectedAreaId();
      ghostR.style.cssText = 'pointer-events:none;';
      ghostR.innerHTML =
        '<div class="cd-prod-check"><input type="checkbox" disabled style="opacity:0.3;"></div>' +
        '<div class="cd-prod-name-col">' +
          '<div style="position:relative;width:56px;height:56px;flex-shrink:0;">' +
            '<div class="cd-prod-thumb" style="background:#e8e8e8;border-radius:4px;width:56px;height:56px;"></div>' +
          '</div>' +
          '<div class="cd-prod-info">' +
            '<div class="cd-prod-title"><span style="display:inline-block;width:140px;height:13px;background:#e0e0e0;border-radius:4px;"></span></div>' +
            '<div class="cd-prod-meta" style="margin-top:6px;"><span style="display:inline-block;width:100px;height:11px;background:#e8e8e8;border-radius:3px;"></span></div>' +
          '</div>' +
        '</div>' +
        '<div class="cd-prod-price-col"><span style="display:inline-block;width:48px;height:13px;background:#e8e8e8;border-radius:4px;"></span></div>' +
        '<div class="cd-prod-qty-col"><span style="display:inline-block;width:32px;height:13px;background:#e8e8e8;border-radius:4px;"></span></div>' +
        '<div class="cd-prod-status-col"><span style="display:inline-block;width:64px;height:22px;background:#e8e8e8;border-radius:10px;"></span></div>' +
        '<div class="cd-prod-actions-col" style="pointer-events:auto;opacity:1;">' +
          '<button class="cd-icon-btn cd-icon-btn-sm" data-tip="Duplicate" style="opacity:0.35;" disabled>' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M3 11V3a1 1 0 0 1 1-1h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</button>' +
          '<button class="cd-icon-btn cd-icon-btn-sm cd-icon-btn--danger" data-tip="Delete" style="opacity:0.35;" disabled>' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 5h10M6 5V3h4v2M6 8v4M10 8v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="5" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>' +
          '</button>' +
          '<button class="cd-icon-btn cd-icon-btn-sm" data-tip="More options" style="background:rgba(0,0,0,0.08);border-radius:6px;">' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="4" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="12" r="1.2" fill="currentColor"/></svg>' +
          '</button>' +
        '</div>';
      tbl.appendChild(ghostR);
    }
    setTimeout(function() {
      var moreBtn = document.querySelector('.cd-tour-ghost-product-row .cd-prod-actions-col button[data-tip="More options"]');
      if (moreBtn) {
        var btnRect = moreBtn.getBoundingClientRect();
        // Build and place the ghost menu
        var ghostMenu = document.createElement('div');
        ghostMenu.id = 'cd-tour-ghost-menu';
        ghostMenu.style.cssText = 'position:fixed;z-index:9100;background:#fff;border-radius:12px;box-shadow:0 1.2px 3.6px rgba(0,0,0,0.11),0 6.4px 14.4px rgba(0,0,0,0.13),inset 0 0 0 0.4px rgba(0,0,0,0.2);min-width:180px;overflow:hidden;pointer-events:none;';
        ghostMenu.style.left = Math.max(8, btnRect.right - 180) + 'px';
        ghostMenu.style.top  = (btnRect.bottom + 4) + 'px';
        var item = document.createElement('div');
        item.textContent = 'Save as Template';
        item.style.cssText = 'font-size:14px;color:#262626;padding:12px 16px;background:rgba(0,0,0,0.05);white-space:nowrap;';
        ghostMenu.appendChild(item);
        document.body.appendChild(ghostMenu);
        // Compute union rect of button + menu and set spotlight to that
        var menuRect = ghostMenu.getBoundingClientRect();
        var unionTop    = Math.min(btnRect.top,    menuRect.top);
        var unionLeft   = Math.min(btnRect.left,   menuRect.left);
        var unionRight  = Math.max(btnRect.right,  menuRect.right);
        var unionBottom = Math.max(btnRect.bottom, menuRect.bottom);
        var pad = 8;
        var spotlight = document.getElementById('cd-tour-spotlight');
        if (spotlight) {
          spotlight.style.display = 'block';
          spotlight.style.top    = (unionTop    - pad) + 'px';
          spotlight.style.left   = (unionLeft   - pad) + 'px';
          spotlight.style.width  = (unionRight  - unionLeft + pad * 2) + 'px';
          spotlight.style.height = (unionBottom - unionTop  + pad * 2) + 'px';
        }
        // Position tooltip to the left of the union
        var tooltip = document.getElementById('cd-tour-tooltip');
        if (tooltip) {
          var ttW = 320, ttH = 230, margin = 16;
          var tLeft = unionLeft - ttW - 16;
          var tTop  = unionTop + (unionBottom - unionTop) / 2 - ttH / 2;
          if (tLeft < margin) { tLeft = unionRight + 16; }
          tTop = Math.max(margin, Math.min(tTop, window.innerHeight - ttH - margin));
          tooltip.style.left = tLeft + 'px';
          tooltip.style.top  = tTop  + 'px';
          tooltip.style.transform = '';
        }
      } else {
        _positionTourStep(index);
      }
    }, 320);
    return;
  }
  if (step.onEnter === '_backToHomeAndOpenPanel') {
    goTo('cd-home');
    var panel2 = document.getElementById('cd-templates-panel');
    var btn2   = document.querySelector('.cd-addproduct-item--template');
    if (panel2) { panel2.classList.add('open'); panel2.setAttribute('aria-hidden','false'); }
    if (btn2)   btn2.classList.add('active');
    setTimeout(function() { _positionTourStep(index); }, 320);
    return;
  }
  if (step.onEnter === '_addGhostLinkedProduct') {
    // Close the templates panel so the product table is visible
    var panel = document.getElementById('cd-templates-panel');
    var btn   = document.querySelector('.cd-addproduct-item--template');
    if (panel) { panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); }
    if (btn)   btn.classList.remove('active');
    _injectGhostLinkedProduct();
    // Wait for panel close transition before positioning
    setTimeout(function() { _positionTourStep(index); }, 280);
    return;
  }
  _positionTourStep(index);
}

function _tourNext() {
  if (_tourStep === _tourSteps.length - 1) { _endTour(); return; }
  _tourStep++;
  _showTourStep(_tourStep);
}

function _tourPrev() {
  if (_tourStep > 0) { _tourStep--; _showTourStep(_tourStep); }
}

function _injectGhostLinkedProduct() {
  var old = document.querySelector('.cd-tour-ghost-product-row');
  if (old) old.remove();

  var table = document.getElementById('cd-product-table');
  if (!table) return;

  // Ensure table is visible and empty state hidden so the row renders
  if (table) table.style.display = 'block';
  var emptyState = document.getElementById('cd-empty-state');
  if (emptyState) emptyState.style.display = 'none';

  // Standard (non-template) ghost row for comparison
  var stdRow = document.createElement('div');
  stdRow.className = 'cd-product-row cd-tour-ghost-standard-row';
  stdRow.dataset.areaId = _getSelectedAreaId();
  stdRow.style.cssText = 'pointer-events:none;';
  stdRow.innerHTML =
    '<div class="cd-prod-check"><input type="checkbox" disabled style="opacity:0.3;"></div>' +
    '<div class="cd-prod-name-col">' +
      '<div style="position:relative;width:56px;height:56px;flex-shrink:0;">' +
        '<div class="cd-prod-thumb" style="background:#e8e8e8;border-radius:4px;width:56px;height:56px;"></div>' +
      '</div>' +
      '<div class="cd-prod-info">' +
        '<div class="cd-prod-title" style="display:flex;align-items:center;gap:8px;">' +
          '<span style="display:inline-block;width:140px;height:13px;background:#e0e0e0;border-radius:4px;"></span>' +
        '</div>' +
        '<div class="cd-prod-meta" style="margin-top:6px;">' +
          '<span style="display:inline-block;width:100px;height:11px;background:#e8e8e8;border-radius:3px;"></span>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="cd-prod-price-col"><span style="display:inline-block;width:48px;height:13px;background:#e8e8e8;border-radius:4px;"></span></div>' +
    '<div class="cd-prod-qty-col"><span style="display:inline-block;width:32px;height:13px;background:#e8e8e8;border-radius:4px;"></span></div>' +
    '<div class="cd-prod-status-col"><span style="display:inline-block;width:64px;height:22px;background:#e8e8e8;border-radius:10px;"></span></div>';
  table.appendChild(stdRow);

  var row = document.createElement('div');
  row.className = 'cd-product-row cd-tour-ghost-product-row';
  row.dataset.areaId = _getSelectedAreaId();
  row.style.cssText = 'pointer-events:none;';
  row.innerHTML =
    '<div class="cd-prod-check"><input type="checkbox" disabled style="opacity:0.3;"></div>' +
    '<div class="cd-prod-name-col">' +
      '<div style="position:relative;width:56px;height:56px;flex-shrink:0;">' +
        '<div class="cd-prod-thumb" style="background:#e8e8e8;border-radius:4px;width:56px;height:56px;"></div>' +
        '<div style="position:absolute;top:4px;right:4px;width:18px;height:18px;background:#1a73e8;border-radius:3px;display:flex;align-items:center;justify-content:center;">' +
          '<svg width="10" height="12" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1h8v10L5 8.5 1 11V1z" fill="white"/></svg>' +
        '</div>' +
      '</div>' +
      '<div class="cd-prod-info">' +
        '<div class="cd-prod-title" style="display:flex;align-items:center;gap:8px;">' +
          '<span style="display:inline-block;width:140px;height:13px;background:#e0e0e0;border-radius:4px;"></span>' +
        '</div>' +
        '<div class="cd-prod-meta" style="margin-top:6px;">' +
          '<span style="display:inline-block;width:100px;height:11px;background:#e8e8e8;border-radius:3px;"></span>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="cd-prod-price-col"><span style="display:inline-block;width:48px;height:13px;background:#e8e8e8;border-radius:4px;"></span></div>' +
    '<div class="cd-prod-qty-col"><span style="display:inline-block;width:32px;height:13px;background:#e8e8e8;border-radius:4px;"></span></div>' +
    '<div class="cd-prod-status-col"><span style="display:inline-block;width:64px;height:22px;background:#e8e8e8;border-radius:10px;"></span></div>';

  table.appendChild(row);
}

function _endTour() {
  var spotlight = document.getElementById('cd-tour-spotlight');
  var tooltip   = document.getElementById('cd-tour-tooltip');
  if (spotlight) spotlight.style.display = 'none';
  if (tooltip)   tooltip.style.display   = 'none';
  // Clean up ghost elements
  var ghostStdRow = document.querySelector('.cd-tour-ghost-standard-row');
  if (ghostStdRow) ghostStdRow.remove();
  var ghostRow = document.querySelector('.cd-tour-ghost-product-row');
  if (ghostRow) {
    ghostRow.remove();
    var emptyState = document.getElementById('cd-empty-state');
    if (emptyState) emptyState.style.display = '';
  }
  var demoSection = document.querySelector('.cd-tour-demo-section');
  if (demoSection) demoSection.remove();
  var ghostMenu = document.getElementById('cd-tour-ghost-menu');
  if (ghostMenu) ghostMenu.remove();
  // Return to home if we ended on the configure screen
  var cdConfigure = document.getElementById('cd-configure');
  if (cdConfigure && cdConfigure.classList.contains('active')) goTo('cd-home');
  _showToast('Tour complete', 'You can replay this tour anytime from Help → Product Tours.');
}
