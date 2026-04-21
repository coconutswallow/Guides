import { getEquipment } from './assets/js/allowed-content/ac-service.js';

async function checkData() {
    const data = await getEquipment();
    const special = data.filter(i => i.name.includes('Barding') || i.name.includes('Adamantine'));
    console.log(JSON.stringify(special, null, 2));
}

checkData();
