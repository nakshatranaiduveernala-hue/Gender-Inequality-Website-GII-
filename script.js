/* ===============================
   MAP — ROBUST CHOROPLETH
================================ */

let map=null;
let countryLayer=null;
let geoData=null;
let currentMapIndicator="SG.GEN.PARL.ZS";

const mapInfo=document.getElementById("map-info");

function getCountryCode(feature){
  const p=feature.properties||{};
  return (
    p.ISO_A3 ||
    p.iso_a3 ||
    p.ISO3 ||
    p.ADM0_A3 ||
    p.SOV_A3 ||
    p["ISO3166-1-Alpha-3"] ||
    p["ISO_A3"] ||
    null
  );
}

function getCountryName(feature){
  const p=feature.properties||{};
  return p.ADMIN||p.name||p.NAME||p.NAME_EN||"Country";
}

function latestValue(countryData){
  if(!countryData)return null;
  const years=Object.keys(countryData).map(Number).sort((a,b)=>b-a);
  for(const year of years){
    const v=countryData[year];
    if(v!==null&&v!==undefined)return v;
  }
  return null;
}

function mapColor(value,indicator){
  if(value===null||value===undefined)return "#d5d5d5";

  if(indicator==="SG.GEN.PARL.ZS"){
    if(value<10)return "#f1dfe5";
    if(value<20)return "#d8a6b8";
    if(value<30)return "#b66a83";
    if(value<40)return "#922d50";
    return "#4b1028";
  }

  if(indicator==="SP.ADO.TFRT"){
    if(value<10)return "#4b1028";
    if(value<30)return "#922d50";
    if(value<60)return "#b66a83";
    if(value<100)return "#d8a6b8";
    return "#f1dfe5";
  }

  if(indicator==="SH.STA.MMRT"){
    if(value<50)return "#4b1028";
    if(value<150)return "#922d50";
    if(value<300)return "#b66a83";
    if(value<500)return "#d8a6b8";
    return "#f1dfe5";
  }

  return "#d5d5d5";
}

function mapStyle(feature,data,indicator){
  const code=getCountryCode(feature);
  const value=code?latestValue(data[code]):null;

  return {
    fillColor:mapColor(value,indicator),
    fillOpacity:.9,
    color:"#ffffff",
    weight:.7
  };
}

function addMapInteractions(feature,layer,data,indicator){
  const code=getCountryCode(feature);
  const value=code?latestValue(data[code]):null;
  const name=getCountryName(feature);

  const display=value===null
    ?"No data"
    :indicators[indicator].format(value);

  layer.bindTooltip(
    `<strong>${name}</strong><br>${display}`,
    {sticky:true}
  );

  layer.on("mouseover",function(){
    layer.setStyle({weight:2,color:"#c5a15b"});
  });

  layer.on("mouseout",function(){
    countryLayer.resetStyle(layer);
  });

  layer.on("click",function(){
    mapInfo.innerHTML=
      `<strong>${name}</strong><br>`+
      `${indicators[indicator].label}: ${display}`;
  });
}

function updateLegend(indicator){
  const legend=document.querySelector(".map-legend");
  if(!legend)return;

  if(indicator==="SG.GEN.PARL.ZS"){
    legend.innerHTML=`
      <span><i style="background:#f1dfe5"></i>0–9.9%</span>
      <span><i style="background:#d8a6b8"></i>10–19.9%</span>
      <span><i style="background:#b66a83"></i>20–29.9%</span>
      <span><i style="background:#922d50"></i>30–39.9%</span>
      <span><i style="background:#4b1028"></i>40%+</span>
      <span><i style="background:#d5d5d5"></i>No data</span>
    `;
  }else if(indicator==="SP.ADO.TFRT"){
    legend.innerHTML=`
      <span><i style="background:#4b1028"></i>Lowest</span>
      <span><i style="background:#922d50"></i>Low–moderate</span>
      <span><i style="background:#b66a83"></i>Moderate</span>
      <span><i style="background:#d8a6b8"></i>High</span>
      <span><i style="background:#f1dfe5"></i>Highest</span>
      <span><i style="background:#d5d5d5"></i>No data</span>
    `;
  }else{
    legend.innerHTML=`
      <span><i style="background:#4b1028"></i>Lowest</span>
      <span><i style="background:#922d50"></i>Low–moderate</span>
      <span><i style="background:#b66a83"></i>Moderate</span>
      <span><i style="background:#d8a6b8"></i>High</span>
      <span><i style="background:#f1dfe5"></i>Highest</span>
      <span><i style="background:#d5d5d5"></i>No data</span>
    `;
  }
}

async function updateMap(indicator){
  currentMapIndicator=indicator;
  updateLegend(indicator);

  mapInfo.textContent="Loading geographical data...";

  const data=await getData(indicator);

  if(!geoData){
    try{
      const response=await fetch(
        "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
      );
      if(!response.ok)throw new Error("GeoJSON unavailable");
      geoData=await response.json();
    }catch(error){
      mapInfo.textContent="Unable to load map geography. Please check your internet connection.";
      return;
    }
  }

  if(countryLayer){
    map.removeLayer(countryLayer);
  }

  countryLayer=L.geoJSON(geoData,{
    style:feature=>mapStyle(feature,data,indicator),
    onEachFeature:(feature,layer)=>{
      addMapInteractions(feature,layer,data,indicator);
    }
  }).addTo(map);

  mapInfo.innerHTML=
    "<strong>Global distribution</strong><br>"+
    "Hover over countries to inspect them. Click a country to see its value.";

  map.invalidateSize();
}

function initialiseMap(){
  if(!document.getElementById("map")||map)return;

  map=L.map("map").setView([20,0],2);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution:"© OpenStreetMap © CARTO",
      maxZoom:7
    }
  ).addTo(map);

  updateMap(currentMapIndicator);
}
