// === Add Unit to Army ===
function addUnitToArmy(unit) {
  const unitCopy = { 
    ...unit, 
    selectedUpgrades: {},
    unitType: unit.keywords[0]?.toLowerCase() || '' // first keyword as unit type
  };

  if (unit.allowedUpgrades && unit.allowedUpgrades.length) {
    unit.allowedUpgrades.forEach(typeKey => {
      const filtered = filterUpgrades(unitCopy, typeKey.toLowerCase());
      unitCopy.selectedUpgrades[typeKey] = filtered.length ? '' : '';
    });
  }

  army.push(unitCopy);
  renderArmy();
}

// === Filter upgrades for a unit ===
function filterUpgrades(unit, typeKey) {
  const allOfType = allUpgrades[typeKey] || [];
  const unitFaction = unit.faction.toLowerCase();
  const unitRank = unit.rank.toLowerCase();
  const unitType = unit.unitType?.toLowerCase();

  return allOfType.filter(up => {
    const upgradeFactions = (up.factions || []).map(f => f.toLowerCase());
    const upgradeRestrictions = (up.restrictions || []).map(r => r.toLowerCase());

    const factionOK = upgradeFactions.length === 0 || upgradeFactions.includes(unitFaction);

    // Check restrictions against either rank or unit type
    const restrictionOK =
      upgradeRestrictions.length === 0 ||
      upgradeRestrictions.some(r => r === unitRank || r === unitType);

    return factionOK && restrictionOK;
  });
}
