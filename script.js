// === Global Variables ===
let factionListEl = document.getElementById('faction-list');
let unitGridEl = document.getElementById('unit-grid');
let armyContainerEl = document.getElementById('army-container');
let armySummaryEl = document.getElementById('army-summary');
let saveArmyBtn = document.getElementById('save-army');
let loadArmyBtn = document.getElementById('load-army');
let newArmyBtn = document.getElementById('new-army');
let resetBtn = document.getElementById('reset-army');

let currentFaction = null;
let army = [];
let draggingIndex = null;
let placeholderEl = null;

// === Example data ===
const units = [
  { id: "rebel_trooper", name: "Rebel Troopers", type: "Trooper", points: 40, upgrades: ["Heavy Weapon", "Personnel"] },
  { id: "fleet_trooper", name: "Fleet Troopers", type: "Trooper", points: 44, upgrades: ["Heavy Weapon", "Personnel"] },
  { id: "at_rt", name: "AT-RT", type: "Vehicle", points: 55, upgrades: ["Hardpoint"] },
  { id: "stormtrooper", name: "Stormtroopers", type: "Trooper", points: 44, upgrades: ["Heavy Weapon", "Personnel"] },
  { id: "speeder_bike", name: "74-Z Speeder Bikes", type: "Vehicle", points: 75, upgrades: ["Comms"] },
];

const factions = {
  Rebels: ["rebel_trooper", "fleet_trooper", "at_rt"],
  Imperials: ["stormtrooper", "speeder_bike"]
};

// === Initialization ===
document.addEventListener("DOMContentLoaded", () => {
  renderFactionList();
  attachContainerDnDHandlers();
});

// === Render Factions ===
function renderFactionList() {
  factionListEl.innerHTML = "";
  Object.keys(factions).forEach(faction => {
    const btn = document.createElement("button");
    btn.textContent = faction;
    btn.onclick = () => selectFaction(faction);
    factionListEl.appendChild(btn);
  });
}

// === Select Faction ===
function selectFaction(faction) {
  currentFaction = faction;
  unitGridEl.innerHTML = "";
  const factionUnits = factions[faction].map(id => units.find(u => u.id === id));

  factionUnits.forEach(unit => {
    const card = document.createElement("div");
    card.className = "unit-card";
    card.innerHTML = `
      <h4>${unit.name}</h4>
      <p>${unit.type} • ${unit.points} pts</p>
      <small>Upgrades: ${unit.upgrades.join(", ")}</small>
      <button>Add</button>
    `;
    card.querySelector("button").onclick = () => addUnitToArmy(unit);
    unitGridEl.appendChild(card);
  });
}

// === Add Unit ===
function addUnitToArmy(unit) {
  army.push({ ...unit });
  renderArmy();
}

// === Render Army ===
function renderArmy() {
  armyContainerEl.innerHTML = "";

  army.forEach((unit, index) => {
    const card = document.createElement("div");
    card.className = "army-unit";
    card.draggable = true;
    card.dataset.index = index;
    card.innerHTML = `
      <h4>${unit.name}</h4>
      <p>${unit.type} • ${unit.points} pts</p>
      <small>Upgrades: ${unit.upgrades.join(", ")}</small>
      <button class="remove-btn">Remove</button>
    `;

    // Drag handlers
    card.addEventListener("dragstart", e => {
      draggingIndex = index;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      placeholderEl?.remove();
      placeholderEl = null;
      draggingIndex = null;
    });

    card.querySelector(".remove-btn").onclick = () => removeUnit(index);
    armyContainerEl.appendChild(card);
  });

  updateSummary();
}

// === Update Summary ===
function updateSummary() {
  const total = army.reduce((sum, u) => sum + u.points, 0);
  armySummaryEl.textContent = `Total: ${total} pts`;
}

// === Remove Unit ===
function removeUnit(index) {
  army.splice(index, 1);
  renderArmy();
}

// === Reset Army ===
resetBtn.addEventListener("click", () => {
  army = [];
  renderArmy();
  console.log("Army reset.");
});

// === New Army ===
newArmyBtn.addEventListener("click", () => {
  currentFaction = null;
  army = [];
  renderArmy();
  unitGridEl.innerHTML = "";
  factionListEl.innerHTML = "";
  renderFactionList();
  console.log("Started new army.");
});

// === Save / Load ===
saveArmyBtn.addEventListener("click", () => {
  localStorage.setItem("armyList", JSON.stringify({ faction: currentFaction, army }));
  console.log("Army saved!");
});

loadArmyBtn.addEventListener("click", () => {
  const data = JSON.parse(localStorage.getItem("armyList"));
  if (!data) return;
  currentFaction = data.faction;
  army = data.army;
  renderArmy();
  console.log("Army loaded!");
});

// === Drag and Drop Reordering ===
function attachContainerDnDHandlers() {
  armyContainerEl.addEventListener("dragover", e => {
    e.preventDefault();
    const afterEl = getDragAfterElement(armyContainerEl, e.clientY);
    if (!placeholderEl) {
      placeholderEl = document.createElement("div");
      placeholderEl.className = "drag-placeholder";
      placeholderEl.style.height = "50px";
      placeholderEl.style.margin = "6px 0";
      placeholderEl.style.border = "2px dashed #888";
      placeholderEl.style.borderRadius = "8px";
    }
    if (!afterEl) {
      armyContainerEl.appendChild(placeholderEl);
    } else {
      armyContainerEl.insertBefore(placeholderEl, afterEl);
    }
  });

  armyContainerEl.addEventListener("drop", e => {
    e.preventDefault();
    if (draggingIndex == null) return;

    const children = Array.from(armyContainerEl.querySelectorAll(".army-unit"));
    let targetIndex = children.findIndex(c => c === placeholderEl);
    if (targetIndex === -1) targetIndex = children.length;

    const [moved] = army.splice(draggingIndex, 1);
    army.splice(targetIndex, 0, moved);

    placeholderEl?.remove();
    placeholderEl = null;
    draggingIndex = null;

    renderArmy();
  });

  armyContainerEl.addEventListener("dragleave", e => {
    const rect = armyContainerEl.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.bottom) {
      placeholderEl?.remove();
      placeholderEl = null;
    }
  });
}

function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll(".army-unit:not(.dragging)")];
  return elements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}
