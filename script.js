// === Global Variables ===
let allUnits = [];
let allUpgrades = {}; // cached by lowercase type key
let army = [];
let currentFaction = null;
let initComplete = false;

// === Upgrade Types Map ===
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

// === Load JSON ===
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

// === Init ===
async function init() {
  try {
    const unitsData = await loadJSON('data/units.json');
    allUnits = unitsData.units || [];

    // Load upgrades
    for (const [typeKey, file] of Object.entries(upgradeFileMap)) {
      const data = await loadJSON(`data/${file}`);
      allUpgrades[typeKey] = (data.upgrades || []).map(upg => ({
        ...upg,
        typeKey // store the lowercase type key for filtering
      }));
    }

    initComplete = true;
    document.getElementById('new-army').disabled = false;
  } catch (err) {
    console.error('Failed to initialize', err);
  }
}

// === Filter Upgrades for a Unit ===
function filterUpgradesForUnit(unit, upgrades) {
  return upgrades.filter(up => {
    const factionOK =
      !up.factions ||
      up.factions.length === 0 ||
      up.factions.map(f => f.toLowerCase()).includes(unit.faction.toLowerCase());
    const restrictionOK =
      !up.restrictions ||
      up.restrictions.length === 0 ||
      up.restrictions.map(r => r.toLowerCase()).includes(unit.rank.toLowerCase());
    return factionOK && restrictionOK;
  });
}

// === Add Unit ===
function addUnitToArmy(unit) {
  const unitCopy = { ...unit, selectedUpgrades: {} };

  (unit.allowedUpgrades || []).forEach(typeKey => {
    const upgradesForType = allUpgrades[typeKey] || [];
    const filtered = filterUpgradesForUnit(unit, upgradesForType);
    if (filtered.length) unitCopy.selectedUpgrades[typeKey] = '';
  });

  army.push(unitCopy);
  renderArmy();
}

// === Render Army ===
function renderArmy() {
  const container = document.getElementById('army-container');
  container.innerHTML = '';
  let totalPoints = 0;

  army.forEach((unit, i) => {
    totalPoints += unit.points;
    const div = document.createElement('div');
    div.className = 'army-unit';
    div.innerHTML = `<h3>${unit.name} (${unit.points} pts)</h3>`;

    const upgradeContainer = document.createElement('div');
    upgradeContainer.className = 'upgrades';

    (unit.allowedUpgrades || []).forEach(typeKey => {
      const upgradesForType = allUpgrades[typeKey] || [];
      const filtered = filterUpgradesForUnit(unit, upgradesForType);

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
        unit.selectedUpgrades[typeKey] = e.target.value;
        renderArmy();
      });

      upgradeContainer.appendChild(select);

      const selected = filtered.find(u => u.name === unit.selectedUpgrades[typeKey]);
      if (selected) totalPoints += selected.points || 0;
    });

    div.appendChild(upgradeContainer);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => {
      army.splice(i, 1);
      renderArmy();
    };
    div.appendChild(removeBtn);

    container.appendChild(div);
  });

  document.getElementById('army-summary').innerHTML = `<div>Total Points: ${totalPoints}</div>`;
}

// === Buttons ===
document.getElementById('new-army').onclick = () => {
  document.getElementById('faction-modal').style.display = 'block';
};
document.getElementById('reset-army').onclick = () => { army = []; renderArmy(); };
document.getElementById('save-army').onclick = () => { localStorage.setItem('savedArmy', JSON.stringify(army)); alert('Saved!'); };
document.getElementById('load-army').onclick = () => { army = JSON.parse(localStorage.getItem('savedArmy') || '[]'); renderArmy(); };

// === Faction Selection ===
document.querySelectorAll('#faction-modal button').forEach(btn => {
  btn.onclick = () => {
    const faction = btn.dataset.faction.toLowerCase();
    army = [];
    renderUnitsForFaction(faction);
    document.getElementById('faction-modal').style.display = 'none';
  };
});

// === Render Units ===
function renderUnitsForFaction(faction) {
  currentFaction = faction;
  const grid = document.getElementById('unit-grid');
  grid.innerHTML = '';
  allUnits
    .filter(u => u.faction.toLowerCase() === faction)
    .forEach(unit => {
      const card = document.createElement('div');
      card.className = 'unit-card';
      card.innerHTML = `<h3>${unit.name}</h3><p>${unit.points} pts</p><button>Add</button>`;
      card.querySelector('button').onclick = () => addUnitToArmy(unit);
      grid.appendChild(card);
    });
}

// === Initialize ===
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('new-army').disabled = true;
  await init();
  document.getElementById('new-army').disabled = false;
});
