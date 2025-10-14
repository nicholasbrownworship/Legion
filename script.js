// === Global Elements ===
const factionListEl = document.getElementById('faction-list');
const unitGridEl = document.getElementById('unit-grid');
const armyContainerEl = document.getElementById('army-container');
const armySummaryEl = document.getElementById('army-summary');
const newArmyBtn = document.getElementById('new-army');
const resetArmyBtn = document.getElementById('reset-army');
const saveArmyBtn = document.getElementById('save-army');
const loadArmyBtn = document.getElementById('load-army');
const factionModalEl = document.getElementById('faction-modal');
const modalContentEl = factionModalEl.querySelector('.modal-content');
const modalFactionButtons = modalContentEl.querySelectorAll('button[data-faction]');

// === Global Data ===
let units = [];
let currentArmy = [];
let selectedFaction = null;

// === Load Unit Data ===
fetch('data/units.json')
  .then(res => res.json())
  .then(data => {
    units = data.units;
    console.log("Units loaded:", units);
    newArmyBtn.disabled = false; // enable New Army button
    populateSidebarFactionList();
  })
  .catch(err => console.error('Error loading unit data:', err));

// === Attach modal button click listeners ===
modalFactionButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedFaction = btn.dataset.faction;
    factionModalEl.classList.remove('active'); // use class toggle instead of style
    displayUnits(selectedFaction);
  });
});

// === Sidebar Faction Buttons ===
function populateSidebarFactionList() {
  const factions = ['rebels', 'imperials', 'cis', 'gar']; // hard-coded sidebar
  factionListEl.innerHTML = '';
  factions.forEach(faction => {
    const btn = document.createElement('button');
    btn.textContent = capitalize(faction === 'gar' ? 'Republic' : faction);
    btn.addEventListener('click', () => {
      selectedFaction = faction;
      displayUnits(selectedFaction);
    });
    factionListEl.appendChild(btn);
  });
}

// === Display Units for Selected Faction ===
function displayUnits(faction) {
  unitGridEl.innerHTML = '';
  const filtered = units.filter(u => u.faction.toLowerCase() === faction.toLowerCase());
  console.log("Selected faction:", faction);
  console.log("Units found:", filtered.map(u => u.name));

  if (filtered.length === 0) {
    unitGridEl.innerHTML = `<p>No units found for ${capitalize(faction === 'gar' ? 'Republic' : faction)}.</p>`;
    return;
  }

  filtered.forEach(unit => {
    const card = document.createElement('div');
    card.classList.add('unit-card');
    card.innerHTML = `
      <h4>${unit.name}</h4>
      <p>Rank: ${unit.rank}</p>
      <p>Points: ${unit.points}</p>
      <button class="add-unit">Add</button>
    `;
    card.querySelector('.add-unit').addEventListener('click', () => addUnitToArmy(unit));
    unitGridEl.appendChild(card);
  });
}

// === Army Management ===
function getOrCreateRankSection(rank) {
  let rankSection = document.querySelector(`.rank-section[data-rank="${rank}"]`);
  if (!rankSection) {
    rankSection = document.createElement('div');
    rankSection.classList.add('rank-section');
    rankSection.dataset.rank = rank;

    const header = document.createElement('h3');
    header.textContent = `${capitalize(rank)} (0)`;
    rankSection.appendChild(header);

    const list = document.createElement('div');
    list.classList.add('rank-list');
    rankSection.appendChild(list);

    armyContainerEl.appendChild(rankSection);
  }
  return rankSection;
}

function addUnitToArmy(unit) {
  currentArmy.push(unit);

  const rankSection = getOrCreateRankSection(unit.rank);
  const rankList = rankSection.querySelector('.rank-list');

  const unitEl = document.createElement('div');
  unitEl.classList.add('army-unit');
  unitEl.textContent = `${unit.name} (${unit.points} pts)`;

  const removeBtn = document.createElement('button');
  removeBtn.textContent = '✕';
  removeBtn.classList.add('remove-unit');
  removeBtn.addEventListener('click', () => {
    currentArmy = currentArmy.filter(u => u !== unit);
    unitEl.remove();
    updateRankCount(unit.rank);
    checkEmptyRankSections();
    updateArmySummary();
  });

  unitEl.appendChild(removeBtn);
  rankList.appendChild(unitEl);

  updateRankCount(unit.rank);
  updateArmySummary();
}

// === Rank & Summary Updates ===
function updateRankCount(rank) {
  const rankSection = document.querySelector(`.rank-section[data-rank="${rank}"]`);
  if (!rankSection) return;
  const count = currentArmy.filter(u => u.rank === rank).length;
  rankSection.querySelector('h3').textContent = `${capitalize(rank)} (${count})`;
}

function checkEmptyRankSections() {
  document.querySelectorAll('.rank-section').forEach(section => {
    const list = section.querySelector('.rank-list');
    if (!list.children.length) section.remove();
  });
}

function updateArmySummary() {
  const totalUnits = currentArmy.length;
  const totalPoints = currentArmy.reduce((sum, u) => sum + u.points, 0);
  armySummaryEl.textContent = `Total Units: ${totalUnits} | Total Points: ${totalPoints}`;
}

// === Army Buttons ===
newArmyBtn.addEventListener('click', () => {
  factionModalEl.classList.add('active'); // use class toggle
});

resetArmyBtn.addEventListener('click', () => {
  if (confirm('Clear current army?')) {
    currentArmy = [];
    armyContainerEl.innerHTML = '';
    updateArmySummary();
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

// === Close Modal on Outside Click ===
window.addEventListener('click', e => {
  if (e.target === factionModalEl) factionModalEl.classList.remove('active');
});

// === Utility ===
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
