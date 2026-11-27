
/* ==========================================
   NAVIGATION
========================================== */

const navButtons = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");
const pageHeading = document.getElementById("page-heading");

const pageNames = {
  home: "Home",
  issue: "The Issue",
  india: "India",
  trends: "Trends",
  indicator: "Development Indicator",
  "criterion-b": "Criterion B",
  "criterion-c": "Criterion C",
  "criterion-d": "Criterion D",
  sources: "Sources",
  about: "About Me"
};

function showPage(pageId) {
  pages.forEach(page => page.classList.remove("active"));
  navButtons.forEach(button => button.classList.remove("active"));

  const target = document.getElementById(pageId);
  if (target) target.classList.add("active");

  const activeButton = document.querySelector(`[data-page="${pageId}"]`);
  if (activeButton) activeButton.classList.add("active");

  if (pageHeading) pageHeading.textContent = pageNames[pageId] || pageId;

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pageId === "trends" && map) {
    setTimeout(() => map.invalidateSize(), 200);
  }
}

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});


/* ==========================================
   DATA
========================================== */

const INDICATORS = {
  "SG.GEN.PARL.ZS": {
    name: "Women in Parliament (% seats)",
    unit: "%",
    higherIsBetter: true
  },
  "SP.ADO.TFRT": {
    name: "Adolescent Fertility Rate",
    unit: "births per 1,000",
    higherIsBetter: false
  },
  "SH.STA.MMRT": {
    name: "Maternal Mortality Ratio",
    unit: "deaths per 100,000",
    higherIsBetter: false
  }
};

const COUNTRIES = [
  {code:"IND",name:"India"},
  {code:"RWA",name:"Rwanda"},
  {code:"SWE",name:"Sweden"},
  {code:"JPN",name:"Japan"},
  {code:"USA",name:"United States"},
  {code:"NOR",name:"Norway"},
  {code:"AFG",name:"Afghanistan"},
  {code:"ARE",name:"United Arab Emirates"},
  {code:"NZL",name:"New Zealand"},
  {code:"BRA",name:"Brazil"},
  {code:"FRA",name:"France"},
  {code:"ZAF",name:"South Africa"}
];

const countrySelect = document.getElementById("country-select");
const indicatorSelect = document.getElementById("indicator-select");
const countryInfo = document.getElementById("country-info");
const mapStatus = document.getElementById("map-status");

let map;
let geoLayer;
let chart;
let currentIndicator = "SG.GEN.PARL.ZS";
let geoData = null;
let currentData = {};
let dataCache = {};


/* ==========================================
   WORLD BANK API
========================================== */

async function fetchIndicator(indicator) {
  if (dataCache[indicator]) return dataCache[indicator];

  const url =
    `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=20000`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("World Bank data request failed.");
  }

  const json = await response.json();

  if (!json || !json[1]) {
    throw new Error("No data returned.");
  }

  const values = {};

  json[1].forEach(item => {
    if (
      item.countryiso3code &&
      item.value !== null &&
      item.countryiso3code.length === 3
    ) {
      const existing = values[item.countryiso3code];

      if (!existing || Number(item.date) > Number(existing.year)) {
        values[item.countryiso3code] = {
          value: Number(item.value),
          year: Number(item.date),
          name: item.country?.value || item.countryiso3code
        };
      }
    }
  });

  dataCache[indicator] = values;
  return values;
}


/* ==========================================
   MAP
========================================== */

function getCountryCode(feature) {
  const p = feature.properties || {};

  const possible = [
    p.ISO_A3,
    p.iso_a3,
    p.ISO3,
    p.ADM0_A3,
    p.SOV_A3,
    p["ISO3166-1-Alpha-3"],
    p.iso3
  ];

  for (const code of possible) {
    if (code && typeof code === "string" && code.length === 3 && code !== "-99") {
      return code.toUpperCase();
    }
  }

  return null;
}

function getCountryName(feature) {
  const p = feature.properties || {};
  return p.ADMIN || p.name || p.NAME || p.name_en || "Unknown";
}

function getMapColor(value, indicator) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "#ded9d5";
  }

  if (indicator === "SG.GEN.PARL.ZS") {
    if (value < 10) return "#f2e6e8";
    if (value < 20) return "#dfbac5";
    if (value < 30) return "#c7889b";
    if (value < 40) return "#a95270";
    if (value < 50) return "#7c2948";
    return "#4b1028";
  }

  if (indicator === "SP.ADO.TFRT") {
    if (value < 10) return "#f2e6e8";
    if (value < 25) return "#dfbac5";
    if (value < 50) return "#c7889b";
    if (value < 75) return "#a95270";
    if (value < 100) return "#7c2948";
    return "#4b1028";
  }

  if (indicator === "SH.STA.MMRT") {
    if (value < 20) return "#f2e6e8";
    if (value < 50) return "#dfbac5";
    if (value < 100) return "#c7889b";
    if (value < 300) return "#a95270";
    if (value < 500) return "#7c2948";
    return "#4b1028";
  }

  return "#ded9d5";
}

function getLegend(indicator) {
  if (indicator === "SG.GEN.PARL.ZS") {
    return [
      ["0–9.9%", "#f2e6e8"],
      ["10–19.9%", "#dfbac5"],
      ["20–29.9%", "#c7889b"],
      ["30–39.9%", "#a95270"],
      ["40–49.9%", "#7c2948"],
      ["50%+", "#4b1028"]
    ];
  }

  if (indicator === "SP.ADO.TFRT") {
    return [
      ["0–9.9", "#f2e6e8"],
      ["10–24.9", "#dfbac5"],
      ["25–49.9", "#c7889b"],
      ["50–74.9", "#a95270"],
      ["75–99.9", "#7c2948"],
      ["100+", "#4b1028"]
    ];
  }

  return [
    ["0–19.9", "#f2e6e8"],
    ["20–49.9", "#dfbac5"],
    ["50–99.9", "#c7889b"],
    ["100–299.9", "#a95270"],
    ["300–499.9", "#7c2948"],
    ["500+", "#4b1028"]
  ];
}

function updateLegend(indicator) {
  const container = document.getElementById("map-legend");
  if (!container) return;

  const entries = getLegend(indicator);

  container.innerHTML = `
    <div class="legend-row">
      ${entries.map(entry => `
        <div class="legend-item">
          <span class="legend-color" style="background:${entry[1]}"></span>
          <span>${entry[0]}</span>
        </div>
      `).join("")}
      <div class="legend-item">
        <span class="legend-color" style="background:#ded9d5"></span>
        <span>No data</span>
      </div>
    </div>
  `;
}

function mapStyle(feature) {
  const code = getCountryCode(feature);
  const record = currentData[code];
  const value = record ? record.value : null;

  return {
    fillColor: getMapColor(value, currentIndicator),
    fillOpacity: 0.88,
    color: "#fffdfb",
    weight: 0.7
  };
}

function mapPopup(feature, layer) {
  const code = getCountryCode(feature);
  const name = getCountryName(feature);
  const record = currentData[code];

  let text = `<strong>${name}</strong>`;

  if (record) {
    text += `<br>${INDICATORS[currentIndicator].name}: ${record.value}`;
    text += `<br>Year: ${record.year}`;
  } else {
    text += `<br>No data available`;
  }

  layer.bindPopup(text);
}

function mapHover(feature, layer) {
  layer.on({
    mouseover: function(e) {
      e.target.setStyle({
        weight: 2,
        color: "#4b1028",
        fillOpacity: 1
      });

      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        e.target.bringToFront();
      }
    },

    mouseout: function(e) {
      if (geoLayer) geoLayer.resetStyle(e.target);
    }
  });
}

async function loadMapIndicator(indicator) {
  currentIndicator = indicator;

  if (mapStatus) {
    mapStatus.textContent = "Loading country data…";
  }

  updateLegend(indicator);

  try {
    currentData = await fetchIndicator(indicator);

    if (!geoData) {
      const geoResponse = await fetch(
        "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
      );

      if (!geoResponse.ok) {
        throw new Error("Map geography could not be loaded.");
      }

      geoData = await geoResponse.json();
    }

    if (geoLayer) {
      map.removeLayer(geoLayer);
    }

    geoLayer = L.geoJSON(geoData, {
      style: mapStyle,
      onEachFeature: function(feature, layer) {
        mapPopup(feature, layer);
        mapHover(feature, layer);
      }
    }).addTo(map);

    if (mapStatus) {
      mapStatus.textContent =
        `Map displayed using the latest available value for each country. ` +
        `Some countries may have missing data or different reporting years.`;
    }

    if (map) map.invalidateSize();

  } catch (error) {
    console.error(error);

    if (mapStatus) {
      mapStatus.textContent =
        "The map data could not be loaded. Check your internet connection or try refreshing.";
    }
  }
}

function initializeMap() {
  const mapElement = document.getElementById("map");
  if (!mapElement || typeof L === "undefined") return;

  map = L.map("map", {
    worldCopyJump: true
  }).setView([20, 10], 2);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      maxZoom: 8
    }
  ).addTo(map);

  loadMapIndicator(currentIndicator);
}


/* ==========================================
   COUNTRY EXPLORER + CHART
========================================== */

async function updateCountryChart(indicator) {
  try {
    const values = await fetchIndicator(indicator);

    const chartCountries = COUNTRIES.map(country => ({
      name: country.name,
      code: country.code,
      value: values[country.code]?.value ?? null,
      year: values[country.code]?.year ?? null
    })).filter(country => country.value !== null);

    const ctx = document.getElementById("countryChart");
    if (!ctx) return;

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: chartCountries.map(c => c.name),
        datasets: [{
          label: INDICATORS[indicator].name,
          data: chartCountries.map(c => c.value),
          backgroundColor: [
            "#4b1028",
            "#701d3b",
            "#922d50",
            "#a95270",
            "#c7889b",
            "#7c2948",
            "#b66a83",
            "#d8a6b8",
            "#8b3d5c",
            "#c5a15b",
            "#e0c78f",
            "#ad7586"
          ],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              afterLabel: function(context) {
                const item = chartCountries[context.dataIndex];
                return `Year: ${item.year}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: INDICATORS[indicator].unit
            }
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 0
            }
          }
        }
      }
    });

  } catch (error) {
    console.error(error);
  }
}

async function updateCountryInfo() {
  if (!countrySelect || !countryInfo) return;

  const code = countrySelect.value;
  const country = COUNTRIES.find(c => c.code === code);

  if (!country) return;

  countryInfo.innerHTML = "Loading country data…";

  try {
    const values = await fetchIndicator(currentIndicator);
    const record = values[code];

    if (!record) {
      countryInfo.innerHTML =
        `<strong>${country.name}</strong><p>No data available for this indicator.</p>`;
      return;
    }

    countryInfo.innerHTML = `
      <h3>${country.name}</h3>
      <p><strong>${INDICATORS[currentIndicator].name}</strong></p>
      <p class="country-value">${record.value}</p>
      <p>Reporting year: ${record.year}</p>
      <p>Values are based on the latest available observation returned for this country.</p>
    `;

  } catch (error) {
    console.error(error);
    countryInfo.innerHTML = "Unable to retrieve country data.";
  }
}


/* ==========================================
   EVENT LISTENERS
========================================== */

if (indicatorSelect) {
  indicatorSelect.addEventListener("change", async function() {
    currentIndicator = indicatorSelect.value;
    await loadMapIndicator(currentIndicator);
    await updateCountryChart(currentIndicator);
    await updateCountryInfo();
  });
}

if (countrySelect) {
  countrySelect.addEventListener("change", updateCountryInfo);
}


/* ==========================================
   START
========================================== */

initializeMap();

updateCountryChart(currentIndicator);

updateCountryInfo();
