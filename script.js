
/* IMAGE FALLBACK */
function imageFallback(img){
  const box=document.createElement("div");
  box.className="image-placeholder";
  box.textContent=img.alt||"Image";
  img.replaceWith(box);
}

/* GLOBAL CHART SETTINGS */
Chart.defaults.font.family="DM Sans, sans-serif";
Chart.defaults.color="#627681";

/* GLOBAL REPRESENTATION */
const globalChart=document.getElementById("globalChart");
if(globalChart){
  new Chart(globalChart,{
    type:"line",
    data:{
      labels:["2015","2020","2025"],
      datasets:[{
        label:"Women (%)",
        data:[22.1,24.9,27.2],
        borderColor:"#557D98",
        backgroundColor:"rgba(85,125,152,.15)",
        fill:true,
        tension:.4,
        pointRadius:5
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        y:{beginAtZero:true,ticks:{callback:v=>v+"%"}}
      }
    }
  });
}

/* UNPAID CARE */
const careChart=document.getElementById("careChart");
if(careChart){
  new Chart(careChart,{
    type:"bar",
    data:{
      labels:["Women","Men"],
      datasets:[{
        label:"Relative comparison",
        data:[2.5,1],
        backgroundColor:["#557D98","#B69A65"],
        borderRadius:6
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true}}
    }
  });
}

/* INDIA - LOK SABHA */
const indiaChart=document.getElementById("indiaChart");
if(indiaChart){
  new Chart(indiaChart,{
    type:"bar",
    data:{
      labels:[
        "1951","1957","1962","1967","1971","1977",
        "1980","1984","1989","1991","1996","1998",
        "1999","2004","2009","2014","2019","2024"
      ],
      datasets:[{
        label:"Women elected",
        data:[
          22,27,31,29,22,19,28,44,29,
          39,40,43,49,45,59,62,78,74
        ],
        backgroundColor:"#B69A65",
        borderRadius:4
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        y:{beginAtZero:true},
        x:{ticks:{maxRotation:45,minRotation:45}}
      }
    }
  });
}

/* NAVIGATION - ACTIVE SECTION */
const navLinks=document.querySelectorAll(".topbar nav a");
const sections=document.querySelectorAll("section[id]");

if("IntersectionObserver" in window){
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        navLinks.forEach(link=>{
          link.classList.toggle(
            "active",
            link.getAttribute("href")==="#"+entry.target.id
          );
        });
      }
    });
  },{rootMargin:"-30% 0px -60% 0px"});

  sections.forEach(section=>observer.observe(section));
}
