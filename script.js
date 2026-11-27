// ===== PAGE NAVIGATION =====
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='indicator' && mapInstance){
    setTimeout(()=>mapInstance.invalidateSize(),250);
  }
  if(id==='trends') setTimeout(buildTrendCharts,150);
  if(id==='india') setTimeout(buildIndiaChart,150);
}

function imgFallback(img){
  img.src='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="400"><rect width="100%" height="100%" fill="#dce8f3"/><text x="50%" y="45%" font-size="25" fill="#163f68" text-anchor="middle" font-family="sans-serif">Image unavailable</text><text x="50%" y="58%" font-size="16" fill="#163f68" text-anchor="middle" font-family="sans-serif">Replace with a sourced photograph</text></svg>`
  );
  img.onerror=null;
}

// ===== LOAD LIBRARIES =====
function loadScript(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;
    s.onload=resolve;
    s.onerror=reject;
    document.head.appendChild(s);
  });
}

function loadCSS(src){
  const l=document.createElement('link');
  l.rel='stylesheet';
  l.href=src;
  document.head.appendChild(l);
}

let chartInstances={};

function chart(id,type,data,options={}){
  const el=document.getElementById(id);
  if(!el || !window.Chart)return;
  if(chartInstances[id]) chartInstances[id].destroy();
  chartInstances[id]=new Chart(el,{
    type,
    data,
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{display:true},
        tooltip:{enabled:true}
      },
      ...options
    }
  });
}

// ===== WORLD BANK DATA =====
const IND={
  'SG.GEN.PARL.ZS':{
    name:'Women in Parliament (%)',
    unit:'% of parliamentary seats',
    positive:true
  },
  'SP.ADO.TFRT':{
    name:'Adolescent fertility rate',
    unit:'births per 1,000 women ages 15–19',
    positive:false
  },
  'SH.STA.MMRT':{
    name:'Maternal mortality ratio',
    unit:'deaths per 100,000 live births',
    positive:false
  }
};

const DATA={};
let countryMeta=[];
let mapInstance=null;
let geoLayer=null;
let mapValues={};
let selectedIndicator='SG.GEN.PARL.ZS';

async function wb(indicator){
  const url=`https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=20000&date=2000:2024`;
  const res=await fetch(url);
  if(!res.ok) throw Error('World Bank data request failed');
  const json=await res.json();
  return json[1]||[];
}

async function loadCountries(){
  const res=await fetch('https://api.worldbank.org/v2/country?format=json&per_page=400');
  const j=await res.json();
  countryMeta=(j[1]||[]).filter(c=>c.region?.id && c.region.id!=='NA');
}

function latestByCountry(rows){
  const out={};
  rows.forEach(r=>{
    if(r.value===null || r.countryiso3code?.length!==3)return;
    if(!out[r.countryiso3code] || +r.date>+out[r.countryiso3code].date){
      out[r.countryiso3code]={
        value:+r.value,
        year:r.date,
        country:r.country?.value,
        code:r.countryiso3code
      };
    }
  });
  return out;
}

async function loadAll(){
  try{
    await loadCountries();
    for(const k in IND){
      DATA[k]=await wb(k);
    }
    const parl=latestByCountry(DATA['SG.GEN.PARL.ZS']);
    const india=parl.IND;
    if(india){
      document.getElementById('homeStat').textContent=india.value.toFixed(1)+'%';
      document.getElementById('homeStatYear').textContent='India · '+india.year+' · World Bank';
    }else{
      document.getElementById('homeStat').textContent='Data unavailable';
    }
    buildIndiaChart();
    buildTrendCharts();
    await initMap();
  }catch(e){
    document.getElementById('homeStat').textContent='Data could not load';
    document.getElementById('mapDataYear').textContent='Unable to load data. Please check your internet connection.';
    console.error(e);
  }
}

// ===== TRENDS CHARTS =====
function buildTrendCharts(){
  if(!window.Chart || !DATA['SG.GEN.PARL.ZS'])return;

  const rows=DATA['SG.GEN.PARL.ZS'];
  const latest=latestByCountry(rows);
  const valid=Object.values(latest).filter(x=>countryMeta.some(c=>c.id===x.code));
  valid.sort((a,b)=>b.value-a.value);

  const top=valid.slice(0,10);
  const bottom=valid.slice(-10).reverse();

  chart('topChart','bar',{
    labels:top.map(x=>x.country),
    datasets:[{
      label:'Women in Parliament (%)',
      data:top.map(x=>x.value),
      backgroundColor:'#376a94',
      borderRadius:3
    }]
  },{
    indexAxis:'y',
    plugins:{legend:{display:false}},
    scales:{x:{beginAtZero:true,title:{display:true,text:'Percentage of seats'}}}
  });

  chart('bottomChart','bar',{
    labels:bottom.map(x=>x.country),
    datasets:[{
      label:'Women in Parliament (%)',
      data:bottom.map(x=>x.value),
      backgroundColor:'#c8a76b',
      borderRadius:3
    }]
  },{
    indexAxis:'y',
    plugins:{legend:{display:false}},
    scales:{x:{beginAtZero:true,title:{display:true,text:'Percentage of seats'}}}
  });

  const years=['2000','2005','2010','2015','2020','2024'];
  const countries=['IND','USA','NOR','RWA','JPN'];
  const names={IND:'India',USA:'United States',NOR:'Norway',RWA:'Rwanda',JPN:'Japan'};
  const colors=['#163f68','#c8a76b','#376a94','#7a9c78','#8b6b9a'];

  const datasets=countries.map((code,i)=>{
    const vals=years.map(y=>{
      const found=rows.find(r=>r.countryiso3code===code && r.date===y);
      return found?.value??null;
    });
    return{
      label:names[code],
      data:vals,
      borderColor:colors[i],
      backgroundColor:colors[i],
      spanGaps:true,
      tension:.3
    };
  });

  chart('trendChart','line',{
    labels:years,
    datasets
  },{
    scales:{y:{beginAtZero:true,title:{display:true,text:'Women in Parliament (%)'}}}
  });

  const mm=latestByCountry(DATA['SH.STA.MMRT']);
  const fr=latestByCountry(DATA['SP.ADO.TFRT']);
  const codes=['IND','RWA','NOR','JPN','USA'];

  chart('healthChart','bar',{
    labels:codes.map(c=>mm[c]?.country||c),
    datasets:[{
      label:'Maternal mortality ratio',
      data:codes.map(c=>mm[c]?.value??null),
      backgroundColor:'#376a94'
    }]
  },{
    scales:{y:{beginAtZero:true,title:{display:true,text:'Deaths per 100,000 live births'}}}
  });

  chart('fertilityChart','bar',{
    labels:codes.map(c=>fr[c]?.country||c),
    datasets:[{
      label:'Adolescent fertility rate',
      data:codes.map(c=>fr[c]?.value??null),
      backgroundColor:'#c8a76b'
    }]
  },{
    scales:{y:{beginAtZero:true,title:{display:true,text:'Births per 1,000 women ages 15–19'}}}
  });
}

function buildIndiaChart(){
  if(!window.Chart || !DATA['SG.GEN.PARL.ZS'])return;
  const rows=DATA['SG.GEN.PARL.ZS'].filter(r=>r.countryiso3code==='IND' && r.value!==null);
  rows.sort((a,b)=>+a.date- +b.date);
  chart('indiaChart','line',{
    labels:rows.map(r=>r.date),
    datasets:[{
      label:'India — Women in Parliament (%)',
      data:rows.map(r=>r.value),
      borderColor:'#376a94',
      backgroundColor:'#376a94',
      tension:.3
    }]
  },{
    scales:{y:{beginAtZero:true,title:{display:true,text:'Percentage of seats'}}}
  });
}

// ===== MAP =====
const palette=['#f1f5fa','#d5e2ef','#a6c5df','#6c9cc5','#356c9a','#173e68'];

function getColor(value,min,max){
  if(value===null || value===undefined)return '#d9d9d9';
  if(max===min)return palette[3];
  const t=(value-min)/(max-min);
  const idx=Math.min(5,Math.max(0,Math.floor(t*6)));
  return palette[idx];
}

function mapStyle(feature){
  const p=feature.properties||{};
  const code=p.ISO_A3||p.ADM0_A3||p.iso_a3||p.ISO3||p['ISO3166-1-Alpha-3'];
  const val=mapValues[code]?.value;
  const vals=Object.values(mapValues).map(v=>v.value);
  const min=Math.min(...vals);
  const max=Math.max(...vals);
  return{
    fillColor:getColor(val,min,max),
    weight:.7,
    opacity:1,
    color:'#ffffff',
    fillOpacity:0.88
  };
}

function mapPopup(feature){
  const p=feature.properties||{};
  const code=p.ISO_A3||p.ADM0_A3||p.iso_a3||p.ISO3||p['ISO3166-1-Alpha-3'];
  const v=mapValues[code];
  if(!v)return `<strong>${p.ADMIN||p.name||'Country'}</strong><br>No available data`;
  return `<strong>${v.country||p.ADMIN||p.name}</strong><br>${IND[selectedIndicator].name}: ${v.value.toLocaleString()}<br>Year: ${v.year}`;
}

async function initMap(){
  try{
    if(!window.L){
      loadCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
    }

    if(!mapInstance){
      mapInstance=L.map('worldMap',{worldCopyJump:true}).setView([20,0],2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution:'&copy; OpenStreetMap contributors',
        maxZoom:6
      }).addTo(mapInstance);
    }

    const geo=await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson');
    const geojson=await geo.json();

    if(geoLayer)mapInstance.removeLayer(geoLayer);
    geoLayer=L.geoJSON(geojson,{
      style:mapStyle,
      onEachFeature:(feature,layer)=>{
        layer.bindPopup(mapPopup(feature));
        layer.on('mouseover',function(){
          this.setStyle({weight:2,color:'#142f4a'});
        });
        layer.on('mouseout',function(){
          geoLayer.resetStyle(this);
        });
      }
    }).addTo(mapInstance);

    document.getElementById('indicatorSelect').addEventListener('change',async e=>{
      selectedIndicator=e.target.value;
      await updateMap();
    });

    await updateMap();
    setTimeout(()=>mapInstance.invalidateSize(),300);
  }catch(e){
    document.getElementById('worldMap').innerHTML='<p style="padding:20px">The map could not load. Please check your internet connection.</p>';
    console.error(e);
  }
}

async function updateMap(){
  try{
    const indicator=selectedIndicator;
    const rows=DATA[indicator]||await wb(indicator);
    DATA[indicator]=rows;
    mapValues=latestByCountry(rows);

    const values=Object.values(mapValues).map(v=>v.value);
    const min=Math.min(...values);
    const max=Math.max(...values);

    document.getElementById('mapDataYear').textContent=
      IND[indicator].name+' · Latest available observation by country · World Bank';

    if(geoLayer)geoLayer.setStyle(mapStyle);
    if(geoLayer)geoLayer.eachLayer(l=>l.setPopupContent(mapPopup(l.feature)));

    const scale=document.getElementById('mapLegend');
    scale.innerHTML=`
      <strong>Map colour scale</strong>
      <p>Dark blue represents higher values; pale blue represents lower values. Grey represents unavailable data.</p>
      <div class="legend-scale">${palette.map(c=>`<span style="background:${c}"></span>`).join('')}<span style="background:#d9d9d9"></span></div>
      <div class="legend-labels"><span>${min.toLocaleString(undefined,{maximumFractionDigits:2})}</span><span>${max.toLocaleString(undefined,{maximumFractionDigits:2})}</span><span>Unavailable</span></div>
      <p>For representation, higher values indicate greater numerical representation. For maternal mortality and adolescent fertility, higher values generally indicate a greater development challenge.</p>
    `;

    const valid=Object.values(mapValues).filter(v=>countryMeta.some(c=>c.id===v.code));
    valid.sort((a,b)=>b.value-a.value);
    const top=valid.slice(0,10);

    chart('mapChart','bar',{
      labels:top.map(v=>v.country),
      datasets:[{
        label:IND[indicator].name,
        data:top.map(v=>v.value),
        backgroundColor:'#376a94'
      }]
    },{
      indexAxis:'y',
      scales:{x:{beginAtZero:true,title:{display:true,text:IND[indicator].unit}}}
    });

    if(mapInstance)mapInstance.invalidateSize();
  }catch(e){
    console.error(e);
  }
}

// ===== COUNTRY COMPARISON =====
function compareCountries(){
  const a=document.getElementById('countryA').value.trim();
  const b=document.getElementById('countryB').value.trim();
  const out=document.getElementById('compareResult');
  if(!a||!b){
    out.textContent='Please enter both country names.';
    return;
  }
  const latest=latestByCountry(DATA['SG.GEN.PARL.ZS']);
  const findCountry=name=>Object.values(latest).find(v=>v.country?.toLowerCase()===name.toLowerCase());
  const ca=findCountry(a),cb=findCountry(b);
  if(!ca||!cb){
    out.textContent='One or both countries were not found in the loaded data. Try their exact World Bank country names.';
    return;
  }
  out.innerHTML=`
    <div class="panel" style="margin-top:15px">
      <h3>${ca.country}</h3><p>${ca.value.toFixed(2)}% · ${ca.year}</p>
      <h3>${cb.country}</h3><p>${cb.value.toFixed(2)}% · ${cb.year}</p>
      <p>Difference: ${Math.abs(ca.value-cb.value).toFixed(2)} percentage points.</p>
      <p>This difference describes representation, but further research is needed to explain its geographical, social, economic and political causes.</p>
    </div>`;
}

// ===== VIDEO =====
function addVideo(){
  const url=document.getElementById('videoURL').value.trim();
  const area=document.getElementById('videoArea');
  if(!url){
    area.textContent='Please enter a video URL.';
    return;
  }
  if(url.includes('youtube.com/watch?v=')){
    const id=url.split('v=')[1].split('&')[0];
    area.innerHTML=`<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  }else if(url.includes('youtu.be/')){
    const id=url.split('youtu.be/')[1].split('?')[0];
    area.innerHTML=`<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  }else{
    area.textContent='Use a YouTube watch link or short link for embedding.';
  }
}

// ===== START =====
(async()=>{
  try{
    if(!window.Chart){
      await loadScript('https://cdn.jsdelivr.net/npm/chart.js');
    }
    await loadAll();
  }catch(e){
    console.error(e);
  }
})();
