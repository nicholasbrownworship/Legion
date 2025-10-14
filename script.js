// === Global Elements ===
const factionListEl = document.getElementById('faction-list');
const unitGridEl = document.getElementById('unit-grid');
const armyContainerEl = document.getElementById('army-container');
const armySummaryEl = document.getElementById('army-summary');
const saveArmyBtn = document.getElementById('save-army');
const loadArmyBtn = document.getElementById('load-army');
const newArmyBtn = document.getElementById('new-army');
const resetArmyBtn = document.getElementById('reset-army');
const factionModal = document.getElementById('faction-modal');

// === Global Variables ===
let allUnits = [];
let allUpgrades = {};
let army = [];
let currentFaction = null;
let initComplete = false;

// Drag state (used while dragging)
let draggingIndex = null;
let placeholderEl = null;

// === Army Rules ===
const LIST_RULES = {
  commander: { min: 1, max: 2 },
  operative: { min: 0, max: 2 },
  corps: { min: 3, max: 6 },
  specialforces: { min: 0, max: 3 },
  support: { min: 0, max: 3 },
  heavy: { min: 0, max: 2 },
};
const MAX_POINTS = 1000;

// === Upgrade Files Map ===
const upgradeFileMap = {
  armament: 'upgrades_armament.json',
  command: 'upgrades_command.json',
  crew: 'upgrades_crew.json',
  gear: 'upgrades_gear.json',
  force: 'upgrades_force.json',
  comms: 'upgrades_comms.json',
  generator: 'upgrades_generator.json',
  hardpoint: 'upgrades_hardpoint.json',
  ordnance: 'upgrades_ordnance.json',
  personnel: 'upgrades_personnel.json',
  pilot: 'upgrades_pilot.json',
  protocol: 'upgrades_protocol.json',
  training: 'upgrades_training.json',
  grenades: 'upgrades_grenades.json',
  heavyweapon: 'upgrades_heavyweapon.json'
};

// === JSON Loader ===
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}

// === Normalize Upgrades ===
function normalizeUpgrades(upgrades, typeKey) {
  return (upgrades || []).map(up => ({
    ...up,
    typeKey: typeKey.toLowerCase(),
    type: typeKey.toLowerCase(),
    factions: (up.factions || []).map(f => f.toLowerCase()),
    restrictions: (up.restrictions || []).map(r => r.toLowerCase())
  }));
}

// === Filter upgrades for a unit ===
function filterUpgrades(unit, typeKey) {
  const allOfType = allUpgrades[typeKey] || [];
  const unitFaction = (unit.faction || '').toLowerCase();
  const unitRank = (unit.rank || '').toLowerCase();
  const unitType = (unit.unitType || '').toLowerCase();

  return allOfType.filter(up => {
    const upgradeFactions = (up.factions || []).map(f => f.toLowerCase());
    const upgradeRestrictions = (up.restrictions || []).map(r => r.toLowerCase());

    const factionOK = upgradeFactions.length === 0 || upgradeFactions.includes(unitFaction);
    const restrictionOK =
      upgradeRestrictions.length === 0 ||
      upgradeRestrictions.some(r => r === unitRank || r === unitType);

    return factionOK && restrictionOK;
  });
}

// === Initialization ===
async function init() {
  try {
    // Load units.json (assumed at data/units.json)
    const unitData = await loadJSON('data/units.json');
    allUnits = (unitData.units || []).map(u => ({
      ...u,
      unitType: u.keywords && u.keywords.length ? u.keywords[0].toLowerCase() : ''
    }));

    // Load upgrade files
    for (const [typeKey, file] of Object.entries(upgradeFileMap)) {
      try {
        const data = await loadJSON(`data/${file}`);
        allUpgrades[typeKey] = normalizeUpgrades(data.upgrades, typeKey);
      } catch (err) {
        console.warn(`No upgrades loaded for ${typeKey}`, err);
        allUpgrades[typeKey] = [];
      }
    }

    // Load saved army if present (defer render until faction chosen)
    const saved = localStorage.getItem('savedArmy');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) army = parsed.map(u => ({ ...u, selectedUpgrades: u.selectedUpgrades || {} }));
      } catch (e) {
        console.warn('Saved army parse failed', e);
      }
    }

    initComplete = true;
    newArmyBtn.disabled = false;
  } catch (err) {
    console.error('Initialization failed', err);
  }
}

// === Show faction modal ===
function showFactionModal() {
  if (!initComplete) return alert('Data still loading, please wait.');
  factionModal.style.display = 'block';
}

// === Faction Buttons ===
factionModal.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFaction = btn.dataset.faction.toLowerCase();
    factionModal.style.display = 'none';
    // If saved army exists and matches faction, keep it; otherwise reset
    army = army && army.length ? army : [];
    renderUnits();
    renderArmy();
  });
});

// === Render Unit List ===
function renderUnits() {
  if (!currentFaction) return;
  const units = allUnits.filter(u => (u.faction || '').toLowerCase() === currentFaction);

  unitGridEl.innerHTML = '';
  units.forEach(unit => {
    const card = document.createElement('div');
    card.className = 'unit-card';
    card.innerHTML = `
      <img src="${unit.image || 'images/placeholder_unit.png'}" alt="${escapeHtml(unit.name)}">
      <h3>${escapeHtml(unit.name)}</h3>
      <p>Type: ${escapeHtml(unit.rank)} | Points: ${unit.points}</p>
      <button class="add-to-army">Add to Army</button>
    `;
    card.querySelector('.add-to-army').addEventListener('click', () => addUnitToArmy(unit));
    unitGridEl.appendChild(card);
  });
}

// === Add Unit to Army ===
function addUnitToArmy(unit) {
  // Deep copy to avoid mutating templates
  const unitCopy = JSON.parse(JSON.stringify(unit));
  unitCopy.selectedUpgrades = unitCopy.selectedUpgrades || {};

  // Ensure allowedUpgrades keys exist in selectedUpgrades
  if (unitCopy.allowedUpgrades && unitCopy.allowedUpgrades.length) {
    unitCopy.allowedUpgrades.forEach(typeKey => {
      if (!(typeKey in unitCopy.selectedUpgrades)) unitCopy.selectedUpgrades[typeKey] = '';
    });
  }

  army.push(unitCopy);
  saveArmyToStorage();
  renderArmy();
  console.log('Added unit to army:', unitCopy.name);
}

// === Save helper ===
function saveArmyToStorage() {
  try {
    localStorage.setItem('savedArmy', JSON.stringify(army));
    //console.log('Saved army to localStorage');
  } catch (e) {
    console.warn('Failed to save army', e);
  }
}

// === Render Army (collapsible cards + drag/drop placeholder approach) ===
function renderArmy() {
  // Clear any existing placeholder (in case rendering happens mid-drag)
  if (placeholderEl && placeholderEl.parentElement) {
    placeholderEl.parentElement.removeChild(placeholderEl);
    placeholderEl = null;
  }

  armyContainerEl.innerHTML = '';
  let totalPoints = 0;
  const typeCounts = {};

  army.forEach((unit, index) => {
    totalPoints += Number(unit.points || 0);
    const rankKey = (unit.rank || '').toLowerCase();
    if (rankKey) typeCounts[rankKey] = (typeCounts[rankKey] || 0) + 1;

    // Card
    const unitDiv = document.createElement('div');
    unitDiv.className = 'army-unit';
    unitDiv.dataset.index = index;
    unitDiv.setAttribute('draggable', 'true');

    // Header (click toggles details)
    const header = document.createElement('div');
    header.className = 'army-header';
    header.innerHTML = `
      <div class="header-left">
        <img src="${unit.image || 'images/placeholder_unit.png'}" alt="${escapeHtml(unit.name)}">
        <div>
          <div class="unit-name">${escapeHtml(unit.name)}</div>
          <div class="unit-meta">${unit.points || 0} pts • ${escapeHtml(unit.rank || '')}</div>
        </div>
      </div>
      <div class="header-right">
        <button class="toggle-details" aria-expanded="false">Show</button>
        <span class="drag-grip" title="Drag to reorder">≡</span>
      </div>
    `;

    // Details (upgrades + actions)
    const details = document.createElement('div');
    details.className = 'army-details';
    details.style.display = 'none';

    const upgradesWrap = document.createElement('div');
    upgradesWrap.className = 'upgrades';

    if (unit.allowedUpgrades && unit.allowedUpgrades.length) {
      unit.allowedUpgrades.forEach(typeKey => {
        const filtered = filterUpgrades(unit, typeKey.toLowerCase());
        const row = document.createElement('div');
        row.className = 'upgrade-row';

        const label = document.createElement('label');
        label.textContent = `${typeKey}: `;
        label.htmlFor = `upgrade-${index}-${typeKey}`;

        const select = document.createElement('select');
        select.id = `upgrade-${index}-${typeKey}`;
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = `None / Select ${typeKey}`;
        select.appendChild(emptyOpt);

        filtered.forEach(upg => {
          const opt = document.createElement('option');
          opt.value = upg.name;
          opt.textContent = `${upg.name} (${upg.points || 0} pts)`;
          select.appendChild(opt);
        });

        // set current selection if present
        if (unit.selectedUpgrades && unit.selectedUpgrades[typeKey]) {
          select.value = unit.selectedUpgrades[typeKey];
          const sel = filtered.find(f => f.name === unit.selectedUpgrades[typeKey]);
          if (sel) totalPoints += Number(sel.points || 0);
        }

        // Listen for change and update army WITHOUT re-rendering immediately
        select.addEventListener('change', (e) => {
          const val = e.target.value;
          // Important: update the appropriate unit object (not the DOM copy)
          army[index].selectedUpgrades = army[index].selectedUpgrades || {};
          army[index].selectedUpgrades[typeKey] = val;
          saveArmyToStorage();
          // Recalculate points and summary by re-rendering
          renderArmy();
        });

        row.appendChild(label);
        row.appendChild(select);
        upgradesWrap.appendChild(row);
      });
    } else {
      const none = document.createElement('div');
      none.className = 'no-upgrades';
      none.textContent = 'No upgrades available for this unit.';
      upgradesWrap.appendChild(none);
    }

    details.appendChild(upgradesWrap);

    const actions = document.createElement('div');
    actions.className = 'unit-actions';

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      army.splice(index, 1);
      saveArmyToStorage();
      renderArmy();
    });

    const dupBtn = document.createElement('button');
    dupBtn.textContent = 'Duplicate';
    dupBtn.addEventListener('click', () => {
      const copy = JSON.parse(JSON.stringify(unit));
      army.splice(index + 1, 0, copy);
      saveArmyToStorage();
      renderArmy();
    });

    actions.appendChild(dupBtn);
    actions.appendChild(removeBtn);
    details.appendChild(actions);

    // Toggle details
    header.querySelector('.toggle-details').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const opened = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!opened));
      btn.textContent = opened ? 'Show' : 'Hide';
      details.style.display = opened ? 'none' : 'block';
    });

    // Drag handlers (only manage placeholder & state, don't reorder DOM here)
    unitDiv.addEventListener('dragstart', (e) => {
      draggingIndex = index;
      unitDiv.classList.add('dragging');
      // required for some browsers
      try { e.dataTransfer.setData('text/plain', String(index)); } catch (err) {}
      e.dataTransfer.effectAllowed = 'move';

      // create placeholder
      placeholderEl = document.createElement('div');
      placeholderEl.className = 'drag-placeholder';
      placeholderEl.style.height = `${unitDiv.getBoundingClientRect().height}px`;
      // insert placeholder in place of the dragged element
      unitDiv.parentNode.insertBefore(placeholderEl, unitDiv.nextSibling);
      console.log('dragstart', index, army[index] && army[index].name);
    });

    unitDiv.addEventListener('dragend', (e) => {
      // cleanup any placeholder if the drop didn't happen on container
      unitDiv.classList.remove('dragging');
      if (placeholderEl && placeholderEl.parentElement) placeholderEl.parentElement.removeChild(placeholderEl);
      placeholderEl = null;
      draggingIndex = null;
      // Re-render to reflect final order (if changed) and reattach events
      saveArmyToStorage();
      renderArmy();
      console.log('dragend');
    });

    // Allow dropping by preventing default on dragover of each card's parent container (handled below)
    unitDiv.appendChild(header);
    unitDiv.appendChild(details);

    armyContainerEl.appendChild(unitDiv);
  });

  // After constructing all cards, attach container-level dragover/drop listeners
  attachContainerDnDHandlers();

  // === Validation & summary ===
  const errors = [];
  for (const [type, rule] of Object.entries(LIST_RULES)) {
    const count = typeCounts[type] || 0;
    if (count < rule.min) errors.push(`Need at least ${rule.min} ${type} unit(s).`);
    if (count > rule.max) errors.push(`Too many ${type} units (max ${rule.max}).`);
  }
  if (totalPoints > MAX_POINTS) errors.push(`Army exceeds ${MAX_POINTS} points (${totalPoints}).`);

  armySummaryEl.innerHTML = `
    <div><strong>Total Points:</strong> ${totalPoints} / ${MAX_POINTS}</div>
    <div><strong>Composition:</strong></div>
    <ul>${Object.entries(typeCounts).map(([type, count]) => `<li>${escapeHtml(type)}: ${count}</li>`).join('')}</ul>
    <div class="errors">${errors.length ? errors.join('<br>') : '<span style="color:lime;">Valid list</span>'}</div>
  `;
}

// === Container-level DnD handlers (once per render) ===
function attachContainerDnDHandlers() {
  // Remove previous handlers by cloning node (simple way to clear listeners)
  const newContainer = armyContainerEl.cloneNode(true);
  armyContainerEl.parentNode.replaceChild(newContainer, armyContainerEl);
  // reassign reference
  const container = document.getElementById('army-container');

  // On dragover we want to show placeholder position without re-rendering
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterEl = getDragAfterElement(container, e.clientY);
    const draggingEl = container.querySelector('.dragging');

    if (!placeholderEl) {
      // if user initiated drag but placeholder was removed for some reason, recreate simple placeholder
      placeholderEl = document.createElement('div');
      placeholderEl.className = 'drag-placeholder';
      placeholderEl.style.height = '60px';
    }

    if (!afterEl) {
      container.appendChild(placeholderEl);
    } else {
      container.insertBefore(placeholderEl, afterEl);
    }
  });

  // drop: perform reorder in the data model then re-render
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    let src = null;
    try { src = Number(e.dataTransfer.getData('text/plain')); } catch (err) { src = draggingIndex; }

    if (isNaN(src)) {
      console.warn('drop: unknown source index');
      cleanupAfterDrop(container);
      return;
    }

    // determine target index from placeholder position
    const children = Array.from(container.querySelectorAll('.army-unit'));
    let targetIndex = children.findIndex(c => c === placeholderEl);
    if (targetIndex === -1) {
      // if placeholder not in children, attempt to find nearest by Y
      const after = getDragAfterElement(container, e.clientY);
      targetIndex = after ? Array.from(container.children).indexOf(after) : container.children.length;
    }

    // If placeholder is after all, put at end
    if (targetIndex === -1) targetIndex = container.children.length;

    // Adjust for case where dragging item is removed earlier in list
    if (src < targetIndex) targetIndex = targetIndex - 1;

    if (src === targetIndex) {
      console.log('Dropped in same position; no change.');
      cleanupAfterDrop(container);
      return;
    }

    // bound indices
    src = Math.max(0, Math.min(src, army.length - 1));
    targetIndex = Math.max(0, Math.min(targetIndex, army.length));

    // move item in army array
    const [moved] = army.splice(src, 1);
    army.splice(targetIndex, 0, moved);
    console.log(`Reordered army: ${src} -> ${targetIndex}`, moved && moved.name);

    // cleanup placeholder and re-render
    cleanupAfterDrop(container);
    saveArmyToStorage();
    renderArmy();
  });

  // If drag leaves container entirely, remove placeholder
  container.addEventListener('dragleave', (e) => {
    // check if leaving to an element outside the container
    const rect = container.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      if (placeholderEl && placeholderEl.parentElement) placeholderEl.parentElement.removeChild(placeholderEl);
      placeholderEl = null;
    }
  });

  // reassign global container reference (used by other functions)
  armyContainerEl = container;
}

// === Helper: remove placeholder on drop end/cleanup ===
function cleanupAfterDrop(container) {
  if (placeholderEl && placeholderEl.parentElement) placeholderEl.parentElement.removeChild(placeholderEl);
  placeholderEl = null;
  draggingIndex = null;
}

// === Helper: compute next element under pointer for insertion ===
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.army-unit:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// === Buttons ===
newArmyBtn.addEventListener('click', showFactionModal);
resetArmyBtn.addEventListener('click', () => {
  army = [];
  saveArmyToStorage();
  renderArmy();
});

saveArmyBtn.addEventListener('click', () => {
  try {
    localStorage.setItem('savedArmy', JSON.stringify(army));
    alert('Army saved!');
  } catch (e) {
    alert('Failed to save army.');
  }
});

loadArmyBtn.addEventListener('click', () => {
  const saved = localStorage.getItem('savedArmy');
  if (saved) {
    try {
      army = JSON.parse(saved);
      if (!Array.isArray(army)) army = [];
      renderArmy();
      alert('Army loaded!');
    } catch (e) {
      console.error('Failed to parse saved army', e);
      alert('Failed to load army.');
    }
  } else {
    alert('No saved army found.');
  }
});

// === Small utility: escape html for safety in text nodes ===
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, function (m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
  });
}

// === Initialize ===
document.addEventListener('DOMContentLoaded', async () => {
  newArmyBtn.disabled = true;
  await init();
  // If faction already chosen and army loaded earlier, render
  if (currentFaction) renderUnits();
  renderArmy();
});
