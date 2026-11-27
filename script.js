// ========================================
// BEYOND THE DIVIDE
// Navigation, country map, data, chart,
// and portrait fallback
// ========================================

let map;
let countryLayer;
let countryData = {};
let chart;
let geoData;
let currentIndicator = "SG.GEN.PARL.ZS";
let latestYearData = {};
let countryNames = {};
let mapInitialized = false;

const indicatorInfo = {
  "SG.GEN.PARL.ZS": {
    title: "Women in parliament (% seats)",
    description: "The percentage of seats in national parliaments held by women. This indicator measures women's representation in national legislative institutions.",
    unit: "%",
    decimals: 1
  },
  "SP.ADO.TFRT": {
    title: "Adolescent fertility rate",
    description: "Births per 1,000 women ages 15–19. This indicator can provide contextual evidence about adolescent reproductive health and social development.",
    unit: "",
    decimals: 1
  },
  "SH.STA.MMRT": {
    title: "Maternal mortality ratio",
    description: "Maternal deaths per 100,000 live births. This indicator provides contextual information about maternal health.",
    unit: "",
    decimals: 0
  }
};

function go(id) {
  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
  });

  const target = document.getElementById(id);

  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll("nav a").forEach(a => {
    a.style.background = "";
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (id === "indicator") {
    setTimeout(initMap, 200);
  }
}

// ========================================
// MAP
// ========================================

async function initMap() {
  if (mapInitialized) {
    if (map) map.invalidateSize();
    return;
  }

  if (typeof L === "undefined") {
    document.getElementById("map").innerHTML =
      "Map library could not load. Check your internet connection.";
    return;
  }

  mapInitialized = true;

  map = L.map("map", {
    worldCopyJump: true
  }).setView([20, 0], 2);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 7
    }
  ).addTo(map);

  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
    );

    if (!response.ok) {
      throw new Error("Map boundaries failed to load");
    }

    geoData = await response.json();

    await loadIndicator();
  } catch (error) {
    document.getElementById("map").innerHTML =
      "Map boundaries could not load. Please check the internet connection.";
    console.error(error);
  }
}

function getISO(feature) {
  const p = feature.properties || {};

  return (
    p.ISO_A3 ||
    p.ISO3 ||
    p.ADM0_A3 ||
    p.iso_a3 ||
    p.iso3 ||
    p["ISO3166-1-Alpha-3"] ||
    ""
  );
}

function getCountryName(feature) {
  const p = feature.properties || {};

  return (
    p.ADMIN ||
    p.name ||
    p.NAME ||
    p.name_long ||
    p.NAME_EN ||
    "Unknown country"
  );
}

function getColor(value) {
  if (value === null || value === undefined) return "#dce5ed";

  if (value < 10) return "#dbeaf4";
  if (value < 20) return "#a9cbe3";
  if (value < 30) return "#72a7cf";
  if (value < 40) return "#3f7fb4";
  if (value < 50) return "#205b91";

  return "#103d68";
}

function styleFeature(feature) {
  const iso = getISO(feature);
  const value = countryData[iso];

  return {
    fillColor: getColor(value),
    weight: 0.6,
    opacity: 1,
    color: "#8fa8bc",
    fillOpacity: 0.85
  };
}

function onCountry(feature, layer) {
  const iso = getISO(feature);
  const name = getCountryName(feature);
  const value = countryData[iso];

  layer.bindPopup(
    `<strong>${name}</strong><br>
    ${indicatorInfo[currentIndicator].title}<br>
    ${
      value === undefined
        ? "No data available"
        : value.toFixed(indicatorInfo[currentIndicator].decimals) +
          indicatorInfo[currentIndicator].unit
    }`
  );

  layer.on({
    mouseover: function(e) {
      e.target.setStyle({
        weight: 2,
        color: "#071d38",
        fillOpacity: 1
      });
    },

    mouseout: function(e) {
      if (countryLayer) countryLayer.resetStyle(e.target);
    }
  });
}

function updateLegend() {
  const legend = document.getElementById("map-legend");

  if (!legend) return;

  const labels = [
    ["0–9", "#dbeaf4"],
    ["10–19", "#a9cbe3"],
    ["20–29", "#72a7cf"],
    ["30–39", "#3f7fb4"],
    ["40+", "#205b91"],
    ["No data", "#dce5ed"]
  ];

  legend.innerHTML = labels.map(item => {
    return `
      <div class="legend-item">
        <span class="legend-color"
              style="background:${item[1]}"></span>
        <span>${item[0]}</span>
      </div>
    `;
  }).join("");
}

// ========================================
// WORLD BANK DATA
// ========================================

async function loadIndicator() {
  const select = document.getElementById("indicator-select");

  if (select) {
    currentIndicator = select.value;
  }

  const definition = document.getElementById("indicator-definition");

  if (definition) {
    definition.textContent = indicatorInfo[currentIndicator].description;
  }

  if (!geoData) return;

  try {
    const url =
      `https://api.worldbank.org/v2/country/all/indicator/${currentIndicator}?format=json&per_page=20000&date=2000:2025`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("World Bank data could not be retrieved");
    }

    const result = await response.json();

    if (!result || !result[1]) {
      throw new Error("No indicator data returned");
    }

    const entries = result[1];

    // Keep the latest non-null value for each country
    latestYearData = {};
    countryData = {};
    countryNames = {};

    entries.forEach(entry => {
      if (
        entry.value !== null &&
        entry.countryiso3code &&
        entry.countryiso3code.length === 3
      ) {
        const iso = entry.countryiso3code;

        if (
          !latestYearData[iso] ||
          Number(entry.date) > Number(latestYearData[iso].year)
        ) {
          latestYearData[iso] = {
            value: Number(entry.value),
            year: entry.date,
            name: entry.country.value
          };
        }
      }
    });

    Object.keys(latestYearData).forEach(iso => {
      countryData[iso] = latestYearData[iso].value;
      countryNames[iso] = latestYearData[iso].name;
    });

    drawMap();
    populateCountrySelects();
    updateCountryChart();
    updateLegend();

  } catch (error) {
    console.error(error);

    definition.textContent +=
      " Data could not be loaded. Please check your connection.";
  }
}

function drawMap() {
  if (!geoData || !map) return;

  if (countryLayer) {
    map.removeLayer(countryLayer);
  }

  countryLayer = L.geoJSON(geoData, {
    style: styleFeature,
    onEachFeature: onCountry
  }).addTo(map);

  map.invalidateSize();
}

// ========================================
// COUNTRY DROPDOWNS
// ========================================

function populateCountrySelects() {
  const countries = Object.entries(latestYearData)
    .map(([iso, data]) => ({
      iso,
      name: data.name,
      value: data.value,
      year: data.year
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selects = [
    document.getElementById("country1"),
    document.getElementById("country2"),
    document.getElementById("country3"),
    document.getElementById("country4")
  ];

  const defaults = ["IND", "USA", "RWA", "NOR"];

  selects.forEach((select, index) => {
    if (!select) return;

    const previous = select.value;

    select.innerHTML = "";

    countries.forEach(country => {
      const option = document.createElement("option");

      option.value = country.iso;
      option.textContent =
        `${country.name} (${country.year})`;

      select.appendChild(option);
    });

    if (countries.some(c => c.iso === previous)) {
      select.value = previous;
    } else if (countries.some(c => c.iso === defaults[index])) {
      select.value = defaults[index];
    }
  });
}

// ========================================
// CHART
// ========================================

function updateCountryChart() {
  const ids = ["country1", "country2", "country3", "country4"];

  const chosen = ids.map(id => {
    const select = document.getElementById(id);
    return select ? select.value : null;
  }).filter(Boolean);

  const data = chosen.map(iso => {
    const country = latestYearData[iso];

    return country ? {
      name: country.name,
      value: country.value,
      year: country.year
    } : null;
  }).filter(Boolean);

  const canvas = document.getElementById("countryChart");

  if (!canvas || typeof Chart === "undefined") return;

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: data.map(c => c.name),
      datasets: [{
        label: indicatorInfo[currentIndicator].title,
        data: data.map(c => c.value),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      scales: {
        x: {
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const item = data[context.dataIndex];

              return `${item.value.toFixed(
                indicatorInfo[currentIndicator].decimals
              )} · ${item.year}`;
            }
          }
        }
      }
    }
  });

  const note = document.getElementById("chart-note");

  if (note) {
    note.textContent =
      "Values show the latest available observation within the selected data period for each country. Years may differ between countries.";
  }
}

// ========================================
// PORTRAIT FALLBACK
// Search Wikimedia through Wikipedia API
// ========================================

async function wikiPortrait(img, person) {
  try {
    const url =
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(person)}&prop=pageimages&format=json&pithumbsize=700&origin=*`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Portrait lookup failed");
    }

    const data = await response.json();
    const pages = data.query.pages;
    const page = Object.values(pages)[0];

    if (page && page.thumbnail && page.thumbnail.source) {
      img.src = page.thumbnail.source;
    } else {
      img.onerror = null;
      img.style.display = "none";
    }
  } catch (error) {
    img.onerror = null;
    img.style.display = "none";
  }
}

// ========================================
// START
// ========================================

document.addEventListener("DOMContentLoaded", function() {
  const indicatorSelect = document.getElementById("indicator-select");

  if (indicatorSelect) {
    currentIndicator = indicatorSelect.value;
  }

  // Initialise when the indicator section is first visited.
});
