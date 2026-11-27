/* ===============================
   NAVIGATION
================================ */

const navButtons = document.querySelectorAll(".navbtn");
const pages = document.querySelectorAll(".page");

function showPage(id){
  pages.forEach(p => p.classList.remove("active"));
  navButtons.forEach(b => b.classList.remove("active"));

  const page = document.getElementById(id);
  const button = document.querySelector(`[data-page="${id}"]`);

  if(page) page.classList.add("active");
  if(button) button.classList.add("active");

  if(id === "trends"){
    setTimeout(() => {
      if(map) map.invalidateSize();
    },150);
  }

  window.scrollTo({top:0,behavior:"smooth"});
}

navButtons.forEach(button=>{
  button.addEventListener("click",()=>{
    showPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-goto]").forEach(button=>{
  button.addEventListener("click",()=>{
    showPage(button.dataset.goto);
  });
});


/* ===============================
   DATA
================================ */

const indicators = {
  "SG.GEN.PARL.ZS":{
    label:"Women in Parliament (%)",
    short:"Women in Parliament",
    unit:"%",
    format:v=>v.toFixed(1)+"%"
  },
  "SP.ADO.TFRT":{
    label:"Adolescent fertility rate",
    short:"Adolescent fertility",
    unit:"births per 1,000",
    format:v=>v.toFixed(1)
  },
  "SH.STA.MMRT":{
    label:"Maternal mortality ratio",
    short:"Maternal mortality",
    unit:"per 100,000",
    format:v=>v.toFixed(1)
  }
};

const comparisonCountries=[
  {code:"RWA",name:"Rwanda"},
  {code:"SWE",name:"Sweden"},
  {code:"NOR",name:"Norway"},
  {code:"IND",name:"India"},
  {code:"MEX",name:"Mexico"},
  {code:"USA",name:"United States"},
  {code:"JPN",name:"Japan"},
  {code:"NZL",name:"New Zealand"}
];

const startYear=2000;
const endYear=2024;

const dataCache={};


/* ===============================
   WORLD BANK DATA
================================ */

async function getData(indicator){
  if(dataCache[indicator]) return dataCache[indicator];

  const url=
    `https://api.worldbank.org/v2/country/all/indicator/${indicator}?date=${startYear}:${endYear}&format=json&per_page=20000`;

  try{
    const response=await fetch(url);
    const json=await response.json();

    if(!json || !json[1]) return {};

    const result={};

    json[1].forEach(row=>{
      if(!row.countryiso3code) return;
      if(row.value===null) return;

      if(!result[row.countryiso3code]){
        result[row.countryiso3code]={};
      }

      result[row.countryiso3code][Number(row.date)]=row.value;
    });

    dataCache[indicator]=result;
    return result;
  }catch(error){
    console.error("Data error:",error);
    return {};
  }
}

function latestValue(countryData){
  if(!countryData) return null;

  const years=Object.keys(countryData)
    .map(Number)
    .sort((a,b)=>b-a);

  for(const year of years){
    if(countryData[year]!==null &&
       countryData[year]!==undefined){
      return countryData[year];
    }
  }

  return null;
}


/* ===============================
   CHARTS
================================ */

let comparisonChart=null;
let timeChart=null;

async function createComparison(indicator){

  const data=await getData(indicator);
  const latest=comparisonCountries.map(country=>{
    const value=latestValue(data[country.code]);
    return {name:country.name,value:value};
  });

  const filtered=latest.filter(d=>d.value!==null);

  if(comparisonChart) comparisonChart.destroy();

  const ctx=document.getElementById("comparisonChart");

  comparisonChart=new Chart(ctx,{
    type:"bar",
    data:{
      labels:filtered.map(d=>d.name),
      datasets:[{
        label:indicators[indicator].label,
        data:filtered.map(d=>d.value),
        backgroundColor:"#842c49",
        borderColor:"#641c36",
        borderWidth:1,
        borderRadius:5
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:true,
      plugins:{
        legend:{display:false},
        tooltip:{enabled:true}
      },
      scales:{
        y:{beginAtZero:true},
        x:{ticks:{maxRotation:30,minRotation:0}}
      }
    }
  });
}

async function createTimeChart(country,indicator="SG.GEN.PARL.ZS"){
  const data=await getData(indicator);
  const series=data[country]||{};

  const years=Object.keys(series).map(Number).sort((a,b)=>a-b);

  if(timeChart) timeChart.destroy();

  const ctx=document.getElementById("timeChart");

  timeChart=new Chart(ctx,{
    type:"line",
    data:{
      labels:years,
      datasets:[{
        label:indicators[indicator].label,
        data:years.map(y=>series[y]),
        borderColor:"#842c49",
        backgroundColor:"rgba(132,44,73,.12)",
        fill:true,
        tension:.25,
        pointRadius:2
      }]
    },
    options:{
      responsive:true,
      plugins:{legend:{display:true}},
      scales:{y:{beginAtZero:true}}
    }
  });
}


/* ===============================
   MAP
================================ */

let map=null;
let countryLayer=null;
let geoData=null;
let currentMapIndicator="SG.GEN.PARL.ZS";

const mapInfo=document.getElementById("map-info");

function mapColor(value,indicator){
  if(value===null || value===undefined) return "#d9d9d9";

  if(indicator==="SG.GEN.PARL.ZS"){
    if(value<10) return "#e7cdd4";
    if(value<20) return "#cf9eae";
    if(value<30) return "#a54864";
    if(value<40) return "#842c49";
    return "#641c36";
  }

  if(indicator==="SP.ADO.TFRT"){
    if(value<10) return "#641c36";
    if(value<30) return "#842c49";
    if(value<60) return "#a54864";
    if(value<100) return "#cf9eae";
    return "#e7cdd4";
  }

  if(indicator==="SH.STA.MMRT"){
    if(value<50) return "#641c36";
    if(value<150) return "#842c49";
    if(value<300) return "#a54864";
    if(value<500) return "#cf9eae";
    return "#e7cdd4";
  }

  return "#d9d9d9";
}

function mapStyle(feature,data,indicator){
  const code=feature.properties.ISO_A3;
  const value=latestValue(data[code]);

  return {
    fillColor:mapColor(value,indicator),
    color:"#ffffff",
    weight:.7,
    fillOpacity:.85
  };
}

function featureName(feature){
  return feature.properties.ADMIN ||
         feature.properties.name ||
         feature.properties.NAME ||
         "Country";
}

function showMapPopup(feature,layer,data,indicator){
  const code=feature.properties.ISO_A3;
  const value=latestValue(data[code]);
  const country=featureName(feature);

  let text=value===null
    ?"No available data"
    :indicators[indicator].format(value);

  layer.bindPopup(
    `<b>${country}</b><br>${indicators[indicator].label}: ${text}`
  );

  layer.on("mouseover",function(){
    this.setStyle({weight:2,color:"#c8a66b"});
  });

  layer.on("mouseout",function(){
    countryLayer.resetStyle(this);
  });

  layer.on("click",function(){
    mapInfo.innerHTML=
      `<strong>${country}</strong><br>`+
      `${indicators[indicator].label}: ${text}`;

    if(value!==null){
      mapInfo.innerHTML+=
        `<br><small>Latest value available in retrieved data</small>`;
    }
  });
}

async function updateMap(indicator){
  currentMapIndicator=indicator;

  const data=await getData(indicator);

  if(!geoData){
    try{
      const response=await fetch(
        "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
      );
      geoData=await response.json();
    }catch(error){
      mapInfo.textContent="The map geography could not be loaded.";
      return;
    }
  }

  if(countryLayer){
    map.removeLayer(countryLayer);
  }

  countryLayer=L.geoJSON(geoData,{
    style:feature=>mapStyle(feature,data,indicator),
    onEachFeature:(feature,layer)=>{
      showMapPopup(feature,layer,data,indicator);
    }
  }).addTo(map);

  mapInfo.textContent=
    "Map updated. Select a country to see its available value.";

  if(map){
    map.invalidateSize();
  }
}

function initialiseMap(){
  if(!document.getElementById("map")) return;
  if(map) return;

  map=L.map("map").setView([20,0],2);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution:
      '&copy; OpenStreetMap &copy; CARTO',
      maxZoom:7
    }
  ).addTo(map);

  updateMap(currentMapIndicator);
}


/* ===============================
   EVENT LISTENERS
================================ */

document.getElementById("map-indicator")
.addEventListener("change",e=>{
  updateMap(e.target.value);
});

document.getElementById("comparison-indicator")
.addEventListener("change",e=>{
  createComparison(e.target.value);
});

document.getElementById("country-select")
.addEventListener("change",e=>{
  createTimeChart(e.target.value);
});


/* ===============================
   START
================================ */

initialiseMap();
createComparison("SG.GEN.PARL.ZS");
createTimeChart("IND","SG.GEN.PARL.ZS");
