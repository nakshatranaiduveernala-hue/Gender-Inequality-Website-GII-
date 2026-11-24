"use strict";

/* =========================================================
   BEYOND THE DIVIDE
   Navigation · World Bank data · Interactive map · Charts
========================================================= */

const INDICATORS = {
  fertility: {
    code: "SP.ADO.TFRT",
    title: "Adolescent Fertility Rate",
    eyebrow: "INDICATOR 01",
    description: "The annual number of births per 1,000 women aged 15–19.",
    unit: "Births per 1,000 girls aged 15–19",
    importance: "This indicator can help reveal differences in access to education, healthcare and reproductive health information.",
    shortUnit: "births per 1,000 girls",
    decimals: 1,
    interpretation: "Higher values indicate more births among adolescents relative to the population of girls aged 15–19. Differences may be connected to education, healthcare access, social conditions and economic opportunity."
  },

  mortality: {
    code: "SH.STA.MMRT",
    title: "Maternal Mortality Ratio",
    eyebrow: "INDICATOR 02",
    description: "The number of maternal deaths per 100,000 live births.",
    unit: "Maternal deaths per 100,000 live births",
    importance: "This indicator helps show differences in maternal healthcare, access to skilled care and health-system capacity.",
    shortUnit: "deaths per 100,000 live births",
    decimals: 0,
    interpretation: "Higher values indicate greater maternal mortality. Differences can be associated with access to skilled care, healthcare quality, transport, income and wider health-system conditions."
  },

  parliament: {
    code: "SG.GEN.PARL.ZS",
    title: "Women in Parliament",
    eyebrow: "INDICATOR 03",
    description: "The percentage of parliamentary seats held by women in national parliaments.",
    unit: "Percentage of parliamentary seats",
    importance: "This indicator helps examine women's political representation and participation in decision-making.",
    shortUnit: "percent of seats",
    decimals: 1,
    interpretation: "Higher values indicate a greater share of parliamentary seats held by women. Representation can be influenced by electoral systems, political parties, social expectations and policies."
  }
};

const state = {
  selectedIndicator: "fertility",
  indiaChart: "fertility",
  data: {},
  charts: {},
  mapRequest: 0
};

const $ = selector => document.querySelector(selector);

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

/* ---------------- NAVIGATION ---------------- */

function showPage(pageId) {
  const target = document.getElementById(pageId);
  if (!target) return;

  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === pageId);
  });

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });

  $("#navLinks")?.classList.remove("open");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (pageId === "indicators") {
    window.setTimeout(() => drawMap(state.selectedIndicator), 120);
  }
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.go);
  });
});

$("#menuToggle")?.addEventListener("click", () => {
  $("#navLinks")?.classList.toggle("open");
});

/* ---------------- HOME INDICATOR CARDS ---------------- */

function openIndicator(key) {
  if (!INDICATORS[key]) return;

  state.selectedIndicator = key;
  updateIndicatorPage();
  showPage("indicators");
}

document.querySelectorAll("[data-open-indicator]").forEach(card => {
  card.addEventListener("click", () => {
    openIndicator(card.dataset.openIndicator);
  });

  card.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openIndicator(card.dataset.openIndicator);
    }
  });
});

/* ---------------- WORLD BANK API ---------------- */

async function getIndicatorData(indicatorCode) {
  const url =
    `https://api.worldbank.org/v2/country/all/indicator/${indicatorCode}` +
    `?format=json&per_page=20000&date=2000:2025`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`World Bank request failed: ${response.status}`);
  }

  const json = await response.json();

  if (!Array.isArray(json) || !Array.isArray(json[1])) {
    throw new Error("Unexpected World Bank response.");
  }

  return json[1];
}

function countryRecords(rows) {
  const records = new Map();

  rows.forEach(item => {
    const code = item.countryiso3code;

    if (
      !code ||
      code.length !== 3 ||
      item.value === null ||
      item.value === undefined
    ) {
      return;
    }

    const year = Number(item.date);
    const previous = records.get(code);

    if (!previous || year > previous.year) {
      records.set(code, {
        code,
        name: item.country?.value || code,
        year,
        value: Number(item.value)
      });
    }
  });

  return [...records.values()];
}

function getWorldRecord(rows) {
  const worldRows = rows
    .filter(item =>
      item.countryiso3code === "WLD" &&
      item.value !== null &&
      item.value !== undefined
    )
    .sort((a, b) => Number(b.date) - Number(a.date));

  if (!worldRows.length) return null;

  return {
    year: Number(worldRows[0].date),
    value: Number(worldRows[0].value)
  };
}

function latestForCode(rows, code) {
  const found = rows
    .filter(item =>
      item.countryiso3code === code &&
      item.value !== null &&
      item.value !== undefined
    )
    .sort((a, b) => Number(b.date) - Number(a.date));

  if (!found.length) return null;

  return {
    year: Number(found[0].date),
    value: Number(found[0].value)
  };
}

function historyForCode(rows, code) {
  return rows
    .filter(item =>
      item.countryiso3code === code &&
      item.value !== null &&
      item.value !== undefined
    )
    .map(item => ({
      year: Number(item.date),
      value: Number(item.value)
    }))
    .sort((a, b) => a.year - b.year);
}

function historyForWorld(rows) {
  return rows
    .filter(item =>
      item.countryiso3code === "WLD" &&
      item.value !== null &&
      item.value !== undefined
    )
    .map(item => ({
      year: Number(item.date),
      value: Number(item.value)
    }))
    .sort((a, b) => a.year - b.year);
}

function formatValue(value, decimals = 1) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
}

async function loadAllData() {
  const keys = Object.keys(INDICATORS);

  const results = await Promise.all(
    keys.map(async key => {
      try {
        const rows = await getIndicatorData(INDICATORS[key].code);

        return {
          key,
          rows,
          countries: countryRecords(rows),
          world: getWorldRecord(rows),
          error: null
        };
      } catch (error) {
        console.error(`Could not load ${key}:`, error);

        return {
          key,
          rows: [],
          countries: [],
          world: null,
          error
        };
      }
    })
  );

  results.forEach(result => {
    state.data[result.key] = result;
  });

  updateIndicatorPage();
  updateIndiaCards();
  updateIndiaChart(state.indiaChart);
  updateTrendCharts();

  if (state.data[state.selectedIndicator]?.countries.length) {
    drawMap(state.selectedIndicator);
  } else {
    showMapMessage("Country data could not be loaded. Check your internet connection and try again.");
  }
}

/* ---------------- INDICATOR PAGE ---------------- */

function updateIndicatorPage() {
  const key = state.selectedIndicator;
  const config = INDICATORS[key];
  const data = state.data[key];

  $("#indicatorEyebrow").textContent = config.eyebrow;
  $("#indicatorTitle").textContent = config.title;
  $("#indicatorDescription").textContent = config.description;
  $("#indicatorUnit").textContent = config.unit;
  $("#indicatorImportance").textContent = config.importance;
  $("#mapInterpretation").textContent = config.interpretation;

  if (data?.world) {
    $("#worldAverage").textContent =
      formatValue(data.world.value, config.decimals);

    $("#worldAverageUnit").textContent =
      `${config.shortUnit} · ${data.world.year}`;
  } else {
    $("#worldAverage").textContent = "Unavailable";
    $("#worldAverageUnit").textContent =
      "No global value was returned by the source.";
  }

  const sorted = [...(data?.countries || [])]
    .filter(country => Number.isFinite(country.value))
    .sort((a, b) => b.value - a.value);

  const high = sorted[0];
  const low = sorted[sorted.length - 1];

  $("#highestCountry").textContent = high
    ? `${high.name} · ${formatValue(high.value, config.decimals)} (${high.year})`
    : "No country data available";

  $("#lowestCountry").textContent = low
    ? `${low.name} · ${formatValue(low.value, config.decimals)} (${low.year})`
    : "No country data available";

  document.querySelectorAll("[data-indicator]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.indicator === key
    );
  });

  drawCountryChart(key);
  drawMap(key);
}

document.querySelectorAll("[data-indicator]").forEach(button => {
  button.addEventListener("click", () => {
    state.selectedIndicator = button.dataset.indicator;
    updateIndicatorPage();
  });
});

/* ---------------- COUNTRY COMPARISON CHART ---------------- */

function drawCountryChart(key) {
  const data = state.data[key];
  const canvas = $("#countryChart");

  if (!canvas || typeof Chart === "undefined") return;

  if (!data?.countries?.length) {
    $("#countryChartCaption").textContent =
      "Country data is not available at the moment.";
    return;
  }

  const preferred = [
    "IND", "USA", "GBR", "BRA",
    "ZAF", "JPN", "SWE", "NGA"
  ];

  const selected = preferred
    .map(code =>
      data.countries.find(country => country.code === code)
    )
    .filter(Boolean);

  if (selected.length < 4) {
    const additional = data.countries
      .filter(country =>
        !selected.some(item => item.code === country.code)
      )
      .sort((a, b) => b.value - a.value)
      .slice(0, 8 - selected.length);

    selected.push(...additional);
  }

  const config = INDICATORS[key];

  if (state.charts.country) {
    state.charts.country.destroy();
  }

  state.charts.country = new Chart(canvas, {
    type: "bar",
    data: {
      labels: selected.map(item => item.name),
      datasets: [{
        label: config.title,
        data: selected.map(item => item.value),
        backgroundColor: [
          "#173b56",
          "#2d607b",
          "#4e8094",
          "#78a0ac",
          "#91b1b9",
          "#a8c0c5",
          "#b7cbd0",
          "#c5d5d4"
        ],
        borderRadius: 3,
        maxBarThickness: 42
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context =>
              `${formatValue(context.raw, config.decimals)} · ${config.shortUnit}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#647680", font: { size: 10 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: "#e9edef" },
          ticks: { color: "#647680" }
        }
      }
    }
  });

  $("#countryChartCaption").textContent =
    `Latest available values for selected countries. Data years can differ by country. Source: World Bank, ${config.code}.`;
}

/* ---------------- INTERACTIVE WORLD MAP ---------------- */

function showMapMessage(message) {
  const container = $("#worldMap");
  if (!container) return;

  container.innerHTML = "";

  const paragraph = document.createElement("p");
  paragraph.className = "small-note";
  paragraph.textContent = message;

  const button = document.createElement("button");
  button.className = "selector";
  button.textContent = "Try loading the map again";
  button.addEventListener("click", () => {
    drawMap(state.selectedIndicator);
  });

  container.append(paragraph, button);
}

async function drawMap(key) {
  const container = $("#worldMap");
  if (!container) return;

  const data = state.data[key];

  if (!data?.countries?.length) {
    showMapMessage("Country data is still loading or unavailable.");
    return;
  }

  if (typeof d3 === "undefined") {
    showMapMessage("The map library could not load. Check your internet connection.");
    return;
  }

  const requestNumber = ++state.mapRequest;
  container.innerHTML = '<p class="small-note">Loading interactive map…</p>';

  try {
    const geoUrl =
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

    const geo = await d3.json(geoUrl);

    if (requestNumber !== state.mapRequest) return;

    if (!geo || !Array.isArray(geo.features)) {
      throw new Error("Map geography could not be loaded.");
    }

    const values = new Map(
      data.countries.map(country => [country.code, country])
    );

    const usable = data.countries
      .map(country => country.value)
      .filter(Number.isFinite);

    if (!usable.length) {
      throw new Error("No country values are available.");
    }

    const quantile = d3.scaleQuantile()
      .domain(usable)
      .range([
        "#dce9e9",
        "#a9c6cc",
        "#6e9ba9",
        "#315f78",
        "#173b56"
      ]);

    const width = 920;
    const height = 470;

    container.innerHTML = "";

    const svg = d3.select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", "World map shaded by the selected development indicator");

    const projection = d3.geoNaturalEarth1()
      .fitExtent([[8, 8], [width - 8, height - 8]], geo);

    const path = d3.geoPath(projection);
    const tooltip = $("#mapTooltip");
    const frame = $(".map-frame");

    svg.selectAll("path")
      .data(geo.features)
      .join("path")
      .attr("class", "country-shape")
      .attr("d", path)
      .attr("fill", feature => {
        const code =
          feature.properties.ADM0_A3 ||
          feature.properties.ISO_A3;

        const record = values.get(code);

        return record ? quantile(record.value) : "#d5dcdd";
      })
      .on("mousemove", function(event, feature) {
        const code =
          feature.properties.ADM0_A3 ||
          feature.properties.ISO_A3;

        const record = values.get(code);

        const name =
          feature.properties.ADMIN ||
          feature.properties.NAME ||
          "Country";

        tooltip.style.display = "block";

        tooltip.innerHTML = record
          ? `<strong>${name}</strong>${formatValue(record.value, INDICATORS[key].decimals)} · ${record.year}`
          : `<strong>${name}</strong>No matched value in the selected dataset`;

        const bounds = frame.getBoundingClientRect();

        tooltip.style.left =
          `${event.clientX - bounds.left + 12}px`;

        tooltip.style.top =
          `${event.clientY - bounds.top + 12}px`;
      })
      .on("mouseleave", () => {
        tooltip.style.display = "none";
      });

  } catch (error) {
    console.error("Map error:", error);

    if (requestNumber === state.mapRequest) {
      showMapMessage(
        "The interactive map could not load. The comparison graph remains available. Check your connection and try again."
      );
    }
  }
}

/* ---------------- INDIA DATA ---------------- */

function updateIndiaCards() {
  const targets = {
    fertility: $("#indiaFertility"),
    mortality: $("#indiaMortality"),
    parliament: $("#indiaParliament")
  };

  Object.keys(targets).forEach(key => {
    const result = latestForCode(
      state.data[key]?.rows || [],
      "IND"
    );

    targets[key].textContent = result
      ? formatValue(result.value, INDICATORS[key].decimals)
      : "—";

    targets[key].title = result
      ? `Latest available year: ${result.year}`
      : "No data available";
  });
}

function updateIndiaChart(key) {
  const canvas = $("#indiaChart");

  if (!canvas || typeof Chart === "undefined") return;

  const history = historyForCode(
    state.data[key]?.rows || [],
    "IND"
  );

  if (!history.length) {
    return;
  }

  if (state.charts.india) {
    state.charts.india.destroy();
  }

  state.charts.india = new Chart(canvas, {
    type: "line",
    data: {
      labels: history.map(item => item.year),
      datasets: [{
        label: INDICATORS[key].title,
        data: history.map(item => item.value),
        borderColor: "#285c78",
        backgroundColor: "rgba(40,92,120,.12)",
        fill: true,
        tension: .3,
        pointRadius: 2,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 10 }
        },
        y: {
          beginAtZero: true,
          grid: { color: "#e8edef" }
        }
      }
    }
  });
}

document.querySelectorAll("[data-india-chart]").forEach(button => {
  button.addEventListener("click", () => {
    state.indiaChart = button.dataset.indiaChart;

    document.querySelectorAll("[data-india-chart]").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    updateIndiaChart(state.indiaChart);
  });
});

/* ---------------- GLOBAL TREND CHARTS ---------------- */

function makeTrendChart(canvasId, key) {
  const canvas = document.getElementById(canvasId);

  if (!canvas || typeof Chart === "undefined") return;

  const history = historyForWorld(
    state.data[key]?.rows || []
  );

  if (!history.length) {
    const note = document.createElement("p");
    note.className = "small-note";
    note.textContent = "Global time-series data is not available from the source.";

    canvas.insertAdjacentElement("afterend", note);
    canvas.style.display = "none";
    return;
  }

  if (state.charts[canvasId]) {
    state.charts[canvasId].destroy();
  }

  canvas.style.display = "block";

  state.charts[canvasId] = new Chart(canvas, {
    type: "line",
    data: {
      labels: history.map(item => item.year),
      datasets: [{
        data: history.map(item => item.value),
        borderColor: "#315f78",
        backgroundColor: "rgba(49,95,120,.12)",
        fill: true,
        tension: .32,
        pointRadius: 1,
        pointHoverRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxTicksLimit: 6,
            font: { size: 9 }
          }
        },
        y: {
          beginAtZero: true,
          ticks: { font: { size: 9 } },
          grid: { color: "#edf0f0" }
        }
      }
    }
  });
}

function updateTrendCharts() {
  makeTrendChart("trendFertility", "fertility");
  makeTrendChart("trendMortality", "mortality");
  makeTrendChart("trendParliament", "parliament");
}

/* ---------------- IMAGE FALLBACKS ---------------- */

function setImageFallback(image) {
  const card = image.closest(".leader-card");

  image.alt = "Image unavailable. Use the image source link in this card.";
  image.style.objectFit = "contain";
  image.style.padding = "35px";
  image.style.background = "#e3e9e9";

  if (card) {
    card.classList.add("image-unavailable");
  }
}

document.querySelectorAll(".leader-card img").forEach(image => {
  image.addEventListener("error", () => {
    setImageFallback(image);
  });

  if (image.complete && image.naturalWidth === 0) {
    setImageFallback(image);
  }
});

/* ---------------- ABOUT ME PHOTO ---------------- */

const aboutPhoto = $("#aboutPhoto");
const photoMissing = $("#photoMissing");

function checkAboutPhoto() {
  if (!aboutPhoto || !photoMissing) return;

  if (aboutPhoto.complete && aboutPhoto.naturalWidth === 0) {
    aboutPhoto.style.display = "none";
    photoMissing.style.display = "flex";
  } else {
    aboutPhoto.style.display = "block";
    photoMissing.style.display = "none";
  }
}

aboutPhoto?.addEventListener("load", checkAboutPhoto);
aboutPhoto?.addEventListener("error", checkAboutPhoto);

if (aboutPhoto?.complete) {
  checkAboutPhoto();
}

/* ---------------- START WEBSITE ---------------- */

async function startWebsite() {
  if (typeof Chart === "undefined") {
    showToast("The chart library did not load. Check your internet connection.");
  }

  await loadAllData();
}

startWebsite();
