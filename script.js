
/* Wikimedia Commons image search */
async function commonsPhoto(query, img){
  const api="https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch="+encodeURIComponent("filetype:bitmap "+query)+"&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=900&format=json&origin=*";
  try{
    const r=await fetch(api);
    if(!r.ok)throw new Error("API");
    const data=await r.json();
    const pages=Object.values(data.query?.pages||{});
    const candidates=pages.filter(p=>p.imageinfo?.[0]?.thumburl);
    if(!candidates.length)throw new Error("No images");
    const chosen=candidates[Math.floor(Math.random()*Math.min(candidates.length,4))];
    img.src=chosen.imageinfo[0].thumburl;
    img.loading="lazy";
    img.addEventListener("error",()=>fallback(img),{once:true});
    const credit=chosen.imageinfo[0].extmetadata?.Artist?.value||"Wikimedia Commons";
    img.dataset.credit=credit.replace(/<[^>]*>/g,"");
    img.dataset.file=chosen.title;
  }catch(e){fallback(img)}
}
function fallback(img){
  const div=document.createElement("div");
  div.className="photo-fallback";
  div.textContent="Image unavailable · "+(img.alt||"photo");
  img.replaceWith(div);
}
document.querySelectorAll(".dynamic-photo").forEach(img=>{
  img.classList.add("image-loading");
  commonsPhoto(img.dataset.search,img);
});

/* Charts */
Chart.defaults.font.family="DM Sans, sans-serif";
Chart.defaults.color="#647783";
const blue="#567D98",gold="#B69A65",coral="#BC7355",green="#526C5D";

function makeChart(id,type,labels,data,label,opts={}){
  const canvas=document.getElementById(id);
  if(!canvas)return;
  new Chart(canvas,{
    type,
    data:{
      labels,
      datasets:[{
        label,
        data,
        backgroundColor:opts.colors||blue,
        borderColor:opts.border||blue,
        borderWidth:opts.borderWidth||1,
        borderRadius:opts.radius||4,
        tension:.35,
        fill:opts.fill||false
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{display:opts.legend||false}},
      scales:opts.scales||{y:{beginAtZero:true},x:{grid:{display:false}}}
    }
  });
}

makeChart("careChart","bar",["Women","Men"],[2.5,1],"Average ratio",{colors:[blue,gold]});

makeChart("parliamentChart","line",["2015","2020","2024","2025"],[22.1,25.5,26.9,27.2],"Women seats (%)",{border:blue,colors:blue,fill:true});

makeChart("indiaChart","bar",["1991","1996","1999","2004","2009","2014","2019","2024"],[39,40,49,45,59,62,78,74],"Women MPs",{colors:gold});

makeChart("laborChart","line",["2000","2005","2010","2015","2020","2025"],[33.6,34,29.2,27.5,27.6,33],"South Asia (%)",{border:green,colors:green,fill:true});

/* Interactive map */
const mapEl=document.getElementById("genderMap");

if(mapEl && window.L){
  const map=L.map(mapEl,{scrollWheelZoom:false}).setView([18,25],2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:18,
    attribution:"&copy; OpenStreetMap contributors"
  }).addTo(map);

  const examples=[
    {name:"South Asia",coords:[22,80],text:"Example topics: access to education, unpaid care work, work participation, representation and local differences. Explore the World Bank and UN regional data."},
    {name:"Sub-Saharan Africa",coords:[-2,24],text:"Example topics: education access, rural infrastructure, economic participation and local initiatives. Conditions differ greatly across countries."},
    {name:"Middle East & North Africa",coords:[27,35],text:"Example topics: legal rights, labour access, participation and regional variation. Avoid treating the region as uniform."},
    {name:"Europe",coords:[51,15],text:"Example topics: pay gaps, care responsibilities, representation and workplace policy. Inequality can persist even where formal protections exist."},
    {name:"Latin America",coords:[-15,-60],text:"Example topics: political participation, care work, economic access and efforts to address gender-based violence."},
    {name:"East Asia & Pacific",coords:[12,120],text:"Example topics: labour participation, care responsibilities, leadership and education. Regional comparisons need country-level context."}
  ];

  examples.forEach(x=>{
    const m=L.marker(x.coords).addTo(map).bindPopup("<b>"+x.name+"</b><br>"+x.text);
    m.on("click",()=>{
      const note=document.getElementById("mapNote");
      if(note)note.textContent=x.text;
    });
  });
}

/* Navigation highlighting */
const navs=document.querySelectorAll(".nav nav a");
const sections=document.querySelectorAll("main section[id]");

if("IntersectionObserver" in window){
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        navs.forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+e.target.id));
      }
    });
  },{rootMargin:"-25% 0px -65% 0px"});
  sections.forEach(s=>obs.observe(s));
}
