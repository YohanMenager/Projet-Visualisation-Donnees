/* ================= OUTILS COMMUNS ================= */
const NR = "Non renseigné";
const tooltip = d3.select("#tooltip");
const showTip = (event, html) => tooltip.style("opacity", 1).html(html)
  .style("left", (event.pageX + 12) + "px").style("top", (event.pageY + 12) + "px");
const hideTip = () => tooltip.style("opacity", 0);
const f1 = d3.format(".1f");
let data = [];

// Graphique en barres horizontales : items = [{label, value}]
function hbar(sel, items, { title, w = 380, color = "#4e79a7" }) {
  const box = d3.select(sel); box.selectAll("*").remove();
  const m = { top: 28, right: 40, bottom: 8, left: 130 }, rowH = 22, h = items.length * rowH;
  const svg = box.append("svg").attr("width", w).attr("height", h + m.top + m.bottom).append("g").attr("transform", `translate(${m.left},${m.top})`);
  svg.append("text").attr("x", -m.left + 4).attr("y", -12).style("font-weight", 600).style("font-size", "12px").text(title);
  const y = d3.scaleBand(items.map(d => d.label), [0, h]).padding(0.2);
  const x = d3.scaleLinear([0, d3.max(items, d => d.value) || 1], [0, w - m.left - m.right]);
  svg.append("g").call(d3.axisLeft(y).tickSize(0)).call(g => g.select(".domain").remove());
  svg.selectAll("rect").data(items).join("rect").attr("x", 0).attr("y", d => y(d.label)).attr("height", y.bandwidth())
    .attr("width", d => x(d.value)).attr("fill", d => d.color || color).attr("opacity", d => d.faded ? 0.3 : 1);
  svg.selectAll(".val").data(items).join("text").attr("class", "val").attr("x", d => x(d.value) + 4).attr("y", d => y(d.label) + y.bandwidth() / 2 + 4).text(d => d.text ?? d.value);
}
// Barres verticales : items = [{label, value}]
function vbar(sel, items, { title, xLabel, yLabel, w = 380, h = 200, color = "#4e79a7" }) {
  const box = d3.select(sel); box.selectAll("*").remove();
  const m = { top: 28, right: 10, bottom: 40, left: 40 };
  const iw = w - m.left - m.right, ih = h - m.top - m.bottom;
  const svg = box.append("svg").attr("width", w).attr("height", h).append("g").attr("transform", `translate(${m.left},${m.top})`);
  svg.append("text").attr("x", -m.left + 4).attr("y", -12).style("font-weight", 600).style("font-size", "12px").text(title);
  const x = d3.scaleBand(items.map(d => d.label), [0, iw]).padding(0.15);
  const y = d3.scaleLinear([0, d3.max(items, d => d.value) || 1], [ih, 0]).nice();
  svg.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0));
  svg.append("g").call(d3.axisLeft(y).ticks(4));
  svg.selectAll("rect").data(items).join("rect").attr("x", d => x(d.label)).attr("y", d => y(d.value))
    .attr("width", x.bandwidth()).attr("height", d => ih - y(d.value)).attr("fill", color);
  svg.append("text").attr("x", iw / 2).attr("y", ih + 34).attr("text-anchor", "middle").text(xLabel);
  svg.append("text").attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -30).attr("text-anchor", "middle").text(yLabel);
}
function axes(svg, x, y, w, h, xLabel, yLabel) {
  svg.append("g").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(7));
  svg.append("g").call(d3.axisLeft(y).ticks(6));
  svg.append("g").attr("stroke", "#e6e8ec").selectAll("line").data(y.ticks(6)).join("line").attr("x2", w).attr("y1", d => y(d)).attr("y2", d => y(d));
  svg.append("text").attr("x", w / 2).attr("y", h + 40).attr("text-anchor", "middle").text(xLabel);
  svg.append("text").attr("transform", "rotate(-90)").attr("x", -h / 2).attr("y", -42).attr("text-anchor", "middle").text(yLabel);
}

/* ================= CHARGEMENT ================= */
d3.csv("dataset_clean.csv", d => ({
  id: d.User_ID, age: +d.Age, pays: d.Pays, type: d["Type d'utilisateur"], edu: d["Niveau d'éducation"],
  outil: d["IA utilisée"], objectif: d["Objectif d'utilisation de l'IA"], heures: +d["Utilisation par jour"],
  prec: +d["Précision perçue"], sat: +d["Niveau de satisfaction"], prof: d.Profession
})).then(rows => {
  data = rows;
  const names = ["Développeurs IA", "Chercheurs", "Décideurs publics"];
  d3.select("#tabs").selectAll("button").data(names).join("button").text(d => d)
    .on("click", (e, d) => showTab(names.indexOf(d)));
  showTab(0);
  drawBubble(); drawScatter(); drawHeat();
}).catch(err => d3.select("#message").append("p").attr("class", "error")
  .text("Impossible de charger dataset_clean.csv (lance un serveur local : python -m http.server). " + err.message));

function showTab(i) {
  d3.selectAll(".view").style("display", (_, k) => k === i ? "block" : "none");
  d3.selectAll("#tabs button").classed("active", (_, k) => k === i);
}

/* ================= VUE 1 : BUBBLE CHART (développeurs IA) ================= */
let selTool = null;
function drawBubble() {
  const box = d3.select("#v0-chart"); box.selectAll("*").remove();
  // Agrégation : un point par outil
  const tools = d3.rollups(data.filter(d => d.outil !== NR),
    g => ({ n: g.length, prec: d3.mean(g, d => d.prec), sat: d3.mean(g, d => d.sat) }), d => d.outil)
    .map(([outil, v]) => ({ outil, ...v }));
  const W = 640, H = 430, m = { top: 20, right: 30, bottom: 52, left: 58 }, w = W - m.left - m.right, h = H - m.top - m.bottom;
  const x = d3.scaleLinear([d3.min(tools, d => d.prec) - 0.15, d3.max(tools, d => d.prec) + 0.15], [0, w]);
  const y = d3.scaleLinear([d3.min(tools, d => d.sat) - 0.3, d3.max(tools, d => d.sat) + 0.3], [h, 0]);
  const r = d3.scaleSqrt([0, d3.max(tools, d => d.n)], [0, 40]);
  const color = d3.scaleOrdinal(d3.schemeTableau10).domain(tools.map(d => d.outil));
  const svg = box.append("svg").attr("width", W).attr("height", H).append("g").attr("transform", `translate(${m.left},${m.top})`);
  axes(svg, x, y, w, h, "Précision perçue moyenne (1 à 5)", "Satisfaction moyenne (1 à 10)");
  tools.sort((a, b) => b.n - a.n);   // grandes bulles dessinées en premier
  const g = svg.selectAll("g.b").data(tools).join("g").attr("class", "b").style("cursor", "pointer");
  g.append("circle").attr("cx", d => x(d.prec)).attr("cy", d => y(d.sat)).attr("r", d => r(d.n))
    .attr("fill", d => color(d.outil)).attr("fill-opacity", 0.72)
    .attr("stroke", d => d.outil === selTool ? "#000" : "#fff").attr("stroke-width", d => d.outil === selTool ? 2.5 : 1);
  // Étiquettes : couche séparée, au-dessus de toutes les bulles, avec un halo blanc pour rester lisibles
  svg.selectAll("text.lab").data(tools).join("text").attr("class", "lab").style("pointer-events", "none")
    .attr("x", d => x(d.prec) + r(d.n) + 4).attr("y", d => y(d.sat) + 4)
    .style("paint-order", "stroke").style("stroke", "#fff").style("stroke-width", "3px").style("font-size", "11px").text(d => d.outil);
  g.on("mousemove", (e, d) => showTip(e, `<b>${d.outil}</b><br>${d.n} utilisateurs<br>Précision : ${f1(d.prec)} / 5<br>Satisfaction : ${f1(d.sat)} / 10`))
   .on("mouseout", hideTip)
   .on("click", (e, d) => { selTool = d.outil; drawBubble(); drawToolDetail(); });
  drawToolDetail();
}
function drawToolDetail() {
  const box = d3.select("#v0-detail"); box.selectAll("*").remove();
  if (!selTool) { box.append("p").attr("class", "hint").text("Clique sur une bulle pour voir la répartition des notes de satisfaction de cet outil."); return; }
  const rows = data.filter(d => d.outil === selTool);
  box.append("div").attr("class", "card").html(`<b>${selTool}</b><br>${rows.length} utilisateurs<br>Précision moyenne : ${f1(d3.mean(rows, d => d.prec))} / 5<br>Satisfaction moyenne : ${f1(d3.mean(rows, d => d.sat))} / 10`);
  const counts = d3.rollup(rows, g => g.length, d => Math.round(d.sat));
  const items = d3.range(3, 11).map(k => ({ label: String(k), value: counts.get(k) || 0 }));
  box.append("div").attr("id", "v0-hist");
  vbar("#v0-hist", items, { title: "Répartition des notes de satisfaction", xLabel: "Note de satisfaction", yLabel: "Utilisateurs", color: "#e15759" });
}

/* ================= VUE 2 : SCATTER PLOT (chercheurs) ================= */
const hidden = new Set(); let selUser = null;
function drawScatter() {
  const cap = d3.select("#cap").property("checked");
  const all = data.filter(d => Number.isFinite(d.heures) && Number.isFinite(d.sat) && (!cap || d.heures <= 12));
  const objs = d3.rollups(all, g => g.length, d => d.objectif).sort((a, b) => b[1] - a[1]).map(d => d[0]);
  const palette = d3.scaleOrdinal(d3.schemeTableau10).domain(objs.filter(o => o !== NR));
  const color = o => o === NR ? "#9a9a9a" : palette(o);
  const vis = all.filter(d => !hidden.has(d.objectif));

  const box = d3.select("#v1-chart"); box.selectAll("*").remove();
  const W = 560, H = 400, m = { top: 16, right: 20, bottom: 50, left: 55 }, w = W - m.left - m.right, h = H - m.top - m.bottom;
  const x = d3.scaleLinear([0, d3.max(all, d => d.heures) + 0.5], [0, w]);
  const y = d3.scaleLinear([2.5, 10.5], [h, 0]);
  const svg = box.append("svg").attr("width", W).attr("height", H).append("g").attr("transform", `translate(${m.left},${m.top})`);
  axes(svg, x, y, w, h, "Utilisation de l'IA (heures par jour)", "Niveau de satisfaction (1 à 10)");
  svg.append("defs").append("clipPath").attr("id", "clip-sc").append("rect").attr("width", w).attr("height", h);

  // Droite de régression (moindres carrés) et corrélation de Pearson sur les points visibles
  const n = vis.length, mx = d3.mean(vis, d => d.heures), my = d3.mean(vis, d => d.sat);
  const sxy = d3.sum(vis, d => (d.heures - mx) * (d.sat - my)), sxx = d3.sum(vis, d => (d.heures - mx) ** 2), syy = d3.sum(vis, d => (d.sat - my) ** 2);
  const stat = d3.select("#v1-stat");
  if (n > 2 && sxx > 0 && syy > 0) {
    const slope = sxy / sxx, icpt = my - slope * mx, rr = sxy / Math.sqrt(sxx * syy);
    const [x0, x1] = x.domain();
    svg.append("line").attr("x1", x(x0)).attr("x2", x(x1)).attr("y1", y(icpt + slope * x0)).attr("y2", y(icpt + slope * x1))
      .attr("stroke", "#333").attr("stroke-dasharray", "5 4").attr("stroke-width", 1.5).attr("clip-path", "url(#clip-sc)");
    stat.html(`<b>Corrélation de Pearson r = ${rr.toFixed(2)}</b> (n = ${n}). Droite de régression en pointillés.`);
  } else stat.text("Pas assez de points visibles pour calculer une corrélation.");

  svg.selectAll("circle").data(vis).join("circle").attr("cx", d => x(d.heures)).attr("cy", d => y(d.sat)).attr("r", 4.5)
    .attr("fill", d => color(d.objectif)).attr("fill-opacity", 0.55)
    .attr("stroke", d => d.id === selUser ? "#000" : "none").attr("stroke-width", 2).style("cursor", "pointer")
    .on("mousemove", (e, d) => showTip(e, `<b>${d.id}</b> · ${d.objectif}<br>${d.heures} h/jour · satisfaction ${d.sat}`))
    .on("mouseout", hideTip)
    .on("click", (e, d) => { selUser = d.id; drawScatter(); });

  // Légende cliquable
  const leg = d3.select("#v1-legend"); leg.selectAll("*").remove();
  leg.append("div").style("font-weight", 600).style("font-size", "12px").style("margin-bottom", "4px").text("Objectif d'utilisation");
  leg.selectAll("div.legend-item").data(objs).join("div").attr("class", d => "legend-item" + (hidden.has(d) ? " off" : ""))
    .html(d => `<i style="background:${color(d)}"></i>${d} (${all.filter(r => r.objectif === d).length})`)
    .on("click", (e, d) => { hidden.has(d) ? hidden.delete(d) : hidden.add(d); drawScatter(); });

  // Second niveau : satisfaction moyenne par objectif + fiche utilisateur
  const means = objs.map(o => ({ label: o, value: d3.mean(all.filter(d => d.objectif === o), d => d.sat), color: color(o), faded: hidden.has(o) }))
    .sort((a, b) => b.value - a.value).map(d => ({ ...d, text: f1(d.value) }));
  hbar("#v1-bars", means, { title: "Satisfaction moyenne par objectif", w: 400 });
  const det = d3.select("#v1-detail"); det.selectAll("*").remove();
  const u = data.find(d => d.id === selUser);
  det.append(u ? "div" : "p").attr("class", u ? "card" : "hint")
    .html(u ? `<b>${u.id}</b> · ${u.type}<br>Âge : ${Number.isFinite(u.age) ? u.age : NR} · Pays : ${u.pays}<br>Profession : ${u.prof}<br>Outil : ${u.outil} · Objectif : ${u.objectif}<br>${u.heures} h/jour · satisfaction ${u.sat} · précision ${u.prec}`
                : "Clique sur un point pour afficher la fiche de l'utilisateur.");
}
d3.select("#cap").on("change", drawScatter);

/* ================= VUE 3 : HEATMAP (décideurs publics) ================= */
let selCell = null;
const EDU = ["Lycée", "Études de premier cycle", "Licence", "Diplômé", "Master", "Doctorat"];
const EDU_SHORT = { "Études de premier cycle": "1er cycle" };
function drawHeat() {
  const metric = d3.select("#metric").property("value"), utype = d3.select("#utype").property("value");
  const base = data.filter(d => d.pays !== NR && d.edu !== NR);
  const rows = utype === "all" ? base : base.filter(d => d.type === utype);
  const pays = d3.rollups(base, g => g.length, d => d.pays).sort((a, b) => b[1] - a[1]).map(d => d[0]);
  const cells = [];
  for (const p of pays) for (const e of EDU) {
    const g = rows.filter(d => d.pays === p && d.edu === e);
    const h = g.length ? d3.mean(g.filter(d => Number.isFinite(d.heures)), d => d.heures) : NaN;
    cells.push({ p, e, n: g.length, h, value: metric === "n" ? g.length : h });
  }
  const finite = cells.map(c => c.value).filter(Number.isFinite);
  const color = d3.scaleSequential(d3.interpolateBlues).domain([0, d3.max(finite) || 1]);
  const m = { top: 58, right: 10, bottom: 8, left: 90 }, cw = 84, ch = 30;
  const w = EDU.length * cw, h = pays.length * ch;
  const box = d3.select("#v2-chart"); box.selectAll("*").remove();
  const svg = box.append("svg").attr("width", m.left + w + m.right).attr("height", m.top + h + m.bottom).append("g").attr("transform", `translate(${m.left},${m.top})`);
  const x = d3.scaleBand(EDU, [0, w]).padding(0.05), y = d3.scaleBand(pays, [0, h]).padding(0.05);
  svg.append("g").call(d3.axisTop(x).tickSize(0).tickFormat(e => EDU_SHORT[e] || e)).call(g => g.select(".domain").remove());
  svg.append("g").call(d3.axisLeft(y).tickSize(0)).call(g => g.select(".domain").remove());
  const label = c => !Number.isFinite(c.value) || (metric === "n" && c.n === 0) ? "" : metric === "n" ? c.n : f1(c.value);
  const g = svg.selectAll("g.c").data(cells).join("g").attr("class", "c").style("cursor", "pointer");
  g.append("rect").attr("x", c => x(c.e)).attr("y", c => y(c.p)).attr("width", x.bandwidth()).attr("height", y.bandwidth())
    .attr("fill", c => Number.isFinite(c.value) && !(metric === "n" && c.n === 0) ? color(c.value) : "#ececec")
    .attr("stroke", c => selCell && selCell.p === c.p && selCell.e === c.e ? "#000" : "none").attr("stroke-width", 2);
  g.append("text").attr("x", c => x(c.e) + x.bandwidth() / 2).attr("y", c => y(c.p) + y.bandwidth() / 2 + 4).attr("text-anchor", "middle")
    .style("fill", c => Number.isFinite(c.value) && c.value > color.domain()[1] * 0.55 ? "#fff" : "#222").text(label);
  g.on("mousemove", (ev, c) => showTip(ev, `<b>${c.p} · ${c.e}</b><br>${c.n} répondants<br>Usage moyen : ${Number.isFinite(c.h) ? f1(c.h) + " h/jour" : "n/a"}`))
   .on("mouseout", hideTip)
   .on("click", (ev, c) => { selCell = { p: c.p, e: c.e }; drawHeat(); });

  // Légende
  const lg = d3.select("#v2-legend"); lg.selectAll("*").remove();
  const LW = 240, s = lg.append("svg").attr("width", LW + 40).attr("height", 48);
  const gr = s.append("defs").append("linearGradient").attr("id", "hg");
  d3.range(0, 1.01, 0.1).forEach(t => gr.append("stop").attr("offset", `${t * 100}%`).attr("stop-color", d3.interpolateBlues(t)));
  s.append("text").attr("x", 20).attr("y", 10).text(metric === "n" ? "Nombre de répondants" : "Utilisation moyenne (h par jour)");
  const lgg = s.append("g").attr("transform", "translate(20,16)");
  lgg.append("rect").attr("width", LW).attr("height", 12).attr("fill", "url(#hg)");
  lgg.append("g").attr("transform", "translate(0,12)").call(d3.axisBottom(d3.scaleLinear(color.domain(), [0, LW])).ticks(5).tickSize(3)).call(a => a.select(".domain").remove());

  // Second niveau : détails de la case sélectionnée
  const det = d3.select("#v2-detail"); det.selectAll("*").remove();
  if (!selCell) { det.append("p").attr("class", "hint").text("Clique sur une case pour voir le détail : profils et outils utilisés."); return; }
  const sel = rows.filter(d => d.pays === selCell.p && d.edu === selCell.e);
  const stud = sel.filter(d => d.type === "Étudiant").length;
  det.append("div").attr("class", "card").html(`<b>${selCell.p} · ${selCell.e}</b><br>${sel.length} répondants` + (sel.length ? `<br>Étudiants : ${stud} · Professionnels : ${sel.length - stud}<br>Usage moyen : ${f1(d3.mean(sel.filter(d => Number.isFinite(d.heures)), d => d.heures))} h par jour` : ""));
  if (sel.length) {
    const items = d3.rollups(sel, v => v.length, d => d.outil).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
    det.append("div").attr("id", "v2-tools");
    hbar("#v2-tools", items, { title: "Outils utilisés dans cette case", color: "#59a14f" });
  }
}
d3.select("#metric").on("change", drawHeat);
d3.select("#utype").on("change", drawHeat);