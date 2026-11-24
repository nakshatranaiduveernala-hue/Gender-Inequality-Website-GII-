
/* IMAGE FALLBACK: prevents empty broken-image boxes */
document.querySelectorAll("img").forEach(img=>{
  img.addEventListener("error",()=>{
    if(img.dataset.failed)return;
    img.dataset.failed="true";
    const placeholder=document.createElement("div");
    placeholder.className="photoFallback";
    placeholder.textContent=img.alt || "Photograph unavailable";
    img.replaceWith(placeholder);
  });
});

/* CHART STYLE */
Chart.defaults.font.family="DM Sans, sans-serif";
Chart.defaults.color="#607581";

const palette={
  blue:"#537A94",
  gold:"#B69A65",
  rust:"#BC7355",
  green:"#536D5D"
};

/* GLOBAL PARLIAMENT */
function lineChart(id,labels,data,label){
  const el=document.getElementById(id);
  if(!el)return;
  new Chart(el,{
    type:"line",
    data:{
      labels,
      datasets:[{
        label,
        data,
        borderColor:palette.blue,
        backgroundColor:"rgba(83,122,148,.15)",
        fill:true,
        tension:.35,
        pointRadius:4,
        pointBackgroundColor:palette.gold
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{display:false}
      },
      scales:{
        y:{
          beginAtZero:true,
          grid:{color:"rgba(0,0,0,.07)"}
        },
        x:{
          grid:{display:false}
        }
      }
    }
  });
}

lineChart(
  "globalChart",
  ["2015","2018","2020","2022","2025"],
  [22.1,23.4,24.9,26.1,27.2],
  "Women"
);

/* UNPAID CARE: illustrative comparison */
const care=document.getElementById("careChart");
if(care){
  new Chart(care,{
    type:"bar",
    data:{
      labels:["Women","Men"],
      datasets:[{
        data:[2.5,1],
        backgroundColor:[palette.blue,palette.gold],
        borderRadius:5
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{display:false}
      },
      scales:{
        y:{beginAtZero:true},
        x:{grid:{display:false}}
      }
    }
  });
}

/* INDIA LOK SABHA */
const india=document.getElementById("indiaChart");
if(india){
  new Chart(india,{
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
        backgroundColor:palette.gold,
        borderRadius:4
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{display:false}
      },
      scales:{
        y:{beginAtZero:true},
        x:{
          grid:{display:false},
          ticks:{maxRotation:45,minRotation:45}
        }
      }
    }
  });
}

/* TRENDS GRAPH */
lineChart(
  "trendChart",
  ["2015","2018","2020","2022","2025"],
  [22.1,23.4,24.9,26.1,27.2],
  "Women in parliament"
);

/* NAV ACTIVE STATE */
const navLinks=document.querySelectorAll(".nav nav a");
const pageSections=document.querySelectorAll("section[id]");

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
  },{
    rootMargin:"-25% 0px -60% 0px"
  });

  pageSections.forEach(section=>observer.observe(section));
}
