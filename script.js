/* ==========================================
   GLOBAL GENDER EQUALITY WEBSITE
   Navigation, data, map and charts
========================================== */

/* ---------- NAVIGATION ---------- */

const navButtons = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");
const heading = document.getElementById("page-heading");

const headings = {
  home: "Exploring Gender Inequality",
  issue: "Understanding the Issue",
  india: "India",
  trends: "Global Data & Trends",
  indicator: "Development Indicator",
  "criterion-b": "Criterion B · Planning",
  "criterion-c": "Criterion C · Communication",
  "criterion-d": "Criterion D · Analysis",
  sources: "Sources & Evaluation",
  about: "About Me"
};

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    const pageId = button.dataset.page;

    navButtons.forEach(btn => btn.classList.remove("active"));
    pages.forEach(page => page.classList.remove("active"));

    button.classList.add("active");

    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add("active");

    if (heading) heading.textContent = headings[pageId] || "Development Investigation";

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    if (pageId === "trends") {
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 200);
    }
  });
});


/* ---------- WORLD BANK DATA ---------- */

const indicators = {
  "SG.GEN.PARL.ZS": {
    name: "Women in Parliament (%)",
    description: "Proportion of seats held by women in national parliaments.",
    unit: "%",
    reverse: false
  },

  "SP.ADO.TFRT": {
    name: "Adolescent Fertility Rate",
    description: "Births per 1,000 women aged 15–19.",
    unit: "births per 1,000 women",
    reverse: true
  },

  "SH.STA.MMRT": {
    name: "Maternal Mortality Ratio",
    description: "Maternal deaths per 100,000 live births.",
    unit: "deaths per 100,000 live births",
    reverse: true
  }
};

const countryNames = {
  IND: "India",
  RWA: "Rwanda",
  SWE: "Sweden",
  JPN: "Japan",
  USA: "United States",
  NOR: "Norway",
  AFG: "Afghanistan",
  ARE: "United Arab Emirates",
  NZL: "New Zealand",
  BRA: "Brazil",
  FRA: "France",
  ZAF: "South Africa"
};

let currentIndicator = "SG.GEN.PARL.ZS";
let map;
let mapLayer;
let chart;
let countryData = {};
let mapData = {};
let dataCache = {};


/* ---------- FETCH WORLD BANK ---------- */

async function fetchIndicator(code) {
  if (dataCache[code]) {
    return dataCache[code];
  }

  const url =
    `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000&date=2020:2025`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("World Bank request failed");
    }

    const data = await response.json();

    if (!data || !data[1]) {
      throw new Error("No indicator data returned");
    }

    const records = {};

    data[1].forEach(item => {
      const countryCode = item.countryiso3code;
      const value = item.value;
      const year = item.date;

      if (!countryCode || value === null) return;

      if (!records[countryCode] || year > records[countryCode].year) {
        records[countryCode] = {
          value: value,
          year: year
        };
      }
    });

    dataCache[code] = records;

    return records;

  } catch (error) {
    console.error("Indicator error:", error);
    return {};
  }
}


/* ---------- MAP ---------- */

function initMap() {
  const mapElement = document.getElementById("map");

  if (!mapElement || typeof L === "undefined") return;

  map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([20, 15], 2);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 8
    }
  ).addTo(map);

  loadMap();
}


async function loadMap() {
  const status = document.getElementById("map-status");

  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
    );

    if (!response.ok) {
      throw new Error("Map boundaries failed to load");
    }

    const geoData = await response.json();

    mapLayer = L.geoJSON(geoData, {
      style: styleFeature,
      onEachFeature: addFeatureEvents
    }).addTo(map);

    if (status) {
      status.textContent = "Map loaded. Exploring data...";
    }

    await updateMap(currentIndicator);

  } catch (error) {
    console.error(error);

    if (status) {
      status.textContent =
        "The map boundaries could not load. Please check your internet connection.";
    }
  }
}


function getISO(feature) {
  const properties = feature.properties || {};

  return (
    properties.ISO_A3 ||
    properties.iso_a3 ||
    properties.ISO3 ||
    properties.ADM0_A3 ||
    properties.SOV_A3 ||
    properties["ISO3166-1-Alpha-3"] ||
    properties.iso3 ||
    ""
  );
}


function getValue(code) {
  return mapData[code] ? mapData[code].value : null;
}


function styleFeature(feature) {
  const code = getISO(feature);
  const value = getValue(code);

  return {
    fillColor: getColour(value),
    weight: 0.6,
    color: "#FFFFFF",
    fillOpacity: value === null ? 0.35 : 0.8
  };
}


function getColour(value) {
  if (value === null || value === undefined) {
    return "#DCE5EF";
  }

  if (currentIndicator === "SG.GEN.PARL.ZS") {
    if (value < 10) return "#F2DCE6";
    if (value < 20) return "#D8A8C0";
    if (value < 30) return "#B77596";
    if (value < 40) return "#865070";
    if (value < 50) return "#4F315A";
    return "#173D70";
  }

  if (currentIndicator === "SP.ADO.TFRT") {
    if (value < 10) return "#DCEFF9";
    if (value < 30) return "#A4CDE6";
    if (value < 60) return "#6BA7D1";
    if (value < 100) return "#397FB8";
    return "#174C8E";
  }

  if (currentIndicator === "SH.STA.MMRT") {
    if (value < 20) return "#DDEEE9";
    if (value < 70) return "#9BCDBB";
    if (value < 150) return "#66A98E";
    if (value < 300) return "#3D8069";
    return "#1F5145";
  }

  return "#DCE5EF";
}


function addFeatureEvents(feature, layer) {
  layer.on({
    mouseover: function(event) {
      event.target.setStyle({
        weight: 2,
        color: "#C7A45C",
        fillOpacity: 0.95
      });

      event.target.bringToFront();
    },

    mouseout: function(event) {
      if (mapLayer) {
        mapLayer.resetStyle(event.target);
      }
    }
  });

  const code = getISO(feature);
  const name =
    feature.properties.ADMIN ||
    feature.properties.name ||
    feature.properties.NAME ||
    "Unknown country";

  layer.bindTooltip(name, {
    sticky: true
  });

  layer.on("click", () => {
    const record = mapData[code];

    if (record) {
      showCountryDetails(code, name, record);
    } else {
      showCountryDetails(code, name, null);
    }
  });
}


async function updateMap(indicatorCode) {
  currentIndicator = indicatorCode;

  const status = document.getElementById("map-status");

  if (status) {
    status.textContent = "Loading data...";
  }

  mapData = await fetchIndicator(indicatorCode);

  if (mapLayer) {
    mapLayer.setStyle(styleFeature);
  }

  updateLegend();

  if (status) {
    status.textContent =
      `Showing ${indicators[indicatorCode].name}. Click a country for details.`;
  }

  updateChart();
  updateCountryInfo();
}


function updateLegend() {
  const legend = document.getElementById("map-legend");

  if (!legend) return;

  let levels;

  if (currentIndicator === "SG.GEN.PARL.ZS") {
    levels = [
      ["<10%", "#F2DCE6"],
      ["10–19.9%", "#D8A8C0"],
      ["20–29.9%", "#B77596"],
      ["30–39.9%", "#865070"],
      ["40–49.9%", "#4F315A"],
      ["50%+", "#173D70"]
    ];
  }

  else if (currentIndicator === "SP.ADO.TFRT") {
    levels = [
      ["<10", "#DCEFF9"],
      ["10–29.9", "#A4CDE6"],
      ["30–59.9", "#6BA7D1"],
      ["60–99.9", "#397FB8"],
      ["100+", "#174C8E"]
    ];
  }

  else {
    levels = [
      ["<20", "#DDEEE9"],
      ["20–69.9", "#9BCDBB"],
      ["70–149.9", "#66A98E"],
      ["150–299.9", "#3D8069"],
      ["300+", "#1F5145"]
    ];
  }

  legend.innerHTML = `
    <div class="legend-title">${indicators[currentIndicator].name}</div>
    <div class="legend-items">
      ${levels.map(item => `
        <div class="legend-item">
          <span class="legend-swatch" style="background:${item[1]}"></span>
          <span>${item[0]}</span>
        </div>
      `).join("")}
      <div class="legend-item">
        <span class="legend-swatch" style="background:#DCE5EF"></span>
        <span>No data</span>
      </div>
    </div>
  `;
}


/* ---------- COUNTRY POPUP ---------- */

function showCountryDetails(code, name, record) {
  const info = document.getElementById("country-info");

  if (!info) return;

  if (!record) {
    info.innerHTML = `
      <div class="country-detail-card">
        <h3>${name}</h3>
        <p>No recent data available for this indicator.</p>
      </div>
    `;

    return;
  }

  info.innerHTML = `
    <div class="country-detail-card">
      <h3>${name}</h3>
      <div class="country-value">${Number(record.value).toLocaleString()}</div>
      <p>${indicators[currentIndicator].name}</p>
      <p class="caption">Year: ${record.year}</p>
    </div>
  `;
}


/* ---------- CHART ---------- */

async function updateChart() {
  const canvas = document.getElementById("countryChart");

  if (!canvas || typeof Chart === "undefined") return;

  const countries = Object.keys(countryNames);

  const data = await fetchIndicator(currentIndicator);

  const values = countries.map(code => {
    return data[code] ? data[code].value : null;
  });

  const labels = countries.map(code => countryNames[code]);

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(canvas, {
    type: "bar",

    data: {
      labels: labels,

      datasets: [{
        label: indicators[currentIndicator].name,
        data: values,
        borderWidth: 1,
        borderRadius: 5,
        backgroundColor: [
          "#174C8E",
          "#246BCE",
          "#4F8FE8",
          "#80B1EA",
          "#A6C9F2",
          "#C6DCF8",
          "#365B83",
          "#6795C1",
          "#8AB5DF",
          "#3973A8",
          "#6B9BC8",
          "#31587F"
        ]
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false
        },

        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.parsed.y ?? "No data"}`;
            }
          }
        }
      },

      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}


/* ---------- COUNTRY DROPDOWN ---------- */

function updateCountryInfo() {
  const selector = document.getElementById("country-select");

  if (!selector) return;

  const code = selector.value;
  const name = countryNames[code];

  const record = mapData[code];

  showCountryDetails(code, name, record || null);
}


/* ---------- EVENT LISTENERS ---------- */

const indicatorSelector = document.getElementById("indicator-select");

if (indicatorSelector) {
  indicatorSelector.addEventListener("change", async event => {
    await updateMap(event.target.value);
  });
}

const countrySelector = document.getElementById("country-select");

if (countrySelector) {
  countrySelector.addEventListener("change", () => {
    updateCountryInfo();
  });
}


/* ---------- INITIALISE ---------- */

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  updateChart();
});
