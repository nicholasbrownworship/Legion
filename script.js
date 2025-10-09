const factionListEl = document.getElementById('faction-list');
const unitGridEl = document.getElementById('unit-grid');
const armyContainerEl = document.getElementById('army-container');
const searchInput = document.getElementById('search-input');
const saveArmyBtn = document.getElementById('save-army');
const loadArmyBtn = document.getElementById('load-army');

let data = {};
let currentFaction = null;
let army = [];

// Load JSON data
fetch('units.json')
  .then(res => res.json())
  .then(json => {
    data = json;
    renderFactions();
    renderUnits();
  });

// Render factions in sidebar
function renderFactions(){
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
function renderUnits(){
  unitGridEl.innerHTML = '';
  let units = data.units;
  if(currentFaction) units = units.filter(u => u.faction === currentFaction);
  const searchTerm = searchInput.value.toLowerCase();
  if(searchTerm) units = units.filter(u => u.name.toLowerCase().includes(searchTerm));

  units.forEach(unit => {
    const card = document.createElement('div');
    card.className = 'unit-card';

    const img = document.createElement('img');
    img.src = 'images/placeholder.png'; // placeholder image
    card.appendChild(img);

    const name = document.createElement('div');
    name.textContent = `${unit.name} (${unit.points} pts)`;
    card.appendChild(name);

    if(unit.upgrades && unit.upgrades.length > 0){
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

// Army builder
function addToArmy(unit){
  army.push(unit);
  renderArmy();
}

function renderArmy(){
  armyContainerEl.innerHTML = '';
  army.forEach((unit, index) => {
    const card = document.createElement('div');
    card.className = 'unit-card';
    card.textContent = `${unit.name} (${unit.points} pts)`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      army.splice(index, 1);
      renderArmy();
    });
    card.appendChild(removeBtn);
    armyContainerEl.appendChild(card);
  });
}

// Save / Load army
saveArmyBtn.addEventListener('click', () => {
  localStorage.setItem('savedArmy', JSON.stringify(army));
  alert('Army saved!');
});
loadArmyBtn.addEventListener('click', () => {
  const saved = localStorage.getItem('savedArmy');
  if(saved){
    army = JSON.parse(saved);
    renderArmy();
    alert('Army loaded!');
  }
});