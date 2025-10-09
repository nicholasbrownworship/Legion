const factionSelect = document.getElementById('faction-select');
const unitsContainer = document.getElementById('units-container');

let units = [];

// Load units from JSON
fetch('units.json')
  .then(response => response.json())
  .then(data => {
    units = data;
    populateFactionDropdown();
  });

// Populate factions dynamically
function populateFactionDropdown() {
  const factions = [...new Set(units.map(u => u.faction))];
  factions.forEach(f => {
    const option = document.createElement('option');
    option.value = f;
    option.textContent = f;
    factionSelect.appendChild(option);
  });
}

// Update unit list when faction changes
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
    unitsContainer.appendChild(div);
  });
}