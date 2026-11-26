
(() => {
const nav=document.querySelector('#nav');
const pages=[...document.querySelectorAll('.page')];
const links=[...document.querySelectorAll('.navlink')];

function showPage(id){
pages.forEach(p=>p.classList.toggle('active',p.id===id));
links.forEach(b=>b.classList.toggle('active',b.dataset.page===id));
nav.classList.remove('open');
window.scrollTo({top:0,behavior:'smooth'});
if(id==='indicator'&&!mapStarted)initMap();
if(id==='trends')drawAllCharts();
}

links.forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.goto)));
document.querySelector('#menuToggle').addEventListener('click',()=>nav.classList.toggle('open'));
document.querySelector('#topBtn').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

const indicators={
'SG.GEN.PARL.ZS':{
name:'Women in Parliament',
unit:'Percent of seats (%)',
why:'Shows the share of parliamentary seats held by women. It measures representation, not the full extent of influence or equality.',
variable:'Share of seats held by women in national parliament.',
countries:['IND','NPL','BGD','PAK','USA','RWA','SWE','JPN']
},
'SP.ADO.TFRT':{
name:'Adolescent fertility rate',
unit:'Births per 1,000 women ages 15–19',
why:'Provides information about adolescent childbearing, which relates to education, health, services and social conditions.',
variable:'Annual births per 1,000 women aged 15–19.',
countries:['IND','NPL','BGD','PAK','USA','RWA','SWE','JPN']
},
'SH.STA.MMRT':{
name:'Maternal mortality ratio',
unit:'Deaths per 100,000 live births',
why:'Reflects maternal health risks and access to quality care, but estimates and health-system context must be considered.',
variable:'Maternal deaths per 100,000 live births.',
countries:['IND','NPL','BGD','PAK','USA','RWA','SWE','JPN']
}
};

const countryNames={
IND:'India',NPL:'Nepal',BGD:'Bangladesh',PAK:'Pakistan',
USA:'United States',RWA:'Rwanda',SWE:'Sweden',JPN:'Japan'
};

let currentIndicator='SG.GEN.PARL.ZS';
let mapStarted=false;
let mapObj=null;
let geoLayer=null;
let latestValues={};

async function wb(code,indicator){
const url=`https://api.worldbank.org/v2/country/${code}/indicator/${indicator}?format=json&per_page=100`;
const res=await fetch(url);
if(!res.ok)throw Error('Data request failed');
const data=await res.json();
return (data[1]||[])
.filter(x=>x.value!=null)
.sort((a,b)=>+a.date-+b.date)
.map(x=>({year:+x.date,value:+x.value}));
}

async function getCountries(indicator){
let all={};
await Promise.all(indicators[indicator].countries.map(async c=>{
try{all[c]=await wb(c,indicator)}catch(e){all[c]=[]}
}));
return all;
}

function drawCanvas(id,series,labels=[],opts={}){
const canvas=document.getElementById(id);
if(!canvas)return;
const ctx=canvas.getContext('2d');
const rect=canvas.getBoundingClientRect();
if(rect.width<5)return;
const dpr=window.devicePixelRatio||1;
canvas.width=rect.width*dpr;
canvas.height=(opts.height||240)*dpr;
canvas.style.height=(opts.height||240)+'px';
ctx.scale(dpr,dpr);

const w=rect.width,h=opts.height||240;
const p={l:45,r:15,t:18,b:32};
const cw=w-p.l-p.r,ch=h-p.t-p.b;
ctx.clearRect(0,0,w,h);
ctx.font='11px DM Sans, sans-serif';
ctx.fillStyle='#64778a';
ctx.strokeStyle='#dce5ec';
ctx.lineWidth=1;

let values=series.flatMap(s=>s.data.map(d=>d.value)).filter(v=>Number.isFinite(v));
if(!values.length){
ctx.fillText('No data available',p.l,h/2);
return;
}

let min=opts.zero?0:Math.min(...values);
let max=Math.max(...values);
if(max===min)max+=1;
let pad=(max-min)*.12;
min=opts.zero?0:min-pad;
max+=pad;

for(let i=0;i<5;i++){
let val=min+(max-min)*i/4;
let y=p.t+ch-(val-min)/(max-min)*ch;
ctx.beginPath();
ctx.moveTo(p.l,y);
ctx.lineTo(w-p.r,y);
ctx.stroke();
ctx.fillText(val.toFixed(opts.decimals??0),4,y+4);
}

const years=labels.length?labels:series.flatMap(s=>s.data.map(d=>d.year));
const yearMin=Math.min(...years);
const yearMax=Math.max(...years);

if(yearMin===yearMax){
ctx.fillText(yearMin,p.l,h-7);
}

series.forEach((s,idx)=>{
ctx.strokeStyle=s.color||['#2671a8','#0c2c50','#79b9df','#548cbb'][idx%4];
ctx.lineWidth=2.4;
ctx.beginPath();
let started=false;

s.data.forEach(d=>{
if(!Number.isFinite(d.value))return;
let x=p.l+(d.year-yearMin)/(yearMax-yearMin||1)*cw;
let y=p.t+ch-(d.value-min)/(max-min)*ch;
if(!started){ctx.moveTo(x,y);started=true}else ctx.lineTo(x,y);
});
if(started)ctx.stroke();

s.data.forEach(d=>{
let x=p.l+(d.year-yearMin)/(yearMax-yearMin||1)*cw;
let y=p.t+ch-(d.value-min)/(max-min)*ch;
ctx.fillStyle=s.color||'#2671a8';
ctx.beginPath();
ctx.arc(x,y,2.5,0,Math.PI*2);
ctx.fill();
});
});

ctx.fillStyle='#64778a';
let yearTicks=[yearMin,Math.round((yearMin+yearMax)/2),yearMax];
yearTicks.forEach(y=>{
ctx.fillText(String(y),p.l+(y-yearMin)/(yearMax-yearMin||1)*cw-10,h-8);
});

if(opts.legend){
let lx=p.l;
series.forEach(s=>{
ctx.fillStyle=s.color||'#2671a8';
ctx.fillRect(lx,p.t-10,9,9);
ctx.fillStyle='#536a80';
ctx.fillText(s.name,lx+13,p.t-2);
lx+=ctx.measureText(s.name).width+30;
});
}
}

function latest(data){return data?.length?data[data.length-1]:null}
function seriesFor(data,name,color){return {name,data:data||[],color}}

async function loadTrends(){
try{
const g=await wb('WLD','SG.GEN.PARL.ZS');
drawCanvas('trendChart',[seriesFor(g,'World','#2671a8')],[],{decimals:1});
}catch(e){drawCanvas('trendChart',[],[],{});}

try{
const f=await wb('IND','SP.ADO.TFRT');
drawCanvas('fertilityChart',[seriesFor(f,'India','#2474a9')],[],{decimals:0});
}catch(e){drawCanvas('fertilityChart',[],[],{});}

try{
const m=await wb('IND','SH.STA.MMRT');
drawCanvas('maternalChart',[seriesFor(m,'India','#2474a9')],[],{decimals:0});
}catch(e){drawCanvas('maternalChart',[],[],{});}

try{
const vals=await getCountries('SG.GEN.PARL.ZS');
let ss=Object.keys(vals).map((c,i)=>seriesFor(vals[c],countryNames[c],['#2671a8','#0c2c50','#79b9df','#548cbb'][i]));
drawCanvas('indiaChart',ss,[],{decimals:1,legend:true});
}catch(e){drawCanvas('indiaChart',[],[],{});}
}

function drawAllCharts(){loadTrends();}
loadTrends();

function mapColor(v,min,max){
if(v==null)return'#d9e5ed';
let t=(v-min)/(max-min||1);
return t<.25?'#d0e5f1':t<.5?'#8fc4df':t<.75?'#4189b9':'#174b78';
}

async function initMap(){
if(mapStarted)return;
mapStarted=true;
if(!window.L){
document.getElementById('worldMap').innerHTML='<p style="padding:20px">The map library could not load. Please check your connection.</p>';
return;
}
mapObj=L.map('worldMap',{worldCopyJump:true}).setView([20,0],2);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',{
attribution:'© OpenStreetMap contributors © CARTO',
maxZoom:7
}).addTo(mapObj);
await loadMapData();
setTimeout(()=>mapObj.invalidateSize(),200);
}

async function loadMapData(){
const id=currentIndicator;
document.querySelector('#mapTitle').textContent=indicators[id].name;

try{
let all=await fetch(`https://api.worldbank.org/v2/country/all/indicator/${id}?format=json&per_page=20000`).then(r=>r.json());
latestValues={};

(all[1]||[]).forEach(d=>{
if(d.countryiso3code&&d.value!=null&&(!latestValues[d.countryiso3code]||+d.date>latestValues[d.countryiso3code].year)){
latestValues[d.countryiso3code]={value:+d.value,year:+d.date,name:d.country?.value};
}
});

let geo=await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson').then(r=>r.json());
if(geoLayer)mapObj.removeLayer(geoLayer);

let nums=Object.values(latestValues).map(x=>x.value);
let min=Math.min(...nums),max=Math.max(...nums);

geoLayer=L.geoJSON(geo,{
style:f=>{
let code=f.properties.ISO3166-1-Alpha-3||f.properties.ADM0_A3||f.properties.iso_a3;
let v=latestValues[code]?.value;
return{
fillColor:mapColor(v,min,max),
color:'#fff',
weight:.65,
fillOpacity:.85
};
},
onEachFeature:(f,l)=>{
let code=f.properties.ISO3166-1-Alpha-3||f.properties.ADM0_A3||f.properties.iso_a3;
let v=latestValues[code];
l.bindTooltip(`${f.properties.name||f.properties.ADMIN||code}: ${v?`${v.value.toFixed(1)} (${v.year})`:'No data'}`);
l.on('click',()=>selectCountry(code,f.properties.name||f.properties.ADMIN));
}
}).addTo(mapObj);

}catch(e){
document.getElementById('worldMap').innerHTML='<p style="padding:20px">Map data could not load. Check your internet connection.</p>';
}
}

async function selectCountry(code,name){
document.querySelector('#countryName').textContent=name||countryNames[code]||code;
const val=latestValues[code];
document.querySelector('#countryValue').textContent=val?`${val.value.toFixed(1)}${currentIndicator==='SG.GEN.PARL.ZS'?'%':''}`:'No data';
document.querySelector('#countryDescription').textContent=val?`Latest available value: ${val.year}. Source: World Bank.`:'No recent data was returned for this country.';

try{
const data=await wb(code,currentIndicator);
drawCanvas('globalCountryChart',[seriesFor(data,name,'#2671a8')],[],{height:180,decimals:1});
}catch(e){
drawCanvas('globalCountryChart',[],[],{height:180});
}
}

function changeIndicator(id){
currentIndicator=id;
let meta=indicators[id];
document.querySelector('#mapTitle').textContent=meta.name;
document.querySelector('#indicatorWhy').textContent=meta.why;
document.querySelector('#variableText').textContent=meta.variable;
document.querySelector('#unitText').textContent=meta.unit;
loadMapData();
const chosen=document.querySelector('#compareSelect').value;
selectCountry(chosen,countryNames[chosen]);
}

document.querySelector('#indicatorSelect').addEventListener('change',e=>changeIndicator(e.target.value));
document.querySelector('#compareBtn').addEventListener('click',()=>{
let c=document.querySelector('#compareSelect').value;
selectCountry(c,countryNames[c]);
});
document.querySelector('#compareSelect').addEventListener('change',e=>selectCountry(e.target.value,countryNames[e.target.value]));

document.querySelector('#loadVideo').addEventListener('click',()=>{
let url=document.querySelector('#videoUrl').value.trim();
let container=document.querySelector('#videoFrame');
if(!url){container.innerHTML='<p>Please enter an embed URL.</p>';return;}
try{
let u=new URL(url);
if(u.hostname==='www.youtube.com'&&u.pathname==='/watch')u.pathname='/embed/'+u.searchParams.get('v');
if(u.hostname==='youtu.be')u.pathname='/embed'+u.pathname;
if(!u.hostname.includes('youtube.com')&&!u.hostname.includes('youtu.be')&&!u.hostname.includes('vimeo.com')){
container.innerHTML='<p>Use a supported video embed link.</p>';
return;
}
container.innerHTML=`<iframe src="${u.href}" title="Project video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
}catch(e){
container.innerHTML='<p>That URL does not look valid.</p>';
}
});

window.addEventListener('resize',()=>{
drawAllCharts();
if(mapObj)mapObj.invalidateSize();
});
})();
