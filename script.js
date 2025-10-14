// === Global Elements ===
const factionListEl = document.getElementById('faction-list');
const unitGridEl = document.getElementById('unit-grid');
const armyContainerEl = document.getElementById('army-container');
const armySummaryEl = document.getElementById('army-summary');
const newArmyBtn = document.getElementById('new-army');
const resetArmyBtn = document.getElementById('reset-army');
const saveArmyBtn = document.getElementById('save-army');
const loadArmyBtn = document.getElementById('load-army');
const searchInputEl = document.getElementById('search-input');
const factionModalEl = document.getElementById('faction-modal');

// === Global Data ===
let units = [];
let currentArmy = [];
let selectedFaction = null;

// === Load Unit Data ===
fetch('units.json')
  .then(res => res.json())
  .then(data => {
    units = data.units;
    populateFactionButtons();
  })
  .catch(err => console.error('Error loading unit data:', err));

// === Faction Modal Functions ===
newArmyBtn.addEventListener('click', () => {
  factionModalEl.style.display = 'flex';
});

function populateFactionButtons() {
  const modalButtons = factionModalEl.querySelectorAll('button[data-faction]');
  modalButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFaction = btn.dataset.faction;
      factionModalEl.style.display = 'none';
      displayUnits(selectedFaction);
      updateFactionList(); // Update sidebar faction buttons
    });
  });
}

// === Populate Sidebar Faction List ===
function updateFactionList() {
  factionListEl.innerHTML = '';
  const factions = [...new Set(units.map(u => u.faction))];
  factions.forEach(faction => {
    const btn = document.createElement('button');
    btn.textContent = faction;
    btn.addEventListener('click', () => {
      selectedFaction = faction;
      displayUnits(faction);
    });
    factionListEl.appendChild(btn);
  });
}

// === Display Units ===
function displayUnits(faction) {
  unitGridEl.innerHTML = '';
  let filteredUnits = units.filter(u => u.faction === faction);

  const searchTerm = searchInputEl.value.trim().toLowerCase();
  if (searchTerm) {
    filteredUnits = filteredUnits.filter(u =>
      u.name.toLowerCase().includes(searchTerm)
    );
  }

  filteredUnits.forEach(unit => {
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

// === Search Units ===
searchInputEl.addEventListener('input', () => {
  if (selectedFaction) displayUnits(selectedFaction);
});

// === Army Management Functions ===
function getOrCreateRankSection(rank) {
  let section = document.querySelector(`.rank-section[data-rank="${rank}"]`);
  if (!section) {
    section = document.createElement('div');
    section.classList.add('rank-section');
    section.dataset.rank = rank;

    const header = document.createElement('h3');
    header.textContent = rank;
    section.appendChild(header);

    const list = document.createElement('div');
    list.classList.add('rank-list');
    section.appendChild(list);

    armyContainerEl.appendChild(section);
  }
  return section.querySelector('.rank-list');
}

function addUnitToArmy(unit) {
  const rankList = getOrCreateRankSection(unit.rank);

  const unitEl = document.createElement('div');
  unitEl.classList.add('army-unit');
  unitEl.textContent = `${unit.name} (${unit.points} pts)`;

  const removeBtn = document.createElement('button');
  removeBtn.classList.add('remove-unit');
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', () => {
    unitEl.remove();
    currentArmy = currentArmy.filter(u => u !== unit);
    removeEmptyRankSections();
    updateArmySummary();
  });

  unitEl.appendChild(removeBtn);
  rankList.appendChild(unitEl);
  currentArmy.push(unit);
  updateArmySummary();
}

function removeEmptyRankSections() {
  document.querySelectorAll('.rank-section').forEach(section => {
    const list = section.querySelector('.rank-list');
    if (!list.children.length) section.remove();
  });
}

function updateArmySummary() {
  const totalPoints = currentArmy.reduce((sum, u) => sum + u.points, 0);
  const totalUnits = currentArmy.length;
  armySummaryEl.textContent = `Total Units: ${totalUnits} | Total Points: ${totalPoints}`;
}

// === Army Buttons ===
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

// === Close Modal if Click Outside ===
window.addEventListener('click', e => {
  if (e.target === factionModalEl) {
    factionModalEl.style.display = 'none';
  }
});
