document.addEventListener('DOMContentLoaded', () => {
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

  // === Load all upgrade JSONs dynamically ===
  function loadAllUpgradeFiles() {
    const types = ["gear", "force", "command", "training", "personnel", "heavyweapon", "hardpoint", "armament", "crew", "grenades", "generator"];
    types.forEach(type => {
      fetch(`data/upgrades_${type}.json`)
        .then(res => {
          if (!res.ok) throw new Error(`No upgrades file for ${type}`);
          return res.json();
        })
        .then(data => {
          upgradesData[type] = data.upgrades || [];
          console.log(`Loaded ${type} upgrades`, upgradesData[type]);
        })
        .catch(err => {
          console.debug(`Skipping upgrades_${type}.json: ${err.message}`);
        });
    });
  }

  // === Load Faction Units ===
  function loadFactionUnits(faction) {
    fetch(`data/units_${faction}.json`)
      .then(res => res.json())
      .then(data => {
        units = data.units || [];
        console.log(`Units loaded for ${faction}:`, units);

        // Optional: merge multi-faction units if needed
        fetch('data/units_multi.json')
          .then(res => res.json())
          .then(multiData => {
            const multiUnitsForFaction = multiData.units.filter(u =>
              Array.isArray(u.faction) ? u.faction.includes(faction) : u.faction === faction
            );
            units = units.concat(multiUnitsForFaction);
            console.log(`Merged multi-faction units for ${faction}:`, multiUnitsForFaction);
          })
          .catch(() => console.log('No multi-faction units found, skipping.'))
          .finally(() => {
            displayUnits(faction);
            newArmyBtn.disabled = false;
            loadAllUpgradeFiles();
          });
      })
      .catch(err => console.error(`Error loading units for faction "${faction}":`, err));
  }

  // === Faction modal selection ===
  modalFactionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFaction = btn.dataset.faction;
      factionModalEl.classList.remove('active');
      loadFactionUnits(selectedFaction);
    });
  });

  // === Display Units for Selected Faction ===
  function displayUnits(faction) {
    unitGridEl.innerHTML = '';
    const filtered = units
      .filter(u => Array.isArray(u.faction) ? u.faction.includes(faction) : u.faction.toLowerCase() === faction.toLowerCase())
      .sort((a, b) => rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));

    if (filtered.length === 0) {
      unitGridEl.innerHTML = `<p>No units found for ${capitalize(faction === 'gar' ? 'Republic' : faction)}.</p>`;
      return;
    }

    filtered.forEach(unit => {
      const card = document.createElement('div');
      card.classList.add('unit-card');

      const imgHtml = unit.image
        ? `<img src="${unit.image}" alt="${unit.name}" style="max-width:100%;height:100px;object-fit:contain;margin-bottom:8px;">`
        : `<div style="height:100px;display:flex;align-items:center;justify-content:center;color:#00fff2;opacity:0.6">No Image</div>`;

      card.innerHTML = `
        ${imgHtml}
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
    const armyUnit = JSON.parse(JSON.stringify(unit));
    armyUnit.selectedUpgrades = {};
    armyUnit.currentPoints = armyUnit.points;
    currentArmy.push(armyUnit);

    const rankSection = getOrCreateRankSection(armyUnit.rank);
    const rankList = rankSection.querySelector('.rank-list');

    const unitEl = document.createElement('div');
    unitEl.classList.add('army-unit');
    unitEl.style.width = '100%';
    unitEl.style.display = 'flex';
    unitEl.style.alignItems = 'flex-start';
    unitEl.style.gap = '12px';

    const img = document.createElement('img');
    img.src = armyUnit.image || '';
    img.alt = armyUnit.name;
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
    namePts.style.color = '#dffaff';
    infoDiv.appendChild(namePts);

    const upgradeImagesDiv = document.createElement('div');
    upgradeImagesDiv.classList.add('upgrade-images');
    upgradeImagesDiv.style.display = 'flex';
    upgradeImagesDiv.style.gap = '6px';
    upgradeImagesDiv.style.flexWrap = 'wrap';
    upgradeImagesDiv.style.marginBottom = '6px';
    infoDiv.appendChild(upgradeImagesDiv);

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
        arrow.classList.add('arrow');
        arrow.textContent = '▶';
        arrow.style.marginLeft = '8px';
        typeBtn.appendChild(arrow);

        const menu = document.createElement('div');
        menu.classList.add('upgrade-menu');
        menu.style.position = 'relative';
        menu.style.zIndex = '999';

        const availableUpgrades = upgradesData[upgType] || [];
        if (availableUpgrades.length === 0) {
          const note = document.createElement('div');
          note.textContent = 'No options';
          note.style.padding = '6px';
          note.style.color = '#9fdff0';
          menu.appendChild(note);
        } else {
          availableUpgrades.forEach(upg => {
            const btn = document.createElement('button');
            btn.classList.add('upgrade-btn');
            btn.type = 'button';
            btn.dataset.upgrade = upg.id;
            btn.textContent = `${upg.name} ${upg.points ? `(+${upg.points} pts)` : ''}`;

            btn.addEventListener('click', () => {
              const prevId = armyUnit.selectedUpgrades[upgType];
              if (prevId && prevId !== upg.id) {
                const prevUpgrade = availableUpgrades.find(u => u.id === prevId);
                if (prevUpgrade) armyUnit.currentPoints -= (prevUpgrade.points || 0);
                const prevImgEl = upgradeImagesDiv.querySelector(`img[data-upgrade="${prevId}"]`);
                if (prevImgEl) prevImgEl.remove();
                const prevBtn = menu.querySelector(`button[data-upgrade="${prevId}"]`);
                if (prevBtn) prevBtn.classList.remove('selected');
              }

              if (armyUnit.selectedUpgrades[upgType] === upg.id) {
                delete armyUnit.selectedUpgrades[upgType];
                armyUnit.currentPoints -= (upg.points || 0);
                btn.classList.remove('selected');
                const imgEl = upgradeImagesDiv.querySelector(`img[data-upgrade="${upg.id}"]`);
                if (imgEl) imgEl.remove();
              } else {
                armyUnit.selectedUpgrades[upgType] = upg.id;
                armyUnit.currentPoints += (upg.points || 0);
                menu.querySelectorAll('.upgrade-btn').forEach(b => b.classList.remove('selected'));
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

              namePts.textContent = `${armyUnit.name} (${armyUnit.currentPoints} pts)`;
              updateArmySummary();
              menu.style.maxHeight = '0';
              menu.style.opacity = '0';
              typeBtn.classList.remove('active');
            });

            menu.appendChild(btn);
          });
        }

        typeBtn.addEventListener('click', () => {
          const isOpen = typeBtn.classList.toggle('active');
          if (isOpen) {
            menu.style.opacity = '1';
            menu.style.maxHeight = menu.scrollHeight ? `${menu.scrollHeight}px` : '300px';
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

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.classList.add('remove-unit');
    removeBtn.addEventListener('click', () => {
      currentArmy = currentArmy.filter(u => u !== armyUnit);
      unitEl.remove();
      updateRankCount(armyUnit.rank);
      checkEmptyRankSections();
      updateArmySummary();
    });
    unitEl.appendChild(removeBtn);

    rankList.appendChild(unitEl);

    updateRankCount(armyUnit.rank);
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
    const totalPoints = currentArmy.reduce((sum, u) => sum + (u.currentPoints || u.points || 0), 0);
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
    if (!str) return '';
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
  }
});
