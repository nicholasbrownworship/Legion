// === Full Army Builder Script with Saved Armies Sidebar, Image Zoom & Full Unit Export/Import ===
document.addEventListener('DOMContentLoaded', () => {
  // === Global Elements ===
  const unitGridEl = document.getElementById('unit-grid');
  const armyContainerEl = document.getElementById('army-container');
  const armySummaryEl = document.getElementById('army-summary');
  const newArmyBtn = document.getElementById('new-army');
  const resetArmyBtn = document.getElementById('reset-army');
  const saveArmyBtn = document.getElementById('save-army');
  const loadArmyBtn = document.getElementById('load-army'); // fallback in case of id mismatch
  // try original id
  const loadArmyBtnReal = document.getElementById('load-army');
  if (loadArmyBtnReal) window.loadArmyBtn = loadArmyBtnReal;
  const loadBtnUsed = loadArmyBtnReal || document.getElementById('load-armry') || document.getElementById('load-army');

  // Use loadBtnUsed below for safety
  const loadArmyButton = loadBtnUsed;

  const factionModalEl = document.getElementById('faction-modal');
  const modalContentEl = factionModalEl.querySelector('.modal-content');
  const modalFactionButtons = modalContentEl.querySelectorAll('button[data-faction]');
  const savedArmiesContainer = document.createElement('div');
  savedArmiesContainer.id = 'saved-armies';
  savedArmiesContainer.style.marginTop = '20px';
  savedArmiesContainer.innerHTML = `<h3>Saved Armies</h3>`;
  document.querySelector('.sidebar').appendChild(savedArmiesContainer);

  // === Global Data ===
  let units = []; // all units loaded for the faction (including multi)
  let currentArmy = [];
  let selectedFaction = null;
  const upgradesData = {};
  const rankOrder = ["commander", "operative", "corps", "specialforces", "support", "heavy"];
  const factionDisplayNames = {
    "rebels": "Rebels",
    "imperials": "Empire",
    "cis": "CIS",
    "gar": "Republic"
  };
  const rankLimits = {
  commander: { min: 1, max: 2 },
  operative: { min: 0, max: 2 },
  corps: { min: 3, max: 6 },
  specialforces: { min: 0, max: 3 },
  support: { min: 0, max: 3 },
  heavy: { min: 0, max: 2 }
};

  // === Load all upgrade JSONs dynamically ===
  function loadAllUpgradeFiles() {
    const types = ["gear","force","command","training","personnel","heavyweapon","hardpoint","armament","crew","grenades","generator","comms", "squadleader"];
    types.forEach(type => {
      fetch(`data/upgrades_${type}.json`)
        .then(res => res.ok ? res.json() : Promise.reject(`No upgrades file for ${type}`))
        .then(data => {
          upgradesData[type] = data.upgrades || [];
          console.log(`Loaded ${type} upgrades`, upgradesData[type]);
        })
        .catch(err => console.debug(`Skipping upgrades_${type}.json: ${err}`));
    });
  }

  // === Load Units From JSON File ===
  function loadFactionUnits(factionFile) {
    console.log(`🔍 Attempting to load units for faction: ${factionFile}`);
    fetch(`data/units_${factionFile}.json`)
      .then(res => res.ok ? res.json() : Promise.reject(`❌ Could not load data/units_${factionFile}.json`))
      .then(data => {
        if (!data || !Array.isArray(data.units)) throw new Error('⚠️ JSON format invalid — expected { units: [...] }');
        units = data.units;
        console.log(`📦 ${units.length} units loaded for ${factionFile}`);

        // Load multi-faction units
        fetch('data/units_multi.json')
          .then(res => res.ok ? res.json() : Promise.reject('No multi-faction file found.'))
          .then(multiData => {
            if (!multiData.units) {
              console.warn('⚠️ units_multi.json found, but missing "units" array');
              return;
            }
            const multiUnitsForFaction = multiData.units.filter(u => Array.isArray(u.faction) ? u.faction.includes(factionFile) : u.faction === factionFile);
            console.log(`🔄 Adding ${multiUnitsForFaction.length} multi-faction units for ${factionFile}`);
            units = units.concat(multiUnitsForFaction);
          })
          .catch(err => console.log(`(optional) ${err}`))
          .finally(() => {
            console.log(`✅ Final unit list (${units.length} total):`, units.map(u => u.name));
            // initial render of available units
            displayUnits();
            newArmyBtn.disabled = false;
            loadAllUpgradeFiles();
          });
      })
      .catch(err => {
        console.error(`🚫 Error loading units for faction "${factionFile}":`, err);
        unitGridEl.innerHTML = `<p style="color:red;">Failed to load ${factionFile} units. Check console for details.</p>`;
      });
  }

  // === Modal Button Selection ===
  modalFactionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const clickedFaction = btn.dataset.faction.toLowerCase();
      factionModalEl.classList.remove('active');
      const factionMap = { "rebels": "rebels", "empire": "imperials", "cis": "cis", "republic": "gar" };
      selectedFaction = factionMap[clickedFaction];
      if (!selectedFaction) return console.error(`Unknown faction "${clickedFaction}" clicked — check data-faction values.`);
      const displayName = factionDisplayNames[selectedFaction] || selectedFaction;
      console.log(`🎯 Selected Faction: ${displayName} -> loading data/units_${selectedFaction}.json`);
      units = [];
      currentArmy = [];
      armyContainerEl.innerHTML = '';
      unitGridEl.innerHTML = '';
      armySummaryEl.textContent = '';
      loadFactionUnits(selectedFaction);
    });
  });

  // === Utility Functions ===
  function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
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
    const totalPoints = currentArmy.reduce((sum, u) => sum + (u.currentPoints || u.points || 0), 0);
    armySummaryEl.textContent = `Total Units: ${totalUnits} | Total Points: ${totalPoints}`;
  }
  // === Update Rank Tally Sidebar ===
function updateRankTally() {
    const rankTallyEl = document.getElementById('rank-tally');
    if (!rankTallyEl) return;

    rankTallyEl.innerHTML = '';
    const ranks = rankOrder;

    ranks.forEach(rank => {
        const unitsOfRank = currentArmy.filter(u => u.rank === rank);
        const count = unitsOfRank.length;
        const limits = rankLimits[rank] || { min: 0, max: Infinity };

        const row = document.createElement('div');
        row.classList.add('rank-row');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.marginBottom = '4px';

        const label = document.createElement('span');
        label.textContent = capitalize(rank);

        const tally = document.createElement('span');
        tally.textContent = `${count} / min:${limits.min} max:${limits.max}`;
        if (count < limits.min) tally.style.color = 'yellow';
        else if (count > limits.max) tally.style.color = 'red';
        else tally.style.color = 'limegreen';

        row.appendChild(label);
        row.appendChild(tally);
        rankTallyEl.appendChild(row);
    });
}


  // === New helper: determines whether a given unit should be shown in the available pool ===
  function isUnitAvailableInPool(unit) {
    // Only show same-faction units (units variable already should be the faction's list).
    // If you ever store multi-faction in units array, check faction here:
    if (selectedFaction && unit.faction && String(unit.faction).toLowerCase() !== String(selectedFaction).toLowerCase()) {
      // If unit's faction is an array, allow if it includes selectedFaction
      if (Array.isArray(unit.faction) && !unit.faction.includes(selectedFaction)) {
        return false;
      }
    }

    // If unit has no restrictions, it's available
    if (!Array.isArray(unit.restrictions) || unit.restrictions.length === 0) return true;

    // For each restriction, check if currentArmy satisfies it.
    // Supported semantics:
    // - If restriction === 'attached' => require any army unit with keyword 'attached'
    // - If restriction matches an army unit's id => require that unit present
    // - If restriction matches an army unit keyword (case-insensitive) => require that keyword present on some army unit
    // - If restriction matches an army unit rank or unitType => require unit of that rank/type present
    // All restrictions must be satisfied (every).
    const lowerRestrictions = unit.restrictions.map(r => String(r).toLowerCase().trim());

    const armyKeywordsSet = new Set();
    const armyIds = new Set();
    const armyRanks = new Set();
    const armyTypes = new Set();
    currentArmy.forEach(a => {
      if (Array.isArray(a.keywords)) a.keywords.forEach(k => armyKeywordsSet.add(String(k).toLowerCase()));
      if (a.id) armyIds.add(String(a.id).toLowerCase());
      if (a.rank) armyRanks.add(String(a.rank).toLowerCase());
      if (a.unitType) armyTypes.add(String(a.unitType).toLowerCase());
    });

    // check each restriction
    const allMatch = lowerRestrictions.every(r => {
      if (!r) return false;

      // special-case "attached" — check for keyword 'attached' in any existing unit
      if (r === 'attached') {
        return armyKeywordsSet.has('attached');
      }

      // if restriction equals an army unit id
      if (armyIds.has(r)) return true;

      // if restriction found in any army keyword
      if (armyKeywordsSet.has(r)) return true;

      // if restriction equals an army rank
      if (armyRanks.has(r)) return true;

      // if restriction equals an army unitType
      if (armyTypes.has(r)) return true;

      // not matched
      return false;
    });

    return allMatch;
  }

// === Display Units (with search + rank bins) ===
function displayUnits() {
  unitGridEl.innerHTML = '';
  if (!units.length) {
    unitGridEl.innerHTML = `<p>No units available.</p>`;
    return;
  }

  const searchQuery = document.getElementById('unit-search')?.value?.toLowerCase().trim() || '';

  // Filter and sort units
  const available = units
    .filter(u => isUnitAvailableInPool(u))
    .filter(u => {
      if (!searchQuery) return true;
      const nameMatch = u.name?.toLowerCase().includes(searchQuery);
      const keywordMatch = Array.isArray(u.keywords) && u.keywords.some(k => k.toLowerCase().includes(searchQuery));
      return nameMatch || keywordMatch;
    })
    .sort((a, b) => rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));

  if (!available.length) {
    unitGridEl.innerHTML = `<p>No units available (check restrictions or search).</p>`;
    return;
  }

  // Group units by rank
  const unitsByRank = {};
  rankOrder.forEach(r => unitsByRank[r] = []);
  available.forEach(u => {
    const rank = u.rank || 'corps';
    unitsByRank[rank].push(u);
  });

  // Render rank sections
  rankOrder.forEach(rank => {
    const rankUnits = unitsByRank[rank];
    if (!rankUnits.length) return;

    const section = document.createElement('div');
    section.classList.add('available-rank-section');

    // Count selected units for this rank (currentArmy is an array)
    const selectedCount = currentArmy.filter(u => u.rank === rank).length;

    // Header
    const header = document.createElement('button');
    header.type = 'button';
    header.classList.add('rank-dropdown-btn');
    header.innerHTML = `${capitalize(rank)} (${rankUnits.length}) - Selected: ${selectedCount} <span class="arrow">▶</span>`;
    section.appendChild(header);

    // Unit list container (use CSS .expanded class)
    const listDiv = document.createElement('div');
    listDiv.classList.add('rank-unit-list', 'expanded'); // start expanded by default
    section.appendChild(listDiv);

    // Render unit cards into this rank's listDiv
    rankUnits.forEach(unit => {
      const card = document.createElement('div');
      card.classList.add('unit-card');
      card.innerHTML = `
        ${unit.image ? `<img src="${unit.image}" alt="${unit.name}" class="unit-image" style="max-width:100%;height:100px;object-fit:contain;margin-bottom:8px;">` :
        `<div style="height:100px;display:flex;align-items:center;justify-content:center;color:#00fff2;opacity:0.6">No Image</div>`}
        <h4>${unit.name}</h4>
        <p>Rank: ${capitalize(unit.rank)}</p>
        <p>Points: ${unit.points}</p>
        <button class="add-unit">Add</button>
      `;

      card.querySelector('.add-unit').addEventListener('click', () => {
        // use your existing addUnitToArmy (which modifies currentArmy array)
        addUnitToArmy(unit);

        // update sidebar and tallies using your correct functions
        updateArmySummary();
        updateRankTally();

        // re-render the available units so counts and availability refresh
        displayUnits();
      });

      listDiv.appendChild(card);
    });

    // Arrow toggle synced with CSS (.expanded)
    const arrow = header.querySelector('.arrow');
    header.addEventListener('click', () => {
      const isExpanded = listDiv.classList.toggle('expanded');
      arrow.style.transform = isExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
    });

    unitGridEl.appendChild(section);
  });

  // debug-friendly log (available exists here)
  console.log("✅ Units displayed successfully. (available=", available.map(u => u.id).join(', '), ")");
}

// === Bind search bar if exists ===
const unitSearchEl = document.getElementById('unit-search');
if (unitSearchEl) {
  unitSearchEl.addEventListener('input', () => displayUnits());
}

  // === Add Unit to Army ===
function addUnitToArmy(unit) {

  // === Enforce Unit Min/Max ===
  const existingUnits = currentArmy.filter(u => u.id === unit.id);
  const currentCount = existingUnits.length;
  const maxAllowed = unit.max ?? Infinity;

  if (currentCount >= maxAllowed) {
    alert(`You can only include up to ${unit.max} of ${unit.name}!`);
    return;
  }

  const armyUnit = JSON.parse(JSON.stringify(unit));
  armyUnit.selectedUpgrades = armyUnit.selectedUpgrades || {};
  armyUnit.currentPoints = armyUnit.points;
  currentArmy.push(armyUnit);

  const rankSection = getOrCreateRankSection(armyUnit.rank);
  const rankList = rankSection.querySelector('.rank-list');

  const unitEl = document.createElement('div');
  unitEl.classList.add('army-unit');
  unitEl.style.position = 'relative';
  unitEl.style.display = 'flex';
  unitEl.style.alignItems = 'flex-start';
  unitEl.style.gap = '12px';
  unitEl.style.marginBottom = '8px';

  const img = document.createElement('img');
  img.src = armyUnit.image || '';
  img.alt = armyUnit.name;
  img.classList.add('unit-image');
  img.style.width = "60px";
  img.style.height = "60px";
  img.style.objectFit = "cover";
  img.style.borderRadius = "6px";
  unitEl.appendChild(img);

  const infoDiv = document.createElement('div');
  infoDiv.classList.add('unit-info');
  infoDiv.style.flex = '1';

  const namePts = document.createElement('div');
  namePts.textContent = `${armyUnit.name} (${armyUnit.currentPoints} pts)`;
  namePts.style.marginBottom = '8px';
  infoDiv.appendChild(namePts);

  const upgradeImagesDiv = document.createElement('div');
  upgradeImagesDiv.classList.add('upgrade-images');
  upgradeImagesDiv.style.display = 'flex';
  upgradeImagesDiv.style.gap = '6px';
  upgradeImagesDiv.style.flexWrap = 'wrap';
  upgradeImagesDiv.style.marginBottom = '6px';
  infoDiv.appendChild(upgradeImagesDiv);

  // === Upgrades Section ===
  if (armyUnit.allowedUpgrades && armyUnit.allowedUpgrades.length) {
    armyUnit.allowedUpgrades.forEach(upgType => {
      const typeContainer = document.createElement('div');
      typeContainer.classList.add('upgrade-type-container');
      typeContainer.style.marginBottom = '6px';
      typeContainer.style.position = 'relative';

      const typeBtn = document.createElement('button');
      typeBtn.classList.add('upgrade-type-btn');
      typeBtn.type = 'button';
      typeBtn.textContent = capitalize(upgType);

      const arrow = document.createElement('span');
      arrow.textContent = '▶';
      arrow.style.marginLeft = '8px';
      typeBtn.appendChild(arrow);

      const menu = document.createElement('div');
      menu.classList.add('upgrade-menu');
      menu.style.position = 'relative';
      menu.style.zIndex = '999';

      const availableUpgrades = upgradesData[upgType] || upgradesData[upgType.toLowerCase()] || [];
      const filteredUpgrades = availableUpgrades.filter(upg => {
        if (Array.isArray(upg.factions) && upg.factions.length) {
          if (!armyUnit.faction || !upg.factions.map(f => String(f).toLowerCase()).includes(String(armyUnit.faction).toLowerCase())) {
            return false;
          }
        }

        if (!Array.isArray(upg.restrictions) || upg.restrictions.length === 0) return true;

        const ukeywords = (armyUnit.keywords || []).map(k => String(k).toLowerCase());
        const urank = String(armyUnit.rank || '').toLowerCase();
        const utype = String(armyUnit.unitType || '').toLowerCase();
        const uid = String(armyUnit.id || '').toLowerCase();

        return upg.restrictions.every(rawR => {
          const r = String(rawR || '').toLowerCase().trim();
          if (!r) return false;
          if (ukeywords.includes(r)) return true;
          if (urank === r) return true;
          if (utype === r) return true;
          if (uid.includes(r)) return true;
          return false;
        });
      });

      if (!filteredUpgrades.length) {
        const note = document.createElement('div');
        note.textContent = 'No options';
        note.style.padding = '6px';
        note.style.color = '#9fdff0';
        menu.appendChild(note);
      } else {
        filteredUpgrades.forEach(upg => {
          const btn = document.createElement('button');
          btn.classList.add('upgrade-btn');
          btn.type = 'button';
          btn.dataset.upgrade = upg.id;
          btn.textContent = upg.name + (upg.points ? ' (+' + upg.points + ' pts)' : '');

          btn.addEventListener('click', () => {
            if (upg.isUnique) {
              const alreadyUsed = currentArmy.some(u =>
                Object.values(u.selectedUpgrades || {}).flat().includes(upg.id)
              );
              if (alreadyUsed) {
                alert(`You can only include one copy of ${upg.name} in your army!`);
                return;
              }
            }

            const maxSlots = armyUnit.upgradeSlots?.[upgType] || 1;
            if (!Array.isArray(armyUnit.selectedUpgrades[upgType])) armyUnit.selectedUpgrades[upgType] = [];
            const selected = armyUnit.selectedUpgrades[upgType];
            const index = selected.indexOf(upg.id);

            if (index > -1) {
              selected.splice(index, 1);
              armyUnit.currentPoints -= upg.points || 0;
              btn.classList.remove('selected');
              const imgEl = upgradeImagesDiv.querySelector('img[data-upgrade="' + upg.id + '"]');
              if (imgEl) imgEl.remove();
            } else {
              if (selected.length >= maxSlots) return alert('Cannot select more than ' + maxSlots + ' ' + capitalize(upgType) + ' upgrades.');
              selected.push(upg.id);
              armyUnit.currentPoints += upg.points || 0;
              btn.classList.add('selected');
              if (upg.image) {
                const upgImg = document.createElement('img');
                upgImg.src = upg.image;
                upgImg.alt = upg.name;
                upgImg.dataset.upgrade = upg.id;
                upgImg.style.width = '30px';
                upgImg.style.height = '30px';
                upgImg.style.objectFit = 'cover';
                upgImg.style.borderRadius = '4px';
                upgradeImagesDiv.appendChild(upgImg);
              }
            }

            namePts.textContent = armyUnit.name + ' (' + armyUnit.currentPoints + ' pts)';
            menu.style.maxHeight = '0';
            menu.style.opacity = '0';
            typeBtn.classList.remove('active');

            // === UPDATE TALLIES & COLORS ===
            updateArmySummary();
            updateRankTally();
            updateUnitColors();
          });

          menu.appendChild(btn);
        });
      }

      typeBtn.addEventListener('click', () => {
        const isOpen = typeBtn.classList.toggle('active');
        if (isOpen) {
          menu.style.opacity = '1';
          menu.style.maxHeight = menu.scrollHeight ? menu.scrollHeight + 'px' : '300px';
        } else {
          menu.style.maxHeight = '0';
          menu.style.opacity = '0';
        }
      });

      typeContainer.appendChild(typeBtn);
      typeContainer.appendChild(menu);
      infoDiv.appendChild(typeContainer);
    });
  }

  unitEl.appendChild(infoDiv);

  // === REMOVE BUTTON FOR ARMY UNIT ===
  const removeBtn = document.createElement('button');
  removeBtn.classList.add('remove-unit');
  removeBtn.textContent = '✕';
  removeBtn.title = 'Remove unit';
  removeBtn.addEventListener('click', () => {
    unitEl.remove();
    const index = currentArmy.indexOf(armyUnit);
    if (index > -1) currentArmy.splice(index, 1);

    updateArmySummary();
    updateRankTally();
    updateUnitColors();
    displayUnits();
  });
  unitEl.appendChild(removeBtn);

  rankList.appendChild(unitEl);

  // === UPDATE TALLIES & COLORS AFTER ADD ===
  updateArmySummary();
  updateRankTally();
  updateUnitColors();
}

  // === Army Buttons & Saved Army Logic (Fixed) ===
function bindArmyButtons() {
  const newArmyBtn = document.getElementById('new-army');
  const resetArmyBtn = document.getElementById('reset-army');
  const saveArmyBtn = document.getElementById('save-army');
  const loadArmyBtn = document.getElementById('load-army');

  if (newArmyBtn) {
    newArmyBtn.addEventListener('click', () => {
      if (!factionModalEl) return console.warn('Faction modal not found.');
      factionModalEl.classList.add('active');
    });
  }

  if (resetArmyBtn) {
    resetArmyBtn.addEventListener('click', () => {
      if (!confirm('Clear current army?')) return;
      currentArmy = [];
      if (armyContainerEl) armyContainerEl.innerHTML = '';
      updateArmySummary();
      displayUnits();
    });
  }

  if (saveArmyBtn) {
    saveArmyBtn.addEventListener('click', () => {
      const name = prompt('Enter a name for this army:');
      if (!name) return;
      const savedArmies = JSON.parse(localStorage.getItem('savedArmies') || '[]');
      savedArmies.push({ name, units: currentArmy });
      localStorage.setItem('savedArmies', JSON.stringify(savedArmies));
      renderSavedArmies();
    });
  }

  if (loadArmyBtn) {
    loadArmyBtn.addEventListener('click', () => {
      const saved = JSON.parse(localStorage.getItem('savedArmies') || '[]');
      if (!saved.length) return alert('No saved army found!');
      currentArmy = [];
      if (armyContainerEl) armyContainerEl.innerHTML = '';
      saved[0].units.forEach(unit => addUnitToArmy(unit));
      displayUnits();
    });
  }

  // === Saved Armies Sidebar ===
  function renderSavedArmies() {
    savedArmiesContainer.innerHTML = `<h3>Saved Armies</h3>`;
    const savedArmies = JSON.parse(localStorage.getItem('savedArmies') || '[]');
    if (!savedArmies.length) {
      savedArmiesContainer.innerHTML += '<p>No saved armies.</p>';
      return;
    }
    savedArmies.forEach((army, idx) => {
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';
      div.style.marginBottom = '6px';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = army.name;
      nameSpan.style.cursor = 'pointer';
      nameSpan.addEventListener('click', () => {
        if (!confirm(`Load army "${army.name}"? This will replace your current army.`)) return;
        currentArmy = [];
        armyContainerEl.innerHTML = '';
        army.units.forEach(unit => addUnitToArmy(unit));
        displayUnits();
      });

      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.style.marginLeft = '8px';
      delBtn.addEventListener('click', () => {
        if (!confirm(`Delete army "${army.name}"?`)) return;
        savedArmies.splice(idx, 1);
        localStorage.setItem('savedArmies', JSON.stringify(savedArmies));
        renderSavedArmies();
      });

      div.appendChild(nameSpan);
      div.appendChild(delBtn);
      savedArmiesContainer.appendChild(div);
    });
  }
  renderSavedArmies();
}

// Call this at the **end of DOMContentLoaded**, after sidebar elements exist:
bindArmyButtons();


  // === Close Modal on Outside Click ===
  window.addEventListener('click', e => {
    if (e.target === factionModalEl) factionModalEl.classList.remove('active');
  });

  // === Image Zoom Functionality (Event Delegation) ===
  document.body.addEventListener('click', e => {
    if (e.target.classList.contains('unit-image') || (e.target.parentElement && e.target.parentElement.classList.contains('upgrade-images'))) {
      const overlay = document.createElement('div');
      overlay.classList.add('img-zoom-overlay');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '9999';
      overlay.style.cursor = 'zoom-out';
      overlay.style.transition = 'opacity 0.3s ease';
      overlay.style.opacity = '0';

      const img = document.createElement('img');
      img.src = e.target.src;
      img.style.maxWidth = '90%';
      img.style.maxHeight = '90%';
      img.style.borderRadius = '8px';
      img.style.boxShadow = '0 0 20px rgba(0,0,0,0.7)';

      overlay.appendChild(img);
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.style.opacity = '1');

      overlay.addEventListener('click', () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
      });
    }
  });

  // === Toast System ===
  const toastContainer = document.getElementById('toast-container');
  function showToast(message, duration = 2500) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  // === Export / Import Army Feature ===
  const exportArmyBtn = document.getElementById('export-army');
  const exportAllBtn = document.getElementById('export-all');
  const importArmyBtn = document.getElementById('import-army-btn');
  const importArmyFile = document.getElementById('import-army-file');

  function downloadJSON(obj, filename) {
    const json = JSON.stringify(obj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function makeFilename(baseName) {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timestamp = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    return `${baseName}_${timestamp}.json`;
  }

  // === Export Current Army ===
  if (exportArmyBtn) {
    exportArmyBtn.addEventListener('click', () => {
      if (!currentArmy.length) {
        showToast('⚠️ No army to export!', 2500);
        return;
      }
      const data = {
        faction: selectedFaction || 'unknown',
        units: JSON.parse(JSON.stringify(currentArmy)),
        totalPoints: currentArmy.reduce((sum, u) => sum + (u.currentPoints || u.points || 0), 0),
        exportedAt: new Date().toISOString()
      };
      downloadJSON(data, makeFilename('army_export'));
      showToast('✅ Army exported successfully!');
    });
  }

  // === Export All Saved Armies ===
  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', () => {
      const allArmies = JSON.parse(localStorage.getItem('savedArmies') || '[]');
      if (!allArmies.length) {
        showToast('⚠️ No saved armies found to export.', 2500);
        return;
      }
      downloadJSON(allArmies, makeFilename('all_armies_export'));
      showToast(`✅ Exported ${allArmies.length} armies!`);
    });
  }

  // === Import Army ===
  if (importArmyBtn && importArmyFile) {
    importArmyBtn.addEventListener('click', () => importArmyFile.click());
    importArmyFile.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const data = JSON.parse(event.target.result);
          if (Array.isArray(data)) {
            localStorage.setItem('savedArmies', JSON.stringify(data));
            renderSavedArmies();
            showToast(`✅ Imported ${data.length} armies!`);
          } else if (data.units && Array.isArray(data.units)) {
            if (!confirm(`Import "${data.faction || 'Army'}" and overwrite current army?`)) return;
            currentArmy = [];
            armyContainerEl.innerHTML = '';
            data.units.forEach(unit => {
              unit.selectedUpgrades = unit.selectedUpgrades || {};
              addUnitToArmy(unit);
            });
            updateArmySummary();
            showToast('✅ Army imported successfully!');
            // refresh pool after import
            displayUnits();
          } else {
            showToast('❌ Invalid file format.', 2500);
          }
        } catch (err) {
          console.error('Error importing JSON:', err);
          showToast('❌ Failed to import file.', 2500);
        } finally {
          importArmyFile.value = '';
        }
      };
      reader.readAsText(file);
    });
  }

  console.log('✅ Full Army Builder script loaded successfully.');
});
