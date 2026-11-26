
(() => {
const nav=document.querySelector('#nav');

// Navigation: switch sections and remove numbered labels.
document.querySelectorAll('#nav a').forEach(a=>{
a.addEventListener('click',e=>{
const id=a.getAttribute('href')?.slice(1);
const target=document.getElementById(id);
if(target){
e.preventDefault();
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
target.classList.add('active');
document.querySelectorAll('#nav a').forEach(x=>x.classList.toggle('active',x===a));
nav?.classList.remove('open');
window.scrollTo({top:0,behavior:'smooth'});
setTimeout(()=>resizeCharts(),250);
if(id==='indicator')initMap();
}
});
});

document.querySelectorAll('[href^="#"]:not(#nav a)').forEach(a=>{
a.addEventListener('click',e=>{
const id=a.getAttribute('href').slice(1);
const target=document.getElementById(id);
if(target?.classList.contains('page')){
e.preventDefault();
document.querySelector(`#nav a[href="#${id}"]`)?.click();
}
});
});

const menu=document.querySelector('#menu');
menu?.addEventListener('click',()=>nav?.classList.toggle('open'));

// Image fallbacks.
document.querySelectorAll('img').forEach(img=>{
img.addEventListener('error',()=>{
img.dataset.failed='true';
img.alt=img.alt+' (image unavailable; see caption/source)';
img.style.minHeight='150px';
img.style.background='linear-gradient(135deg,#dbeaf4,#91bdd8)';
img.style.objectFit='contain';
},{once:true});
});

// Indicator definitions.
const indicatorMeta={
'SG.GEN.PARL.ZS':{
title:'Women in Parliament (%)',
desc:'Percentage of seats in national parliaments held by women. This indicator measures representation, but not necessarily power, influence or the quality of participation.',
importance:'Representation is one dimension of participation in political decision-making; it should be considered alongside rights, institutions and lived experiences.'
},
'SP.ADO.TFRT':{
title:'Adolescent fertility rate',
desc:'Births per 1,000 women ages 15–19. The indicator reflects a range of social, health, educational and economic conditions.',
importance:'Rates can be associated with access to health services, education, social conditions and opportunities. Association is not proof of a single cause.'
},
'SH.STA.MMRT':{
title:'Maternal mortality ratio',
desc:'Maternal deaths per 100,000 live births. Estimates reflect health risks and access to quality services.',
importance:'It can help examine health-system access and disparities, but data estimates, definitions and context matter.'
}
};

const countries=['India','Nepal','Bangladesh','Pakistan','United States','Rwanda','Sweden','Japan'];
const codes=['IND','NPL','BGD','PAK','USA','RWA','SWE','JPN'];
let selected='SG.GEN.PARL.ZS',map,layer,initialized=false;
const chartRefs={};

function chart(id,type,labels,datasets,options={}){
const el=document.getElementById(id);
if(!el||!window.Chart)return;
if(chartRefs[id])chartRefs[id].destroy();
chartRefs[id]=new Chart(el,{
type,
data:{labels,datasets},
options:{
responsive:true,
maintainAspectRatio:false,
plugins:{
legend:{display:datasets.length>1},
tooltip:{enabled:true}
},
scales:{
y:{
beginAtZero:options.zero!==false,
title:{display:!!options.unit,text:options.unit||''}
},
x:{ticks:{maxTicksLimit:8}}
},
...options.extra
}
});
}

async function api(code,ind){
const u=`https://api.worldbank.org/v2/country/${code}/indicator/${ind}?format=json&per_page=100`;
const r=await fetch(u);
if(!r.ok)throw Error('API unavailable');
const j=await r.json();
return(j[1]||[])
.filter(x=>x.value!==null)
.map(x=>({year:+x.date,value:+x.value}))
.sort((a,b)=>a.year-b.year);
}

function latest(d){
return d?.length?d[d.length-1]:null;
}

async function trend(){
try{
let data=await api('WLD','SG.GEN.PARL.ZS');
chart('trendChart','line',data.map(x=>x.year),[
{label:'World (%)',data:data.map(x=>x.value),borderColor:'#2879b4',backgroundColor:'#2879b4',tension:.25}
]);
}catch(e){}
}

async function comparison(ind){
try{
let series=await Promise.all(codes.map(c=>api(c,ind)));
const values=series.map(x=>latest(x)?.value??null);

chart('globalCountryChart','bar',countries,[
{label:indicatorMeta[ind].title,data:values,backgroundColor:'#78b9dc'}
],{unit:indicatorMeta[ind].title});

chart('fertilityChart','bar',countries,[
{label:indicatorMeta[ind].title,data:values,backgroundColor:'#78b9dc'}
],{unit:indicatorMeta[ind].title});
}catch(e){}
}

async function india(ind='SG.GEN.PARL.ZS'){
try{
let list=await Promise.all(codes.map(c=>api(c,ind)));
chart('indiaChart','bar',countries,[
{label:'Women in parliament (%)',data:list.map(d=>latest(d)?.value??null),backgroundColor:'#78b9dc'}
]);
}catch(e){}
}

async function loadIndicator(){
const m=indicatorMeta[selected];
const desc=document.getElementById('indicatorDescription');
const importance=document.getElementById('indicatorImportance');
if(desc)desc.textContent=m.desc;
if(importance)importance.textContent=m.importance;
await comparison(selected);
if(initialized)loadMap();
}

async function loadMap(){
if(!map)return;
try{
const r=await fetch(`https://api.worldbank.org/v2/country/all/indicator/${selected}?format=json&per_page=20000`);
const j=await r.json();
let vals={};

(j[1]||[]).forEach(d=>{
if(d.countryiso3code&&d.value!=null&&
(!vals[d.countryiso3code]||+d.date>vals[d.countryiso3code].year)){
vals[d.countryiso3code]={value:+d.value,year:+d.date};
}
});

const g=await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson').then(r=>r.json());

if(layer)map.removeLayer(layer);

let v=Object.values(vals).map(x=>x.value);
let lo=Math.min(...v),hi=Math.max(...v);

const color=x=>x==null?'#e1eaf0':
x<lo+(hi-lo)*.25?'#d2e5f0':
x<lo+(hi-lo)*.5?'#9bc9df':
x<lo+(hi-lo)*.75?'#5798c5':'#174b78';

layer=L.geoJSON(g,{
style:f=>{
let p=f.properties;
let code=p['ISO3166-1-Alpha-3']||p.ADM0_A3||p.iso_a3;
return{fillColor:color(vals[code]?.value),color:'#fff',weight:.6,fillOpacity:.85};
},
onEachFeature:(f,l)=>{
let p=f.properties;
let code=p['ISO3166-1-Alpha-3']||p.ADM0_A3||p.iso_a3;
let entry=vals[code];
l.bindTooltip(`${p.name||p.ADMIN||code}: ${entry?entry.value.toFixed(2)+' ('+entry.year+')':'No data'}`);
}
}).addTo(map);

}catch(e){
document.getElementById('map')?.insertAdjacentHTML('beforeend','<p class="map-error">Map data could not load. Check your connection.</p>');
}
}

function initMap(){
if(initialized)return;
initialized=true;
if(!window.L){
const m=document.getElementById('map');
if(m)m.innerHTML='<p>Map library could not load. Check your connection.</p>';
return;
}
map=L.map('map').setView([20,0],2);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',{
attribution:'© OpenStreetMap © CARTO'
}).addTo(map);
loadMap();
setTimeout(()=>map.invalidateSize(),300);
}

document.getElementById('indicatorSelect')?.addEventListener('change',e=>{
selected=e.target.value;
loadIndicator();
});

// YouTube video validation.
document.getElementById('loadVideo')?.addEventListener('click',()=>{
let input=document.getElementById('videoUrl')?.value.trim();
let box=document.getElementById('videoFrame');
if(!box)return;
if(!input){box.textContent='Enter a video URL first.';return;}

try{
let u=new URL(input),id='';
if(u.hostname==='youtu.be')id=u.pathname.slice(1);
else if(u.hostname.includes('youtube.com'))id=u.searchParams.get('v')||u.pathname.split('/').pop();
else if(u.hostname.includes('youtube-nocookie.com'))id=u.pathname.split('/').pop();

if(!id||!/^[\w-]{6,}$/.test(id)){
box.textContent='Please use a valid YouTube video URL.';
return;
}
box.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Presentation video" allowfullscreen></iframe>`;
}catch(e){
box.textContent='That URL is not valid.';
}
});

function resizeCharts(){
Object.values(chartRefs).forEach(c=>c.resize());
}
window.addEventListener('resize',resizeCharts);

trend();
comparison(selected);
india();

})();
