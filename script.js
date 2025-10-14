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
  const unitFaction = unit.faction.toLowerCase();
  const unitRank = unit.rank.toLowerCase();
  const unitType = unit.unitType?.toLowerCase();

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
    allUnits = (unitData.units || []).map(u => {
      const unitType = u.keywords?.[0]?.toLowerCase() || '';

      // Default upgrade slots and selectedUpgrades
      const upgradeSlots = {};
      const selectedUpgrades = {};
      if (u.allowedUpgrades && u.allowedUpgrades.length) {
        u.allowedUpgrades.forEach(typeKey => {
          const key = typeKey.toLowerCase();
          upgradeSlots[key] = key === 'force' ? 3 : 1;
          selectedUpgrades[key] = new Array(upgradeSlots[key]).fill('');
        });
      }

      return {
        ...u,
        unitType,
        upgradeSlots,
        selectedUpgrades
      };
    });

    // Load upgrades
    for (const [typeKey, file] of Object.entries(upgradeFileMap)) {
      try {
        const data = await loadJSON(`data/${file}`);
        allUpgrades[typeKey.toLowerCase()] = normalizeUpgrades(data.upgrades, typeKey);
      } catch (err) {
        console.warn(`No upgrades loaded for ${typeKey}`, err);
        allUpgrades[typeKey.toLowerCase()] = [];
      }
    }

    initComplete = true;
    newArmyBtn.disabled = false;
  } catch (err) {
    console.error('Initialization failed', err);
  }
}

// === Show Faction Modal ===
function showFactionModal() {
  if (!initComplete) return alert('Data still loading, please wait.');
  factionModal.style.display = 'block';
}

// === Faction Buttons ===
factionModal.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFaction = btn.dataset.faction.toLowerCase();
    factionModal.style.display = 'none';
    army = [];
    renderUnits();
    renderArmy();
  });
});

// === Render Unit List ===
function renderUnits() {
  if (!currentFaction) return;
  const units = allUnits.filter(u => u.faction.toLowerCase() === currentFaction);

  unitGridEl.innerHTML = '';
  units.forEach(unit => {
    const card = document.createElement('div');
    card.className = 'unit-card';
    card.innerHTML = `
      <img src="${unit.image || 'images/placeholder_unit.png'}" alt="${unit.name}">
      <h3>${unit.name}</h3>
      <p>Type: ${unit.rank} | Points: ${unit.points}</p>
      <button>Add to Army</button>
    `;
    card.querySelector('button').addEventListener('click', () => addUnitToArmy(unit));
    unitGridEl.appendChild(card);
  });
}

// === Add Unit to Army ===
function addUnitToArmy(unit) {
  const unitCopy = JSON.parse(JSON.stringify(unit)); // deep copy
  army.push(unitCopy);
  renderArmy();
}

// === Render Army ===
function renderArmy() {
  armyContainerEl.innerHTML = '';
  let totalPoints = 0;
  const typeCounts = {};

  army.forEach((unit, index) => {
    totalPoints += unit.points;
    const rankKey = unit.rank.toLowerCase();
    typeCounts[rankKey] = (typeCounts[rankKey] || 0) + 1;

    const unitDiv = document.createElement('div');
    unitDiv.className = 'army-unit';
    unitDiv.innerHTML = `
      <img src="${unit.image || 'images/placeholder_unit.png'}" alt="${unit.name}">
      <h3>${unit.name} (${unit.points} pts)</h3>
      <p>Rank: ${unit.rank}</p>
    `;

    const upgradeContainer = document.createElement('div');
    upgradeContainer.className = 'upgrades';

    if (unit.allowedUpgrades && unit.allowedUpgrades.length) {
      unit.allowedUpgrades.forEach(typeKey => {
        const key = typeKey.toLowerCase();
        const filteredUpgrades = filterUpgrades(unit, key);
        const maxSlots = unit.upgradeSlots[key] || 1;

        for (let slot = 0; slot < maxSlots; slot++) {
          const select = document.createElement('select');
          select.innerHTML = `<option value="">Select ${typeKey} ${slot + 1}</option>`;

          filteredUpgrades.forEach(upg => {
            // Only show options not already selected in other slots
            if (!unit.selectedUpgrades[key].includes(upg.name)) {
              const opt = document.createElement('option');
              opt.value = upg.name;
              opt.textContent = `${upg.name} (${upg.points || 0} pts)`;
              select.appendChild(opt);
            }
          });

          // Set currently selected value
          if (unit.selectedUpgrades[key][slot]) select.value = unit.selectedUpgrades[key][slot];

          select.addEventListener('change', e => {
            unit.selectedUpgrades[key][slot] = e.target.value;
            renderArmy(); // re-render to update points and dropdown options
          });

          upgradeContainer.appendChild(select);

          // Add points for already selected upgrades
          const selectedUpgrade = filteredUpgrades.find(u => u.name === unit.selectedUpgrades[key][slot]);
          if (selectedUpgrade) totalPoints += selectedUpgrade.points || 0;
        }
      });
    }

    unitDiv.appendChild(upgradeContainer);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      army.splice(index, 1);
      renderArmy();
    });
    unitDiv.appendChild(removeBtn);

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

// === Buttons ===
newArmyBtn.addEventListener('click', showFactionModal);

resetArmyBtn.addEventListener('click', () => {
  army = [];
  renderArmy();
});

saveArmyBtn.addEventListener('click', () => {
  localStorage.setItem('savedArmy', JSON.stringify({ faction: currentFaction, army }));
  alert('Army saved!');
});

loadArmyBtn.addEventListener('click', () => {
  const saved = JSON.parse(localStorage.getItem('savedArmy'));
  if (saved) {
    currentFaction = saved.faction;
    army = saved.army;
    renderUnits();
    renderArmy();
    alert('Army loaded!');
  }
});

// === Initialize ===
document.addEventListener('DOMContentLoaded', async () => {
  newArmyBtn.disabled = true;
  await init();
});
