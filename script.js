const factionListEl = document.getElementById('faction-list');
const unitGridEl = document.getElementById('unit-grid');
const armyContainerEl = document.getElementById('army-container');
const searchInput = document.getElementById('search-input');
const saveArmyBtn = document.getElementById('save-army');
const loadArmyBtn = document.getElementById('load-army');
const armySummaryEl = document.getElementById('army-summary'); // Add this div in your HTML

let data = {};
let currentFaction = null;
let army = [];

// Legion list-building rules
const LIST_RULES = {
  Commander: { min: 1, max: 2 },
  Operative: { min: 0, max: 2 },
  Corps: { min: 3, max: 6 },
  SpecialForces: { min: 0, max: 3 },
  Support: { min: 0, max: 3 },
  Heavy: { min: 0, max: 2 },
};
const MAX_POINTS = 800;

// Load JSON data
fetch('units.json')
  .then(res => res.json())
  .then(json => {
    data = json;
    renderFactions();
    renderUnits();
  });

// Render factions
function renderFactions() {
  factionListEl.innerHTML = '';
  data.factions.forEach(f => {
    const btn = document.createElement('button');
    btn.textContent = f;
    btn.addEventListener('click', () => {
      currentFaction = f;
      renderUnits();
    });
    factionListEl.appendChild(btn);
  });
}

// Render units
function renderUnits() {
  unitGridEl.innerHTML = '';
  let units = data.units;
  if (currentFaction) units = units.filter(u => u.faction === currentFaction);
  const searchTerm = searchInput.value.toLowerCase();
  if (searchTerm) units = units.filter(u => u.name.toLowerCase().includes(searchTerm));

  units.forEach(unit => {
    const card = document.createElement('div');
    card.className = 'unit-card';

    const img = document.createElement('img');
    img.src = 'images/placeholder.png';
    card.appendChild(img);

    const name = document.createElement('div');
    name.textContent = `${unit.name} (${unit.points} pts)`;
    card.appendChild(name);

    const type = document.createElement('div');
    type.textContent = `Type: ${unit.type}`;
    type.className = 'unit-type';
    card.appendChild(type);

    if (unit.upgrades && unit.upgrades.length > 0) {
      const select = document.createElement('select');
      unit.upgrades.forEach(up => {
        const opt = document.createElement('option');
        opt.value = up;
        opt.textContent = up;
        select.appendChild(opt);
      });
      card.appendChild(select);
    }

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add to Army';
    addBtn.addEventListener('click', () => addToArmy(unit));
    card.appendChild(addBtn);

    unitGridEl.appendChild(card);
  });
}

searchInput.addEventListener('input', renderUnits);

// Add unit to army
function addToArmy(unit) {
  army.push(unit);
  renderArmy();
}

// Render army + validation
function renderArmy() {
  armyContainerEl.innerHTML = '';

  let totalPoints = 0;
  const counts = {};

  // Count unit types and points
  army.forEach(u => {
    totalPoints += u.points;
    counts[u.type] = (counts[u.type] || 0) + 1;
  });

  // Display each unit
  army.forEach((unit, index) => {
    const card = document.createElement('div');
    card.className = 'unit-card';
    card.innerHTML = `<strong>${unit.name}</strong> (${unit.points} pts) - <em>${unit.type}</em>`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      army.splice(index, 1);
      renderArmy();
    });
    card.appendChild(removeBtn);
    armyContainerEl.appendChild(card);
  });

  // Validate list-building
  const errors = [];
  for (const [type, rule] of Object.entries(LIST_RULES)) {
    const count = counts[type] || 0;
    if (count < rule.min) errors.push(`Need at least ${rule.min} ${type}.`);
    if (count > rule.max) errors.push(`Too many ${type} units (max ${rule.max}).`);
  }
  if (totalPoints > MAX_POINTS)
    errors.push(`Army exceeds ${MAX_POINTS} points (${totalPoints}).`);

  // Summary display
  armySummaryEl.innerHTML = `
    <div><strong>Total Points:</strong> ${totalPoints} / ${MAX_POINTS}</div>
    <div><strong>Composition:</strong></div>
    <ul>${Object.entries(counts)
      .map(([type, count]) => `<li>${type}: ${count}</li>`)
      .join('')}</ul>
    <div class="errors">${errors.length > 0 ? errors.join('<br>') : '<span style="color:lime;">Valid list</span>'}</div>
  `;
}

// Save / Load
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
