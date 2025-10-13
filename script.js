const factionListEl = document.getElementById('faction-list');
const unitGridEl = document.getElementById('unit-grid');
const armyContainerEl = document.getElementById('army-container');
const searchInput = document.getElementById('search-input');
const saveArmyBtn = document.getElementById('save-army');
const loadArmyBtn = document.getElementById('load-army');
const armySummaryEl = document.getElementById('army-summary');

let data = {};
let currentFaction = null;
let army = [];

// Legion list-building rules
const LIST_RULES = {
  Commander: { min: 1, max: 2 },
  Operative: { min: 0, max: 2 },
  Corps: { min: 3, max: 6 },
  SpecialForces: { min: 0, max: 3 },
  Support: { min: 0, max: 3 },
  Heavy: { min: 0, max: 2 },
};
const MAX_POINTS = 800;

// Load JSON data
fetch('units.json')
  .then(res => res.json())
  .then(json => {
    data = json;
    renderFactions();
    renderUnits();
  });

// Render factions
function renderFactions() {
  factionListEl.innerHTML = '';
  data.factions.forEach(f => {
    const btn = document.createElement('button');
    btn.textContent = f;
    btn.addEventListener('click', () => {
      currentFaction = f;
      renderUnits();
    });
    factionListEl.appendChild(btn);
  });
}

// Render unit selection grid
function renderUnits() {
  unitGridEl.innerHTML = '';
  let units = data.units;
  if (currentFaction) units = units.filter(u => u.faction === currentFaction);

  const searchTerm = searchInput.value.toLowerCase();
  if (searchTerm) units = units.filter(u => u.name.toLowerCase().includes(searchTerm));

  units.forEach(unit => {
    const card = document.createElement('div');
    card.className = 'unit-card';

    const img = document.createElement('img');
    img.src = unit.image || 'images/placeholder.png';
    card.appendChild(img);

    const name = document.createElement('div');
    name.textContent = `${unit.name} (${unit.points} pts)`;
    card.appendChild(name);

    const type = document.createElement('div');
    type.textContent = `Type: ${unit.type}`;
    type.className = 'unit-type';
    card.appendChild(type);

    // ❌ Removed upgrades here — handled after adding to army

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add to Army';
    addBtn.addEventListener('click', () => addToArmy(unit));
    card.appendChild(addBtn);

    unitGridEl.appendChild(card);
  });
}

searchInput.addEventListener('input', renderUnits);

// Add unit to army
function addToArmy(unit) {
  // Copy unit object and initialize upgrade slots
  const unitCopy = JSON.parse(JSON.stringify(unit));
  unitCopy.selectedUpgrades = {};
  army.push(unitCopy);
  renderArmy();
}

// Render army + validation
function renderArmy() {
  armyContainerEl.innerHTML = '';
  let totalPoints = 0;
  const counts = {};

  // === Display each unit card in army ===
  army.forEach((unit, index) => {
    let unitPoints = unit.points;
    const card = document.createElement('div');
    card.className = 'unit-card';

    const header = document.createElement('div');
    header.innerHTML = `<strong>${unit.name}</strong> (${unit.points} pts) - <em>${unit.type}</em>`;
    card.appendChild(header);

    // === Render upgrade slots dynamically ===
    if (unit.upgradeSlots && data.upgrades) {
      unit.upgradeSlots.forEach(slotType => {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'upgrade-slot';
        slotDiv.textContent = `${slotType}: `;

        const select = document.createElement('select');
        const noneOpt = document.createElement('option');
        noneOpt.value = '';
        noneOpt.textContent = '-- None --';
        select.appendChild(noneOpt);

        // Filter upgrades valid for this slot + unit
        const validUpgrades = data.upgrades.filter(up =>
          up.type === slotType &&
          (!up.allowedTypes ||
            up.allowedTypes.includes(unit.rank) ||
            up.allowedTypes.includes(unit.type))
        );

        validUpgrades.forEach(up => {
          const opt = document.createElement('option');
          opt.value = up.name;
          opt.textContent = `${up.name} (+${up.points} pts)`;
          if (unit.selectedUpgrades[slotType]?.name === up.name) {
            opt.selected = true;
          }
          select.appendChild(opt);
        });

        // On change, update selected upgrade
        select.addEventListener('change', e => {
          const chosen = data.upgrades.find(u => u.name === e.target.value);
          if (chosen) {
            unit.selectedUpgrades[slotType] = chosen;
          } else {
            delete unit.selectedUpgrades[slotType];
          }
          renderArmy(); // Refresh display + total points
        });

        slotDiv.appendChild(select);
        card.appendChild(slotDiv);
      });
    }

    // === Remove button ===
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      army.splice(index, 1);
      renderArmy();
    });
    card.appendChild(removeBtn);

    // === Calculate total for this unit ===
    if (unit.selectedUpgrades) {
      for (const up of Object.values(unit.selectedUpgrades)) {
        unitPoints += up.points;
      }
    }
    totalPoints += unitPoints;

    const pointsDiv = document.createElement('div');
    pointsDiv.className = 'unit-points';
    pointsDiv.textContent = `Unit total: ${unitPoints}`;
    card.appendChild(pointsDiv);

    armyContainerEl.appendChild(card);

    // Count unit type for validation
    counts[unit.type] = (counts[unit.type] || 0) + 1;
  });

  // === Validation ===
  const errors = [];
  for (const [type, rule] of Object.entries(LIST_RULES)) {
    const count = counts[type] || 0;
    if (count < rule.min) errors.push(`Need at least ${rule.min} ${type}.`);
    if (count > rule.max) errors.push(`Too many ${type} units (max ${rule.max}).`);
  }
  if (totalPoints > MAX_POINTS)
    errors.push(`Army exceeds ${MAX_POINTS} points (${totalPoints}).`);

  // === Summary display ===
  armySummaryEl.innerHTML = `
    <div><strong>Total Points:</strong> ${totalPoints} / ${MAX_POINTS}</div>
    <div><strong>Composition:</strong></div>
    <ul>${Object.entries(counts)
      .map(([type, count]) => `<li>${type}: ${count}</li>`)
      .join('')}</ul>
    <div class="errors">${errors.length > 0
      ? errors.join('<br>')
      : '<span style="color:lime;">Valid list</span>'}</div>
  `;
}

// === Save / Load Army ===
saveArmyBtn.addEventListener('click', () => {
  localStorage.setItem('savedArmy', JSON.stringify(army));
  alert('Army saved!');
});
loadArmyBtn.addEventListener('click', () => {
  const saved = localStorage.getItem('savedArmy');
  if (saved) {
    army = JSON.parse(saved);
    renderArmy();
    alert('Army loaded!');
  }
});
