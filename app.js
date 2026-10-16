/* ====== CONFIGURACIÓN ====== */
// Google Sheets > Archivo > Compartir > Publicar en la web > hoja de inventario > CSV > copiar enlace
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTVtjb1UiiDrZ65ulxoDgvfZkUuwrvqd31Odvm4I_pbovEyutJLgK1Goo1xASgpD9Yq8U0fpFS3sJ8R/pub?output=csv";
// Número con código de país, sin + ni espacios (Colombia = 57)
const WHATSAPP = "573176670197";

/* ====== TABLAS DE TALLAS ======
   Dama y caballero: tabla real. T_NINOS: valores aproximados, reemplazar.
   Cada fila: { CO, EU, USA, CM } */
const T_DAMA = [
  {CO:35,EU:35,USA:5,CM:22},
  {CO:35.5,EU:35.5,USA:5.5,CM:22.5},
  {CO:36,EU:36,USA:6,CM:23},
  {CO:36.5,EU:36.5,USA:6.5,CM:23.5},
  {CO:37,EU:37,USA:7,CM:24},
  {CO:37.5,EU:37.5,USA:7.5,CM:24.5},
  {CO:38,EU:38,USA:8,CM:25},
  {CO:38.5,EU:38.5,USA:8.5,CM:25.5},
  {CO:39,EU:39,USA:9,CM:26},
  {CO:39.5,EU:39.5,USA:9.5,CM:26.5},
  {CO:40,EU:40,USA:10,CM:27},
  {CO:40.5,EU:40.5,USA:10.5,CM:27.5},
  {CO:41,EU:41,USA:11,CM:28}
];
const T_CABALLERO = [
  {CO:37,EU:38.5,USA:6,CM:24},
  {CO:37.5,EU:39,USA:6.5,CM:24.5},
  {CO:38,EU:40,USA:7,CM:25},
  {CO:38.5,EU:40.5,USA:7.5,CM:25.5},
  {CO:39,EU:41,USA:8,CM:26},
  {CO:39.5,EU:42,USA:8.5,CM:26.5},
  {CO:40,EU:42.5,USA:9,CM:27},
  {CO:40.5,EU:43,USA:9.5,CM:27.5},
  {CO:41,EU:44,USA:10,CM:28},
  {CO:41.5,EU:44.5,USA:10.5,CM:28.5},
  {CO:42,EU:45,USA:11,CM:29},
  {CO:42.5,EU:45.5,USA:11.5,CM:29.5},
  {CO:43,EU:46,USA:12,CM:30},
  {CO:43.5,EU:47,USA:12.5,CM:30.5},
  {CO:44,EU:47.5,USA:13,CM:31},
  {CO:44.5,EU:48,USA:13.5,CM:31.5},
  {CO:45,EU:48.5,USA:14,CM:32}
];
const T_NINOS = [
  {CO:28,EU:28,USA:11,CM:17.5},{CO:29,EU:29,USA:12,CM:18},{CO:30,EU:30,USA:13,CM:18.5},
  {CO:31,EU:31,USA:13.5,CM:19.5},{CO:32,EU:32,USA:1,CM:20},{CO:33,EU:33,USA:2,CM:21},{CO:34,EU:34,USA:3,CM:21.5}
];
const TABLAS = {dama:T_DAMA, caballero:T_CABALLERO, niño:T_NINOS, niña:T_NINOS};

/* ====== UTILIDADES ====== */
const $ = id => document.getElementById(id);
const norm = s => (s||"").toString().trim().toLowerCase();
const precioFmt = n => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n);

// Convierte enlaces de Drive a imagen directa; el resto se deja igual
function imgUrl(u){
  u = (u||"").trim();
  const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([\w-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w1000` : u;
}

// CSV parser que respeta comillas
function parseCSV(t){
  const rows=[]; let r=[],c="",q=false;
  for(let i=0;i<t.length;i++){
    const ch=t[i];
    if(q){ if(ch=='"'&&t[i+1]=='"'){c+='"';i++} else if(ch=='"') q=false; else c+=ch; }
    else if(ch=='"') q=true;
    else if(ch==","){r.push(c);c=""}
    else if(ch=="\n"||ch=="\r"){ if(ch=="\r"&&t[i+1]=="\n")i++; r.push(c);c=""; rows.push(r);r=[]; }
    else c+=ch;
  }
  if(c||r.length){r.push(c);rows.push(r)}
  return rows;
}

/* ====== DATOS ====== */
let productos=[], filtro="todos";

async function cargar(){
  try{
    const res = await fetch(CSV_URL+(CSV_URL.includes("?")?"&":"?")+"t="+Date.now());
    if(!res.ok) throw new Error(res.status);
    const rows = parseCSV(await res.text());
    const head = rows.shift().map(norm);
    const ix = k => head.indexOf(k);
    productos = rows.map(r=>({
      id:r[ix("id")], nombre:r[ix("nombre")]?.trim(),
      imgs:(r[ix("imagen_url")]||"").split(/[\s,|;]+/).filter(u=>/^https?:/.test(u)).map(imgUrl),
      precio:parseFloat((r[ix("precio")]||"").replace(/[^\d.]/g,"")),
      genero:norm(r[ix("genero")]),
      disp:norm(r[ix("disponible")])
    })).filter(p=>p.nombre && ["si","sí"].includes(p.disp));
    productos.forEach(p=>p.img=p.imgs[0]||"");
    $("estado").hidden = true;
    pintar();
  }catch(e){
    $("estado").textContent="No pudimos cargar el inventario. Intenta de nuevo en unos minutos.";
    console.error(e);
  }
}

function pintar(){
  const lista = productos.filter(p=>filtro=="todos"||p.genero==filtro);
  const g=$("grid"); g.innerHTML="";
  if(!lista.length){ $("estado").hidden=false; $("estado").textContent="No hay calzado disponible en esta categoría."; return; }
  $("estado").hidden=true;
  lista.forEach(p=>{
    const b=document.createElement("button"); b.className="card";
    b.innerHTML=`<div class="img"><img loading="lazy" referrerpolicy="no-referrer" alt=""></div><h3></h3><span class="p"></span>`;
    b.querySelector("img").src=p.img; b.querySelector("img").alt=p.nombre;
    b.querySelector("h3").textContent=p.nombre;
    b.querySelector(".p").textContent=isNaN(p.precio)?"":precioFmt(p.precio);
    b.onclick=()=>abrir(p);
    g.appendChild(b);
  });
}

$("filtros").onclick=e=>{
  const b=e.target.closest("button"); if(!b) return;
  filtro=b.dataset.g;
  document.querySelectorAll("#filtros button").forEach(x=>x.classList.toggle("on",x===b));
  pintar();
};

/* ====== OVERLAY ====== */
let actual=null, tallaSel=null, ultimoFoco=null, fotoIdx=0, abierto=false;

function abrir(p){
  actual=p; tallaSel=null; ultimoFoco=document.activeElement;
  $("o-img").referrerPolicy="no-referrer"; fotoIdx=0; pintarFoto();
  $("o-nombre").textContent=p.nombre;
  $("o-precio").textContent=isNaN(p.precio)?"":precioFmt(p.precio);
  $("equiv").hidden=true;
  pintarTallas();
  actualizarPedir();
  $("overlay").hidden=false; abierto=true;
  document.body.style.overflow="hidden";
  history.pushState({o:1},"");          // el botón "atrás" del celular también cierra el overlay
  $("cerrar").focus();
}
function ocultar(){
  if(!abierto) return;
  abierto=false; $("overlay").hidden=true; document.body.style.overflow="";
  ultimoFoco&&ultimoFoco.focus();
}
function cerrar(){ if(history.state&&history.state.o) history.back(); else ocultar(); }
window.addEventListener("popstate",ocultar);

/* ---- Galería y zoom ---- */
function pintarFoto(){
  const imgs=actual.imgs, multi=imgs.length>1;
  $("visor").classList.remove("z"); $("hint").textContent="Toca la foto para ampliar"; $("o-img").style.transformOrigin="50% 50%";
  $("o-img").src=imgs[fotoIdx]||""; $("o-img").alt=actual.nombre+(multi?` (foto ${fotoIdx+1} de ${imgs.length})`:"");
  $("prev").hidden=$("next").hidden=!multi;
  const t=$("thumbs"); t.hidden=!multi; t.innerHTML="";
  if(multi) imgs.forEach((u,i)=>{
    const b=document.createElement("button"); b.setAttribute("aria-label","Ver foto "+(i+1));
    b.classList.toggle("on",i===fotoIdx);
    b.innerHTML='<img referrerpolicy="no-referrer" alt="">'; b.firstChild.src=u;
    b.onclick=()=>{fotoIdx=i;pintarFoto()}; t.appendChild(b);
  });
}
function mover(d){ const n=actual.imgs.length; fotoIdx=(fotoIdx+d+n)%n; pintarFoto(); }
$("prev").onclick=()=>mover(-1); $("next").onclick=()=>mover(1);
$("visor").onclick=e=>{
  const v=$("visor"), z=!v.classList.contains("z");
  v.classList.toggle("z",z); $("hint").textContent=z?"Mueve el dedo o el mouse para recorrer la foto":"Toca la foto para ampliar";
  if(z) origen(e);
};
function origen(e){
  const r=$("visor").getBoundingClientRect();
  $("o-img").style.transformOrigin=((e.clientX-r.left)/r.width*100)+"% "+((e.clientY-r.top)/r.height*100)+"%";
}
$("visor").addEventListener("pointermove",e=>{ if($("visor").classList.contains("z")) origen(e); });
function pintarTallas(){
  const sis=$("sistema").value, tabla=TABLAS[actual.genero]||T_NINOS, c=$("tallas");
  c.innerHTML="";
  tabla.forEach((fila,i)=>{
    const b=document.createElement("button");
    b.textContent=fila[sis]; b.setAttribute("aria-pressed",i===tallaSel);
    b.classList.toggle("on",i===tallaSel);
    b.onclick=()=>{tallaSel=i;pintarTallas();mostrarEquiv();actualizarPedir()};
    c.appendChild(b);
  });
}
function mostrarEquiv(){
  const fila=(TABLAS[actual.genero]||T_NINOS)[tallaSel];
  ["CO","EU","USA","CM"].forEach(k=>$("e-"+k).textContent=fila[k]);
  $("equiv").hidden=false;
}
function actualizarPedir(){
  const a=$("pedir");
  if(tallaSel===null){ a.setAttribute("aria-disabled","true"); a.textContent="Elige una talla para pedir"; a.removeAttribute("href"); return; }
  const f=(TABLAS[actual.genero]||T_NINOS)[tallaSel];
  const msg=`Hola, quiero pedir: ${actual.nombre} (ref. ${actual.id}), talla CO ${f.CO} / EU ${f.EU} / USA ${f.USA} / ${f.CM} cm.`;
  a.href=`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  a.setAttribute("aria-disabled","false"); a.textContent="Pedir por WhatsApp";
}

$("sistema").onchange=()=>{pintarTallas()};
$("cerrar").onclick=cerrar;
$("overlay").onclick=e=>{if(e.target===$("overlay"))cerrar()};
document.addEventListener("keydown",e=>{
  if($("overlay").hidden) return;
  if(e.key==="Escape") cerrar();
  if(actual.imgs.length>1){ if(e.key==="ArrowLeft") mover(-1); if(e.key==="ArrowRight") mover(1); }
});

cargar();
