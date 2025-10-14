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
let allUpgrades = {}; // cache by typeKey
let army = [];
let currentFaction = null;
let initComplete = false;
let dragSrcIndex = null;

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

// === Upgrade Files ===
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
    // Load units
    const unitData = await loadJSON('data/units.json');
    allUnits = (unitData.units || []).map(u => ({
      ...u,
      unitType: u.keywords && u.keywords.length ? u.keywords[0].toLowerCase() : '' // set unitType early
    }));

    // Load upgrades
    for (const [typeKey, file] of Object.entries(upgradeFileMap)) {
      try {
        const data = await loadJSON(`data/${file}`);
        allUpgrades[typeKey] = normalizeUpgrades(data.upgrades, typeKey);

        if (typeKey === 'heavyweapon') console.log('Loaded heavy weapons:', allUpgrades[typeKey]);
        if (typeKey === 'gear') console.log('Loaded gear upgrades:', allUpgrades[typeKey]);
      } catch (err) {
        console.warn(`No upgrades loaded for ${typeKey}`, err);
        allUpgrades[typeKey] = [];
      }
    }

    // If there's a saved army in localStorage, load it (but wait until faction chosen)
    const saved = localStorage.getItem('savedArmy');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          army = parsed;
          console.log('Loaded saved army from storage (deferred render).');
        }
      } catch (e) { /* ignore parse errors */ }
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
    // If a saved army (loaded earlier) is for this faction, keep it; else reset.
    if (!army || army.length === 0) {
      army = [];
    } else {
      // ensure units still have structure (backwards compatibility)
      army = army.map(u => ({ ...u, selectedUpgrades: u.selectedUpgrades || {} }));
    }
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
      <img src="${unit.image || 'images/placeholder_unit.png'}" alt="${unit.name}">
      <h3>${unit.name}</h3>
      <p>Type: ${unit.rank} | Points: ${unit.points}</p>
      <button class="add-to-army">Add to Army</button>
    `;
    card.querySelector('.add-to-army').addEventListener('click', () => addUnitToArmy(unit));
    unitGridEl.appendChild(card);
  });
}

// === Add Unit to Army ===
function addUnitToArmy(unit) {
  const unitCopy = { ...unit, selectedUpgrades: {} };

  if (unitCopy.allowedUpgrades && unitCopy.allowedUpgrades.length) {
    unitCopy.allowedUpgrades.forEach(typeKey => {
      const filtered = filterUpgrades(unitCopy, typeKey.toLowerCase());
      unitCopy.selectedUpgrades[typeKey] = filtered.length ? '' : '';
    });
  }

  army.push(unitCopy);
  saveArmyToStorage();
  renderArmy();
}

// === Helpers: save/load ===
function saveArmyToStorage() {
  try {
    localStorage.setItem('savedArmy', JSON.stringify(army));
    console.log('Auto-saved army to localStorage.');
  } catch (e) {
    console.warn('Failed to auto-save army', e);
  }
}

// === Render Army (cards + drag/drop) ===
function renderArmy() {
  armyContainerEl.innerHTML = '';
  let totalPoints = 0;
  const typeCounts = {};

  army.forEach((unit, index) => {
    totalPoints += unit.points || 0;
    const rankKey = (unit.rank || '').toLowerCase();
    if (rankKey) typeCounts[rankKey] = (typeCounts[rankKey] || 0) + 1;

    // Card root
    const unitDiv = document.createElement('div');
    unitDiv.className = 'army-unit card';
    unitDiv.setAttribute('draggable', 'true');
    unitDiv.dataset.index = index;

    // Card header (name / points / drag-hint)
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <div class="card-left">
        <img src="${unit.image || 'images/placeholder_unit.png'}" alt="${unit.name}">
        <div class="card-title">
          <strong>${unit.name}</strong>
          <div class="card-sub">${unit.points || 0} pts • ${unit.rank || ''}</div>
        </div>
      </div>
      <div class="card-actions">
        <button class="toggle-details" aria-expanded="false">Details</button>
        <span class="drag-hint" title="Drag to reorder">⇅</span>
      </div>
    `;
    unitDiv.appendChild(header);

    // Details section (upgrades + remove)
    const details = document.createElement('div');
    details.className = 'card-details';
    details.style.display = 'none';

    const upgradeContainer = document.createElement('div');
    upgradeContainer.className = 'upgrades';

    if (unit.allowedUpgrades && unit.allowedUpgrades.length) {
      unit.allowedUpgrades.forEach(typeKey => {
        const filtered = filterUpgrades(unit, typeKey.toLowerCase());

        const selectWrap = document.createElement('div');
        selectWrap.className = 'select-wrap';

        const label = document.createElement('label');
        label.textContent = ` ${typeKey}: `;
        label.htmlFor = `sel-${index}-${typeKey}`;

        const select = document.createElement('select');
        select.id = `sel-${index}-${typeKey}`;
        select.innerHTML = `<option value="">Select ${typeKey}</option>`;

        filtered.forEach(upg => {
          const opt = document.createElement('option');
          opt.value = upg.name;
          opt.textContent = `${upg.name} (${upg.points || 0} pts)`;
          if (unit.selectedUpgrades[typeKey] === upg.name) opt.selected = true;
          select.appendChild(opt);
        });

        select.addEventListener('change', e => {
          army[index].selectedUpgrades[typeKey] = e.target.value;
          // rerender to update points/summary
          saveArmyToStorage();
          renderArmy();
        });

        selectWrap.appendChild(label);
        selectWrap.appendChild(select);
        upgradeContainer.appendChild(selectWrap);

        const selectedUpgrade = filtered.find(u => u.name === unit.selectedUpgrades[typeKey]);
        if (selectedUpgrade) totalPoints += selectedUpgrade.points || 0;
      });
    } else {
      const none = document.createElement('div');
      none.textContent = 'No upgrades available.';
      upgradeContainer.appendChild(none);
    }

    details.appendChild(upgradeContainer);

    const btnRow = document.createElement('div');
    btnRow.className = 'card-buttons';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-unit';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      army.splice(index, 1);
      saveArmyToStorage();
      renderArmy();
    });

    const duplicateBtn = document.createElement('button');
    duplicateBtn.className = 'duplicate-unit';
    duplicateBtn.textContent = 'Duplicate';
    duplicateBtn.addEventListener('click', () => {
      const copy = JSON.parse(JSON.stringify(unit));
      army.splice(index + 1, 0, copy);
      saveArmyToStorage();
      renderArmy();
    });

    btnRow.appendChild(duplicateBtn);
    btnRow.appendChild(removeBtn);
    details.appendChild(btnRow);

    unitDiv.appendChild(details);

    // Toggle details button
    header.querySelector('.toggle-details').addEventListener('click', (ev) => {
      const btn = ev.currentTarget;
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isOpen));
      details.style.display = isOpen ? 'none' : 'block';
    });

    // Drag & Drop handlers
    unitDiv.addEventListener('dragstart', (e) => {
      dragSrcIndex = index;
      unitDiv.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(index)); } catch (err) { /* some browsers require setData */ }
      console.log('dragstart', index, unit.name);
    });

    unitDiv.addEventListener('dragend', (e) => {
      unitDiv.classList.remove('dragging');
      dragSrcIndex = null;
      // ensure we save and re-render after drag ends
      saveArmyToStorage();
      renderArmy();
      console.log('dragend');
    });

    // Allow drop on container by preventing default on dragover and compute insertion position
    unitDiv.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(armyContainerEl, e.clientY);
      const draggingEl = document.querySelector('.dragging');
      if (!draggingEl) return;
      if (afterElement == null) {
        armyContainerEl.appendChild(draggingEl);
      } else {
        armyContainerEl.insertBefore(draggingEl, afterElement);
      }
    });

    unitDiv.addEventListener('drop', (e) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('text/plain');
      const srcIndex = data !== '' ? Number(data) : dragSrcIndex;
      const targetIndex = Number(unitDiv.dataset.index);
      if (isNaN(srcIndex) || isNaN(targetIndex)) return;

      // If same index, nothing
      if (srcIndex === targetIndex) return;

      // Remove source item and insert at new position
      const item = army.splice(srcIndex, 1)[0];
      // if source < target, removing shifts target left by 1
      const insertAt = srcIndex < targetIndex ? targetIndex : targetIndex;
      army.splice(insertAt, 0, item);
      console.log(`Dropped: moved ${srcIndex} -> ${insertAt}`);
      saveArmyToStorage();
      renderArmy();
    });

    // Append to container
    armyContainerEl.appendChild(unitDiv);
  });

  // === Validation ===
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
    <ul>${Object.entries(typeCounts).map(([type, count]) => `<li>${type}: ${count}</li>`).join('')}</ul>
    <div class="errors">${errors.length ? errors.join('<br>') : '<span style="color:lime;">Valid list</span>'}</div>
  `;
}

// === Drag helper: find insertion element by pointer Y ===
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
  localStorage.setItem('savedArmy', JSON.stringify(army));
  alert('Army saved!');
});

loadArmyBtn.addEventListener('click', () => {
  const saved = localStorage.getItem('savedArmy');
  if (saved) {
    try {
      army = JSON.parse(saved);
      renderArmy();
      alert('Army loaded!');
    } catch (e) {
      console.error('Failed to parse saved army', e);
      alert('Failed to load saved army.');
    }
  } else {
    alert('No saved army found.');
  }
});

// === Initialize ===
document.addEventListener('DOMContentLoaded', async () => {
  newArmyBtn.disabled = true;
  await init();
});
