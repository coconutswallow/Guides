import { initCharacterData, fetchMyReworks, saveReworkToDb, loadReworkById, deleteReworkById } from "./state-manager.js";
import { 
    scrapeColumn, populateColumn, renderBaseAttributes, renderFeatureRows, 
    addClassRow, removeClassRow, addCostRow, generateOutputString, 
    updatePointBuyDisplay as refreshPoints
} from "./rework-ui.js";
import { computeReworkCosts, getTotalLevel, getAlacarteRates } from "./rework-calculations.js";
import { ATTRIBUTES } from "./rework-constants.js";

// --- Tab Navigation ---
window.switchTab = (t) => {
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
    document.querySelector(`button[onclick*="'${t}'"]`)?.classList.add('active');
    document.getElementById(`tab-${t}`)?.classList.add('active');
    if (t === 'output') window.generateOutput();
    if (t === 'cost') window.calculateCosts();
};

// --- Cost Calculation & Summary ---
window.calculateCosts = () => {
    const typeEl = document.getElementById('rework-type');
    if (!typeEl) return;
    
    const result = computeReworkCosts(typeEl.value, scrapeColumn('original'), scrapeColumn('new'));
    const err = document.getElementById('cost-error');
    const tbody = document.getElementById('cost-table-body');
    const thead = document.querySelector('#cost-table thead tr');
    
    if (!result.isValid) {
        err.style.display = 'block'; 
        err.innerText = result.error; 
        return;
    }
    
    err.style.display = 'none';
    tbody.innerHTML = '';

    // UI Alignment: Left-aligned descriptions
    if (result.isFixed) {
        thead.innerHTML = `<th style="text-align: left;">Rework Type</th><th>DTP</th><th>Gold</th>`;
    } else {
        thead.innerHTML = `<th style="text-align: left;">Detailed Change Description</th><th style="width: 120px;"># Changes</th>`;
    }

    result.costs.forEach(c => {
        const row = document.createElement('tr');
        if (result.isFixed) {
            row.innerHTML = `<td style="text-align: left;">${c.change}</td><td>${c.dtp}</td><td>${c.gold} GP</td>`;
        } else {
            row.innerHTML = `<td style="text-align: left; font-size: 0.85em; color: #444;">${c.change}</td>
                             <td><input type="number" class="text-input cost-num-changes" value="${c.count}" onchange="window.updateTotalCost()"></td>`;
        }
        tbody.appendChild(row);
    });

    result.isFixed ? window.updateFixedSummary(result.costs[0].dtp, result.costs[0].gold) 
                   : window.updateAlacarteSummary(result.rates);
};

window.updateFixedSummary = (dtp, gold) => {
    document.getElementById('total-changes').innerText = "-";
    document.getElementById('total-dtp').innerText = dtp;
    document.getElementById('total-gold').innerText = gold;
    document.getElementById('rework-cost').value = `${gold} GP / ${dtp} DTP`;
};

window.updateAlacarteSummary = (rates) => {
    let totalChanges = 0;
    document.querySelectorAll('.cost-num-changes').forEach(i => totalChanges += parseInt(i.value) || 0);
    
    const tGold = totalChanges * (rates?.gold || 0);
    const tDtp = totalChanges * (rates?.dtp || 0);

    document.getElementById('total-changes').innerText = totalChanges;
    document.getElementById('total-dtp').innerText = `${tDtp} (${totalChanges} chg × ${rates?.dtp || 0})`;
    document.getElementById('total-gold').innerText = `${tGold} GP (${totalChanges} chg × ${rates?.gold || 0})`;
    document.getElementById('rework-cost').value = `${tGold} GP / ${tDtp} DTP`;
};

window.updateTotalCost = () => {
    const type = document.getElementById('rework-type').value;
    if (type === 'alacarte') {
        const rates = getAlacarteRates(getTotalLevel(scrapeColumn('original').classes));
        window.updateAlacarteSummary(rates);
    } else {
        window.calculateCosts();
    }
};

window.generateOutput = () => {
    const cost = document.getElementById('rework-cost').value;
    const notes = document.getElementById('rework-notes').value;
    document.getElementById('output-text').value = generateOutputString(scrapeColumn('original'), scrapeColumn('new'), cost, notes);
};

// --- Initialization ---
async function initApp() {
    ['original', 'new'].forEach(col => {
        renderBaseAttributes(col);
        renderFeatureRows(`race-features-container-${col}`, 4);
        renderFeatureRows(`origin-features-container-${col}`, 4);
        renderFeatureRows(`origin-feat-features-container-${col}`, 4);
    });
    await initCharacterData();
    const urlId = new URLSearchParams(window.location.search).get('id');
    urlId ? await loadReworkById(urlId).then(d => { populateColumn('original', d.old_character); populateColumn('new', d.new_character); })
          : ['original', 'new'].forEach(col => addClassRow(col));
    await window.fetchReworks();
}

document.addEventListener('DOMContentLoaded', initApp);