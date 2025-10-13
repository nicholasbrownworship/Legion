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
  Heavy: { min: 0, max: 2 }
};
const MAX_POINTS = 800;

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
  const upgradeTypes = ['commander', 'operative', 'corps', 'specialforces', 'support', 'heavy'];
  for (const type of upgradeTypes) {
    try {
      const data = await loadJSON(`data/upgrades/${type}.json`);
      allUpgrades[type] = data.upgrades;
    } catch (err) {
      console.warn(`No upgrades loaded for type ${type}`, err);
      allUpgrades[type] = [];
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
  
  // Pre-populate upgrades from cached allUpgrades
  if (unit.allowedUpgrades) {
    for (const type of unit.allowedUpgrades) {
      const upgradesForType = allUpgrades[type.toLowerCase()] || [];
      const filtered = upgradesForType.filter(up =>
        up.factions.includes(unit.faction) &&
        (!up.restrictions || up.restrictions.i
