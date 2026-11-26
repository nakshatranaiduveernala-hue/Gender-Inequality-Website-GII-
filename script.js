"use strict";

/* =========================================
   BEYOND THE DIVIDE
   Navigation · Map · Indicators · Charts
========================================= */

const $ = id => document.getElementById(id);

/* NAVIGATION */

function showPage(id){
  const target=$(id);
  if(!target || !target.classList.contains("page"))return;

  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  target.classList.add("active");

  document.querySelectorAll("#mainNav a").forEach(a=>{
    a.classList.toggle("active",a.getAttribute("href")==="#"+id);
  });

  $("mainNav")?.classList.remove("open");

  window.scrollTo({top:0,behavior:"smooth"});

  if(id==="indicators" && mapInstance){
    setTimeout(()=>mapInstance.invalidateSize(),250);
  }
}

document.querySelectorAll("#mainNav a").forEach(a=>{
  a.addEventListener("click",e=>{
    e.preventDefault();
    const id=a.getAttribute("href").slice(1);
    showPage(id);
    history.replaceState(null,"","#"+id);
  });
});

document.querySelectorAll('a[href^="#"]').forEach(a=>{
  if(a.closest("#mainNav"))return;

  a.addEventListener("click",e=>{
    const id=a.getAttribute("href").slice(1);

    if($(id)?.classList.contains("page")){
      e.preventDefault();
      showPage(id);
      history.replaceState(null,"","#"+id);
    }
  });
});

$("menuToggle")?.addEventListener("click",()=>{
  $("mainNav")?.classList.toggle("open");
});

if(location.hash && $(location.hash.slice(1))?.classList.contains("page")){
  showPage(location.hash.slice(1));
}


/* INDICATORS */

const indicators={
  parliament:{
    code:"SG.GEN.PARL.ZS",
    title:"Women in Parliament",
    unit:"Seats held by women (%)",
    suffix:"%",
    range:[0,60]
  },
  fertility:{
    code:"SP.ADO.TFRT",
    title:"Adolescent Fertility Rate",
    unit:"Births per 1,000 women aged 15–19",
    suffix:"",
    range:[0,150]
  },
  maternal:{
    code:"SH.STA.MMRT",
    title:"Maternal Mortality Ratio",
    unit:"Deaths per 100,000 live births",
    suffix:"",
    range:[0,1000]
  }
};

const cache={};

async function fetchWB(code,dates="1995:2024"){
  const key=code+dates;

  if(cache[key])return cache[key];

  const url=
    "https://api.worldbank.org/v2/country/all/indicator/"+
    code+"?format=json&date="+dates+"&per_page=20000";

  const res=await fetch(url);

  if(!res.ok)throw new Error("Data request failed");

  const json=await res.json();

  if(!json||!json[1])throw new Error("No data returned");

  cache[key]=json[1];

  return json[1];
}

function latestValues(rows){
  const result={};

  rows.forEach(r=>{
    if(!r.countryiso3code||r.value===null)return;

    const iso=r.countryiso3code;
    const year=Number(r.date);

    if(!result[iso]||year>result[iso].year){
      result[iso]={
        name:r.country?.value||iso,
        value:Number(r.value),
        year
      };
    }
  });

  return result;
}

function countrySeries(rows,iso){
  const arr=rows
    .filter(r=>r.countryiso3code===iso&&r.value!==null)
    .sort((a,b)=>Number(a.date)-Number(b.date));

  return{
    labels:arr.map(r=>r.date),
    values:arr.map(r=>Number(r.value))
  };
}


/* CHARTS */

const charts={};

function makeChart(id,type,labels,values,label,unit){
  const canvas=$(id);

  if(!canvas||!window.Chart)return;

  charts[id]?.destroy();

  charts[id]=new Chart(canvas,{
    type,
    data:{
      labels,
      datasets:[{
        label,
        data:values,
        backgroundColor:
          type==="line"?"rgba(50,107,149,.16)":"#326b95",
        borderColor:"#326b95",
        borderWidth:2,
        fill:type==="line",
        tension:.3,
        pointRadius:3,
        borderRadius:5
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{display:true},
        tooltip:{enabled:true}
      },
      scales:{
        y:{
          beginAtZero:true,
          title:{display:true,text:unit}
        },
        x:{grid:{display:false}}
      }
    }
  });
}

function chartError(id,message){
  const canvas=$(id);

  if(!canvas)return;

  let p=canvas.parentElement.querySelector(".chart-error");

  if(!p){
    p=document.createElement("p");
    p.className="chart-error small";
    canvas.parentElement.appendChild(p);
  }

  p.textContent=message;
}

/* FIXED: accepts the indicator key and uses its World Bank code */

async function loadLine(id,indicatorKey,iso,label){
  try{
    const rows=await fetchWB(
      indicators[indicatorKey].code,
      "1995:2024"
    );

    const s=countrySeries(rows,iso);

    if(!s.values.length)throw new Error("No observations");

    makeChart(
      id,
      "line",
      s.labels,
      s.values,
      label,
      indicators[indicatorKey].unit
    );

  }catch(e){
    console.error(e);
    chartError(id,"Data unavailable. Check the source database.");
  }
}

async function loadCountryChart(){
  try{
    const rows=await fetchWB(
      indicators.parliament.code,
      "2020:2024"
    );

    const latest=latestValues(rows);

    const codes=[
      "RWA","SWE","NOR","FIN","MEX",
      "IND","USA","JPN","PAK","NGA"
    ];

    const data=codes.map(c=>latest[c]).filter(Boolean);

    if(!data.length)throw new Error("No data");

    makeChart(
      "globalCountryChart",
      "bar",
      data.map(d=>d.name),
      data.map(d=>d.value),
      "Women in Parliament",
      "Seats held by women (%)"
    );

  }catch(e){
    console.error(e);
    chartError("globalCountryChart","Country data unavailable.");
  }
}


/* INDIA AND GLOBAL CHARTS */

loadLine("indiaChart","parliament","IND","Women in Parliament");

loadLine(
  "fertilityChart",
  "fertility",
  "IND",
  "Adolescent Fertility Rate"
);

loadLine(
  "maternalChart",
  "maternal",
  "IND",
  "Maternal Mortality Ratio"
);

loadLine(
  "trendChart",
  "parliament",
  "WLD",
  "Global representation"
);

loadCountryChart();


/* MAP */

let mapInstance;
let countryLayer;
let currentMapData={};
let currentIndicator="parliament";

function mapColour(value,key){
  if(value===undefined||value===null)return "#d8dce1";

  if(key==="parliament"){
    if(value<10)return "#e4edf5";
    if(value<20)return "#b9d4e5";
    if(value<30)return "#7daac9";
    if(value<40)return "#39739e";
    return "#123e68";
  }

  if(key==="fertility"){
    if(value<10)return "#e4edf5";
    if(value<30)return "#b9d4e5";
    if(value<60)return "#7daac9";
    if(value<100)return "#39739e";
    return "#123e68";
  }

  if(value<20)return "#e4edf5";
  if(value<100)return "#b9d4e5";
  if(value<300)return "#7daac9";
  if(value<600)return "#39739e";
  return "#123e68";
}

function iso(feature){
  const p=feature.properties||{};

  return(
    p.ISO_A3||
    p.iso_a3||
    p.ADM0_A3||
    p.ISO3||
    p.A3||
    null
  );
}

function nameOf(feature){
  const p=feature.properties||{};

  return p.ADMIN||p.name||p.NAME||"Country";
}

function styleFeature(feature){
  const code=iso(feature);
  const value=currentMapData[code]?.value;

  return{
    fillColor:mapColour(value,currentIndicator),
    fillOpacity:.85,
    color:"#ffffff",
    weight:.7
  };
}

function updateCountryPanel(feature){
  const code=iso(feature);
  const name=nameOf(feature);
  const data=currentMapData[code];

  $("countryName").textContent=name;

  if(!data){
    $("countryValue").textContent=
      "No available observation for this country in the selected dataset.";
    return;
  }

  $("countryValue").textContent=
    indicators[currentIndicator].title+
    ": "+formatValue(data.value)+
    indicators[currentIndicator].suffix+
    " · "+data.year+
    " · Source: World Bank";
}

function bindFeature(feature,layer){
  const code=iso(feature);
  const data=currentMapData[code];
  const name=nameOf(feature);

  layer.bindTooltip(
    data?
      name+"<br>"+
      formatValue(data.value)+
      indicators[currentIndicator].suffix+
      "<br>"+data.year:
      name+"<br>No data",
    {sticky:true}
  );

  layer.on({
    click:()=>updateCountryPanel(feature),

    mouseover:function(){
      this.setStyle({
        weight:2,
        color:"#071c34",
        fillOpacity:1
      });
    },

    mouseout:function(){
      countryLayer?.resetStyle(this);
    }
  });
}

async function loadMapData(key){
  currentIndicator=key;

  const status=$("mapStatus");

  status.textContent=
    "Loading "+indicators[key].title+"…";

  try{
    const rows=await fetchWB(
      indicators[key].code,
      "1995:2024"
    );

    currentMapData=latestValues(rows);

    if(!countryLayer){

      status.textContent="Loading geographical boundaries…";

      const url=
        "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

      const res=await fetch(url);

      if(!res.ok)throw new Error("Map boundary data unavailable");

      const geo=await res.json();

      countryLayer=L.geoJSON(geo,{
        style:styleFeature,
        onEachFeature:bindFeature
      }).addTo(mapInstance);

    }else{

      countryLayer.setStyle(styleFeature);

      countryLayer.eachLayer(layer=>{
        const f=layer.feature;
        const d=currentMapData[iso(f)];
        const n=nameOf(f);

        layer.unbindTooltip();

        layer.bindTooltip(
          d?
            n+"<br>"+
            formatValue(d.value)+
            indicators[key].suffix+
            "<br>"+d.year:
            n+"<br>No data",
          {sticky:true}
        );
      });
    }

    $("mapHeading").textContent=indicators[key].title;

    status.textContent=
      "Map loaded. Hover for details; click a country to view its observation.";

    $("countryName").textContent="Click a country on the map";

    $("countryValue").textContent="Country data will appear here.";

    mapInstance.invalidateSize();

  }catch(e){
    console.error(e);

    status.textContent=
      "The map or data could not load. Check your internet connection.";
  }
}

function initMap(){
  if(!window.L){
    $("mapStatus").textContent="Map library unavailable.";
    return;
  }

  mapInstance=L.map("worldMap",{
    minZoom:1,
    maxZoom:5,
    scrollWheelZoom:false
  }).setView([20,0],2);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    {
      attribution:"&copy; OpenStreetMap &copy; CARTO",
      maxZoom:5
    }
  ).addTo(mapInstance);

  loadMapData("parliament");
}

$("mapIndicator")?.addEventListener("change",e=>{
  loadMapData(e.target.value);
});

initMap();


/* COUNTRY COMPARISON */

const countryCodes={
  IND:"India",
  USA:"United States",
  RWA:"Rwanda",
  SWE:"Sweden",
  NOR:"Norway",
  FIN:"Finland",
  MEX:"Mexico",
  JPN:"Japan",
  PAK:"Pakistan",
  NGA:"Nigeria",
  GBR:"United Kingdom",
  CAN:"Canada",
  BRA:"Brazil",
  ZAF:"South Africa",
  AFG:"Afghanistan",
  AUS:"Australia",
  FRA:"France",
  DEU:"Germany",
  ARG:"Argentina",
  NZL:"New Zealand"
};

function fillSelect(id,defaultCode){
  const s=$(id);

  if(!s)return;

  s.innerHTML="";

  Object.entries(countryCodes).forEach(([code,name])=>{
    const option=document.createElement("option");

    option.value=code;
    option.textContent=name;

    s.appendChild(option);
  });

  s.value=defaultCode;
}

fillSelect("countryOne","IND");
fillSelect("countryTwo","USA");

$("compareButton")?.addEventListener("click",async()=>{
  const result=$("comparisonResult");

  result.textContent="Loading comparison…";

  try{
    const rows=await fetchWB(
      indicators[currentIndicator].code,
      "1995:2024"
    );

    const latest=latestValues(rows);

    const a=$("countryOne").value;
    const b=$("countryTwo").value;

    const da=latest[a];
    const db=latest[b];

    result.innerHTML="";

    const table=document.createElement("table");

    table.className="comparison-table";

    table.innerHTML=
      "<thead><tr>"+
      "<th>Country</th>"+
      "<th>Value</th>"+
      "<th>Year</th>"+
      "</tr></thead>";

    const tbody=document.createElement("tbody");

    [[a,da],[b,db]].forEach(([code,d])=>{
      const tr=document.createElement("tr");

      const name=document.createElement("td");
      const val=document.createElement("td");
      const year=document.createElement("td");

      name.textContent=countryCodes[code]||code;

      val.textContent=d?
        formatValue(d.value)+indicators[currentIndicator].suffix:
        "No data";

      year.textContent=d?d.year:"—";

      tr.append(name,val,year);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    result.appendChild(table);

  }catch(e){
    console.error(e);

    result.textContent=
      "Comparison unavailable. Please try again.";
  }
});


/* VIDEO EMBED */

$("embedVideo")?.addEventListener("click",()=>{
  const raw=$("videoURL").value.trim();
  const container=$("videoContainer");

  container.replaceChildren();

  if(!raw){
    container.textContent="Paste a video URL first.";
    return;
  }

  let embed="";

  try{
    const url=new URL(raw);

    if(url.hostname==="youtu.be"){
      embed=
        "https://www.youtube-nocookie.com/embed/"+
        url.pathname.slice(1);

    }else if(url.hostname.includes("youtube.com")){
      const id=url.searchParams.get("v");

      if(id){
        embed="https://www.youtube-nocookie.com/embed/"+id;
      }else if(url.pathname.startsWith("/embed/")){
        embed="https://www.youtube-nocookie.com"+url.pathname;
      }

    }else if(url.hostname.includes("vimeo.com")){
      const id=url.pathname.split("/").filter(Boolean).pop();

      if(/^\d+$/.test(id)){
        embed="https://player.vimeo.com/video/"+id;
      }
    }

  }catch(e){}

  if(!embed){
    container.textContent=
      "Unsupported video URL. Use YouTube or Vimeo.";
    return;
  }

  const frame=document.createElement("iframe");

  frame.src=embed;
  frame.title="Criterion C speech video";
  frame.width="100%";
  frame.height="400";
  frame.allow="fullscreen; picture-in-picture";
  frame.setAttribute("allowfullscreen","");
  frame.loading="lazy";

  container.appendChild(frame);
});


/* FORMATTING */

function formatValue(value){
  if(value===undefined||value===null)return "No data";

  return Number(value).toLocaleString(undefined,{
    maximumFractionDigits:2
  });
}
