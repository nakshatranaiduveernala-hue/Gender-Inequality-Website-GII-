
(() => {
'use strict';

const navButtons = document.querySelectorAll('.nav-btn');

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === id);
  });

  navButtons.forEach(b => {
    b.classList.toggle('active', b.dataset.page === id);
  });

  window.scrollTo({top:0,behavior:'smooth'});

  if(id === 'indicator' && map) {
    map.invalidateSize();
  }
}

navButtons.forEach(b => {
  b.addEventListener('click', () => showPage(b.dataset.page));
});

document.querySelectorAll('[data-go]').forEach(b => {
  b.addEventListener('click', () => showPage(b.dataset.go));
});

const yearSelect = document.getElementById('yearSelect');

for(let y = 2024; y >= 1997; y--) {
  const o = document.createElement('option');
  o.value = y;
  o.textContent = y;
  yearSelect.appendChild(o);
}

yearSelect.value = '2022';

const indicatorSelect = document.getElementById('indicatorSelect');
const mapMessage = document.getElementById('mapMessage');
const tableBody = document.getElementById('countryTableBody');
const legend = document.getElementById('legend');

const indicatorMeta = {
  'SG.GEN.PARL.ZS': {
    label:'Women in parliament (%)',
    unit:'%',
    suffix:'%'
  },
  'SP.ADO.TFRT': {
    label:'Adolescent fertility rate',
    unit:' births per 1,000 women',
    suffix:''
  },
  'SH.STA.MMRT': {
    label:'Maternal mortality ratio',
    unit:' per 100,000 live births',
    suffix:''
  }
};

let map = null;
let geoLayer = null;
let chart = null;
let geoData = null;
let valuesByCode = new Map();
let currentRows = [];

const palette = [
  '#e7eff7',
  '#c6d9ea',
  '#94bad5',
  '#5d94bb',
  '#316a98',
  '#17436e'
];

/* MAP */

function initMap() {
  const el = document.getElementById('worldMap');

  if(!window.L) {
    mapMessage.textContent =
      'Map library unavailable. Check your internet connection.';
    return;
  }

  map = L.map(el, {
    scrollWheelZoom:false,
    zoomControl:true
  }).setView([20,0],2);

  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution:'© OpenStreetMap contributors',
      maxZoom:6
    }
  ).addTo(map);

  fetchGeo();
}

function codeOf(f) {
  const p = f.properties || {};

  return String(
    p.ISO_A3 ||
    p.ADM0_A3 ||
    p.iso_a3 ||
    p.ISO3 ||
    p.ISO_A3_EH ||
    ''
  ).toUpperCase();
}

function nameOf(f) {
  const p = f.properties || {};

  return p.ADMIN ||
    p.name ||
    p.NAME ||
    p.name_long ||
    'Unknown';
}

function colorFor(v, arr) {
  if(v === null || !Number.isFinite(v)) {
    return '#d7dce2';
  }

  const sorted = arr.slice().sort((a,b)=>a-b);

  if(!sorted.length) {
    return palette[0];
  }

  const max = sorted[sorted.length-1] || 1;

  const ratio = Math.max(0,Math.min(1,v/max));

  const index = Math.min(
    palette.length-1,
    Math.floor(ratio*palette.length)
  );

  return palette[index];
}

function styleFeature(f) {
  const code = codeOf(f);
  const v = valuesByCode.get(code);
  const all = currentRows.map(r=>r.value);

  return {
    fillColor:colorFor(v,all),
    weight:.6,
    color:'#fff',
    opacity:1,
    fillOpacity:.85
  };
}

function fetchGeo() {
  mapMessage.textContent = 'Loading map geography…';

  fetch(
    'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
  )
  .then(r => {
    if(!r.ok) throw Error('GeoJSON fetch failed');
    return r.json();
  })
  .then(data => {
    geoData = data;
    loadData();
  })
  .catch(() => {
    mapMessage.textContent =
      'Map geography could not load. Check connection and retry.';
  });
}

/* DATA */

function loadData() {
  const ind = indicatorSelect.value;
  const year = yearSelect.value;

  mapMessage.textContent = 'Loading World Bank data…';

  fetch(
    `https://api.worldbank.org/v2/country/all/indicator/${ind}?date=${year}&format=json&per_page=2000`
  )
  .then(r => {
    if(!r.ok) throw Error('API error');
    return r.json();
  })
  .then(d => {
    const records = (d && d[1]) || [];

    const rows = records
      .filter(x => x.value !== null && x.country && x.country.id)
      .map(x => ({
        code:String(x.country.id).toUpperCase(),
        name:x.country.value,
        value:Number(x.value),
        year:Number(x.date)
      }))
      .filter(x => Number.isFinite(x.value));

    currentRows = rows;
    valuesByCode = new Map();

    /* Convert World Bank country codes to map ISO-3 codes */

    if(geoData) {
      const iso2to3 = new Map();

      geoData.features.forEach(f => {
        const p = f.properties || {};

        const a2 = String(
          p.ISO_A2 ||
          p.iso_a2 ||
          p.ISO2 ||
          ''
        ).toUpperCase();

        const a3 = codeOf(f);

        if(a2 && a3 && a2 !== '-99') {
          iso2to3.set(a2,a3);
        }
      });

      rows.forEach(x => {
        const mapped = iso2to3.get(x.code);

        if(mapped) {
          valuesByCode.set(mapped,x.value);
        }
      });
    }

    renderMap();
    renderStats();
    renderChart();
    renderTable();
    renderLegend();

    mapMessage.textContent =
      rows.length
      ? `${rows.length} countries/territories with available data`
      : 'No data for this selection';
  })
  .catch(() => {
    mapMessage.textContent =
      'World Bank data could not load. Check your connection and retry.';
  });
}

/* MAP LAYER */

function renderMap() {
  if(!geoData || !map) return;

  if(geoLayer) {
    map.removeLayer(geoLayer);
  }

  geoLayer = L.geoJSON(geoData,{
    style:styleFeature,

    onEachFeature:(f,l) => {
      const c = codeOf(f);
      const v = valuesByCode.get(c);
      const meta = indicatorMeta[indicatorSelect.value];

      l.bindPopup(
        `<strong>${nameOf(f)}</strong><br>${meta.label}: ${
          v === undefined
          ? 'No data'
          : v.toLocaleString(undefined,{
              maximumFractionDigits:2
            }) + meta.unit
        }`
      );

      l.on('mouseover',e => {
        e.target.setStyle({
          weight:2,
          color:'#173f70'
        });
      });

      l.on('mouseout',() => {
        if(geoLayer) {
          geoLayer.resetStyle(l);
        }
      });
    }
  }).addTo(map);
}

/* STATISTICS */

function renderStats() {
  const vals = currentRows.map(x=>x.value);

  document.getElementById('statCount').textContent =
    vals.length.toLocaleString();

  if(!vals.length) {
    ['statAverage','statHighest','statLowest']
    .forEach(id => {
      document.getElementById(id).textContent = '—';
    });

    return;
  }

  const avg = vals.reduce((a,b)=>a+b,0)/vals.length;

  const hi = currentRows.reduce((a,b)=>
    a.value>b.value?a:b
  );

  const lo = currentRows.reduce((a,b)=>
    a.value<b.value?a:b
  );

  document.getElementById('statAverage').textContent =
    avg.toLocaleString(undefined,{
      maximumFractionDigits:2
    });

  document.getElementById('statHighest').textContent =
    `${hi.value.toLocaleString(undefined,{
      maximumFractionDigits:2
    })} · ${hi.name}`;

  document.getElementById('statLowest').textContent =
    `${lo.value.toLocaleString(undefined,{
      maximumFractionDigits:2
    })} · ${lo.name}`;
}

/* CHART */

function renderChart() {
  const ctx = document.getElementById('countryChart');

  if(!window.Chart) {
    ctx.insertAdjacentHTML(
      'afterend',
      '<p>Chart library unavailable.</p>'
    );

    return;
  }

  const top = currentRows
    .slice()
    .sort((a,b)=>b.value-a.value)
    .slice(0,12);

  if(chart) {
    chart.destroy();
  }

  chart = new Chart(ctx,{
    type:'bar',

    data:{
      labels:top.map(x=>x.name),

      datasets:[{
        label:indicatorMeta[indicatorSelect.value].label,
        data:top.map(x=>x.value),
        backgroundColor:'#326da6',
        borderRadius:4
      }]
    },

    options:{
      indexAxis:'y',
      responsive:true,
      maintainAspectRatio:false,

      plugins:{
        legend:{
          display:false
        }
      },

      scales:{
        x:{
          beginAtZero:true
        },

        y:{
          ticks:{
            font:{
              size:11
            }
          }
        }
      }
    }
  });
}

/* TABLE */

function renderTable(filter='') {
  const rows = currentRows
    .slice()
    .sort((a,b)=>b.value-a.value)
    .filter(x =>
      x.name.toLowerCase().includes(filter.toLowerCase())
    );

  tableBody.innerHTML = rows
    .slice(0,200)
    .map(x => `
      <tr>
        <td>${escapeHtml(x.name)}</td>
        <td>${x.value.toLocaleString(undefined,{
          maximumFractionDigits:2
        })}</td>
        <td>${x.year}</td>
      </tr>
    `)
    .join('') ||
    '<tr><td colspan="3">No matching countries.</td></tr>';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g,c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

/* LEGEND */

function renderLegend() {
  const vals = currentRows.map(x=>x.value)
    .sort((a,b)=>a-b);

  legend.innerHTML = '';

  if(!vals.length) {
    legend.textContent = 'No legend values available.';
    return;
  }

  legend.innerHTML =
    '<span>Low</span>' +
    palette.map(c => `
      <span class="legend-item">
        <span class="legend-swatch" style="background:${c}"></span>
      </span>
    `).join('') +
    '<span>High</span>' +
    '<span class="legend-item">' +
      '<span class="legend-swatch" style="background:#d7dce2"></span>' +
      'No data' +
    '</span>';
}

/* COUNTRY SEARCH */

function searchCountry(q) {
  if(!q || !geoLayer) return;

  const found = [];

  geoLayer.eachLayer(l => {
    const n = nameOf(l.feature).toLowerCase();

    if(n.includes(q.toLowerCase())) {
      found.push(l);
    }
  });

  if(found.length) {
    const l = found[0];

    map.fitBounds(l.getBounds(),{
      maxZoom:4
    });

    l.openPopup();
  }
}

/* CONTROLS */

document.getElementById('countrySearch')
.addEventListener('input',e => {
  renderTable(e.target.value);
});

document.getElementById('countrySearch')
.addEventListener('keydown',e => {
  if(e.key === 'Enter') {
    searchCountry(e.target.value.trim());
  }
});

indicatorSelect.addEventListener('change',loadData);
yearSelect.addEventListener('change',loadData);

document.getElementById('refreshMapButton')
.addEventListener('click',loadData);

initMap();

})();
