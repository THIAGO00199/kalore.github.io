
const config = {
    regions: {
        'global': { center: [20, 0], zoom: 2, color: '#2e8b57' },
        'america-sul': { center: [-15, -60], zoom: 4, color: '#3cb371' },
        'america-norte': { center: [40, -100], zoom: 3, color: '#4c956c' },
        'europa': { center: [50, 15], zoom: 4, color: '#5aa57e' },
        'asia': { center: [30, 100], zoom: 3, color: '#6ab58f' },
        'africa': { center: [0, 20], zoom: 3, color: '#7ac5a0' },
        'oceania': { center: [-25, 135], zoom: 3, color: '#8ad5b1' }
    },
    species: [
        { name: "Ipê Amarelo", scientific: "Tabebuia chrysotricha", percent: 32 },
        { name: "Pau Brasil", scientific: "Paubrasilia echinata", percent: 18 },
        { name: "Araucária", scientific: "Araucaria angustifolia", percent: 15 },
        { name: "Jatobá", scientific: "Hymenaea courbaril", percent: 12 },
        { name: "Cedro", scientific: "Cedrela fissilis", percent: 10 },
        { name: "Mogno", scientific: "Swietenia macrophylla", percent: 8 },
        { name: "Angico", scientific: "Anadenanthera colubrina", percent: 5 }
    ],
    co2PerTree: 22.5, // kg/ano
    oxygenPerTree: 118, // kg/ano
    coolingPer1000Trees: 0.015 // °C em 10 anos
};

// Inicialização do Mapa
const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
}).addTo(map);

let heatLayer = L.heatLayer([], { radius: 15, blur: 15, maxZoom: 17 }).addTo(map);

// Variáveis globais
let markers = [];
let countUpInstances = {};
let co2Chart = null;
let tempChart = null;
let currentRegion = 'global';
let currentDate = new Date().toISOString().split('T')[0];

// Funções principais
async function loadTreeData(date, region) {
    toggleLoading(true);
    
    // Simulação de API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const regionConfig = config.regions[region];
    const treeCount = Math.floor(Math.random() * 500) + 100;
    const speciesCount = Math.min(7, config.species.length);
    
    const trees = [];
    const heatPoints = [];
    
    for (let i = 0; i < treeCount; i++) {
        const lat = regionConfig.center[0] + (Math.random() - 0.5) * 30;
        const lng = regionConfig.center[1] + (Math.random() - 0.5) * 60;
        const species = config.species[Math.floor(Math.random() * speciesCount)];
        
        trees.push({
            lat,
            lng,
            species: species.name,
            age: Math.floor(Math.random() * 5) + 1,
            co2: (Math.random() * 10 + 15).toFixed(2)
        });
        
        heatPoints.push([lat, lng, 0.5]);
    }
    
    toggleLoading(false);
    return { trees, heatPoints, treeCount, speciesCount };
}

function updateMap(data) {
    clearMarkers();
    heatLayer.setLatLngs(data.heatPoints);
    
    data.trees.forEach(tree => {
        const marker = L.marker([tree.lat, tree.lng], {
            icon: L.divIcon({
                className: 'tree-marker',
                iconSize: [20, 20]
            })
        }).addTo(map);
        
        marker.bindPopup(`
            <div class="popup-content">
                <div class="popup-title">${tree.species}</div>
                <div class="popup-row">
                    <span class="popup-label"><i class="fas fa-calendar"></i> Idade:</span>
                    <span>${tree.age} anos</span>
                </div>
                <div class="popup-row">
                    <span class="popup-label"><i class="fas fa-cloud"></i> CO2:</span>
                    <span>${tree.co2} kg/ano</span>
                </div>
            </div>
        `);
        
        markers.push(marker);
    });
    
    map.setView(config.regions[currentRegion].center, config.regions[currentRegion].zoom);
    
    // Atualiza UI
    document.getElementById('tree-count').textContent = data.treeCount;
    document.getElementById('stat-trees').textContent = data.treeCount;
    document.getElementById('stat-species').textContent = data.speciesCount;
    document.getElementById('tree-progress').style.width = `${Math.min(100, data.treeCount / 1000 * 100)}%`;
    
    updateEnvironmentalImpact(data.treeCount);
    updateCharts(data.treeCount);
    updateSpeciesList();
    
    const now = new Date();
    document.getElementById('update-time').textContent = now.toLocaleString('pt-BR');
}

function updateEnvironmentalImpact(treeCount) {
    const co2Reduction = (treeCount * config.co2PerTree) / 1000;
    const oxygenProduction = (treeCount * config.oxygenPerTree) / 1000;
    const tempReduction = (treeCount * config.coolingPer1000Trees) / 1000;
    
    animateValue('stat-co2', 0, co2Reduction, 2000);
    animateValue('stat-oxigenio', 0, oxygenProduction, 2000);
    
    if (tempChart) {
        tempChart.data.datasets[0].data = [0, tempReduction/2, tempReduction];
        tempChart.update();
    }
}

function updateCharts(treeCount) {
    const ctx = document.getElementById('tempChart').getContext('2d');
    
    if (tempChart) {
        tempChart.destroy();
    }
    
    tempChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['2023', '2025', '2030'],
            datasets: [{
                label: 'Redução de Temperatura (°C)',
                data: [0, (treeCount * config.coolingPer1000Trees / 1000)/2, treeCount * config.coolingPer1000Trees / 1000],
                borderColor: config.regions[currentRegion].color,
                backgroundColor: `${config.regions[currentRegion].color}20`,
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: 'white',
                pointBorderColor: config.regions[currentRegion].color,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => ` ${context.dataset.label}: ${context.raw.toFixed(5)}°C`
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Redução de Temperatura (°C)', color: '#666' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function updateSpeciesList() {
    const speciesList = document.querySelector('.species-list');
    speciesList.innerHTML = '';
    
    config.species.forEach(species => {
        const item = document.createElement('div');
        item.className = 'species-item';
        item.innerHTML = `
            <div class="species-info">
                <div class="species-name">${species.name}</div>
                <div class="species-scientific">${species.scientific}</div>
            </div>
            <div class="species-percent">${species.percent}%</div>
            <div class="progress-bar">
                <div class="progress" style="width: ${species.percent}%"></div>
            </div>
        `;
        
        speciesList.appendChild(item);
    });
}

// Funções auxiliares
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

function toggleLoading(show) {
    const button = document.getElementById('buscarDados');
    const buttonText = document.getElementById('buttonText');
    const buttonLoading = document.getElementById('buttonLoading');
    
    if (show) {
        button.disabled = true;
        buttonText.textContent = "Carregando...";
        buttonLoading.style.display = "inline-block";
    } else {
        button.disabled = false;
        buttonText.textContent = "Atualizar Dados";
        buttonLoading.style.display = "none";
    }
}

function animateValue(id, start, end, duration) {
    if (countUpInstances[id]) {
        countUpInstances[id].update(end);
    } else {
        const element = document.getElementById(id);
        countUpInstances[id] = new CountUp(id, end, {
            startVal: start,
            duration: duration / 1000,
            decimalPlaces: end < 1 ? 5 : 1,
            separator: '.',
            decimal: ',',
            suffix: end < 1 ? '' : ' t'
        });
        countUpInstances[id].start();
    }
}

// Event Listeners
document.getElementById('buscarDados').addEventListener('click', async function() {
    currentDate = document.getElementById('dataSelecionada').value;
    currentRegion = document.getElementById('regiao').value;
    
    if (!currentDate) {
        alert("Por favor, selecione uma data");
        return;
    }
    
    const data = await loadTreeData(currentDate, currentRegion);
    updateMap(data);
});

document.getElementById('view-all').addEventListener('click', function() {
    alert("Esta funcionalidade mostraria todas as espécies em um painel detalhado!");
});

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('dataSelecionada').value = currentDate;
    document.getElementById('buscarDados').click();
    updateSpeciesList();
});
