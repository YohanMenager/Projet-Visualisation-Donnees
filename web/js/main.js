/* ============================================================
   1. ÉTAT ET OUTILS COMMUNS
   ============================================================ */
const NR = "Non renseigné";
const EDU = ["Lycée","Études de premier cycle","Licence","Diplômé","Master","Doctorat","Non renseigné"];
const EDU_SHORT = { "Études de premier cycle": "1er cycle" };
const f1 = d3.format(".1f");
const tooltip = d3.select("#tooltip");
const showTip = (e, html) => tooltip.style("opacity", 1).html(html).style("left", (e.pageX + 12) + "px").style("top", (e.pageY + 12) + "px");
const hideTip = () => tooltip.style("opacity", 0);

let data = [], paysOrder = [], objs = [], colorObj, colorTool;

// Filtres globaux : partagés par les six vues
const F = { type: null, edu: null, pays: null, outil: null, objectif: null, cap: false };
let metric = "n";

// Navigation et sélection dans le dashboard
let currentView = "overview";
let selectedDetail = null;

const KEY = { type: "type", edu: "edu", pays: "pays", outil: "outil", objectif: "objectif" };

// Données filtrées. "skip" = filtres ignorés par la vue qui les pilote : elle montre alors
// toutes les valeurs et met en évidence la sélection (on garde le contexte).
function filtered(skip = []) {
  return data.filter(d => Object.keys(KEY).every(k => skip.includes(k) || !F[k] || d[KEY[k]] === F[k])
                          && (!F.cap || !(d.heures > 12)));
}
// Un clic sur un élément le transforme en filtre ; un second clic l'enlève
function toggle(k, v) { F[k] = F[k] === v ? null : v; renderAll(); }

// Crée un SVG à la taille du conteneur : le tableau de bord ne défile jamais
function svgIn(sel) {
  const el = document.querySelector(sel), w = el.clientWidth, h = el.clientHeight;
  d3.select(el).selectAll("*").remove();
  if (w < 20 || h < 20) return {};
  return { svg: d3.select(el).append("svg").attr("width", w).attr("height", h), w, h };
}
const empty = (svg, w, h) => svg.append("text").attr("x", w / 2).attr("y", h / 2).attr("text-anchor", "middle").text("Aucun utilisateur pour ces filtres");

// Barres horizontales cliquables : items = [{key, label, value, text, color, faded, tip}]
function hbar(sel, items, { onClick, domain } = {}) {
  const { svg, w, h } = svgIn(sel); if (!svg) return;
  if (!items.length) return empty(svg, w, h);
  const m = { top: 2, right: 34, bottom: 2, left: Math.min(150, w * 0.42) };
  const y = d3.scaleBand(items.map(d => d.key), [m.top, h - m.bottom]).padding(0.18);
  const x = d3.scaleLinear(domain || [0, d3.max(items, d => d.value) || 1], [0, w - m.left - m.right]);
  const g = svg.selectAll("g.r").data(items).join("g").attr("class", "r").style("cursor", onClick ? "pointer" : "default")
    .attr("opacity", d => d.faded ? 0.3 : 1);
  const bh = Math.min(y.bandwidth(), 26), cy = d => y(d.key) + y.bandwidth() / 2;   // épaisseur limitée, barre centrée
  g.append("rect").attr("x", m.left).attr("y", d => cy(d) - bh / 2).attr("height", bh).attr("width", d => x(d.value)).attr("fill", d => d.color);
  g.append("text").attr("x", m.left - 5).attr("y", d => cy(d) + 3.5).attr("text-anchor", "end").text(d => d.label);
  g.append("text").attr("x", d => m.left + x(d.value) + 4).attr("y", d => cy(d) + 3.5).text(d => d.text);
  g.on("mousemove", (e, d) => showTip(e, d.tip || d.label)).on("mouseout", hideTip);
  if (onClick) g.on("click", (e, d) => onClick(d.key));
}

/* ============================================================
   2. CHARGEMENT DES DONNÉES
   ============================================================ */
const num = v => v == null || v.trim() === "" ? NaN : +v;

d3.csv("../data/dataset_clean.csv", d => ({
  id: d.User_ID,
  age: num(d.Age),
  pays: d.Pays,
  type: d["Type d'utilisateur"],
  edu: d["Niveau d'éducation"],
  prof: d.Profession,

  outil: d["IA utilisée"],
  objectif: d["Objectif d'utilisation de l'IA"],
  taches: d["Tâches effectuées"],

  heures: num(d["Utilisation par jour"]),
  gainTemps: num(d["Gain de temps par semaine"]),
  cout: num(d["Coût mensuel"]),
  productivite: num(d["Score de productivité"]),
  prec: num(d["Précision perçue"]),
  sat: num(d["Niveau de satisfaction"]),

  recommandation: d["Avis sur la recommandation"]
})).then(init)
  .catch(error => {
    console.error("Erreur de chargement du CSV :", error);
    d3.select("#message").html('<p class="error">Impossible de charger le dataset. Vérifie le chemin du fichier CSV.</p>');
  });


/* ============================================================
   NAVIGATION, KPI ET PANNEAU DE DETAILS
   ============================================================ */

// Changer de vue

function switchView(view) {
  const overview = document.querySelector("#view-overview");
  const btnOverview = document.querySelector("#btn-overview");
  const btnDetail = document.querySelector("#btn-detail");

  if (!overview || !btnOverview || !btnDetail) {
    console.error("Éléments de navigation introuvables.");
    return;
  }

  currentView = view;

  const isDetail = view === "detail";

  // Modifier la classe de la vue
  overview.classList.toggle("detail-mode", isDetail);

  // Mettre à jour les boutons
  btnOverview.classList.toggle("active", !isDetail);
  btnDetail.classList.toggle("active", isDetail);

  // Afficher ou masquer explicitement les éléments détaillés
  document.querySelectorAll("#view-overview .detail-only")
    .forEach(element => {
      element.style.display = isDetail ? "flex" : "none";
    });

  // Redessiner les graphiques après le changement de vue
  requestAnimationFrame(() => {
    renderAll();
  });
}


// Mettre à jour les indicateurs KPI
function updateKpis() {
  const rows = filtered();

  const mean = (key) => {
    const values = rows.filter(d => Number.isFinite(d[key]));
    return values.length ? d3.mean(values, d => d[key]) : NaN;
  };

  const hours = mean("heures");
  const gain = mean("gainTemps");
  const satisfaction = mean("sat");

  d3.select("#kpi-total").text(rows.length);

  d3.select("#kpi-hours")
    .text(Number.isFinite(hours) ? f1(hours) + " h/jour" : "—");

  // L'unité du gain de temps reste à confirmer
  d3.select("#kpi-gain")
    .text(Number.isFinite(gain) ? f1(gain) : "—");

  d3.select("#kpi-satisfaction")
    .text(Number.isFinite(satisfaction)
      ? f1(satisfaction) + " / 10"
      : "—");
}

// Afficher des informations dans le panneau de détails
function showDetail(title, html) {
  selectedDetail = { title, html };

  d3.select("#detail-title").text(title);
  d3.select("#detail-content").html(html);
}

// Afficher les détails d'un utilisateur
function showUserDetail(d) {
  showDetail(
    "Détails du répondant " + d.id,
    `
      <p><b>Type :</b> ${d.type || NR}</p>
      <p><b>Profession :</b> ${d.prof || NR}</p>
      <p><b>Niveau d'éducation :</b> ${d.edu || NR}</p>
      <p><b>Pays :</b> ${d.pays || NR}</p>
      <p><b>Outil utilisé :</b> ${d.outil || NR}</p>
      <p><b>Objectif :</b> ${d.objectif || NR}</p>
      <p><b>Utilisation quotidienne :</b> ${Number.isFinite(d.heures) ? f1(d.heures) + " h/jour" : "Non renseigné"}</p>
      <p><b>Gain de temps hebdomadaire :</b> ${Number.isFinite(d.gainTemps) ? f1(d.gainTemps) : "Non renseigné"}</p>
      <p><b>Productivité :</b> ${Number.isFinite(d.productivite) ? f1(d.productivite) + " / 10" : "Non renseigné"}</p>
      <p><b>Satisfaction :</b> ${Number.isFinite(d.sat) ? f1(d.sat) + " / 10" : "Non renseigné"}</p>
      <p><b>Recommandation :</b> ${d.recommandation || NR}</p>
      <p><b>Tâches effectuées :</b> ${d.taches || NR}</p>
    `
  );
}

// Afficher les détails d'un outil
function showToolDetail(tool) {
  const rows = filtered(["outil"]).filter(d => d.outil === tool);
  const prec = d3.mean(rows, d => d.prec);
  const sat = d3.mean(rows, d => d.sat);
  const gain = d3.mean(rows, d => d.gainTemps);

  showDetail(
    "Analyse de l'outil : " + tool,
    `
      <p><b>Nombre d'utilisateurs :</b> ${rows.length}</p>
      <p><b>Précision moyenne :</b> ${Number.isFinite(prec) ? f1(prec) + " / 5" : "—"}</p>
      <p><b>Satisfaction moyenne :</b> ${Number.isFinite(sat) ? f1(sat) + " / 10" : "—"}</p>
      <p><b>Gain de temps moyen :</b> ${Number.isFinite(gain) ? f1(gain) : "—"}</p>
    `
  );
}

// Afficher les détails d'un objectif
function showObjectiveDetail(objective) {
  const rows = filtered(["objectif"]).filter(d => d.objectif === objective);
  const sat = d3.mean(rows, d => d.sat);
  const gain = d3.mean(rows, d => d.gainTemps);

  showDetail(
    "Analyse de l'objectif : " + objective,
    `
      <p><b>Nombre d'utilisateurs :</b> ${rows.length}</p>
      <p><b>Satisfaction moyenne :</b> ${Number.isFinite(sat) ? f1(sat) + " / 10" : "—"}</p>
      <p><b>Gain de temps moyen :</b> ${Number.isFinite(gain) ? f1(gain) : "—"}</p>
    `
  );
}


function init(rows) {
  data = rows;
  const byCount = (arr, k) => d3.rollups(arr, g => g.length, d => d[k]).sort((a, b) => b[1] - a[1]).map(d => d[0]);
  paysOrder = byCount(data.filter(d => d.pays !== NR && d.edu !== NR), "pays");
  objs = byCount(data, "objectif");
  const pal = d3.scaleOrdinal(d3.schemeTableau10).domain(objs.filter(o => o !== NR));
  colorObj = o => o === NR ? "#9a9a9a" : pal(o);
  const tools = byCount(data.filter(d => d.outil !== NR), "outil");
  const palT = d3.scaleOrdinal(d3.schemeTableau10).domain(tools);
  colorTool = t => palT(t);

  // Menus de filtres
  const fill = (k, values) => d3.select("#f-" + k).selectAll("option").data(["", ...values]).join("option")
    .attr("value", d => d).text(d => d === "" ? "Tous" : d);
  fill("type", ["Étudiant", "Professionnel"]);
  fill("edu", EDU);
  fill("pays", paysOrder);
  fill("outil", tools);
  fill("objectif", objs.filter(o => o !== NR));
  for (const k of Object.keys(KEY)) d3.select("#f-" + k).on("change", function () { F[k] = this.value || null; renderAll(); });
  d3.select("#f-cap").on("change", function () { F.cap = this.checked; renderAll(); });
  d3.select("#metric").on("change", function () { metric = this.value; renderAll(); });
  d3.select("#reset").on("click", () => {Object.keys(KEY).forEach(k => F[k] = null); F.cap = false; selectedDetail = null; renderAll();
  });

  d3.select("#btn-overview").on("click", () => switchView("overview"));

  d3.select("#btn-detail").on("click", () => switchView("detail"));
  
  // Chaque vue se redessine quand la taille de son panneau change
  const draws = { c0: drawBubble, c1: drawScatter, c2: drawHeat, c3: drawHist, c4: drawObjBars, c5: drawToolBars };
  for (const [id, fn] of Object.entries(draws)) new ResizeObserver(() => fn()).observe(document.getElementById(id));
  renderAll();
}

// Redessine toutes les vues à partir de l'état des filtres
function renderAll() {
  for (const k of Object.keys(KEY)) {
    d3.select("#f-" + k).property("value", F[k] || "");
  }

  d3.select("#f-cap").property("checked", F.cap);
  d3.select("#metric").property("value", metric);

  d3.select("#count").text(
    `${filtered().length} / ${data.length} utilisateurs`
  );

  updateKpis();

  drawBubble();
  drawScatter();
  drawHeat();
  drawHist();
  drawObjBars();
  drawToolBars();

  // Conserver les informations de la sélection
  if (selectedDetail) {
    d3.select("#detail-title").text(selectedDetail.title);
    d3.select("#detail-content").html(selectedDetail.html);
  }
}

/* ============================================================
   3. VUE 1 : BUBBLE CHART (outils) : précision × satisfaction, taille = effectif
   ============================================================ */
function drawBubble() {
  const { svg, w, h } = svgIn("#c0"); if (!svg) return;
  const rows = filtered(["outil"]).filter(d => d.outil !== NR && Number.isFinite(d.prec) && Number.isFinite(d.sat));
  const tools = d3.rollups(rows, g => ({ n: g.length, prec: d3.mean(g, d => d.prec), sat: d3.mean(g, d => d.sat) }), d => d.outil)
    .map(([outil, v]) => ({ outil, ...v })).sort((a, b) => b.n - a.n);
  if (!tools.length) return empty(svg, w, h);
  const m = { top: 10, right: 18, bottom: 36, left: 42 }, iw = w - m.left - m.right, ih = h - m.top - m.bottom;
  const pad = (e, p) => e[1] - e[0] < 1e-6 ? [e[0] - 0.5, e[1] + 0.5] : [e[0] - (e[1] - e[0]) * p, e[1] + (e[1] - e[0]) * p];
  const x = d3.scaleLinear(pad(d3.extent(tools, d => d.prec), 0.25), [0, iw]);
  const y = d3.scaleLinear(pad(d3.extent(tools, d => d.sat), 0.25), [ih, 0]);
  const r = d3.scaleSqrt([0, d3.max(tools, d => d.n)], [0, Math.min(iw, ih) * 0.13]);   // aire proportionnelle à l'effectif
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
  g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(5));
  g.append("g").call(d3.axisLeft(y).ticks(5));
  g.append("text").attr("x", iw / 2).attr("y", ih + 30).attr("text-anchor", "middle").text("Précision perçue moyenne (1 à 5)");
  g.append("text").attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -32).attr("text-anchor", "middle").text("Satisfaction moyenne (1 à 10)");
  const faded = d => F.outil && F.outil !== d.outil;
  const rad = d => Math.max(4, r(d.n));
  g.selectAll("circle").data(tools).join("circle").style("cursor", "pointer")
    .attr("cx", d => x(d.prec)).attr("cy", d => y(d.sat)).attr("r", rad)
    .attr("fill", d => colorTool(d.outil)).attr("fill-opacity", d => faded(d) ? 0.2 : 0.75)
    .attr("stroke", d => d.outil === F.outil ? "#000" : "#fff").attr("stroke-width", d => d.outil === F.outil ? 2.5 : 1)
    .on("mousemove", (e, d) => showTip(e, `<b>${d.outil}</b><br>${d.n} utilisateurs<br>Précision : ${f1(d.prec)} / 5<br>Satisfaction : ${f1(d.sat)} / 10`))
    .on("mouseout", hideTip)
    .on("click", (e, d) => {toggle("outil", d.outil);showToolDetail(d.outil);
});
// Étiquettes au-dessus des bulles, avec un halo blanc pour rester lisibles
  const right = d => x(d.prec) > iw * 0.7;
  g.selectAll("text.lab").data(tools).join("text").attr("class", "lab").style("pointer-events", "none")
    .attr("x", d => right(d) ? x(d.prec) - rad(d) - 4 : x(d.prec) + rad(d) + 4)
    .attr("text-anchor", d => right(d) ? "end" : "start").attr("y", d => y(d.sat) + 3.5)
    .style("paint-order", "stroke").style("stroke", "#fff").style("stroke-width", "3px")
    .attr("opacity", d => faded(d) ? 0.4 : 1).text(d => d.outil);
}

/* ============================================================
   4. VUE 2 : SCATTER PLOT : heures d'usage × satisfaction, couleur = objectif
   ============================================================ */

function drawScatter() {
  const { svg, w, h } = svgIn("#c1");
  if (!svg) return;

  const base = filtered(["objectif"]).filter(d =>
    Number.isFinite(d.heures) &&
    Number.isFinite(d.gainTemps)
  );

  if (!base.length) return empty(svg, w, h);

  const m = { top: 15, right: 15, bottom: 42, left: 48 };
  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;

  const xmax = d3.max(base, d => d.heures) || 1;
  const ymax = d3.max(base, d => d.gainTemps) || 1;

  const x = d3.scaleLinear([0, xmax * 1.05], [0, iw]);
  const y = d3.scaleLinear([0, ymax * 1.1], [ih, 0]);

  const g = svg.append("g")
    .attr("transform", `translate(${m.left},${m.top})`);

  g.append("g")
    .attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).ticks(6));

  g.append("g")
    .call(d3.axisLeft(y).ticks(6));

  g.append("text")
    .attr("x", iw / 2)
    .attr("y", ih + 35)
    .attr("text-anchor", "middle")
    .text("Utilisation quotidienne (heures/jour)");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -ih / 2)
    .attr("y", -36)
    .attr("text-anchor", "middle")
    .text("Gain de temps hebdomadaire (unité à confirmer)");

  const inSel = d =>
    !F.objectif || d.objectif === F.objectif;

  const sel = base.filter(inSel);
  const other = base.filter(d => !inSel(d));

  function drawPoints(arr, opacity) {
    g.selectAll(null)
      .data(arr)
      .join("circle")
      .attr("cx", d => x(d.heures))
      .attr("cy", d => y(d.gainTemps))
      .attr("r", 4)
      .attr("fill", d => colorObj(d.objectif))
      .attr("fill-opacity", opacity)
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.7)
      .style("cursor", "pointer")

      .on("mousemove", (e, d) => {
        showTip(e,
          `<b>${d.id}</b><br>
          ${d.type}<br>
          ${d.outil}<br>
          Utilisation : ${d.heures} h/jour<br>
          Gain de temps : ${f1(d.gainTemps)}`
        );
      })

      .on("mouseout", hideTip)

      .on("click", (e, d) => {
        showUserDetail(d);
        switchView("detail");
      });
  }

  drawPoints(other, 0.12);
  drawPoints(sel, 0.7);

  // Corrélation entre utilisation et gain de temps
  const n = sel.length;
  const mx = d3.mean(sel, d => d.heures);
  const my = d3.mean(sel, d => d.gainTemps);

  const sxy = d3.sum(sel, d =>
    (d.heures - mx) * (d.gainTemps - my)
  );

  const sxx = d3.sum(sel, d => (d.heures - mx) ** 2);
  const syy = d3.sum(sel, d => (d.gainTemps - my) ** 2);

  let label = `n = ${n}`;

  if (n > 2 && sxx > 0 && syy > 0) {
    const slope = sxy / sxx;
    const intercept = my - slope * mx;

    g.append("line")
      .attr("x1", x(0))
      .attr("x2", x(xmax * 1.05))
      .attr("y1", y(intercept))
      .attr("y2", y(intercept + slope * xmax * 1.05))
      .attr("stroke", "#333")
      .attr("stroke-dasharray", "5 4");

    const r = sxy / Math.sqrt(sxx * syy);
    label = ` Pearson r = ${r.toFixed(2)} · n = ${n}`;
  }

  g.append("text")
    .attr("x", iw - 4)
    .attr("y", 12)
    .attr("text-anchor", "end")
    .style("font-weight", 600)
    .text(label);
}


/* ============================================================
   5. VUE 3 : HEATMAP : pays × niveau d'éducation
   ============================================================ */
function drawHeat() {
  const { svg, w, h } = svgIn("#c2"); if (!svg) return;
  const base = filtered(["pays", "edu"]).filter(d => d.pays !== NR && d.edu !== NR);
  const cells = [];
  for (const p of paysOrder) for (const e of EDU) {
    const g = base.filter(d => d.pays === p && d.edu === e), hs = g.filter(d => Number.isFinite(d.heures));
    cells.push({ p, e, n: g.length, h: hs.length ? d3.mean(hs, d => d.heures) : NaN });
  }
  cells.forEach(c => c.value = metric === "n" ? c.n : c.h);
  const vmax = d3.max(cells, c => c.value) || 1;
  const color = d3.scaleSequential(d3.interpolateBlues).domain([0, vmax]);
  d3.select("#lgmax").text(f1(vmax).replace(".0", ""));
  const m = { top: 22, right: 4, bottom: 4, left: 70 }, iw = w - m.left - m.right, ih = h - m.top - m.bottom;
  const x = d3.scaleBand(EDU, [0, iw]).padding(0.06), y = d3.scaleBand(paysOrder, [0, ih]).padding(0.06);
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
  g.append("g").call(d3.axisTop(x).tickSize(0).tickFormat(e => EDU_SHORT[e] || e)).call(a => a.select(".domain").remove());
  g.append("g").call(d3.axisLeft(y).tickSize(0)).call(a => a.select(".domain").remove());
  const active = c => (!F.pays || c.p === F.pays) && (!F.edu || c.e === F.edu);
  const anySel = F.pays || F.edu, exact = F.pays && F.edu;
  const has = c => Number.isFinite(c.value) && !(metric === "n" && c.n === 0);
  const cg = g.selectAll("g.c").data(cells).join("g").attr("class", "c").style("cursor", "pointer")
    .attr("opacity", c => anySel && !active(c) ? 0.35 : 1);
  cg.append("rect").attr("x", c => x(c.e)).attr("y", c => y(c.p)).attr("width", x.bandwidth()).attr("height", y.bandwidth())
    .attr("fill", c => has(c) ? color(c.value) : "#ececec").attr("stroke", c => exact && active(c) ? "#000" : "none").attr("stroke-width", 2);
  cg.append("text").attr("x", c => x(c.e) + x.bandwidth() / 2).attr("y", c => y(c.p) + y.bandwidth() / 2 + 3.5).attr("text-anchor", "middle")
    .style("fill", c => has(c) && c.value > vmax * 0.55 ? "#fff" : "#222").text(c => !has(c) ? "" : metric === "n" ? c.n : f1(c.value));
  cg.on("mousemove", (ev, c) => showTip(ev, `<b>${c.p} · ${c.e}</b><br>${c.n} répondants<br>Usage moyen : ${Number.isFinite(c.h) ? f1(c.h) + " h/jour" : "n/a"}`))
    .on("mouseout", hideTip)
    .on("click", (ev, c) => {   // la case fixe deux filtres à la fois : pays et niveau d'éducation
      if (F.pays === c.p && F.edu === c.e) { F.pays = null; F.edu = null; } else { F.pays = c.p; F.edu = c.e; }
      renderAll();
    });
}

/* ============================================================
   6. VUES DE DÉTAILS : histogramme, objectifs, outils
   ============================================================ */
function drawHist() {
  const rows = filtered().filter(d => Number.isFinite(d.sat));
  d3.select("#t3").text("Notes de satisfaction : " + (F.outil || "tous les outils"));
  d3.select("#s3").text(rows.length ? `moyenne ${f1(d3.mean(rows, d => d.sat))} · n = ${rows.length}` : "");
  const { svg, w, h } = svgIn("#c3"); if (!svg) return;
  if (!rows.length) return empty(svg, w, h);
  const counts = d3.rollup(rows, g => g.length, d => Math.round(d.sat));
  const items = d3.range(3, 11).map(k => ({ k, v: counts.get(k) || 0 }));
  const m = { top: 6, right: 8, bottom: 30, left: 32 }, iw = w - m.left - m.right, ih = h - m.top - m.bottom;
  const x = d3.scaleBand(items.map(d => d.k), [0, iw]).padding(0.15), y = d3.scaleLinear([0, d3.max(items, d => d.v) || 1], [ih, 0]).nice();
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
  g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0));
  g.append("g").call(d3.axisLeft(y).ticks(Math.min(4, d3.max(items, d => d.v) || 1)).tickFormat(d3.format("d")));
  g.selectAll("rect").data(items).join("rect").attr("x", d => x(d.k)).attr("y", d => y(d.v)).attr("width", x.bandwidth()).attr("height", d => ih - y(d.v))
    .attr("fill", F.outil ? colorTool(F.outil) : "#4e79a7")
    .on("mousemove", (e, d) => showTip(e, `Note ${d.k} : ${d.v} utilisateurs`)).on("mouseout", hideTip);
  g.append("text").attr("x", iw / 2).attr("y", ih + 26).attr("text-anchor", "middle").text("Note de satisfaction");
}

function drawObjBars() {
  const rows = filtered(["objectif"]).filter(d => Number.isFinite(d.sat));
  const items = objs.map(o => { const g = rows.filter(d => d.objectif === o); return { o, n: g.length, mean: g.length ? d3.mean(g, d => d.sat) : 0 }; })
    .filter(d => d.n > 0).sort((a, b) => b.mean - a.mean)
    .map(d => ({ key: d.o, label: `${d.o} (${d.n})`, value: d.mean, text: f1(d.mean), color: colorObj(d.o), faded: F.objectif && F.objectif !== d.o,
                 tip: `<b>${d.o}</b><br>${d.n} utilisateurs<br>Satisfaction moyenne : ${f1(d.mean)}` }));
  hbar("#c4", items, {onClick: k => {toggle("objectif", k); showObjectiveDetail(k);},domain: [0, 10]});
}

function drawToolBars() {
  const rows = filtered();
  const st = rows.filter(d => d.type === "Étudiant").length, hs = rows.filter(d => Number.isFinite(d.heures));
  d3.select("#s5").text(rows.length
    ? `${rows.length} utilisateurs · ${Math.round(100 * st / rows.length)} % étudiants` + (hs.length ? ` · ${f1(d3.mean(hs, d => d.heures))} h/jour` : "") + " · clic = filtrer"
    : "clic = filtrer");
  const items = d3.rollups(rows.filter(d => d.outil !== NR), g => g.length, d => d.outil).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([t, n]) => ({ key: t, label: t, value: n, text: n, color: colorTool(t), faded: F.outil && F.outil !== t, tip: `<b>${t}</b><br>${n} utilisateurs` }));
  hbar("#c5", items, {onClick: k => {toggle("outil", k); showToolDetail(k);}});
}

console.log("Bouton global :", document.querySelector("#btn-overview"));
console.log("Bouton détail :", document.querySelector("#btn-detail"));
