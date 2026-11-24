"use strict";

/* =========================================================
   BEYOND THE DIVIDE
   Navigation, World Bank data, interactive map and graphs
   ========================================================= */

const INDICATORS = {
  fertility: {
    code: "SP.ADO.TFRT",
    title: "Adolescent fertility",
    unit: "births per 1,000 women aged 15–19",
    description:
      "Births per 1,000 women aged 15–19. Higher values can be associated with barriers to education and healthcare.",
    favourable: "Lower values are generally preferred."
  },

  maternal: {
    code: "SH.STA.MMRT",
    title: "Maternal mortality ratio",
    unit: "maternal deaths per 100,000 live births",
    description:
      "Maternal deaths per 100,000 live births. The measure can help reveal differences in maternal healthcare.",
    favourable: "Lower values are generally preferred."
  },

  parliament: {
    code: "SG.GEN.PARL.ZS",
    title: "Women in parliament",
    unit: "percentage of parliamentary seats",
    description:
      "Percentage of seats in a national parliament's single or lower chamber held by women.",
    favourable: "Higher representation is generally preferred."
  }
};

const DATA_START_YEAR = 2000;
const DATA_END_YEAR = new Date().getFullYear() - 1;

const COUNTRY_CODES = [
  "IND", "USA", "GBR", "SWE", "JPN",
  "BRA", "ZAF", "NOR", "FRA", "AUS"
];

const countryData = {};
const countryHistory = {};
const globalHistory = {};
const chartInstances = {};

let mapFeatures = null;
let mapReady = false;
let currentPage = "home";

/* =========================================================
   NAVIGATION
   ========================================================= */

function showPage(pageId) {
  const target = document.getElementById(pageId);

  if (!target || !target.classList.contains("page")) {
    return;
  }

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  target.classList.add("active");
  currentPage = pageId;

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageId
    );
  });

  document.getElementById("mainNav")?.classList.remove("open");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  // Charts need their visible container dimensions.
  window.setTimeout(() => {
    resizeCharts();

    if (pageId === "understanding") {
      drawWorldMap();
    }
  }, 120);
}

document.querySelectorAll("[data-page]").forEach(element => {
  element.addEventListener("click", event => {
    event.preventDefault();
    showPage(element.dataset.page);
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.go);
  });
});

const menuToggle = document.getElementById("menuToggle");

menuToggle?.addEventListener("click", () => {
  document.getElementById("mainNav")?.classList.toggle("open");
});

const backToTop = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
  if (window.scrollY > 400) {
    backToTop?.classList.add("visible");
  } else {
    backToTop?.classList.remove("visible");
  }
});

backToTop?.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

/* =========================================================
   DATA HELPERS
   ========================================================= */

function formatValue(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "No data";
  }

  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: digits
  });
}

function getLatestByCountry(rows) {
  const latest = new Map();

  rows.forEach(row => {
    const code = row.countryiso3code;
    const value = Number(row.value);
    const year = Number(row.date);

    if (
      !code ||
      code.length !== 3 ||
      !Number.isFinite(value) ||
      !Number.isFinite(year) ||
      !row.country ||
      row.country.region?.value === "Aggregates"
    ) {
      return;
    }

    const existing = latest.get(code);

    if (!existing || year > existing.year) {
      latest.set(code, {
        code,
        name: row.country.value,
        value,
        year
      });
    }
  });

  return Array.from(latest.values());
}

function getCountryHistory(rows, countryCode) {
  return rows
    .filter(row => {
      return (
        row.countryiso3code === countryCode &&
        row.value !== null &&
        Number.isFinite(Number(row.value))
      );
    })
    .map(row => ({
      year: Number(row.date),
      value: Number(row.value)
    }))
    .filter(row => Number.isFinite(row.year))
    .sort((a, b) => a.year - b.year);
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function setHTML(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.innerHTML = value;
  }
}

async function fetchIndicator(indicatorKey) {
  const indicator = INDICATORS[indicatorKey];

  const url =
    `https://api.worldbank.org/v2/country/all/indicator/${indicator.code}` +
    `?format=json&per_page=20000&date=${DATA_START_YEAR}:${DATA_END_YEAR}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`World Bank request failed: ${response.status}`);
  }

  const result = await response.json();

  if (!Array.isArray(result) || !Array.isArray(result[1])) {
    throw new Error("The World Bank returned an unexpected data format.");
  }

  return result[1];
}

async function fetchGlobalHistory(indicatorKey) {
  const indicator = INDICATORS[indicatorKey];

  const url =
    `https://api.worldbank.org/v2/country/WLD/indicator/${indicator.code}` +
    `?format=json&per_page=100&date=${DATA_START_YEAR}:${DATA_END_YEAR}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Global trend data could not be loaded.");
  }

  const result = await response.json();

  if (!Array.isArray(result) || !Array.isArray(result[1])) {
    throw new Error("Global trend data is unavailable.");
  }

  return result[1]
    .filter(row => row.value !== null && Number.isFinite(Number(row.value)))
    .map(row => ({
      year: Number(row.date),
      value: Number(row.value)
    }))
    .filter(row => Number.isFinite(row.year))
    .sort((a, b) => a.year - b.year);
}

/* =========================================================
   CHART HELPERS
   ========================================================= */

function destroyChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
}

function chartBaseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 650
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: "#071b35",
        titleColor: "#ffffff",
        bodyColor: "#dceaf5",
        padding: 11,
        cornerRadius: 7
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: "#6d8296",
          font: {
            family: "DM Sans",
            size: 9
          }
        },
        border: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "#e8eff5"
        },
        ticks: {
          color: "#6d8296",
          font: {
            family: "DM Sans",
            size: 9
          }
        },
        border: {
          display: false
        }
      }
    }
  };
}

function showChartMessage(canvasId, message) {
  const canvas = document.getElementById(canvasId);

  if (!canvas) {
    return;
  }

  destroyChart(canvasId);

  const parent = canvas.parentElement;

  if (parent) {
    let messageElement = parent.querySelector(".chart-message");

    if (!messageElement) {
      messageElement = document.createElement("p");
      messageElement.className = "chart-message";
      messageElement.style.cssText =
        "padding:25px 10px;text-align:center;color:#71869a;font-size:11px;line-height:1.8;";
      parent.appendChild(messageElement);
    }

    messageElement.textContent = message;
  }
}

function clearChartMessage(canvasId) {
  const canvas = document.getElementById(canvasId);
  const message = canvas?.parentElement?.querySelector(".chart-message");

  message?.remove();
}

function createBarChart(canvasId, rows, label, unit) {
  const canvas = document.getElementById(canvasId);

  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  clearChartMessage(canvasId);
  destroyChart(canvasId);

  if (!rows || rows.length === 0) {
    showChartMessage(canvasId, "No country observations are available for this graph.");
    return;
  }

  const options = chartBaseOptions();

  options.indexAxis = "y";
  options.plugins.tooltip.callbacks = {
    label(context) {
      return `${formatValue(context.raw, 2)} ${unit}`;
    }
  };

  options.scales.x.title = {
    display: true,
    text: unit,
    color: "#6d8296",
    font: {
      size: 9
    }
  };

  options.scales.y.ticks = {
    color: "#536e85",
    font: {
      size: 9
    }
  };

  chartInstances[canvasId] = new Chart(canvas, {
    type: "bar",
    data: {
      labels: rows.map(row => row.name),
      datasets: [{
        label,
        data: rows.map(row => row.value),
        backgroundColor: [
          "#164c83", "#2877b9", "#4c91c3", "#75add3",
          "#9dc8e5", "#366e9c", "#6d9fbe", "#a9cce2",
          "#527f9f", "#bdd8e9"
        ],
        borderRadius: 4,
        borderSkipped: false,
        barThickness: 13
      }]
    },
    options
  });
}

function createLineChart(canvasId, rows, label, unit) {
  const canvas = document.getElementById(canvasId);

  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  clearChartMessage(canvasId);
  destroyChart(canvasId);

  if (!rows || rows.length === 0) {
    showChartMessage(canvasId, "No time-series observations are available.");
    return;
  }

  const options = chartBaseOptions();

  options.plugins.tooltip.callbacks = {
    label(context) {
      return `${formatValue(context.raw, 2)} ${unit}`;
    }
  };

  options.scales.x.title = {
    display: true,
    text: "Year",
    color: "#6d8296",
    font: {
      size: 9
    }
  };

  options.elements = {
    line: {
      tension: .3,
      borderWidth: 2.5
    },
    point: {
      radius: 2,
      hoverRadius: 5
    }
  };

  chartInstances[canvasId] = new Chart(canvas, {
    type: "line",
    data: {
      labels: rows.map(row => row.year),
      datasets: [{
        label,
        data: rows.map(row => row.value),
        borderColor: "#2877b9",
        backgroundColor: "rgba(40,119,185,.12)",
        fill: true,
        pointBackgroundColor: "#164c83",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 1.5
      }]
    },
    options
  });
}

function resizeCharts() {
  Object.values(chartInstances).forEach(chart => {
    if (chart && typeof chart.resize === "function") {
      chart.resize();
    }
  });
}

/* =========================================================
   INDICATOR GRAPHS
   ========================================================= */

function getSelectedCountryRows(indicatorKey) {
  const rows = countryData[indicatorKey] || [];

  return rows
    .filter(row => COUNTRY_CODES.includes(row.code))
    .sort((a, b) => {
      const indexA = COUNTRY_CODES.indexOf(a.code);
      const indexB = COUNTRY_CODES.indexOf(b.code);
      return indexA - indexB;
    });
}

function updateIndicatorCharts() {
  const config = [
    {
      key: "fertility",
      canvas: "fertilityChart",
      foot: "fertilityChartFoot"
    },
    {
      key: "maternal",
      canvas: "maternalChart",
      foot: "maternalChartFoot"
    },
    {
      key: "parliament",
      canvas: "parliamentChart",
      foot: "parliamentChartFoot"
    }
  ];

  config.forEach(item => {
    const rows = getSelectedCountryRows(item.key);

    createBarChart(
      item.canvas,
      rows,
      INDICATORS[item.key].title,
      INDICATORS[item.key].unit
    );

    const years = rows.map(row => row.year);

    setText(
      item.foot,
      years.length
        ? `Observation years: ${Math.min(...years)}–${Math.max(...years)}. See the source for individual country years.`
        : "Country data could not be loaded."
    );
  });
}

/* =========================================================
   INDIA DATA
   ========================================================= */

function updateIndiaCards() {
  const indiaIds = {
    fertility: ["indiaFertility", "indiaFertilityYear"],
    maternal: ["indiaMaternal", "indiaMaternalYear"],
    parliament: ["indiaParliament", "indiaParliamentYear"]
  };

  Object.entries(indiaIds).forEach(([key, ids]) => {
    const india = (countryData[key] || []).find(row => row.code === "IND");

    if (!india) {
      setText(ids[0], "—");
      setText(ids[1], "No observation available");
      return;
    }

    setText(ids[0], formatValue(india.value, 1));
    setText(ids[1], `Latest available year: ${india.year}`);
  });
}

function updateIndiaChart() {
  const selector = document.getElementById("indiaIndicator");
  const key = selector?.value || "fertility";

  const rows = countryHistory[key] || [];

  createLineChart(
    "indiaTrendChart",
    rows,
    INDICATORS[key].title,
    INDICATORS[key].unit
  );

  setText(
    "indiaTrendFoot",
    rows.length
      ? `India observations: ${rows[0].year}–${rows[rows.length - 1].year}. Source: World Bank.`
      : "India time-series data is not available for this measure."
  );
}

document.getElementById("indiaIndicator")?.addEventListener("change", updateIndiaChart);

/* =========================================================
   GLOBAL TRENDS
   ========================================================= */

function updateGlobalCharts() {
  const settings = [
    {
      key: "fertility",
      canvas: "globalFertilityChart"
    },
    {
      key: "maternal",
      canvas: "globalMaternalChart"
    },
    {
      key: "parliament",
      canvas: "globalParliamentChart"
    }
  ];

  settings.forEach(item => {
    createLineChart(
      item.canvas,
      globalHistory[item.key] || [],
      INDICATORS[item.key].title,
      INDICATORS[item.key].unit
    );
  });
}

/* =========================================================
   COUNTRY COMPARISON
   ========================================================= */

function updateCountryComparison() {
  const selector = document.getElementById("comparisonIndicator");
  const key = selector?.value || "fertility";

  const rows = (countryData[key] || [])
    .filter(row => Number.isFinite(row.value));

  const output = document.getElementById("comparisonOutput");

  if (!output) {
    return;
  }

  if (rows.length < 2) {
    output.textContent = "There is not enough country data to make a comparison.";
    return;
  }

  const lower = [...rows]
    .sort((a, b) => a.value - b.value)
    .slice(0, 4);

  const higher = [...rows]
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const makeRow = row => `
    <div class="evidence-row">
      <span>${escapeHTML(row.name)}</span>
      <strong>${formatValue(row.value, 2)}</strong>
      <small>${row.year}</small>
    </div>
  `;

  output.innerHTML = `
    <div>
      <span class="small-tag">HIGHER OBSERVED VALUES</span>
      ${higher.map(makeRow).join("")}
    </div>
    <div>
      <span class="small-tag">LOWER OBSERVED VALUES</span>
      ${lower.map(makeRow).join("")}
    </div>
    <p class="tiny-note">
      These are the highest and lowest available country observations
      in the retrieved dataset. They are not a complete ranking of
      gender equality. Always consider the observation year and measure.
    </p>
  `;
}

document.getElementById("comparisonIndicator")?.addEventListener(
  "change",
  updateCountryComparison
);

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return replacements[character];
  });
}

/* =========================================================
   INTERACTIVE WORLD MAP
   ========================================================= */

function getFeatureCode(feature) {
  const properties = feature.properties || {};

  const possibleCodes = [
    properties["ISO3166-1-Alpha-3"],
    properties.ISO_A3,
    properties.ADM0_A3,
    properties.iso_a3,
    properties.ISO3,
    properties.iso3
  ];

  const code = possibleCodes.find(value => {
    return typeof value === "string" && /^[A-Z]{3}$/.test(value);
  });

  return code || null;
}

function getFeatureName(feature) {
  const properties = feature.properties || {};

  return (
    properties.name ||
    properties.ADMIN ||
    properties.NAME ||
    properties.name_long ||
    "Unknown country"
  );
}

async function loadMapBoundaries() {
  const urls = [
    "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        continue;
      }

      const geojson = await response.json();

      if (geojson && Array.isArray(geojson.features)) {
        return geojson.features;
      }
    } catch (error) {
      console.warn("Map boundary source unavailable:", url);
    }
  }

  throw new Error("Country boundary data could not be loaded.");
}

function getMapRows(key) {
  return countryData[key] || [];
}

function drawWorldMap() {
  const svgElement = document.getElementById("worldMap");

  if (!svgElement || !mapFeatures || typeof d3 === "undefined") {
    return;
  }

  const selectedKey =
    document.getElementById("mapIndicator")?.value || "fertility";

  const indicator = INDICATORS[selectedKey];
  const rows = getMapRows(selectedKey);

  const mapData = new Map(
    rows.map(row => [row.code, row])
  );

  const width = Math.max(
    560,
    svgElement.parentElement?.clientWidth || 700
  );

  const height = Math.max(260, Math.round(width * .49));

  const svg = d3.select(svgElement);

  svg.selectAll("*").remove();
  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.attr("preserveAspectRatio", "xMidYMid meet");

  const projection = d3.geoNaturalEarth1()
    .fitSize(
      [width - 12, height - 20],
      {
        type: "FeatureCollection",
        features: mapFeatures
      }
    );

  const path = d3.geoPath(projection);

  const validValues = rows
    .map(row => row.value)
    .filter(Number.isFinite);

  const minimum = d3.min(validValues);
  const maximum = d3.max(validValues);

  const colorScale = d3.scaleSequential()
    .domain(
      minimum === maximum
        ? [minimum - 1, maximum + 1]
        : [minimum, maximum]
    )
    .interpolator(d3.interpolateBlues);

  const tooltip = document.getElementById("mapTooltip");
  const mapContainer = svgElement.parentElement;

  const features = svg
    .append("g")
    .selectAll("path")
    .data(mapFeatures)
    .join("path")
    .attr("class", "country-shape")
    .attr("d", path)
    .attr("fill", feature => {
      const code = getFeatureCode(feature);
      const record = code ? mapData.get(code) : null;

      return record
        ? colorScale(record.value)
        : "#e5edf4";
    });

  features
    .on("pointermove", (event, feature) => {
      if (!tooltip || !mapContainer) {
        return;
      }

      const code = getFeatureCode(feature);
      const record = code ? mapData.get(code) : null;
      const name = getFeatureName(feature);

      tooltip.style.display = "block";

      if (record) {
        tooltip.innerHTML =
          `<strong>${escapeHTML(name)}</strong>` +
          `${formatValue(record.value, 2)} ${escapeHTML(indicator.unit)}<br>` +
          `Year: ${record.year}`;
      } else {
        tooltip.innerHTML =
          `<strong>${escapeHTML(name)}</strong>No data available`;
      }

      const bounds = mapContainer.getBoundingClientRect();

      let left = event.clientX - bounds.left + 12;
      let top = event.clientY - bounds.top + 12;

      left = Math.min(left, bounds.width - 175);
      top = Math.min(top, bounds.height - 85);

      tooltip.style.left = `${Math.max(5, left)}px`;
      tooltip.style.top = `${Math.max(5, top)}px`;
    })
    .on("pointerleave", () => {
      if (tooltip) {
        tooltip.style.display = "none";
      }
    });

  setText("mapMeasureTitle", indicator.title);
  setText("mapMeasureDescription", indicator.description);
  setText("mapCountryCount", String(rows.length));

  if (validValues.length) {
    const median = d3.median(validValues);

    setText(
      "mapPattern",
      `Median: ${formatValue(median, 1)}`
    );
  } else {
    setText("mapPattern", "No data");
  }

  setText(
    "mapStatus",
    `${rows.length} countries with data · World Bank`
  );

  updateCountryLists(selectedKey);
  mapReady = true;
}

function updateCountryLists(key) {
  const rows = (countryData[key] || [])
    .filter(row => Number.isFinite(row.value));

  const higher = [...rows]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const lower = [...rows]
    .sort((a, b) => a.value - b.value)
    .slice(0, 5);

  const renderRows = list => {
    if (!list.length) {
      return "<p class='muted'>No country data available.</p>";
    }

    return list.map(row => `
      <div class="country-row">
        <span>${escapeHTML(row.name)} <small>(${row.year})</small></span>
        <strong>${formatValue(row.value, 2)}</strong>
      </div>
    `).join("");
  };

  setHTML("higherCountries", renderRows(higher));
  setHTML("lowerCountries", renderRows(lower));
}

document.getElementById("mapIndicator")?.addEventListener("change", () => {
  drawWorldMap();
});

window.addEventListener("resize", () => {
  if (currentPage === "understanding" && mapReady) {
    window.setTimeout(drawWorldMap, 150);
  }
});

/* =========================================================
   LOAD ALL DATA
   ========================================================= */

async function loadAllData() {
  const keys = Object.keys(INDICATORS);

  setText("mapStatus", "Loading country data…");

  const results = await Promise.allSettled(
    keys.map(async key => {
      const rows = await fetchIndicator(key);

      countryData[key] = getLatestByCountry(rows);

      countryHistory[key] = getCountryHistory(rows, "IND");

      return rows;
    })
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const key = keys[index];
      console.error(`Could not load ${key}:`, result.reason);
      countryData[key] = [];
      countryHistory[key] = [];
    }
  });

  updateIndicatorCharts();
  updateIndiaCards();
  updateIndiaChart();
  updateCountryComparison();

  const globalResults = await Promise.allSettled(
    keys.map(async key => {
      globalHistory[key] = await fetchGlobalHistory(key);
    })
  );

  globalResults.forEach((result, index) => {
    if (result.status === "rejected") {
      const key = keys[index];
      console.warn(`Global trend unavailable for ${key}.`);
      globalHistory[key] = [];
    }
  });

  updateGlobalCharts();

  try {
    mapFeatures = await loadMapBoundaries();
    setText("mapStatus", "Country boundaries loaded");

    if (currentPage === "understanding") {
      drawWorldMap();
    }
  } catch (error) {
    console.error("World map error:", error);
    setText(
      "mapStatus",
      "Map boundaries could not be loaded. Please check your connection."
    );

    const svg = document.getElementById("worldMap");

    if (svg) {
      svg.innerHTML = `
        <text x="50%" y="48%" text-anchor="middle"
          fill="#627b91" font-size="13">
          The map could not load.
        </text>
        <text x="50%" y="55%" text-anchor="middle"
          fill="#8194a6" font-size="10">
          Please refresh the page when connected to the internet.
        </text>
      `;
    }
  }

  resizeCharts();
}

/* =========================================================
   INITIALISE
   ========================================================= */

function initialiseWebsite() {
  if (typeof Chart === "undefined") {
    console.error("Chart.js did not load. Graphs cannot be displayed.");
  }

  if (typeof d3 === "undefined") {
    setText("mapStatus", "D3.js did not load. The map cannot be displayed.");
    console.error("D3.js did not load.");
  }

  loadAllData().catch(error => {
    console.error("Website data initialisation error:", error);
    setText(
      "mapStatus",
      "Data could not be loaded. Check your internet connection and refresh."
    );
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialiseWebsite);
} else {
  initialiseWebsite();
}
