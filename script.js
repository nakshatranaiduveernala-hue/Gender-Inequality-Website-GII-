/* BEYOND THE DIVIDE
   Data: World Bank API
   Main indicator: women in parliament (%)
*/

const WB = "https://api.worldbank.org/v2/country";
const IND = "SG.GEN.PARL.ZS";
const ADO = "SP.ADO.TFRT";
const MMR = "SH.STA.MMRT";

const $ = id => document.getElementById(id);

/* Navigation */
const menuToggle = $("menuToggle");
const mainNav = $("mainNav");

menuToggle?.addEventListener("click", () => mainNav.classList.toggle("open"));

document.querySelectorAll("#mainNav a").forEach(a => {
  a.addEventListener("click", () => mainNav.classList.remove("open"));
});

/* Data utilities */
async function getIndicator(country, indicator, date = "1995:2025") {
  const url = `${WB}/${country}/indicator/${indicator}?format=json&per_page=100&date=${date}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Data request failed");
  const json = await res.json();
  if (!json || !json[1]) return [];
  return json[1]
    .filter(x => x.value !== null)
    .map(x => ({ year: Number(x.date), value: Number(x.value) }))
    .sort((a, b) => a.year - b.year);
}

async function getCountryLatest(indicator) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=300&date=2020:2025`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Data request failed");
  const json = await res.json();
  if (!json || !json[1]) return [];

  const latest = new Map();

  json[1].forEach(item => {
    if (!item.value || !item.country || !item.country.id) return;
    if (item.country.id.length !== 2) return;
    const current = latest.get(item.country.id);
    if (!current || Number(item.date) > current.year) {
      latest.set(item.country.id, {
        code: item.country.id,
        country: item.country.value,
        year: Number(item.date),
        value: Number(item.value)
      });
    }
  });

  return [...latest.values()];
}

function makeChart(id, labels, datasets, options = {}) {
  const canvas = $(id);
  if (!canvas || !window.Chart) return null;

  if (canvas.chart) canvas.chart.destroy();

  canvas.chart = new Chart(canvas, {
    type: options.type || "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: "#c4d2e1" }
        },
        tooltip: { enabled: true }
      },
      scales: options.scales === false ? {} : {
        x: {
          ticks: { color: "#9aaec5" },
          grid: { color: "rgba(164,193,225,.08)" }
        },
        y: {
          ticks: { color: "#9aaec5" },
          grid: { color: "rgba(164,193,225,.08)" },
          ...(options.y || {})
        }
      },
      ...options.options
    }
  });

  return canvas.chart;
}

const blueDataset = (label, data) => ({
  label,
  data,
  borderColor: "#5ca9ff",
  backgroundColor: "rgba(92,169,255,.14)",
  fill: true,
  borderWidth: 2,
  pointRadius: 2,
  tension: .35
});

/* Global map */
async function drawMap() {
  const map = $("worldMap");
  const status = $("mapStatus");

  if (!map || !window.Plotly) {
    if (status) status.textContent = "Map library unavailable.";
    return;
  }

  try {
    const data = await getCountryLatest(IND);
    if (!data.length) throw new Error("No data");

    const sorted = data.sort((a, b) => a.value - b.value);
    const locations = sorted.map(x => x.code);
    const values = sorted.map(x => x.value);
    const names = sorted.map(x => x.country);
    const years = sorted.map(x => x.year);

    const trace = {
      type: "choropleth",
      locationmode: "ISO-3",
      locations: locations.map(code => code),
      z: values,
      text: names,
      customdata: years,
      colorscale: [
        [0, "#10243d"],
        [.25, "#214e77"],
        [.5, "#347fb6"],
        [.75, "#65b2e9"],
        [1, "#b1e4ff"]
      ],
      marker: { line: { color: "#07111f", width: .4 } },
      colorbar: {
        title: { text: "Women (%)", font: { color: "#c4d2e1" } },
        tickfont: { color: "#c4d2e1" },
        outlinewidth: 0
      },
      hovertemplate:
        "<b>%{text}</b><br>" +
        "Women in parliament: %{z:.1f}%<br>" +
        "Observation year: %{customdata}<extra></extra>"
    };

    /* World Bank API codes are ISO-2; Plotly choropleth expects ISO-3.
       Convert through a mapping below. */
    const iso2to3 = {
      IN:"IND", US:"USA", GB:"GBR", FR:"FRA", DE:"DEU", BR:"BRA",
      CN:"CHN", JP:"JPN", CA:"CAN", AU:"AUS", ZA:"ZAF", RU:"RUS",
      MX:"MEX", AR:"ARG", NG:"NGA", KE:"KEN", EG:"EGY", SA:"SAU",
      KR:"KOR", ID:"IDN", PK:"PAK", BD:"BGD", NP:"NPL", LK:"LKA",
      NO:"NOR", SE:"SWE", FI:"FIN", DK:"DNK", IS:"ISL", NL:"NLD",
      BE:"BEL", ES:"ESP", IT:"ITA", PT:"PRT", CH:"CHE", AT:"AUT",
      PL:"POL", CZ:"CZE", HU:"HUN", RO:"ROU", GR:"GRC", TR:"TUR",
      UA:"UKR", IE:"IRL", NZ:"NZL", SG:"SGP", MY:"MYS", TH:"THA",
      VN:"VNM", PH:"PHL", CL:"CHL", CO:"COL", PE:"PER", EC:"ECU",
      GH:"GHA", TZ:"TZA", UG:"UGA", ET:"ETH", MA:"MAR", TN:"TUN",
      JO:"JOR", IL:"ISR", AE:"ARE", QA:"QAT", OM:"OMN", KW:"KWT",
      HR:"HRV", RS:"SRB", BG:"BGR", SK:"SVK", SI:"SVN", LT:"LTU",
      LV:"LVA", EE:"EST", LU:"LUX", CY:"CYP", MT:"MLT", AM:"ARM",
      GE:"GEO", AZ:"AZE", KZ:"KAZ", UZ:"UZB", AF:"AFG", IR:"IRN",
      IQ:"IRQ", SY:"SYR", LB:"LBN", PS:"PSE", YE:"YEM", SD:"SDN",
      SS:"SSD", CM:"CMR", SN:"SEN", CI:"CIV", BF:"BFA", ML:"MLI",
      NE:"NER", TG:"TGO", BJ:"BEN", AO:"AGO", MZ:"MOZ", ZM:"ZMB",
      ZW:"ZWE", BW:"BWA", NA:"NAM", MW:"MWI", RW:"RWA", BI:"BDI",
      CD:"COD", CG:"COG", GA:"GAB", LY:"LBY", ER:"ERI", DJ:"DJI",
      SO:"SOM", GM:"GMB", SL:"SLE", LR:"LBR", GN:"GIN", GW:"GNB",
      MR:"MRT", XK:"XKX", ME:"MNE", MK:"MKD", AL:"ALB", BA:"BIH",
      MD:"MDA", BY:"BLR", FJ:"FJI", PG:"PNG", SB:"SLB", VU:"VUT",
      WS:"WSM", TO:"TON", KI:"KIR", TV:"TUV", NR:"NRU", FM:"FSM",
      MH:"MHL", PW:"PLW", TT:"TTO", JM:"JAM", HT:"HTI", DO:"DOM",
      CU:"CUB", CR:"CRI", PA:"PAN", GT:"GTM", HN:"HND", SV:"SLV",
      NI:"NIC", BZ:"BLZ", PY:"PRY", UY:"URY", BO:"BOL", VE:"VEN",
      GY:"GUY", SR:"SUR", BS:"BHS", BB:"BRB", LC:"LCA", GD:"GRD",
      KN:"KNA", VC:"VCT", AG:"ATG", DM:"DMA"
    };

    trace.locations = locations.map(code => iso2to3[code]).filter(Boolean);
    const filtered = sorted.filter(x => iso2to3[x.code]);
    trace.z = filtered.map(x => x.value);
    trace.text = filtered.map(x => x.country);
    trace.customdata = filtered.map(x => x.year);
    trace.locations = filtered.map(x => iso2to3[x.code]);

    await Plotly.newPlot(map, [trace], {
      paper_bgcolor: "#101f32",
      plot_bgcolor: "#101f32",
      geo: {
        projection: { type: "natural earth" },
        bgcolor: "#101f32",
        showframe: false,
        showcoastlines: true,
        coastlinecolor: "#425b76",
        showland: true,
        landcolor: "#16283d",
        showcountries: true,
        countrycolor: "#263d57",
        lakecolor: "#101f32",
        showocean: true,
        oceancolor: "#101f32"
      },
      margin: { l: 0, r: 0, t: 0, b: 0 }
    }, {
      responsive: true,
      displayModeBar: false
    });

    if (status) status.textContent = "World Bank data loaded. Hover over a country.";
  } catch (err) {
    if (status) status.textContent = "Map data could not be loaded. Check your connection.";
    map.innerHTML = '<div class="map-error">The interactive map could not load right now. Please refresh or check the data service connection.</div>';
  }
}

/* Global comparison graph */
async function drawGlobalChart() {
  try {
    const data = await getCountryLatest(IND);
    const top = data.sort((a, b) => b.value - a.value).slice(0, 12);
    makeChart("globalChart", top.map(x => x.country), [{
      label: "Women in parliament (%)",
      data: top.map(x => x.value),
      backgroundColor: "#5ca9ff",
      borderRadius: 5
    }], {
      type: "bar",
      scales: {
        x: { ticks: { color: "#9aaec5" }, grid: { display: false } },
        y: { ticks: { color: "#9aaec5" }, grid: { color: "rgba(164,193,225,.08)" }, min: 0 }
      }
    });
  } catch (err) {
    console.warn("Global chart:", err);
  }
}

/* Regional illustration chart */
function drawRegionChart() {
  makeChart("regionChart",
    ["Europe", "Americas", "Asia", "Africa", "Oceania"],
    [{
      label: "Illustrative regional comparison",
      data: [0, 0, 0, 0, 0],
      backgroundColor: "#5ca9ff"
    }],
    { type: "bar" }
  );
}

/* India trend */
async function drawIndiaChart() {
  try {
    const data = await getIndicator("IND", IND);
    makeChart("indiaChart", data.map(x => x.year), [blueDataset("Women in parliament (%)", data.map(x => x.value))]);
  } catch (err) {
    console.warn("India chart:", err);
  }
}

/* Global trend */
async function drawTrendChart() {
  try {
    const data = await getIndicator("WLD", IND);
    makeChart("trendChart", data.map(x => x.year), [blueDataset("Global representation (%)", data.map(x => x.value))]);
  } catch (err) {
    console.warn("Trend chart:", err);
  }
}

/* India supporting indicators */
async function drawSupportingIndicators() {
  try {
    const fertility = await getIndicator("IND", ADO);
    makeChart("fertilityChart", fertility.map(x => x.year), [blueDataset("Births per 1,000 adolescents", fertility.map(x => x.value))]);
  } catch (err) {
    console.warn("Fertility chart:", err);
  }

  try {
    const maternal = await getIndicator("IND", MMR);
    makeChart("maternalChart", maternal.map(x => x.year), [blueDataset("Maternal deaths per 100,000 live births", maternal.map(x => x.value))]);
  } catch (err) {
    console.warn("Maternal chart:", err);
  }
}

/* Run */
document.addEventListener("DOMContentLoaded", () => {
  drawMap();
  drawGlobalChart();
  drawRegionChart();
  drawIndiaChart();
  drawTrendChart();
  drawSupportingIndicators();
});
