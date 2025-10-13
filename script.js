// === Global Variables ===
const factionListEl = document.getElementById('faction-list');
const unitGridEl = document.getElementById('unit-grid');
const armyContainerEl = document.getElementById('army-container');
const armySummaryEl = document.getElementById('army-summary');
const saveArmyBtn = document.getElementById('save-army');
const loadArmyBtn = document.getElementById('load-army');
const newArmyBtn = document.getElementById('new-army');
const resetArmyBtn = document.getElementById('reset-army');
const factionModal = document.getElementById('faction-modal');

let allUnits = [];
let allUpgrades = {}; // cache for upgrades by type
let army = [];
let currentFaction = null;

// === Army rules ===
const LIST_RULES = {
  Commander: { min: 1, max: 2 },
  Operative: { min: 0, max: 2 },
  Corps: { min: 3, max: 6 },
  SpecialForces: { min: 0, max: 3 },
  Support: { min: 0, max: 3 },
  Heavy: { min: 0, max: 2 },
  
};
const MAX_POINTS = 1000;

// === Mapping from unit upgrade types to JSON file names ===
const upgradeFileMap = {
  Armament: 'upgrades_armament.json',
  Command: 'upgrades_command.json',
  Crew: 'upgrades_crew.json',
  Gear: 'upgrades_gear.json',
  Force: 'upgrades_force.json',
  Comms: 'upgrades_comms.json',
  Generator: 'upgrades_generator.json',
  Hardpoint: 'upgrades_hardpoint.json',
  Ordnance: 'upgrades_ordnance.json',
  Personnel: 'upgrades_personnel.json',
  Pilot: 'upgrades_pilot.json',
  Protocol: 'upgrades_protocol.json',
  Training: 'upgrades_training.json',
  Grenades: 'upgrades_grenades.json'
};

// === Utility to load JSON ===
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}

// === Initialize units and upgrades ===
async function init() {
  // Load all units
  const unitData = await loadJSON('data/units.json');
  allUnits = unitData.units;

  // Preload all upgrades
  for (const [type, file] of Object.entries(upgradeFileMap)) {
    try {
      const data = await loadJSON(`data/${file}`);
      allUpgrades[type.toLowerCase()] = data.upgrades || [];
    } catch (err) {
      console.warn(`No upgrades loaded for type ${type}`, err);
      allUpgrades[type.toLowerCase()] = [];
    }
  }
}

// === Show faction modal ===
function showFactionModal() {
  factionModal.style.display = 'block';
}

// Faction selection buttons
factionModal.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFaction = btn.dataset.faction;
    factionModal.style.display = 'none';
    army = [];
    renderUnits();
    renderArmy();
  });
});

// === Render units based on faction ===
function renderUnits() {
  if (!currentFaction) return;

  const units = allUnits.filter(u => u.faction === currentFaction);
  unitGridEl.innerHTML = '';

  units.forEach(unit => {
    const card = document.createElement('div');
    card.className = 'unit-card';
    card.innerHTML = `
      <img src="${unit.image || 'images/placeholder_unit.png'}" alt="${unit.name}">
      <h3>${unit.name}</h3>
      <p>Type: ${unit.type} | Points: ${unit.points}</p>
      <button>Add to Army</button>
    `;
    card.querySelector('button').addEventListener('click', () => addUnitToArmy(unit));
    unitGridEl.appendChild(card);
  });
}

// === Add unit to army ===
function addUnitToArmy(unit) {
  const unitCopy = { ...unit, selectedUpgrades: {} };

  if (unit.allowedUpgrades) {
    for (const type of unit.allowedUpgrades) {
      const upgradesForType = allUpgrades[type.toLowerCase()] || [];
      const filtered = upgradesForType.filter(up =>
        up.factions.includes(unit.faction) &&
        (!up.restrictions || up.restrictions.includes(unit.rank))
      );
      unitCopy.selectedUpgrades[type] = filtered.length ? filtered[0].name : '';
    }
  }

  army.push(unitCopy);
  renderArmy();
}

// === Render army with upgrades ===
function renderArmy() {
  armyContainerEl.innerHTML = '';
  let totalPoints = 0;
  const typeCounts = {};

  army.forEach((unit, index) => {
    totalPoints += unit.points;
    typeCounts[unit.type] = (typeCounts[unit.type] || 0) + 1;

    const unitDiv = document.createElement('div');
    unitDiv.className = 'army-unit';
    unitDiv.innerHTML = `
      <img src="${unit.image || 'images/placeholder_unit.png'}" alt="${unit.name}">
      <h3>${unit.name} (${unit.points} pts)</h3>
      <p>Type: ${unit.type}</p>
    `;

    // === Add upgrade selectors ===
    const upgradeContainer = document.createElement('div');
    upgradeContainer.className = 'upgrades';

    if (unit.allowedUpgrades) {
      for (const type of unit.allowedUpgrades) {
        const select = document.createElement('select');
        select.innerHTML = `<option value="">Select ${type}</option>`;

        const upgradesForType = allUpgrades[type.toLowerCase()] || [];
        const filtered = upgradesForType.filter(up =>
          up.factions.includes(unit.faction) &&
          (!up.restrictions || up.restrictions.includes(unit.rank))
        );

        filtered.forEach(upg => {
          const opt = document.createElement('option');
          opt.value = upg.name;
          opt.textContent = `${upg.name} (${upg.points} pts)`;
          if (unit.selectedUpgrades[type] === upg.name) opt.selected = true;
          select.appendChild(opt);
        });

        select.addEventListener('change', e => {
          unit.selectedUpgrades[type] = e.target.value;
        });

        upgradeContainer.appendChild(select);
      }
    }

    unitDiv.appendChild(upgradeContainer);

    // Remove unit button
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      army.splice(index, 1);
      renderArmy();
    });
    unitDiv.appendChild(removeBtn);

    armyContainerEl.appendChild(unitDiv);
  });

  // === Army Summary & Validation ===
  const errors = [];
  for (const [type, rule] of Object.entries(LIST_RULES)) {
    const count = typeCounts[type] || 0;
    if (count < rule.min) errors.push(`Need at least ${rule.min} ${type}.`);
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

// === Buttons ===
newArmyBtn.addEventListener('click', showFactionModal);
resetArmyBtn.addEventListener('click', () => {
  army = [];
  renderArmy();
});

// === Save / Load ===
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

// === Initialize ===
document.addEventListener('DOMContentLoaded', init);
