const WB = "https://api.worldbank.org/v2";
const indicators = {
  "SP.ADO.TFRT": {
    label:"Adolescent fertility rate",
    unit:"births per 1,000 girls aged 15–19",
    favorable:"lower",
    source:"World Bank / UN Population Division"
  },
  "SH.STA.MMRT":{
    label:"Maternal mortality ratio",
    unit:"maternal deaths per 100,000 live births",
    favorable:"lower",
    source:"World Bank / UN"
  },
  "SG.GEN.PARL":{
    label:"Women in parliament",
    unit:"percentage (%)",
    favorable:"higher",
    source:"World Bank / IPU"
  }
};

let indiaChart = null;
let trendChart = null;
let mapCache = {};
let mapFeatures = [];
let mapData = {};
let mapIndicatorCode = "SP.ADO.TFRT";

// API data
async function getData(indicator,country="all",perPage=20000){
  const url=`${WB}/country/${country}/indicator/${indicator}?format=json&per_page=${perPage}`;
  const r=await fetch(url);
  if(!r.ok) throw new Error("Data API unavailable");
  const j=await r.json();
  return j?.[1]||[];
}

function cleanData(rows){
  return rows.filter(x=>x.value!==null && x.date)
    .map(x=>({year:Number(x.date),value:Number(x.value)}))
    .sort((a,b)=>a.year-b.year);
}

function countryName(code){
  const names={
    IN:"India",BR:"Brazil",ZA:"South Africa",SE:"Sweden",
    JP:"Japan",NG:"Nigeria",BD:"Bangladesh",US:"United States",
    FR:"France",World:"World"
  };
  return names[code]||code;
}

function formatValue(v){
  if(v===null||v===undefined||!Number.isFinite(Number(v)))return "No data";
  return Number(v).toLocaleString(undefined,{maximumFractionDigits:2});
}

// Chart styling
function chartOptions(){
  return{
    responsive:true,
    maintainAspectRatio:false,
    interaction:{intersect:false,mode:"index"},
    plugins:{
      legend:{display:false},
      tooltip:{backgroundColor:"#142d42",padding:12}
    },
    scales:{
      x:{grid:{display:false},ticks:{maxTicksLimit:10,color:"#6d7c88"}},
      y:{beginAtZero:true,grid:{color:"#e9ecec"},ticks:{color:"#6d7c88"}}
    }
  };
}

function createChart(canvas,data,label){
  if(!canvas)return null;
  const ctx=canvas.getContext("2d");
  return new Chart(ctx,{
    type:"line",
    data:{
      labels:data.map(x=>x.year),
      datasets:[{
        label,
        data:data.map(x=>x.value),
        borderColor:"#315f78",
        backgroundColor:"rgba(124,169,167,.18)",
        pointBackgroundColor:"#7ca9a7",
        pointRadius:2,
        borderWidth:2.5,
        tension:.25,
        fill:true
      }]
    },
    options:chartOptions()
  });
}

async function loadIndiaChart(){
  const code=document.getElementById("indiaIndicator").value;
  const rows=await getData(code,"IN");
  const data=cleanData(rows);
  if(indiaChart)indiaChart.destroy();
  indiaChart=createChart(document.getElementById("indiaChart"),data,indicators[code].label);
}

async function loadTrend(){
  const indicator=document.getElementById("trendIndicator").value;
  const country=document.getElementById("trendCountry").value;
  let rows=await getData(indicator,country);
  const data=cleanData(rows);
  if(trendChart)trendChart.destroy();
  trendChart=createChart(document.getElementById("trendChart"),data,indicators[indicator].label);

  const text=document.getElementById("trendInterpretation");
  if(data.length<2){
    text.textContent="Insufficient data to interpret this trend. Try a different indicator or country.";
    return;
  }
  const first=data[0],last=data[data.length-1];
  const change=last.value-first.value;
  let direction=change>0?"increased":change<0?"decreased":"remained unchanged";
  const favorable=indicators[indicator].favorable;
  let meaning="";
  if(favorable==="lower"){
    meaning=change<0?"A decrease may indicate improvement in this indicator, although other factors and context are needed.":change>0?"An increase may indicate a worsening outcome for this indicator.":"The indicator has not changed between these endpoints.";
  }else{
    meaning=change>0?"An increase may indicate greater representation.":change<0?"A decrease may indicate reduced representation.":"The indicator has not changed between these endpoints.";
  }
  text.innerHTML=`<strong>${countryName(country)} · ${indicators[indicator].label}</strong><br>
  From ${first.year} (${formatValue(first.value)}) to ${last.year} (${formatValue(last.value)}), the indicator ${direction} by ${formatValue(Math.abs(change))}.<br>${meaning}<br>
  <small>Interpretation is limited to the available data and timeframe.</small>`;
}

// India latest values
async function loadIndiaStats(){
  try{
    const afr=cleanData(await getData("SP.ADO.TFRT","IN"));
    const mmr=cleanData(await getData("SH.STA.MMRT","IN"));
    const afrLatest=afr.at(-1);
    const mmrLatest=mmr.at(-1);
    document.getElementById("indiaAfr").textContent=afrLatest?formatValue(afrLatest.value):"—";
    document.getElementById("indiaMmr").textContent=mmrLatest?formatValue(mmrLatest.value):"—";
    const afrCard=document.getElementById("indiaAfr");
    const mmrCard=document.getElementById("indiaMmr");
    afrCard.title=afrLatest?"Year: "+afrLatest.year:"";
    mmrCard.title=mmrLatest?"Year: "+mmrLatest.year:"";
    afrCard.nextElementSibling.textContent=afrLatest?`Births per 1,000 · ${afrLatest.year}`:"Data unavailable";
    mmrCard.nextElementSibling.textContent=mmrLatest?`Deaths per 100,000 · ${mmrLatest.year}`:"Data unavailable";
  }catch(e){
    document.getElementById("indiaAfr").textContent="—";
    document.getElementById("indiaMmr").textContent="—";
  }
}

// MAP
const mapContainer=document.getElementById("worldMap");
const tooltip=document.getElementById("mapTooltip");

function project(coords,width,height){
  const lon=coords[0],lat=coords[1];
  return[
    (lon+180)/360*width,
    (90-lat)/180*height
  ];
}

function geometryPath(geometry,width,height){
  let path="";
  function ring(coords){
    coords.forEach((p,i)=>{
      const [x,y]=project(p,width,height);
      path+=(i?"L":"M")+x.toFixed(2)+" "+y.toFixed(2);
    });
    path+="Z";
  }
  if(geometry.type==="Polygon"){
    geometry.coordinates.forEach(ring);
  }else if(geometry.type==="MultiPolygon"){
    geometry.coordinates.forEach(poly=>poly.forEach(ring));
  }
  return path;
}

function countryLookup(){
  const lookup={};
  mapData[mapIndicatorCode]?.forEach(d=>{
    if(d.countryiso3code)lookup[d.countryiso3code]=d.value;
  });
  return lookup;
}

function renderMap(){
  const width=900,height=450;
  if(!mapFeatures.length)return;
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("viewBox",`0 0 ${width} ${height}`);
  svg.setAttribute("role","img");
  svg.setAttribute("aria-label","Interactive world map");

  const values=mapData[mapIndicatorCode]||[];
  const numeric=values.map(x=>x.value).filter(v=>Number.isFinite(v));
  const min=Math.min(...numeric),max=Math.max(...numeric);
  const lookup=countryLookup();

  mapFeatures.forEach(feature=>{
    const props=feature.properties||{};
    const iso=props.ISO_A3||props.iso_a3||props.ADM0_A3||props.adm0_a3||props.SOV_A3||props.sov_a3;
    const value=lookup[iso];
    const shape=document.createElementNS("http://www.w3.org/2000/svg","path");
    shape.setAttribute("d",geometryPath(feature.geometry,width,height));
    shape.classList.add("country-shape");
    if(Number.isFinite(value)){
      const normalized=max===min?.5:(value-min)/(max-min);
      const colors=["#dbe8e8","#b6d2ce","#8cb5b0","#5f8d9b","#305d77","#183447"];
      shape.style.fill=colors[Math.min(5,Math.floor(normalized*6))];
    }
    shape.addEventListener("mousemove",e=>{
      const name=props.NAME||props.name||props.ADMIN||"Country";
      tooltip.style.display="block";
      tooltip.style.left=(e.clientX+15)+"px";
      tooltip.style.top=(e.clientY+15)+"px";
      tooltip.innerHTML=`<strong>${name}</strong><br>${indicators[mapIndicatorCode].label}<br>${Number.isFinite(value)?formatValue(value):"No data"}`;
    });
    shape.addEventListener("mouseleave",()=>tooltip.style.display="none");
    shape.addEventListener("click",()=>{
      const name=props.NAME||props.name||props.ADMIN||"Country";
      const box=document.getElementById("countryProfile");
      box.innerHTML=`<strong>${name}</strong><br>${indicators[mapIndicatorCode].label}<br><span>${Number.isFinite(value)?formatValue(value):"No data available"}</span><br><small>${indicators[mapIndicatorCode].unit}</small>`;
    });
    svg.appendChild(shape);
  });
  mapContainer.innerHTML="";
  mapContainer.appendChild(svg);
}

async function loadMapData(){
  const code=mapIndicatorCode;
  if(mapCache[code]){
    mapData[code]=mapCache[code];
    renderMap();
    return;
  }
  try{
    const rows=await getData(code,"all");
    mapData[code]=rows;
    mapCache[code]=rows;
    renderMap();
  }catch(e){
    mapContainer.innerHTML="<p>Map data could not be loaded. Check your internet connection.</p>";
  }
}

async function loadWorldMap(){
  try{
    const r=await fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson");
    if(!r.ok)throw new Error();
    const geo=await r.json();
    mapFeatures=geo.features||[];
    await loadMapData();
  }catch(e){
    mapContainer.innerHTML="<p>Geographical map data could not be loaded. Please try again later.</p>";
  }
}

// Events
document.getElementById("mapIndicator").addEventListener("change",e=>{
  mapIndicatorCode=e.target.value;
  loadMapData();
});
document.getElementById("indiaIndicator").addEventListener("change",loadIndiaChart);
document.getElementById("trendIndicator").addEventListener("change",loadTrend);
document.getElementById("trendCountry").addEventListener("change",loadTrend);

// Broken image fallback
document.querySelectorAll("img").forEach(img=>{
  img.addEventListener("error",()=>{
    img.style.display="none";
    if(img.parentElement){
      const fallback=document.createElement("p");
      fallback.className="image-note";
      fallback.textContent="Image unavailable";
      img.parentElement.appendChild(fallback);
    }
  });
});

// Start
loadWorldMap();
loadIndiaStats();
loadIndiaChart();
loadTrend();
