function go(id){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='indicator' && map) setTimeout(()=>map.invalidateSize(),250);
  if(id==='trends')setTimeout(makeTrendGraphs,300);
  if(id==='india')setTimeout(makeIndia,300);
}

function fallback(img){
  img.src='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="350"><rect width="100%" height="100%" fill="#dce8f2"/><text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#204e78">Image unavailable</text></svg>'
  );
  img.onerror=null;
}

function script(src){
  return new Promise((resolve,reject)=>{
    let s=document.createElement('script');
    s.src=src;s.onload=resolve;s.onerror=reject;
    document.head.appendChild(s);
  });
}
function css(src){
  let l=document.createElement('link');
  l.rel='stylesheet';l.href=src;document.head.appendChild(l);
}

const ids={
  'SG.GEN.PARL.ZS':'Women in Parliament (%)',
  'SP.ADO.TFRT':'Adolescent fertility rate',
  'SH.STA.MMRT':'Maternal mortality ratio'
};
let raw={},charts={},map=null,layer=null,geo=null,values={};
let active='SG.GEN.PARL.ZS';

function makeChart(id,type,data,options={}){
  if(!window.Chart)return;
  let el=document.getElementById(id);
  if(!el)return;
  if(charts[id])charts[id].destroy();
  charts[id]=new Chart(el,{
    type,
    data,
    options:{
      responsive:true,
      maintainAspectRatio:false,
      ...options
    }
  });
}

async function getData(ind){
  let r=await fetch(`https://api.worldbank.org/v2/country/all/indicator/${ind}?format=json&per_page=20000&date=2000:2024`);
  if(!r.ok)throw Error('Data request failed');
  let j=await r.json();
  return j[1]||[];
}

function latest(rows){
  let o={};
  rows.forEach(r=>{
    if(r.value===null||!r.countryiso3code||r.countryiso3code.length!==3)return;
    if(!o[r.countryiso3code]||+r.date>+o[r.countryiso3code].year){
      o[r.countryiso3code]={
        value:+r.value,
        year:r.date,
        country:r.country.value,
        code:r.countryiso3code
      };
    }
  });
  return o;
}

async function startup(){
  try{
    await script('https://cdn.jsdelivr.net/npm/chart.js');
    for(let k in ids)raw[k]=await getData(k);
    const ind=latest(raw['SG.GEN.PARL.ZS']);
    if(ind.IND){
      document.getElementById('homeValue').textContent=ind.IND.value.toFixed(1)+'%';
      document.getElementById('homeYear').textContent='India · '+ind.IND.year;
    }
    makeIndia();
    makeTrendGraphs();
    await startMap();
  }catch(e){
    document.getElementById('homeValue').textContent='Data unavailable';
    document.getElementById('mapInfo').textContent='Could not load data. Check your connection.';
    console.error(e);
  }
}

// INDIA GRAPH
function makeIndia(){
  if(!raw['SG.GEN.PARL.ZS'])return;
  let r=raw['SG.GEN.PARL.ZS'].filter(x=>x.countryiso3code==='IND'&&x.value!==null);
  r.sort((a,b)=>+a.date-+b.date);
  makeChart('indiaGraph','line',{
    labels:r.map(x=>x.date),
    datasets:[{
      label:'India — Women in Parliament (%)',
      data:r.map(x=>x.value),
      borderColor:'#204e78',
      backgroundColor:'#5683aa',
      tension:.25
    }]
  },{
    scales:{y:{beginAtZero:true}}
  });
}

// TREND GRAPHS
function makeTrendGraphs(){
  if(!raw['SG.GEN.PARL.ZS'])return;
  const r=latest(raw['SG.GEN.PARL.ZS']);
  let arr=Object.values(r);
  arr.sort((a,b)=>b.value-a.value);
  let top=arr.slice(0,10);
  let bottom=arr.slice(-10).reverse();

  makeChart('highest','bar',{
    labels:top.map(x=>x.country),
    datasets:[{label:'Women in Parliament (%)',data:top.map(x=>x.value),backgroundColor:'#204e78'}]
  },{indexAxis:'y'});

  makeChart('lowest','bar',{
    labels:bottom.map(x=>x.country),
    datasets:[{label:'Women in Parliament (%)',data:bottom.map(x=>x.value),backgroundColor:'#c6a66b'}]
  },{indexAxis:'y'});

  const yrs=['2000','2005','2010','2015','2020','2024'];
  const cc=['IND','USA','NOR','RWA','JPN'];
  const nm={IND:'India',USA:'United States',NOR:'Norway',RWA:'Rwanda',JPN:'Japan'};
  const cl=['#204e78','#c6a66b','#5683aa','#769a83','#9274a5'];

  makeChart('overTime','line',{
    labels:yrs,
    datasets:cc.map((c,i)=>({
      label:nm[c],
      data:yrs.map(y=>{
        let f=raw['SG.GEN.PARL.ZS'].find(x=>x.countryiso3code===c&&x.date===y);
        return f?f.value:null;
      }),
      borderColor:cl[i],
      backgroundColor:cl[i],
      spanGaps:true,
      tension:.25
    }))
  });

  const mm=latest(raw['SH.STA.MMRT']);
  const fr=latest(raw['SP.ADO.TFRT']);
  const selected=['IND','RWA','NOR','JPN','USA'];

  makeChart('mortality','bar',{
    labels:selected.map(c=>mm[c]?.country||c),
    datasets:[{
      label:'Maternal mortality ratio',
      data:selected.map(c=>mm[c]?.value??null),
      backgroundColor:'#5683aa'
    }]
  });

  makeChart('fertility','bar',{
    labels:selected.map(c=>fr[c]?.country||c),
    datasets:[{
      label:'Adolescent fertility rate',
      data:selected.map(c=>fr[c]?.value??null),
      backgroundColor:'#c6a66b'
    }]
  });
}

// MAP
const palette=['#eff4fa','#d2e1ef','#aac8e0','#78a6cc','#467eaa','#204e78'];

function colour(v,min,max){
  if(v===undefined||v===null)return '#c9cdd1';
  if(max===min)return palette[3];
  let i=Math.min(5,Math.floor((v-min)/(max-min)*6));
  return palette[Math.max(0,i)];
}

function code(feature){
  let p=feature.properties||{};
  return p.ISO_A3||p.ADM0_A3||p.iso_a3||p.ISO3||p['ISO3166-1-Alpha-3'];
}

function style(feature){
  let vals=Object.values(values).map(x=>x.value);
  if(!vals.length)return{fillColor:'#c9cdd1',weight:.6,color:'#fff',fillOpacity:.8};
  let min=Math.min(...vals),max=Math.max(...vals);
  let v=values[code(feature)]?.value;
  return{
    fillColor:colour(v,min,max),
    weight:.7,
    color:'#ffffff',
    fillOpacity:.85
  };
}

function popup(feature){
  let p=feature.properties||{};
  let v=values[code(feature)];
  if(!v)return `<b>${p.ADMIN||p.name||'Country'}</b><br>No available observation`;
  return `<b>${v.country}</b><br>${ids[active]}: ${v.value.toLocaleString()}<br>Year: ${v.year}`;
}

async function startMap(){
  try{
    css('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    await script('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');

    map=L.map('map',{worldCopyJump:true}).setView([20,0],2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap contributors',
      maxZoom:6
    }).addTo(map);

    const response=await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson');
    if(!response.ok)throw Error('Boundary data unavailable');
    geo=await response.json();

    layer=L.geoJSON(geo,{
      style,
      onEachFeature:(f,l)=>{
        l.bindPopup(popup(f));
        l.on('mouseover',function(){this.setStyle({weight:2,color:'#142f4a'});});
        l.on('mouseout',function(){layer.resetStyle(this);});
      }
    }).addTo(map);

    document.getElementById('indicatorChoice').addEventListener('change',async function(){
      active=this.value;
      await updateMap();
    });

    await updateMap();
    setTimeout(()=>map.invalidateSize(),400);
  }catch(e){
    document.getElementById('map').innerHTML='<p style="padding:20px">Map unavailable. Please check internet connection.</p>';
    console.error(e);
  }
}

async function updateMap(){
  try{
    if(!raw[active])raw[active]=await getData(active);
    values=latest(raw[active]);
    if(layer){
      layer.setStyle(style);
      layer.eachLayer(l=>l.setPopupContent(popup(l.feature)));
    }

    const vals=Object.values(values).map(x=>x.value);
    const min=Math.min(...vals),max=Math.max(...vals);

    document.getElementById('mapInfo').textContent=
      ids[active]+' · Latest available observation by country';

    document.getElementById('legend').innerHTML=`
      <strong>Colour scale</strong>
      <p>Blue shades show the value range. Grey indicates missing data.</p>
      <div class="legendbar">${palette.map(c=>`<span style="background:${c}"></span>`).join('')}<span style="background:#c9cdd1"></span></div>
      <div class="legendlabels"><span>${min.toLocaleString(undefined,{maximumFractionDigits:2})}</span><span>${max.toLocaleString(undefined,{maximumFractionDigits:2})}</span><span>Missing</span></div>
      <p>Higher representation is generally positive. Higher maternal mortality and adolescent fertility rates represent greater development challenges.</p>
    `;

    const list=Object.values(values).sort((a,b)=>b.value-a.value).slice(0,10);
    makeChart('mapGraph','bar',{
      labels:list.map(x=>x.country),
      datasets:[{
        label:ids[active],
        data:list.map(x=>x.value),
        backgroundColor:'#204e78'
      }]
    },{indexAxis:'y'});

    map.invalidateSize();
  }catch(e){
    document.getElementById('mapInfo').textContent='Unable to load indicator data.';
    console.error(e);
  }
}

// COMPARISON
function compare(){
  let a=document.getElementById('country1').value.trim().toLowerCase();
  let b=document.getElementById('country2').value.trim().toLowerCase();
  let out=document.getElementById('comparison');
  if(!a||!b){out.textContent='Enter two country names.';return;}
  let r=latest(raw['SG.GEN.PARL.ZS']);
  let x=Object.values(r).find(v=>v.country.toLowerCase()===a);
  let y=Object.values(r).find(v=>v.country.toLowerCase()===b);
  if(!x||!y){out.textContent='Country not found. Try the exact World Bank name.';return;}
  out.innerHTML=`<p><b>${x.country}:</b> ${x.value.toFixed(2)}% (${x.year})</p><p><b>${y.country}:</b> ${y.value.toFixed(2)}% (${y.year})</p><p>Difference: ${Math.abs(x.value-y.value).toFixed(2)} percentage points.</p><p>Further geographical research is required to explain this difference.</p>`;
}

// VIDEO
function embedVideo(){
  let url=document.getElementById('videoLink').value.trim();
  let id='';
  if(url.includes('youtube.com/watch?v='))id=url.split('v=')[1].split('&')[0];
  if(url.includes('youtu.be/'))id=url.split('youtu.be/')[1].split('?')[0];
  if(!id){document.getElementById('video').textContent='Enter a YouTube link.';return;}
  document.getElementById('video').innerHTML=`<iframe width="100%" height="400" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
}

startup();
