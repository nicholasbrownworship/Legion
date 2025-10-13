// === Global Variables ===
const factionSelectEl = document.getElementById('factionSelect');
const unitListEl = document.getElementById('unitList');
const armyListEl = document.getElementById('armyList');
const saveArmyBtn = document.getElementById('saveArmy');
const loadArmyBtn = document.getElementById('loadArmy');
const armySummaryEl = document.getElementById('armySummary');

const newArmyBtn = document.getElementById('newArmy');
const resetArmyBtn = document.getElementById('resetArmy');

let allUnits = [];
let army = [];
let selectedFaction = null;

// === List-building rules ===
const LIST_RULES = {
  Commander: { min: 1, max: 2 },
  Operative: { min: 0, max: 2 },
  Corps: { min: 3, max: 6 },
  SpecialForces: { min: 0, max: 3 },
  Support: { min: 0, max: 3 },
  Heavy: { min: 0, max: 2 }
};
const MAX_POINTS = 800;

// === Utility to fetch JSON ===
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}

// === Initialize factions ===
async function init() {
  const data = await loadJSON('data/units.json');
  allUnits = data.units;

  factionSelectEl.innerHTML = data.factions
    .map(f => `<option value="${f}">${f}</option>`)
    .join('');

  factionSelectEl.addEventListener('change', () => {
    selectedFaction = factionSelectEl.value;
    renderUnits();
  });

  // Initialize selectedFaction
  selectedFaction = factionSelectEl.value;

  renderUnits();
}

// === Render units based on selected faction ===
function renderUnits() {
  if (!selectedFaction) return;

  const units = allUnits.filter(u => u.faction === selectedFaction);

  unitListEl.innerHTML = '';
  units.forEach(unit => {
    const card = document.createElement('div');
    card.className = 'unit-card';
    card.innerHTML = `
      <img src="${unit.image || 'images/placeholder_unit.png'}" alt="${unit.name}" class="unit-image">
      <h3>${unit.name}</h3>
      <p>Type: ${unit.type} | Points: ${unit.points}</p>
      <button>Add to Army</button>
    `;

    card.querySelector('button').addEventListener('click', () => addUnitToArmy(unit));
    unitListEl.appendChild(card);
  });
}

// === Add unit to army ===
async function addUnitToArmy(unit) {
  const unitCopy = { ...unit, selectedUpgrades: {} };

  for (const type of unit.allowedUpgrades || []) {
    try {
      const upgradeData = await loadJSON(`data/upgrades/${type.toLowerCase()}.json`);
      const filtered = upgradeData.upgrades.filter(up =>
        up.factions.includes(unit.faction) &&
        (!up.restrictions || up.restrictions.includes(unit.rank))
      );
      unitCopy.selectedUpgrades[type] = filtered.length > 0 ? filtered[0].name : null;
    } catch (err) {
      console.error(`Failed to load upgrades for type ${type}`, err);
    }
  }

  army.push(unitCopy);
  renderArmy();
}

// === Render army and upgrades ===
async function renderArmy() {
  armyListEl.innerHTML = '';
  let totalPoints = 0;
  const typeCounts = {};

  for (const [index, unit] of army.entries()) {
    totalPoints += unit.points;
    typeCounts[unit.type] = (typeCounts[unit.type] || 0) + 1;

    const unitDiv = document.createElement('div');
    unitDiv.className = 'army-unit';
    unitDiv.innerHTML = `
      <img src="${unit.image || 'images/placeholder_unit.png'}" alt="${unit.name}" class="unit-image">
      <h3>${unit.name} (${unit.points} pts)</h3>
      <p>Type: ${unit.type}</p>
    `;

    const upgradeContainer = document.createElement('div');
    upgradeContainer.className = 'upgrades';
    for (const type of unit.allowedUpgrades || []) {
      const select = document.createElement('select');
      select.innerHTML = `<option value="">Select ${type}</option>`;

      try {
        const upgradeData = await loadJSON(`data/upgrades/${type.toLowerCase()}.json`);
        const filtered = upgradeData.upgrades.filter(up =>
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
      } catch (err) {
        console.error(`Error loading upgrades for ${type}`, err);
      }
    }

    unitDiv.appendChild(upgradeContainer);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      army.splice(index, 1);
      renderArmy();
    });
    unitDiv.appendChild(removeBtn);

    armyListEl.appendChild(unitDiv);
  }

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

// === New Army button ===
newArmyBtn.addEventListener('click', () => {
  const faction = prompt("Select your faction: Rebels or Imperials").toLowerCase();
  if (faction === 'rebels' || faction === 'imperials') {
    selectedFaction = faction;
    factionSelectEl.value = faction.charAt(0).toUpperCase() + faction.slice(1);
    army = [];
    renderArmy();
    renderUnits();
    alert(`New army created for ${selectedFaction.charAt(0).toUpperCase() + selectedFaction.slice(1)}!`);
  } else {
    alert("Invalid faction. Please choose 'Rebels' or 'Imperials'.");
  }
});

// === Reset Army button ===
resetArmyBtn.addEventListener('click', () => {
  army = [];
  renderArmy();
  alert("Army has been reset.");
});

document.addEventListener('DOMContentLoaded', init);
