// === Global Elements ===
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
const upgradesData = {}; // store loaded upgrades by type
const rankOrder = ["commander", "operative", "corps", "specialforces", "support", "heavy"];

// === Load Unit Data ===
fetch('data/units.json')
  .then(res => res.json())
  .then(data => {
    units = data.units;
    console.log("Units loaded:", units);
    newArmyBtn.disabled = false;
    loadAllUpgradeFiles();
  })
  .catch(err => console.error('Error loading unit data:', err));

// === Load all upgrade JSONs dynamically ===
function loadAllUpgradeFiles() {
  const types = ["gear", "force", "command"]; // extend as needed
  types.forEach(type => {
    fetch(`data/upgrades_${type}.json`)
      .then(res => res.json())
      .then(data => {
        upgradesData[type] = data.upgrades;
        console.log(`Loaded ${type} upgrades`, upgradesData[type]);
      })
      .catch(err => console.error(`Error loading upgrades_${type}.json:`, err));
  });
}

// === Faction modal selection ===
modalFactionButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedFaction = btn.dataset.faction;
    factionModalEl.classList.remove('active'); 
    displayUnits(selectedFaction);
  });
});

// === Display Units for Selected Faction ===
function displayUnits(faction) {
  unitGridEl.innerHTML = '';
  const filtered = units
    .filter(u => u.faction.toLowerCase() === faction.toLowerCase())
    .sort((a, b) => rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));

  if (filtered.length === 0) {
    unitGridEl.innerHTML = `<p>No units found for ${capitalize(faction === 'gar' ? 'Republic' : faction)}.</p>`;
    return;
  }

  filtered.forEach(unit => {
    const card = document.createElement('div');
    card.classList.add('unit-card');
    card.innerHTML = `
      <img src="${unit.image}" alt="${unit.name}" />
      <h4>${unit.name}</h4>
      <p>Rank: ${capitalize(unit.rank)}</p>
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

    // Insert rankSection in correct order
    const rankIndex = rankOrder.indexOf(rank);
    let inserted = false;
    document.querySelectorAll('.rank-section').forEach(section => {
      const existingIndex = rankOrder.indexOf(section.dataset.rank);
      if (!inserted && rankIndex < existingIndex) {
        armyContainerEl.insertBefore(rankSection, section);
        inserted = true;
      }
    });
    if (!inserted) armyContainerEl.appendChild(rankSection);
  }
  return rankSection;
}

function addUnitToArmy(unit) {
  const armyUnit = {
    ...unit,
    selectedUpgrades: {},
    currentPoints: unit.points
  };

  currentArmy.push(armyUnit);
  const rankSection = getOrCreateRankSection(unit.rank);
  const rankList = rankSection.querySelector('.rank-list');

  const unitEl = document.createElement('div');
  unitEl.classList.add('army-unit');
  unitEl.style.display = "flex";
  unitEl.style.alignItems = "flex-start";
  unitEl.style.marginBottom = "10px";

  // Unit image
  const img = document.createElement('img');
  img.src = unit.image;
  img.alt = unit.name;
  img.style.width = "60px";
  img.style.height = "60px";
  img.style.marginRight = "10px";
  unitEl.appendChild(img);

  // Info container
  const infoDiv = document.createElement('div');
  infoDiv.classList.add('unit-info');

  const namePts = document.createElement('span');
  namePts.textContent = `${unit.name} (${armyUnit.currentPoints} pts)`;
  infoDiv.appendChild(namePts);

  // Upgrade images container
  const upgradeImagesDiv = document.createElement('div');
  upgradeImagesDiv.classList.add('upgrade-images');
  upgradeImagesDiv.style.marginTop = "5px";
  infoDiv.appendChild(upgradeImagesDiv);

  // Upgrades dropdowns
  if (unit.allowedUpgrades && unit.allowedUpgrades.length) {
    unit.allowedUpgrades.forEach(upgType => {
      const typeContainer = document.createElement('div');
      typeContainer.classList.add('upgrade-type');
      typeContainer.style.marginTop = "5px";

      const typeBtn = document.createElement('button');
      typeBtn.textContent = capitalize(upgType);
      typeBtn.classList.add('upgrade-type-btn');
      typeBtn.style.marginBottom = "2px";

      const menu = document.createElement('div');
      menu.classList.add('upgrade-menu');
      menu.style.maxHeight = "0";
      menu.style.overflow = "hidden";
      menu.style.transition = "max-height 0.3s ease";

      const availableUpgrades = upgradesData[upgType] || [];
      availableUpgrades.forEach(upg => {
        const btn = document.createElement('button');
        btn.classList.add('upgrade-btn');
        btn.dataset.upgrade = upg.id;
        btn.textContent = upg.name;
        btn.style.display = "block";
        btn.style.marginBottom = "2px";

        btn.addEventListener('click', () => {
          // deselect previous upgrade of this type
          const prevId = armyUnit.selectedUpgrades[upgType];
          if (prevId) {
            const prevBtn = menu.querySelector(`button[data-upgrade="${prevId}"]`);
            if (prevBtn) prevBtn.classList.remove('selected');
            const prevImg = upgradeImagesDiv.querySelector(`img[data-upgrade="${prevId}"]`);
            if (prevImg) upgradeImagesDiv.removeChild(prevImg);
            const prevUpgrade = availableUpgrades.find(u => u.id === prevId);
            if (prevUpgrade) armyUnit.currentPoints -= prevUpgrade.points;
          }

          // select new upgrade
          armyUnit.selectedUpgrades[upgType] = upg.id;
          armyUnit.currentPoints += upg.points;
          btn.classList.add('selected');

          const upgImg = document.createElement('img');
          upgImg.src = upg.image || '';
          upgImg.alt = upg.name;
          upgImg.dataset.upgrade = upg.id;
          upgImg.style.width = "30px";
          upgImg.style.height = "30px";
          upgImg.style.marginRight = "5px";
          upgradeImagesDiv.appendChild(upgImg);

          namePts.textContent = `${armyUnit.name} (${armyUnit.currentPoints} pts)`;
          updateArmySummary();

          // close menu after selection with smooth collapse
          menu.style.maxHeight = "0";
        });

        menu.appendChild(btn);
      });

      typeBtn.addEventListener('click', () => {
        if (menu.style.maxHeight === "0px" || menu.style.maxHeight === "") {
          menu.style.maxHeight = menu.scrollHeight + "px";
        } else {
          menu.style.maxHeight = "0";
        }
      });

      typeContainer.appendChild(typeBtn);
      typeContainer.appendChild(menu);
      infoDiv.appendChild(typeContainer);
    });
  }

  unitEl.appendChild(infoDiv);

  // Remove button
  const removeBtn = document.createElement('button');
  removeBtn.textContent = '✕';
  removeBtn.classList.add('remove-unit');
  removeBtn.addEventListener('click', () => {
    currentArmy = currentArmy.filter(u => u !== armyUnit);
    unitEl.remove();
    updateRankCount(unit.rank);
    checkEmptyRankSections();
    updateArmySummary();
  });
  removeBtn.style.marginLeft = "10px";
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
  const totalPoints = currentArmy.reduce((sum, u) => sum + u.currentPoints, 0);
  armySummaryEl.textContent = `Total Units: ${totalUnits} | Total Points: ${totalPoints}`;
}

// === Army Buttons ===
newArmyBtn.addEventListener('click', () => factionModalEl.classList.add('active'));
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
