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

    // If there's a saved army in
