// === Global Elements ===
const factionListEl = document.getElementById('faction-list');
const unitGridEl = document.getElementById('unit-grid');
const armyContainerEl = document.getElementById('army-container');
const armySummaryEl = document.getElementById('army-summary');
const newArmyBtn = document.getElementById('new-army');
const resetArmyBtn = document.getElementById('reset-army');
const saveArmyBtn = document.getElementById('save-army');
const loadArmyBtn = document.getElementById('load-army');
const factionModal = document.getElementById('faction-modal');

// === Global Data ===
let units = [];
let currentArmy = [];
let selectedFaction = null;

// === Load Unit Data ===
fetch('units.json')
  .then(res => res.json())
  .then(data => {
    units = data.units;
    populateFactionList();
  })
  .catch(err => console.error('Error loading unit data:', err));

// === Populate Faction List ===
function populateFactionList() {
  const factions = [...new Set(units.map(u => u.faction))];
  factionListEl.innerHTML = '';
  factions.forEach(faction => {
    const btn = document.createElement('button');
    btn.textContent = faction;
    btn.dataset.faction = faction;
    factionListEl.appendChild(btn);
  });
}

// === Display Units for Selected Faction ===
function displayUnits(faction) {
  unitGridEl.innerHTML = '';
  const filtered = units.filter(u => u.faction === faction);
  filtered.forEach(unit => {
    const card = document.createElement('div');
    card.classList.add('unit-card');
    card.innerHTML = `
      <h4>${unit.name}</h4>
      <p>${unit.rank}</p>
      <p>${unit.points} pts</p>
      <button class="add-unit">Add</button>
    `;

    card.querySelector('.add-unit').addEventListener('click', () => {
      addUnitToArmy(unit);
    });

    unitGridEl.appendChild(card);
  });
}

// === Rank Section Management ===
function getOrCreateRankSection(rank) {
  let rankSection = document.querySelector(`.rank-section[data-rank="${rank}"]`);
  if (!rankSection) {
    rankSection = document.createElement('div');
    rankSection.classList.add('rank-section');
    rankSection.dataset.rank = rank;

    const header = document.createElement('h3');
    header.textContent = rank;
    rankSection.appendChild(header);

    const list = document.createElement('div');
    list.classList.add('rank-list');
    rankSection.appendChild(list);

    armyContainerEl.appendChild(rankSection);
  }
  return rankSection.querySelector('.rank-list');
}

function addUnitToArmy(unit) {
  const rankList = getOrCreateRankSection(unit.rank);

  const unitEl = document.createElement('div');
  unitEl.classList.add('army-unit');
  unitEl.textContent = `${unit.name} (${unit.points} pts)`;

  const removeBtn = document.createElement('button');
  removeBtn.textContent = '✕';
  removeBtn.classList.add('remove-unit');
  removeBtn.addEventListener('click', () => {
    unitEl.remove();
    currentArmy = currentArmy.filter(u => u !== unit);
    checkEmptyRankSections();
    updateArmySummary();
  });

  unitEl.appendChild(removeBtn);
  rankList.appendChild(unitEl);
  currentArmy.push(unit);
  updateArmySummary();
}

function checkEmptyRankSections() {
  document.querySelectorAll('.rank-section').forEach(section => {
    const list = section.querySelector('.rank-list');
    if (!list.children.length) section.remove();
  });
}

// === Update Summary ===
function updateArmySummary() {
  const totalPoints = currentArmy.reduce((sum, u) => sum + u.points, 0);
  const totalUnits = currentArmy.length;
  armySummaryEl.textContent = `Total Units: ${totalUnits} | Total Points: ${totalPoints}`;
}

// === Army Management Buttons ===
newArmyBtn.addEventListener('click', () => {
  currentArmy = [];
  armyContainerEl.innerHTML = '';
  armySummaryEl.textContent = 'Total Units: 0 | Total Points: 0';
  if (factionModal) factionModal.style.display = 'flex';
});

resetArmyBtn.addEventListener('click', () => {
  if (confirm('Clear current army?')) {
    currentArmy = [];
    armyContainerEl.innerHTML = '';
    armySummaryEl.textContent = 'Total Units: 0 | Total Points: 0';
  }
});

saveArmyBtn.addEventListener('click', () => {
  localStorage.setItem('savedArmy', JSON.stringify(currentArmy));
  alert('Army saved!');
});

loadArmyBtn.addEventListener('click', () => {
  const saved = JSON.parse(localStorage.getItem('savedArmy') || '[]');
  if (!saved.length) return alert('No saved army found!');
  currentArmy = [];
  armyContainerEl.innerHTML = '';
  saved.forEach(unit => addUnitToArmy(unit));
});

// === Modal Logic ===
window.addEventListener('DOMContentLoaded', () => {
  if (factionModal) factionModal.style.display = 'none';
});

// Event delegation for modal faction buttons
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-faction]')) {
    const faction = e.target.dataset.faction;
    selectedFaction = faction;
    if (factionModal) factionModal.style.display = 'none';
    displayUnits(faction);
  }
});
