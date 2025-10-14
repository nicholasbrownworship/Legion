// === Global Elements ===
const factionModal = document.getElementById('faction-modal');
const newArmyBtn = document.getElementById('new-army');
const resetArmyBtn = document.getElementById('reset-army');
const unitGridEl = document.getElementById('unit-grid');
const armyContainerEl = document.getElementById('army-container');

// === Global Variables ===
let army = [];
let currentFaction = null;

// === Show Faction Modal ===
function showFactionModal() {
  factionModal.style.display = 'block';
}

// === Faction Buttons ===
factionModal.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFaction = btn.dataset.faction;
    factionModal.style.display = 'none';
    console.log('Faction selected:', currentFaction);
    army = [];
    renderUnits();
    renderArmy();
  });
});

// === Render Units (Dummy for testing) ===
function renderUnits() {
  unitGridEl.innerHTML = '';
  if (!currentFaction) return;
  const units = [
    { name: 'Unit 1', points: 10 },
    { name: 'Unit 2', points: 20 }
  ];
  units.forEach(unit => {
    const card = document.createElement('div');
    card.className = 'unit-card';
    card.innerHTML = `
      <h3>${unit.name}</h3>
      <p>Points: ${unit.points}</p>
      <button>Add to Army</button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      army.push(unit);
      renderArmy();
    });
    unitGridEl.appendChild(card);
  });
}

// === Render Army (Dummy) ===
function renderArmy() {
  armyContainerEl.innerHTML = '';
  army.forEach(u => {
    const div = document.createElement('div');
    div.textContent = `${u.name} (${u.points} pts)`;
    armyContainerEl.appendChild(div);
  });
}

// === Buttons ===
newArmyBtn.addEventListener('click', showFactionModal);

resetArmyBtn.addEventListener('click', () => {
  army = [];
  renderArmy();
});
