const factionSelect = document.getElementById('faction-select');
const unitsContainer = document.getElementById('units-container');
const armyContainer = document.getElementById('army-container');

let units = [];
let army = [];

// Load units from JSON
fetch('units.json')
  .then(response => response.json())
  .then(data => {
    units = data;
    populateFactionDropdown();
  });

// Populate faction dropdown
function populateFactionDropdown() {
  const factions = [...new Set(units.map(u => u.faction))];
  factions.forEach(f => {
    const option = document.createElement('option');
    option.value = f;
    option.textContent = f;
    factionSelect.appendChild(option);
  });
}

// Filter units by faction
factionSelect.addEventListener('change', () => {
  const selectedFaction = factionSelect.value;
  displayUnits(selectedFaction);
});

function displayUnits(faction) {
  unitsContainer.innerHTML = '';
  const filtered = faction ? units.filter(u => u.faction === faction) : units;
  filtered.forEach(unit => {
    const div = document.createElement('div');
    div.className = 'unit-card';
    div.textContent = unit.name;

    // Upgrade selector
    if(unit.upgrades && unit.upgrades.length > 0){
      const select = document.createElement('select');
      unit.upgrades.forEach(up => {
        const opt = document.createElement('option');
        opt.value = up;
        opt.textContent = up;
        select.appendChild(opt);
      });
      div.appendChild(select);
    }

    // Add button
    const button = document.createElement('button');
    button.textContent = 'Add to Army';
    button.addEventListener('click', () => addToArmy(unit));
    div.appendChild(button);

    unitsContainer.appendChild(div);
  });
}

// Add unit to army
function addToArmy(unit) {
  army.push(unit);
  updateArmyDisplay();
}

// Display army roster
function updateArmyDisplay() {
  armyContainer.innerHTML = '';
  army.forEach((unit, index) => {
    const div = document.createElement('div');
    div.className = 'unit-card';
    div.textContent = unit.name;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      army.splice(index, 1);
      updateArmyDisplay();
    });

    div.appendChild(removeBtn);
    armyContainer.appendChild(div);
  });
}