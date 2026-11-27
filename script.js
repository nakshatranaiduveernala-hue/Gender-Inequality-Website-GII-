/* ============================================
   BEYOND THE NUMBERS — JAVASCRIPT
   ============================================ */

const INDICATORS = {
  "SG.GEN.PARL.ZS": {
    name: "Women in Parliament (%)",
    unit: "%",
    description: "Percentage of seats held by women in national parliaments."
  },
  "SP.ADO.TFRT": {
    name: "Adolescent fertility",
    unit: "births per 1,000",
    description: "Births per 1,000 women aged 15–19."
  },
  "SH.STA.MMRT": {
    name: "Maternal mortality",
    unit: "per 100,000",
    description: "Maternal mortality ratio per 100,000 live births."
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
  {code:"ZAF",name:"South Africa"},
  {code:"GBR",name:"United Kingdom"},
  {code:"MEX",name:"Mexico"},
  {code:"DEU",name:"Germany"},
  {code:"CHN",name:"China"}
];

const COLORS = {
  navy:"#123D70",
  blue:"#245FA8",
  bright:"#4389DA",
  gold:"#C7A45C",
  pale:"#EDF4FC",
  text:"#24364B"
};

let currentIndicator = "SG.GEN.PARL.ZS";
let map;
let geoLayer;
let countryChart;
let globalChart;
let mapValues = {};
let mapYear = {};
let mapDataReady = false;
let mapInitialized = false;
let mapLoading = false;
let mapGeoJSON = null;

const dataCache = {};

function showPage(id) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.remove("active");
  });

  const page = document.getElementById(id);
  const button = document.querySelector(`[data-page="${id}"]`);

  if (page) page.classList.add("active");
  if (button) button.classList.add("active");

  const titles = {
    home:"Home",
    issue:"The Issue",
    india:"India",
    trends:"Trends",
    indicator:"Development Indicator",
    "criterion-b":"Criterion B",
    "criterion-c":"Criterion C",
    "criterion-d":"Criterion D",
    sources:"Sources",
    about:"About Me"
  };

  document.getElementById("page-title").textContent =
    titles[id] || "Beyond the Numbers";

  if (id === "indicator" && mapInitialized) {
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }

  window.scrollTo({top:0,behavior:"smooth"});
}

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});


/* WORLD BANK API */

async function getIndicator(code) {
  if (dataCache[code]) return dataCache[code];

  const url =
    `https://api.worldbank.org/v2/country/all/indicator/${code}` +
    `?format=json&per_page=20000&date=2015:2025`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("World Bank request failed.");
  }

  const data = await response.json();

  if (!data || !data[1]) {
    throw new Error("No World Bank data returned.");
  }

  dataCache[code] = data[1];
  return data[1];
}


/* KEEP THE LATEST AVAILABLE OBSERVATION */

function latestByCountry(data) {
  const result = {};

  data.forEach(row => {
    if (!row.countryiso3code || row.value === null) return;

    const code = row.countryiso3code;
    const year = Number(row.date);

    if (
      !result[code] ||
      year > result[code].year
    ) {
      result[code] = {
        value:Number(row.value),
        year:year,
        country:row.country?.value || code
      };
    }
  });

  return result;
}


/* MAP */

async function initializeMap() {
  if (mapInitialized) return;
  mapInitialized = true;

  const mapElement = document.getElementById("map");
  if (!mapElement) return;

  map = L.map("map", {
    worldCopyJump:true,
    minZoom:2
  }).setView([20,10],2);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution:'&copy; OpenStreetMap &copy; CARTO',
      maxZoom:7
    }
  ).addTo(map);

  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
    );

    if (!response.ok) throw new Error("Map boundaries unavailable");

    mapGeoJSON = await response.json();

    await updateMap(currentIndicator);

  } catch(error) {
    document.getElementById("map-status").textContent =
      "Map boundaries could not load. Please check your internet connection.";
  }
}


/* MAP COLOURS */

function getColor(value) {
  if (value === null || value === undefined) return "#E7EDF4";

  return value > 60 ? "#123D70" :
         value > 45 ? "#245FA8" :
         value > 30 ? "#4389DA" :
         value > 20 ? "#82B3E8" :
         value > 10 ? "#C3DDF5" :
         "#EDF4FC";
}

function mapStyle(feature) {
  const code =
    feature.properties.ISO3166_1_alpha_3 ||
    feature.properties.ISO_A3 ||
    feature.properties.ADM0_A3 ||
    feature.properties.iso_a3;

  const value = mapValues[code];

  return {
    fillColor:getColor(value),
    weight:0.6,
    opacity:1,
    color:"#FFFFFF",
    fillOpacity:0.85
  };
}


/* COUNTRY IDENTIFIER */

function getFeatureCode(feature) {
  const p = feature.properties || {};

  return (
    p.ISO3166_1_alpha_3 ||
    p.ISO_A3 ||
    p.ADM0_A3 ||
    p.iso_a3 ||
    p.SOV_A3 ||
    null
  );
}


/* INTERACTION */

function onCountryFeature(feature, layer) {
  const code = getFeatureCode(feature);
  const name =
    feature.properties.ADMIN ||
    feature.properties.name ||
    feature.properties.NAME ||
    code;

  const value = mapValues[code];
  const year = mapYear[code];

  layer.bindTooltip(
    `${name}: ${
      value !== undefined && value !== null
      ? value.toFixed(1)
      : "No data"
    }${value !== undefined && value !== null
      ? " · " + INDICATORS[currentIndicator].unit
      : ""}${year ? " · " + year : ""}`,
    {sticky:true}
  );

  layer.on("click", () => {
    const select = document.getElementById("country-select");

    if (select && COUNTRIES.some(c => c.code === code)) {
      select.value = code;
      updateCountryChart(code);
    }
  });

  layer.on("mouseover", event => {
    event.target.setStyle({
      weight:2,
      color:COLORS.gold
    });
  });

  layer.on("mouseout", event => {
    if (geoLayer) geoLayer.resetStyle(event.target);
  });
}


/* MAP LEGEND */

function buildLegend() {
  const legend = document.getElementById("map-legend");
  if (!legend) return;

  const name = INDICATORS[currentIndicator].name;

  const ranges = [
    {color:"#123D70",label:"Above 60"},
    {color:"#245FA8",label:"45–60"},
    {color:"#4389DA",label:"30–45"},
    {color:"#82B3E8",label:"20–30"},
    {color:"#C3DDF5",label:"10–20"},
    {color:"#EDF4FC",label:"0–10"},
    {color:"#E7EDF4",label:"No data"}
  ];

  legend.innerHTML =
    `<h3>${name}</h3>` +
    ranges.map(item =>
      `<div class="legend-row">
        <span class="legend-color" style="background:${item.color}"></span>
        <span>${item.label}</span>
      </div>`
    ).join("");
}


/* UPDATE MAP */

async function updateMap(indicator) {
  if (!map || !mapGeoJSON || mapLoading) return;

  mapLoading = true;
  currentIndicator = indicator;

  document.getElementById("map-status").textContent =
    "Retrieving data from the World Bank...";

  try {
    const data = await getIndicator(indicator);
    const latest = latestByCountry(data);

    mapValues = {};
    mapYear = {};

    Object.keys(latest).forEach(code => {
      mapValues[code] = latest[code].value;
      mapYear[code] = latest[code].year;
    });

    if (geoLayer) {
      map.removeLayer(geoLayer);
    }

    geoLayer = L.geoJSON(mapGeoJSON, {
      style:mapStyle,
      onEachFeature:onCountryFeature
    }).addTo(map);

    buildLegend();

    document.getElementById("map-status").textContent =
      "Country colours represent the latest available observation " +
      "within 2015–2025. Grey countries have no available data.";

    mapDataReady = true;

  } catch(error) {
    document.getElementById("map-status").textContent =
      "Unable to retrieve indicator data. Check your internet connection.";
  }

  mapLoading = false;
}


/* GLOBAL GRAPH */

async function loadGlobalChart() {
  const status = document.getElementById("global-status");

  try {
    const data = await getIndicator("SG.GEN.PARL.ZS");

    const globalRows = data.filter(row =>
      row.countryiso3code === "WLD" &&
      row.value !== null
    ).sort((a,b) => Number(a.date)-Number(b.date));

    if (!globalRows.length) {
      status.textContent = "Global data was not available.";
      return;
    }

    const years = globalRows.map(row => row.date);
    const values = globalRows.map(row => Number(row.value));

    globalChart = new Chart(
      document.getElementById("globalChart"),
      {
        type:"line",
        data:{
          labels:years,
          datasets:[{
            label:"Women in Parliament (%)",
            data:values,
            borderColor:COLORS.blue,
            backgroundColor:"rgba(36,95,168,0.12)",
            fill:true,
            tension:0.25,
            pointBackgroundColor:COLORS.gold
          }]
        },
        options:{
          responsive:true,
          maintainAspectRatio:true,
          plugins:{
            legend:{display:true},
            tooltip:{enabled:true}
          },
          scales:{
            y:{
              beginAtZero:true,
              title:{
                display:true,
                text:"Percentage of seats"
              }
            },
            x:{
              title:{
                display:true,
                text:"Year"
              }
            }
          }
        }
      }
    );

    status.textContent =
      "Source: World Bank. Data is retrieved dynamically.";

  } catch(error) {
    status.textContent =
      "Global trend data could not be loaded.";
  }
}


/* COUNTRY GRAPH */

async function updateCountryChart(selectedCode) {
  const status = document.getElementById("country-status");

  status.textContent = "Retrieving country data...";

  try {
    const data = await getIndicator(currentIndicator);
    const latest = latestByCountry(data);

    const comparison = COUNTRIES
      .map(country => ({
        name:country.name,
        code:country.code,
        value:latest[country.code]?.value ?? null,
        year:latest[country.code]?.year ?? null
      }))
      .filter(country => country.value !== null)
      .sort((a,b) => b.value-a.value);

    const selected = latest[selectedCode];

    if (countryChart) countryChart.destroy();

    countryChart = new Chart(
      document.getElementById("countryChart"),
      {
        type:"bar",
        data:{
          labels:comparison.map(c=>c.name),
          datasets:[{
            label:INDICATORS[currentIndicator].name,
            data:comparison.map(c=>c.value),
            backgroundColor:comparison.map(c =>
              c.code === selectedCode ? COLORS.gold : COLORS.blue
            ),
            borderRadius:5
          }]
        },
        options:{
          responsive:true,
          indexAxis:"y",
          plugins:{
            legend:{display:false},
            tooltip:{enabled:true}
          },
          scales:{
            x:{
              beginAtZero:true,
              title:{
                display:true,
                text:INDICATORS[currentIndicator].unit
              }
            }
          }
        }
      }
    );

    status.textContent =
      "Countries are sorted by latest available data within 2015–2025.";

    updateCountryInfo(selectedCode,latest);

  } catch(error) {
    status.textContent =
      "Country data could not be loaded.";
  }
}


/* COUNTRY INFORMATION */

function updateCountryInfo(code,latest) {
  const box = document.getElementById("country-info");
  if (!box) return;

  const country = COUNTRIES.find(c=>c.code===code);
  const value = latest[code];

  if (!country || !value) {
    box.innerHTML="<p>No data available for this selection.</p>";
    return;
  }

  box.innerHTML = `
    <h3>${country.name}</h3>
    <p><strong>${INDICATORS[currentIndicator].name}:</strong>
    ${value.value.toFixed(2)} ${INDICATORS[currentIndicator].unit}</p>
    <p><strong>Year:</strong> ${value.year}</p>
    <p>${INDICATORS[currentIndicator].description}</p>
    <p class="status">Source: World Bank API.</p>
  `;
}


/* INDICATOR SELECTION */

document.getElementById("indicator-select")
  .addEventListener("change",async event => {
    const indicator = event.target.value;
    currentIndicator = indicator;

    await updateMap(indicator);
    await updateCountryChart(
      document.getElementById("country-select").value
    );
  });


/* COUNTRY SELECTION */

document.getElementById("country-select")
  .addEventListener("change",event => {
    updateCountryChart(event.target.value);
  });


/* INITIALIZATION */

async function initialize() {
  await initializeMap();
  await loadGlobalChart();
  await updateCountryChart("IND");
}

initialize();
