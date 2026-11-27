(() => {
"use strict";

const pages = [...document.querySelectorAll(".page")];
const nav = [...document.querySelectorAll(".nav-btn")];
const crumb = document.getElementById("crumb");

const labels = {
home:"HOME",
issue:"THE ISSUE",
india:"INDIA",
trends:"TRENDS",
indicator:"DEVELOPMENT INDICATOR",
criterionb:"CRITERION B",
criterionc:"CRITERION C",
criteriond:"CRITERION D",
sources:"SOURCES",
about:"ABOUT ME"
};

window.showPage = function(id){
pages.forEach(p=>p.classList.toggle("active",p.id===id));
nav.forEach(b=>b.classList.toggle("active",b.dataset.page===id));
crumb.textContent="RESEARCH / "+(labels[id]||id).toUpperCase();
window.scrollTo({top:0,behavior:"smooth"});
if(id==="indicator"&&map){
setTimeout(()=>map.invalidateSize(),160);
}
};

nav.forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));

const years=document.getElementById("yearSelect");

for(let y=2025;y>=2000;y--){
const o=document.createElement("option");
o.value=y;
o.textContent=y;
if(y===2023)o.selected=true;
years.append(o);
}

const indicators={
"SG.GEN.PARL.ZS":{
title:"Women in national parliament",
subtitle:"Share of seats held by women in national parliaments (%)",
unit:"%",
ranges:[0,10,20,30,40,50,60]
},
"SP.ADO.TFRT":{
title:"Adolescent fertility rate",
subtitle:"Births per 1,000 women ages 15–19",
unit:"births / 1,000",
ranges:[0,10,20,40,60,90,120]
},
"SH.STA.MMRT":{
title:"Maternal mortality ratio",
subtitle:"Maternal deaths per 100,000 live births",
unit:"deaths / 100,000",
ranges:[0,20,50,100,200,400,800]
}
};

let map=null;
let geoLayer=null;
let chart=null;
let records=[];
let geoData=null;
let selectedIndicator="SG.GEN.PARL.ZS";
let selectedYear=2023;

const mapEl=document.getElementById("worldMap");
const status=document.getElementById("dataStatus");

function palette(){
return ["#eaf2f8","#c9dce9","#9dbfd5","#6e9fbe","#457da5","#285e87","#153f67"];
}

function colorFor(v){
if(v===null||!Number.isFinite(v))return "#d9dee4";
const r=indicators[selectedIndicator].ranges;
for(let i=1;i<r.length;i++){
if(v<r[i])return palette()[i-1];
}
return palette()[6];
}

function format(v){
return v==null||!Number.isFinite(v)
?"No data"
:Number(v).toLocaleString(undefined,{maximumFractionDigits:2});
}

function initMap(){
if(!window.L){
status.textContent="Map library unavailable";
return;
}

map=L.map(mapEl,{
worldCopyJump:true,
minZoom:1,
maxZoom:6
}).setView([20,5],2);

L.tileLayer(
"https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
{
attribution:'&copy; OpenStreetMap &copy; CARTO',
subdomains:"abcd",
maxZoom:19
}
).addTo(map);
}

function codeOf(f){
let p=f.properties||{};
let candidates=[
p.ISO_A3,p.ISO_A3_EH,p.ADM0_A3,
p.iso_a3,p.ISO3,p.SOV_A3,p.ADM_A3,f.id
];

for(let c of candidates){
if(c&&String(c).length===3&&String(c)!=="-99"){
return String(c).toUpperCase();
}
}
return null;
}

function nameOf(f){
let p=f.properties||{};
return p.ADMIN||p.name||p.NAME||p.NAME_EN||p.SOVEREIGNT||"Unknown";
}

function normCode(code){
const mapCodes={
"KOS":"XKX",
"-99":null,
"ROM":"ROU",
"ZAR":"COD",
"SDS":"SSD",
"TMP":"TLS",
"PSX":"PSE",
"CYN":"CYP",
"GRL":"GRL"
};
return mapCodes[code]??code;
}

function fetchWB(ind,year){
const url=
`https://api.worldbank.org/v2/country/all/indicator/${ind}?date=${year}&format=json&per_page=2000`;

return fetch(url)
.then(r=>{
if(!r.ok)throw Error("World Bank request failed");
return r.json();
})
.then(j=>{
if(!j||!j[1])return [];
return j[1]
.filter(x=>x.countryiso3code&&x.value!==null)
.map(x=>({
code:normCode(x.countryiso3code),
country:x.country.value,
value:Number(x.value),
year:x.date
}));
});
}

function fetchGeo(){
if(geoData)return Promise.resolve(geoData);

return fetch(
"https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
)
.then(r=>{
if(!r.ok)throw Error("Map boundaries unavailable");
return r.json();
})
.then(d=>geoData=d);
}

function popup(f,lookup){
let code=normCode(codeOf(f));
let v=lookup.get(code);
let country=nameOf(f);

return `<strong>${country}</strong><br>
${indicators[selectedIndicator].title}<br>
<strong>${v?format(v.value)+" "+indicators[selectedIndicator].unit:"No data"}</strong><br>
Year: ${selectedYear}`;
}

function renderLegend(){
const ranges=indicators[selectedIndicator].ranges;
const leg=document.getElementById("legend");
leg.innerHTML="";
const p=palette();

let bounds=ranges.slice(0,-1).map((n,i)=>({
color:p[i],
label:`${n}–${ranges[i+1]}`
}));

bounds.push({
color:p[6],
label:`${ranges[ranges.length-1]}+`
});

bounds.forEach(b=>{
let el=document.createElement("div");
el.className="legend-item";
el.innerHTML=`<span class="legend-swatch" style="background:${b.color}"></span>${b.label}`;
leg.append(el);
});

let missing=document.createElement("div");
missing.className="legend-item";
missing.innerHTML='<span class="legend-swatch" style="background:#d9dee4"></span>Missing';
leg.append(missing);
}

function updateStats(data){
let sorted=[...data].sort((a,b)=>a.value-b.value);
let count=data.length;
let mean=count?data.reduce((s,x)=>s+x.value,0)/count:null;
let hi=sorted.at(-1);

document.getElementById("dataCount").textContent=count;

document.getElementById("globalMean").textContent=
mean===null?"—":format(mean)+" "+indicators[selectedIndicator].unit;

document.getElementById("highest").textContent=
hi?format(hi.value)+" "+indicators[selectedIndicator].unit:"—";

document.getElementById("highestCountry").textContent=
hi?hi.country:"—";

document.getElementById("meanUnit").textContent=
"Mean of available countries";
}

function updateTable(data){
records=data.sort((a,b)=>a.country.localeCompare(b.country));

const search=document.getElementById("countrySearch").value.toLowerCase();
const tbody=document.getElementById("dataTable");
tbody.innerHTML="";

records
.filter(x=>x.country.toLowerCase().includes(search))
.forEach(x=>{
let tr=document.createElement("tr");
tr.innerHTML=`<td>${x.country}</td><td>${format(x.value)} ${indicators[selectedIndicator].unit}</td><td>${x.year}</td>`;
tbody.append(tr);
});
}

function updateChart(data){
if(!window.Chart)return;

let top=[...data].sort((a,b)=>b.value-a.value).slice(0,15);
const ctx=document.getElementById("comparisonChart");

if(chart)chart.destroy();

chart=new Chart(ctx,{
type:"bar",
data:{
labels:top.map(x=>x.country),
datasets:[{
label:indicators[selectedIndicator].title,
data:top.map(x=>x.value),
backgroundColor:"#477ea9",
borderColor:"#183e64",
borderWidth:1,
borderRadius:3
}]
},
options:{
responsive:true,
indexAxis:"y",
plugins:{
legend:{display:false},
tooltip:{
callbacks:{
label:c=>`${format(c.raw)} ${indicators[selectedIndicator].unit}`
}
}
},
scales:{
x:{beginAtZero:true,grid:{color:"#e9edf2"}},
y:{grid:{display:false}}
}
}
});
}

async function load(){
selectedIndicator=document.getElementById("indicatorSelect").value;
selectedYear=Number(years.value);

status.textContent="Loading data…";

document.getElementById("mapTitle").textContent=
indicators[selectedIndicator].title;

document.getElementById("mapSubtitle").textContent=
indicators[selectedIndicator].subtitle;

try{
let [data,geo]=await Promise.all([
fetchWB(selectedIndicator,selectedYear),
fetchGeo()
]);

records=data;

let lookup=new Map(data.map(x=>[x.code,x]));

if(geoLayer)map.removeLayer(geoLayer);

geoLayer=L.geoJSON(geo,{
style:f=>{
let r=lookup.get(normCode(codeOf(f)));
return{
fillColor:colorFor(r?.value??null),
color:"#fff",
weight:.65,
opacity:.8,
fillOpacity:.82
};
},
onEachFeature:(f,l)=>{
l.bindPopup(popup(f,lookup));

l.on({
mouseover:e=>e.target.setStyle({
weight:2,
color:"#263b51",
fillOpacity:.95
}),
mouseout:e=>geoLayer.resetStyle(e.target)
});
}
}).addTo(map);

renderLegend();
updateStats(data);
updateTable(data);
updateChart(data);

status.textContent=`${data.length} countries · ${selectedYear}`;

setTimeout(()=>map.invalidateSize(),80);

}catch(e){
status.textContent="Unable to load data";

mapEl.innerHTML=
`<div style="padding:35px;color:#40566d">
The map data could not be loaded. Check your internet connection,
then select <strong>Update map</strong> to retry.<br>
<small>${e.message}</small></div>`;

console.error(e);
}
}

document.getElementById("refreshMap").addEventListener("click",load);
document.getElementById("indicatorSelect").addEventListener("change",load);
years.addEventListener("change",load);
document.getElementById("countrySearch").addEventListener("input",()=>updateTable(records));

initMap();
load();

})();
