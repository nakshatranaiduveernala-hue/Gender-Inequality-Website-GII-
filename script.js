// NAVIGATION
const navButtons = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");

function openPage(id) {
  pages.forEach(page => {
    page.classList.toggle("active", page.id === id);
  });

  navButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === id);
  });

  if (id === "indicator") {
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 200);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

navButtons.forEach(btn => {
  btn.addEventListener("click", () => openPage(btn.dataset.page));
});

document.querySelectorAll("[data-goto]").forEach(btn => {
  btn.addEventListener("click", () => openPage(btn.dataset.goto));
});


// INDICATOR DATA
const indicatorNames = {
  "SG.GEN.PARL.ZS": "Women in Parliament (%)",
  "SP.ADO.TFRT": "Adolescent Fertility Rate",
  "SH.STA.MMRT": "Maternal Mortality Ratio"
};

const indicatorUnits = {
  "SG.GEN.PARL.ZS": "%",
  "SP.ADO.TFRT": "births per 1,000",
  "SH.STA.MMRT": "per 100,000 live births"
};

const indicatorSelect = document.getElementById("indicatorSelect");

let map;
let mapLayer;
let countryData = {};
let geoData;
let selectedIndicator = "SG.GEN.PARL.ZS";


// MAP INITIALIZATION
if (typeof L !== "undefined" && document.getElementById("map")) {
  map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: false
  }).setView([20, 10], 2);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 8
  }).addTo(map);
}


// DATA FETCH
async function fetchIndicator(code) {
  const url =
    `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000&date=2000:2025`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Data request failed");

  const json = await response.json();
  if (!json || !json[1]) return {};

  const result = {};

  json[1].forEach(item => {
    const iso = item.countryiso3code;
    const value = item.value;
    const year = Number(item.date);

    if (!iso || value === null || !year) return;

    if (!result[iso] || year > result[iso].year) {
      result[iso] = {
        value: Number(value),
        year: year,
        name: item.country.value
      };
    }
  });

  return result;
}


// MAP COLOURS
function getColor(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return "#dce3ec";
  }

  if (selectedIndicator === "SG.GEN.PARL.ZS") {
    if (value < 10) return "#d7e8ff";
    if (value < 20) return "#a9ccf7";
    if (value < 30) return "#76a9ed";
    if (value < 40) return "#4385db";
    return "#174c99";
  }

  if (selectedIndicator === "SP.ADO.TFRT") {
    if (value < 10) return "#d7e8ff";
    if (value < 30) return "#a9ccf7";
    if (value < 60) return "#76a9ed";
    if (value < 100) return "#4385db";
    return "#174c99";
  }

  if (value < 20) return "#d7e8ff";
  if (value < 100) return "#a9ccf7";
  if (value < 250) return "#76a9ed";
  if (value < 500) return "#4385db";
  return "#174c99";
}

function styleCountry(feature) {
  const iso = feature.properties.ISO_A3;
  const item = countryData[iso];

  return {
    fillColor: item ? getColor(item.value) : "#dce3ec",
    weight: 0.8,
    opacity: 1,
    color: "#ffffff",
    fillOpacity: 0.85
  };
}

function showCountry(feature, layer) {
  const iso = feature.properties.ISO_A3;
  const name = feature.properties.ADMIN || feature.properties.name || iso;
  const item = countryData[iso];

  if (item) {
    layer.bindPopup(
      `<strong>${name}</strong><br>
      ${indicatorNames[selectedIndicator]}: ${item.value.toFixed(2)} ${indicatorUnits[selectedIndicator]}<br>
      Year: ${item.year}`
    );
  } else {
    layer.bindPopup(
      `<strong>${name}</strong><br>No available value in retrieved dataset`
    );
  }

  layer.on("mouseover", function(e) {
    e.target.setStyle({
      weight: 2,
      color: "#173967",
      fillOpacity: 1
    });
  });

  layer.on("mouseout", function(e) {
    if (mapLayer) mapLayer.resetStyle(e.target);
  });
}


// LEGEND
function createLegend() {
  const legend = document.getElementById("map-legend");
  if (!legend) return;

  let ranges;

  if (selectedIndicator === "SG.GEN.PARL.ZS") {
    ranges = [
      ["0–10", "#d7e8ff"],
      ["10–20", "#a9ccf7"],
      ["20–30", "#76a9ed"],
      ["30–40", "#4385db"],
      ["40+", "#174c99"],
      ["No data", "#dce3ec"]
    ];
  } else if (selectedIndicator === "SP.ADO.TFRT") {
    ranges = [
      ["0–10", "#d7e8ff"],
      ["10–30", "#a9ccf7"],
      ["30–60", "#76a9ed"],
      ["60–100", "#4385db"],
      ["100+", "#174c99"],
      ["No data", "#dce3ec"]
    ];
  } else {
    ranges = [
      ["0–20", "#d7e8ff"],
      ["20–100", "#a9ccf7"],
      ["100–250", "#76a9ed"],
      ["250–500", "#4385db"],
      ["500+", "#174c99"],
      ["No data", "#dce3ec"]
    ];
  }

  legend.innerHTML = "";

  ranges.forEach(([label, color]) => {
    const item = document.createElement("span");
    item.innerHTML =
      `<span class="legend-box" style="background:${color}"></span> ${label}`;
    legend.appendChild(item);
  });
}


// RENDER MAP
function renderMap() {
  if (!map || !geoData) return;

  if (mapLayer) {
    map.removeLayer(mapLayer);
  }

  mapLayer = L.geoJSON(geoData, {
    style: styleCountry,
    onEachFeature: showCountry
  }).addTo(map);

  createLegend();
}


// LOAD MAP
async function loadMap() {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
    );

    if (!response.ok) throw new Error("Map data failed");

    geoData = await response.json();

    countryData = await fetchIndicator(selectedIndicator);
    renderMap();
  } catch (error) {
    const mapEl = document.getElementById("map");
    if (mapEl) {
      mapEl.innerHTML =
        "<div style='padding:25px;color:#173967'>The map data could not load. Please check your internet connection and refresh the page.</div>";
    }
  }
}


// CHANGE INDICATOR
indicatorSelect.addEventListener("change", async function() {
  selectedIndicator = this.value;

  try {
    countryData = await fetchIndicator(selectedIndicator);
    renderMap();
    updateChart();
  } catch (error) {
    console.error("Indicator data error:", error);
  }
});


// COUNTRY GRAPH
let chart;
const countrySelect = document.getElementById("countrySelect");

async function updateChart() {
  if (!countrySelect || !document.getElementById("countryChart")) return;

  const iso = countrySelect.value;
  const code = selectedIndicator;

  const url =
    `https://api.worldbank.org/v2/country/${iso}/indicator/${code}?format=json&per_page=100&date=2000:2025`;

  try {
    const response = await fetch(url);
    const json = await response.json();

    if (!json || !json[1]) return;

    const records = json[1]
      .filter(item => item.value !== null)
      .sort((a, b) => Number(a.date) - Number(b.date));

    const labels = records.map(item => item.date);
    const values = records.map(item => Number(item.value));

    const ctx = document.getElementById("countryChart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: indicatorNames[code],
          data: values,
          borderColor: "#2458a6",
          backgroundColor: "rgba(57,119,213,0.15)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#2458a6"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.parsed.y + " " + indicatorUnits[code];
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Year"
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: indicatorUnits[code]
            }
          }
        }
      }
    });
  } catch (error) {
    console.error("Chart data error:", error);
  }
}

countrySelect.addEventListener("change", updateChart);


// START
loadMap();
updateChart();
