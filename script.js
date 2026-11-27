// ==========================================
// BEYOND THE NUMBERS
// WEBSITE NAVIGATION
// ==========================================

const navButtons = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");
const menuToggle = document.getElementById("menuToggle");
const navigation = document.getElementById("navigation");

function showPage(pageId) {
  pages.forEach(page => {
    page.classList.remove("active");
  });

  navButtons.forEach(button => {
    button.classList.remove("active");
  });

  const targetPage = document.getElementById(pageId);

  if (targetPage) {
    targetPage.classList.add("active");
  }

  const activeButton = document.querySelector(
    `.nav-btn[data-page="${pageId}"]`
  );

  if (activeButton) {
    activeButton.classList.add("active");
  }

  navigation.classList.remove("open");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (pageId === "indicator" && map) {
    setTimeout(() => {
      map.invalidateSize();
    }, 250);
  }
}

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-goto]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.goto);
  });
});

menuToggle.addEventListener("click", () => {
  navigation.classList.toggle("open");
});


// ==========================================
// WORLD BANK DATA
// ==========================================

const indicatorSelect =
  document.getElementById("indicatorSelect");

const yearSelect =
  document.getElementById("yearSelect");

const refreshMapButton =
  document.getElementById("refreshMap");

const legendItems =
  document.getElementById("legendItems");

const mapStatus =
  document.getElementById("mapStatus");

const mapTitle =
  document.getElementById("mapTitle");

const mapSubtitle =
  document.getElementById("mapSubtitle");

const tableBody =
  document.getElementById("dataTableBody");

const countriesWithData =
  document.getElementById("countriesWithData");

const countriesWithoutData =
  document.getElementById("countriesWithoutData");

const selectedYearSummary =
  document.getElementById("selectedYearSummary");

const indicatorNames = {
  "SG.GEN.PARL.ZS":
    "Women in Parliament (%)",

  "SP.ADO.TFRT":
    "Adolescent Fertility Rate",

  "SH.STA.MMRT":
    "Maternal Mortality Ratio"
};


// ==========================================
// YEAR DROPDOWN
// ==========================================

for (let year = 2000; year <= 2025; year++) {

  const option = document.createElement("option");

  option.value = year;
  option.textContent = year;

  yearSelect.appendChild(option);

}

yearSelect.value = "2023";


// ==========================================
// MAP INITIALIZATION
// ==========================================

let map = null;
let countryLayer = null;
let comparisonChart = null;

let cachedGeoJSON = null;
let currentRecords = {};
let currentIndicator = "";
let currentYear = "";

const geoJSONUrl =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

const missingColor = "#d1d5db";


// ==========================================
// COLOUR CLASSIFICATION
// ==========================================

function getColor(value, indicator) {

  if (value === null || value === undefined) {
    return missingColor;
  }

  if (indicator === "SG.GEN.PARL.ZS") {

    if (value < 10) return "#e6eff8";
    if (value < 20) return "#c5d9ed";
    if (value < 30) return "#91b9db";
    if (value < 40) return "#5f95c4";
    if (value < 50) return "#326da6";

    return "#173f70";
  }

  if (indicator === "SP.ADO.TFRT") {

    if (value < 10) return "#e6eff8";
    if (value < 25) return "#c5d9ed";
    if (value < 50) return "#91b9db";
    if (value < 75) return "#5f95c4";
    if (value < 100) return "#326da6";

    return "#173f70";
  }

  if (indicator === "SH.STA.MMRT") {

    if (value < 20) return "#e6eff8";
    if (value < 50) return "#c5d9ed";
    if (value < 100) return "#91b9db";
    if (value < 300) return "#5f95c4";
    if (value < 500) return "#326da6";

    return "#173f70";
  }

  return missingColor;
}


// ==========================================
// LEGEND
// ==========================================

function createLegend(indicator) {

  let ranges = [];

  if (indicator === "SG.GEN.PARL.ZS") {

    ranges = [
      ["0–9.9%", "#e6eff8"],
      ["10–19.9%", "#c5d9ed"],
      ["20–29.9%", "#91b9db"],
      ["30–39.9%", "#5f95c4"],
      ["40–49.9%", "#326da6"],
      ["50%+", "#173f70"]
    ];

  }

  if (indicator === "SP.ADO.TFRT") {

    ranges = [
      ["0–9.9", "#e6eff8"],
      ["10–24.9", "#c5d9ed"],
      ["25–49.9", "#91b9db"],
      ["50–74.9", "#5f95c4"],
      ["75–99.9", "#326da6"],
      ["100+", "#173f70"]
    ];

  }

  if (indicator === "SH.STA.MMRT") {

    ranges = [
      ["0–19.9", "#e6eff8"],
      ["20–49.9", "#c5d9ed"],
      ["50–99.9", "#91b9db"],
      ["100–299.9", "#5f95c4"],
      ["300–499.9", "#326da6"],
      ["500+", "#173f70"]
    ];

  }

  legendItems.innerHTML = "";

  ranges.forEach(range => {

    const item = document.createElement("div");

    item.className = "legend-item";

    item.innerHTML = `
      <span class="legend-swatch"
            style="background:${range[1]}">
      </span>

      <span>${range[0]}</span>
    `;

    legendItems.appendChild(item);

  });

  const missingItem = document.createElement("div");

  missingItem.className = "legend-item";

  missingItem.innerHTML = `
    <span class="legend-swatch"
          style="background:${missingColor}">
    </span>

    <span>No data</span>
  `;

  legendItems.appendChild(missingItem);

}


// ==========================================
// MAP
// ==========================================

function initializeMap() {

  if (map) return;

  map = L.map("worldMap", {
    center: [20, 0],
    zoom: 2,
    minZoom: 1,
    maxZoom: 6,
    worldCopyJump: true
  });

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19
    }
  ).addTo(map);

}


// ==========================================
// COUNTRY CODE EXTRACTION
// ==========================================

function getCountryCode(feature) {

  const properties = feature.properties || {};

  const candidates = [
    properties.ISO_A3,
    properties.ISO_A3_EH,
    properties.ADM0_A3,
    properties.iso_a3,
    properties.ISO3,
    feature.id
  ];

  for (const candidate of candidates) {

    if (
      candidate &&
      typeof candidate === "string" &&
      candidate.length === 3 &&
      candidate !== "-99"
    ) {

      return candidate.toUpperCase();

    }

  }

  return null;

}


// ==========================================
// WORLD BANK API
// ==========================================

async function fetchIndicator(indicator, year) {

  const url =
    `https://api.worldbank.org/v2/country/all/indicator/${indicator}?date=${year}&format=json&per_page=2000`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("World Bank API request failed");
  }

  const json = await response.json();

  if (!json || !json[1]) {
    return {};
  }

  const records = {};

  json[1].forEach(item => {

    const code = item.countryiso3code;

    if (
      code &&
      code.length === 3 &&
      item.value !== null
    ) {

      records[code.toUpperCase()] = {
        name: item.country.value,
        value: Number(item.value),
        year: item.date,
        code: code.toUpperCase()
      };

    }

  });

  return records;

}


// ==========================================
// FETCH GEOJSON
// ==========================================

async function fetchGeoJSON() {

  if (cachedGeoJSON) {
    return cachedGeoJSON;
  }

  const response = await fetch(geoJSONUrl);

  if (!response.ok) {
    throw new Error("Map geography could not be loaded");
  }

  cachedGeoJSON = await response.json();

  return cachedGeoJSON;

}


// ==========================================
// COUNTRY STYLE
// ==========================================

function countryStyle(feature) {

  const code = getCountryCode(feature);

  const record = code
    ? currentRecords[code]
    : null;

  const value = record
    ? record.value
    : null;

  return {

    fillColor: getColor(
      value,
      currentIndicator
    ),

    fillOpacity: 0.85,

    color: "#ffffff",

    weight: 0.7,

    opacity: 1

  };

}


// ==========================================
// POPUP
// ==========================================

function createPopup(feature) {

  const code = getCountryCode(feature);

  const record = code
    ? currentRecords[code]
    : null;

  const countryName =
    feature.properties.ADMIN ||
    feature.properties.name ||
    feature.properties.NAME ||
    "Country";

  if (!record) {

    return `
      <div class="popup-content">
        <h3>${countryName}</h3>

        <p>
          <strong>Indicator:</strong>
          ${indicatorNames[currentIndicator]}
        </p>

        <p>
          <strong>Year:</strong>
          ${currentYear}
        </p>

        <p>
          No recorded data available.
        </p>
      </div>
    `;

  }

  return `
    <div class="popup-content">
      <h3>${record.name || countryName}</h3>

      <p>
        <strong>Indicator:</strong>
        ${indicatorNames[currentIndicator]}
      </p>

      <p>
        <strong>Year:</strong>
        ${record.year}
      </p>

      <p>
        <strong>Value:</strong>
        ${record.value.toLocaleString(
          undefined,
          {
            maximumFractionDigits: 2
          }
        )}
      </p>
    </div>
  `;

}


// ==========================================
// DRAW / UPDATE MAP
// ==========================================

function drawMap(geoJSON) {

  if (countryLayer) {

    map.removeLayer(countryLayer);

  }

  countryLayer = L.geoJSON(geoJSON, {

    style: countryStyle,

    onEachFeature: function(feature, layer) {

      layer.bindPopup(
        createPopup(feature)
      );

      layer.on({

        mouseover: function(event) {

          event.target.setStyle({

            weight: 2,

            color: "#c8a96b",

            fillOpacity: 1

          });

          event.target.bringToFront();

        },

        mouseout: function(event) {

          countryLayer.resetStyle(
            event.target
          );

        }

      });

    }

  }).addTo(map);

  map.invalidateSize();

}


// ==========================================
// DATA TABLE
// ==========================================

function updateDataTable() {

  const records = Object.values(currentRecords);

  records.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  tableBody.innerHTML = "";

  if (records.length === 0) {

    tableBody.innerHTML = `
      <tr>
        <td colspan="4">
          No data available for this year.
        </td>
      </tr>
    `;

    return;

  }

  records.forEach(record => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${record.name}</td>

      <td>${record.year}</td>

      <td>${indicatorNames[currentIndicator]}</td>

      <td>
        ${record.value.toLocaleString(
          undefined,
          {
            maximumFractionDigits: 2
          }
        )}
      </td>
    `;

    tableBody.appendChild(row);

  });

}


// ==========================================
// COMPARISON CHART
// ==========================================

function updateComparisonChart() {

  const records = Object.values(currentRecords);

  records.sort((a, b) =>
    b.value - a.value
  );

  const topRecords = records.slice(0, 15);

  const labels = topRecords.map(
    record => record.name
  );

  const values = topRecords.map(
    record => record.value
  );

  const canvas = document.getElementById(
    "comparisonChart"
  );

  if (comparisonChart) {

    comparisonChart.destroy();

  }

  comparisonChart = new Chart(
    canvas,
    {

      type: "bar",

      data: {

        labels: labels,

        datasets: [

          {

            label:
              indicatorNames[currentIndicator],

            data: values,

            backgroundColor:
              "#326da6",

            borderColor:
              "#173f70",

            borderWidth: 1,

            borderRadius: 5

          }

        ]

      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        indexAxis: "y",

        plugins: {

          legend: {

            display: false

          }

        },

        scales: {

          x: {

            beginAtZero: true

          },

          y: {

            ticks: {

              autoSkip: false

            }

          }

        }

      }

    }

  );

}


// ==========================================
// SUMMARY
// ==========================================

function updateSummary(geoJSON) {

  const totalCountries =
    geoJSON.features.length;

  const recordedCountries =
    geoJSON.features.filter(feature => {

      const code = getCountryCode(feature);

      return code && currentRecords[code];

    }).length;

  countriesWithData.textContent =
    recordedCountries;

  countriesWithoutData.textContent =
    Math.max(
      totalCountries - recordedCountries,
      0
    );

  selectedYearSummary.textContent =
    currentYear;

}


// ==========================================
// LOAD MAP DATA
// ==========================================

async function loadMapData() {

  initializeMap();

  currentIndicator =
    indicatorSelect.value;

  currentYear =
    yearSelect.value;

  mapStatus.textContent =
    "Loading";

  mapTitle.textContent =
    indicatorNames[currentIndicator];

  mapSubtitle.textContent =
    `Displaying data for ${currentYear}`;

  tableBody.innerHTML = `
    <tr>
      <td colspan="4">
        Loading data...
      </td>
    </tr>
  `;

  try {

    const results = await Promise.all([

      fetchIndicator(
        currentIndicator,
        currentYear
      ),

      fetchGeoJSON()

    ]);

    currentRecords = results[0];

    const geoJSON = results[1];

    createLegend(currentIndicator);

    drawMap(geoJSON);

    updateDataTable();

    updateComparisonChart();

    updateSummary(geoJSON);

    mapStatus.textContent =
      "Data loaded";

  }

  catch(error) {

    console.error(error);

    mapStatus.textContent =
      "Unable to load";

    mapSubtitle.textContent =
      "The data could not be loaded. Check your connection and try again.";

    tableBody.innerHTML = `
      <tr>
        <td colspan="4">
          Data could not be loaded.
          Please check your internet connection
          and try again.
        </td>
      </tr>
    `;

  }

}


// ==========================================
// CONTROLS
// ==========================================

refreshMapButton.addEventListener(
  "click",
  loadMapData
);

indicatorSelect.addEventListener(
  "change",
  loadMapData
);

yearSelect.addEventListener(
  "change",
  loadMapData
);


// ==========================================
// INITIAL LOAD
// ==========================================

createLegend(
  indicatorSelect.value
);

loadMapData();
