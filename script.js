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
    allUnits = (unitData.units || []).map(u => ({
      ...u,
      unitType: u.keywords?.[0]?.toLowerCase() || ''
    }));

    // Load upgrades
    for (const [typeKey, file] of Object.entries(upgradeFileMap)) {
      try {
        const data = await loadJSON(`data/${file}`);
        allUpgrades[typeKey] = normalizeUpgrades(data.upgrades, typeKey);
      } catch (err) {
        console.warn(`No upgrades loaded for ${typeKey}`, err);
        allUpgrades[typeKey] = [];
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
  const unitCopy = { ...unit, selectedUpgrades: {} };
  if (unit.allowedUpgrades && unit.allowedUpgrades.length) {
    unit.allowedUpgrades.forEach(typeKey => {
      const filtered = filterUpgrades(unitCopy, typeKey.toLowerCase());
      unitCopy.selectedUpgrades[typeKey] = filtered.length ? '' : '';
    });
  }
  army.push(unitCopy);
  renderArmy();
}

// === Helper to create unit element ===
function createArmyUnitElement(unit, index) {
  const unitDiv = document.createElement('div');
  unitDiv.className = 'army-unit';

  const header = document.createElement('div');
  header.className = 'unit-header';
  header.innerHTML = `<h4>${unit.name} (${unit.points} pts)</h4>`;
  unitDiv.appendChild(header);

  const details = document.createElement('div');
  details.className = 'unit-details';

  if (unit.allowedUpgrades && unit.allowedUpgrades.length) {
    unit.allowedUpgrades.forEach(typeKey => {
      const filtered = filterUpgrades(unit, typeKey.toLowerCase());
      const select = document.createElement('select');
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
        renderArmy();
      });
      details.appendChild(select);
    });
  }

  header.addEventListener('click', () => unitDiv.classList.toggle('expanded'));

  const removeBtn = document.createElement('button');
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => {
    army.splice(index, 1);
    renderArmy();
  });
  unitDiv.appendChild(details);
  unitDiv.appendChild(removeBtn);

  return unitDiv;
}

// === Render Army ===
function renderArmy() {
  // Sort army by rank
  const rankOrder = ['commander', 'operative', 'corps', 'specialforces', 'support', 'heavy'];
  army.sort((a, b) => rankOrder.indexOf(a.rank.toLowerCase()) - rankOrder.indexOf(b.rank.toLowerCase()));

  // Group by rank
  const ranks = {};
  army.forEach((unit, idx) => {
    const rank = unit.rank.toLowerCase();
    if (!ranks[rank]) ranks[rank] = [];
    ranks[rank].push({ unit, index: idx });
  });

  armyContainerEl.innerHTML = '';
  let totalPoints = 0;
  const typeCounts = {};

  for (const rank of rankOrder) {
    if (!ranks[rank]) continue;
    const section = document.createElement('div');
    section.className = 'army-rank-section';
    section.innerHTML = `<h3>${rank.toUpperCase()}</h3>`;

    ranks[rank].forEach(({ unit, index }) => {
      section.appendChild(createArmyUnitElement(unit, index));

      totalPoints += unit.points;
      typeCounts[rank] = (typeCounts[rank] || 0) + 1;

      if (unit.allowedUpgrades && unit.allowedUpgrades.length) {
        unit.allowedUpgrades.forEach(typeKey => {
          const selectedUpgrade = allUpgrades[typeKey]?.find(u => u.name === unit.selectedUpgrades[typeKey]);
          if (selectedUpgrade) totalPoints += selectedUpgrade.points || 0;
        });
      }
    });

    armyContainerEl.appendChild(section);
  }

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
