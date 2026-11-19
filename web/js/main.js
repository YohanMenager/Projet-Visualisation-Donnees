
/* ============================================================
   1. ÉTAT ET OUTILS COMMUNS
   ============================================================ */

const NR = "Non renseigné";

const EDU = [
  "Lycée",
  "Études de premier cycle",
  "Licence",
  "Diplômé",
  "Master",
  "Doctorat",
  NR
];

const EDU_SHORT = {
  "Études de premier cycle": "1er cycle"
};

const f1 = d3.format(".1f");
const f2 = d3.format(".2f");

const tooltip = d3.select("#tooltip");

const showTip = (e, html) => {
  tooltip
    .style("opacity", 1)
    .html(html)
    .style("left", (e.pageX + 12) + "px")
    .style("top", (e.pageY + 12) + "px");
};

const hideTip = () => tooltip.style("opacity", 0);

let data = [];
let paysOrder = [];
let objs = [];
let colorObj;
let colorTool;

const F = {
  type: null,
  edu: null,
  pays: null,
  outil: null,
  objectif: null,
  cap: false
};

let metric = "n";
let currentView = "overview";
let selectedDetail = null;

const KEY = {
  type: "type",
  edu: "edu",
  pays: "pays",
  outil: "outil",
  objectif: "objectif"
};


/* ============================================================
   2. FONCTIONS DE TRAITEMENT DES DONNÉES
   ============================================================ */

// Conversion sécurisée des valeurs numériques
const num = value => {
  if (value == null || String(value).trim() === "") {
    return NaN;
  }

  const result = Number(String(value).trim().replace(",", "."));

  return Number.isFinite(result) ? result : NaN;
};

// Nettoyage des valeurs textuelles
const cleanText = value => {
  if (value == null || String(value).trim() === "") {
    return NR;
  }

  return String(value).trim();
};

// Moyenne calculée uniquement sur les valeurs numériques valides
function mean(rows, key) {
  const values = rows
    .map(d => d[key])
    .filter(Number.isFinite);

  return values.length ? d3.mean(values) : NaN;
}

// Médiane
function median(rows, key) {
  const values = rows
    .map(d => d[key])
    .filter(Number.isFinite);

  return values.length ? d3.median(values) : NaN;
}

// Nombre de valeurs valides
function validCount(rows, key) {
  return rows.filter(d => Number.isFinite(d[key])).length;
}

// Données filtrées
function filtered(skip = []) {
  return data.filter(d => {
    const matchesFilters = Object.keys(KEY).every(k => {
      if (skip.includes(k)) return true;
      if (!F[k]) return true;

      return d[KEY[k]] === F[k];
    });

    const matchesCap = !F.cap || !(d.heures > 12);

    return matchesFilters && matchesCap;
  });
}

// Activation / désactivation d'un filtre
function toggle(k, value) {
  F[k] = F[k] === value ? null : value;
  renderAll();
}

// Créer un SVG à la taille du conteneur
function svgIn(sel) {
  const el = document.querySelector(sel);

  if (!el) {
    console.warn("Conteneur graphique introuvable :", sel);
    return {};
  }

  const w = el.clientWidth;
  const h = el.clientHeight;

  d3.select(el).selectAll("*").remove();

  if (w < 20 || h < 20) {
    return {};
  }

  return {
    svg: d3.select(el)
      .append("svg")
      .attr("width", w)
      .attr("height", h),
    w,
    h
  };
}

const empty = (svg, w, h) => {
  svg.append("text")
    .attr("x", w / 2)
    .attr("y", h / 2)
    .attr("text-anchor", "middle")
    .text("Aucun utilisateur pour ces filtres");
};


/* ============================================================
   3. FONCTION COMMUNE : BARRES HORIZONTALES
   ============================================================ */

function hbar(sel, items, { onClick, domain } = {}) {
  const { svg, w, h } = svgIn(sel);

  if (!svg) return;

  if (!items.length) {
    return empty(svg, w, h);
  }

  const m = {
    top: 2,
    right: 34,
    bottom: 2,
    left: Math.min(150, w * 0.42)
  };

  const y = d3.scaleBand()
    .domain(items.map(d => d.key))
    .range([m.top, h - m.bottom])
    .padding(0.18);

  const x = d3.scaleLinear()
    .domain(domain || [0, d3.max(items, d => d.value) || 1])
    .range([0, w - m.left - m.right]);

  const g = svg.selectAll("g.r")
    .data(items)
    .join("g")
    .attr("class", "r")
    .style("cursor", onClick ? "pointer" : "default")
    .attr("opacity", d => d.faded ? 0.3 : 1);

  const bh = Math.min(y.bandwidth(), 26);

  const cy = d => y(d.key) + y.bandwidth() / 2;

  g.append("rect")
    .attr("x", m.left)
    .attr("y", d => cy(d) - bh / 2)
    .attr("height", bh)
    .attr("width", d => x(d.value))
    .attr("fill", d => d.color);

  g.append("text")
    .attr("x", m.left - 5)
    .attr("y", d => cy(d) + 3.5)
    .attr("text-anchor", "end")
    .text(d => d.label);

  g.append("text")
    .attr("x", d => m.left + x(d.value) + 4)
    .attr("y", d => cy(d) + 3.5)
    .text(d => d.text);

  g.on("mousemove", (e, d) => {
    showTip(e, d.tip || d.label);
  })
    .on("mouseout", hideTip);

  if (onClick) {
    g.on("click", (e, d) => onClick(d.key));
  }
}


/* ============================================================
   4. CHARGEMENT DU CSV
   ============================================================ */

d3.csv("../data/dataset_clean.csv", d => ({
  id: cleanText(d.User_ID),
  age: num(d.Age),

  pays: cleanText(d.Pays),
  type: cleanText(d["Type d'utilisateur"]),
  edu: cleanText(d["Niveau d'éducation"]),
  prof: cleanText(d.Profession),

  outil: cleanText(d["IA utilisée"]),
  objectif: cleanText(d["Objectif d'utilisation de l'IA"]),
  taches: cleanText(d["Tâches effectuées"]),

  heures: num(d["Utilisation par jour"]),
  gainTemps: num(d["Gain de temps par semaine"]),
  cout: num(d["Coût mensuel"]),

  productivite: num(d["Score de productivité"]),
  prec: num(d["Précision perçue"]),
  sat: num(d["Niveau de satisfaction"]),

  recommandation: cleanText(d["Avis sur la recommandation"])
}))
  .then(init)
  .catch(error => {
    console.error("Erreur de chargement du CSV :", error);

    d3.select("#message")
      .html('<p class="error">Impossible de charger le dataset. Vérifie le chemin du fichier CSV.</p>');
  });


/* ============================================================
   5. NAVIGATION
   ============================================================ */

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

  overview.classList.toggle("detail-mode", isDetail);

  btnOverview.classList.toggle("active", !isDetail);
  btnDetail.classList.toggle("active", isDetail);

  requestAnimationFrame(renderAll);
}


/* ============================================================
   6. INDICATEURS KPI
   ============================================================ */

function updateKpis() {
  const rows = filtered();

  const hours = mean(rows, "heures");
  const gain = mean(rows, "gainTemps");
  const satisfaction = mean(rows, "sat");

  d3.select("#kpi-total")
    .text(rows.length);

  d3.select("#kpi-hours")
    .text(Number.isFinite(hours) ? f2(hours) + " h/jour" : "—");

  d3.select("#kpi-gain")
    .text(Number.isFinite(gain) ? f2(gain) + " h/semaine" : "—");

  d3.select("#kpi-satisfaction")
    .text(Number.isFinite(satisfaction) ? f2(satisfaction) + " / 10" : "—");
}


/* ============================================================
   7. PANNEAU DE DÉTAILS
   ============================================================ */

function showDetail(title, html) {
  selectedDetail = { title, html };

  d3.select("#detail-title").text(title);
  d3.select("#detail-content").html(html);
}

function showUserDetail(d) {
  showDetail(
    "Détails du répondant " + d.id,
    `
      <p><b>Type :</b> ${d.type}</p>
      <p><b>Profession :</b> ${d.prof}</p>
      <p><b>Niveau d'éducation :</b> ${d.edu}</p>
      <p><b>Pays :</b> ${d.pays}</p>
      <p><b>Outil utilisé :</b> ${d.outil}</p>
      <p><b>Objectif :</b> ${d.objectif}</p>
      <p><b>Utilisation quotidienne :</b>
        ${Number.isFinite(d.heures) ? f2(d.heures) + " h/jour" : "Non renseigné"}
      </p>
      <p><b>Gain de temps hebdomadaire :</b>
        ${Number.isFinite(d.gainTemps) ? f2(d.gainTemps) + " h/semaine" : "Non renseigné"}
      </p>
      <p><b>Productivité :</b>
        ${Number.isFinite(d.productivite) ? f2(d.productivite) + " / 10" : "Non renseigné"}
      </p>
      <p><b>Satisfaction :</b>
        ${Number.isFinite(d.sat) ? f2(d.sat) + " / 10" : "Non renseigné"}
      </p>
      <p><b>Recommandation :</b> ${d.recommandation}</p>
      <p><b>Tâches effectuées :</b> ${d.taches}</p>
    `
  );
}

function showToolDetail(tool) {
  const rows = filtered(["outil"])
    .filter(d => d.outil === tool);

  const prec = mean(rows, "prec");
  const sat = mean(rows, "sat");
  const gain = mean(rows, "gainTemps");

  showDetail(
    "Analyse de l'outil : " + tool,
    `
      <p><b>Nombre d'utilisateurs :</b> ${rows.length}</p>
      <p><b>Précision moyenne :</b>
        ${Number.isFinite(prec) ? f2(prec) + " / 5" : "—"}
      </p>
      <p><b>Satisfaction moyenne :</b>
        ${Number.isFinite(sat) ? f2(sat) + " / 10" : "—"}
      </p>
      <p><b>Gain de temps moyen :</b>
        ${Number.isFinite(gain) ? f2(gain) + " h/semaine" : "—"}
      </p>
    `
  );
}

function showObjectiveDetail(objective) {
  const rows = filtered(["objectif"])
    .filter(d => d.objectif === objective);

  const sat = mean(rows, "sat");
  const gain = mean(rows, "gainTemps");

  showDetail(
    "Analyse de l'objectif : " + objective,
    `
      <p><b>Nombre d'utilisateurs :</b> ${rows.length}</p>
      <p><b>Satisfaction moyenne :</b>
        ${Number.isFinite(sat) ? f2(sat) + " / 10" : "—"}
      </p>
      <p><b>Gain de temps moyen :</b>
        ${Number.isFinite(gain) ? f2(gain) + " h/semaine" : "—"}
      </p>
    `
  );
}


/* ============================================================
   8. INITIALISATION
   ============================================================ */

function init(rows) {
  data = rows;

  // Vérification des données chargées
  console.log("Nombre total de répondants :", data.length);

  console.table([
    {
      profil: "Étudiants",
      effectif: data.filter(d => d.type === "Étudiant").length,
      utilisation_moyenne: f2(mean(data.filter(d => d.type === "Étudiant"), "heures")),
      gain_moyen: f2(mean(data.filter(d => d.type === "Étudiant"), "gainTemps")),
      satisfaction: f2(mean(data.filter(d => d.type === "Étudiant"), "sat"))
    },
    {
      profil: "Professionnels",
      effectif: data.filter(d => d.type === "Professionnel").length,
      utilisation_moyenne: f2(mean(data.filter(d => d.type === "Professionnel"), "heures")),
      gain_moyen: f2(mean(data.filter(d => d.type === "Professionnel"), "gainTemps")),
      satisfaction: f2(mean(data.filter(d => d.type === "Professionnel"), "sat"))
    }
  ]);

  const byCount = (arr, key) =>
    d3.rollups(
      arr,
      group => group.length,
      d => d[key]
    )
      .sort((a, b) => b[1] - a[1])
      .map(d => d[0]);

  paysOrder = byCount(
    data.filter(d => d.pays !== NR && d.edu !== NR),
    "pays"
  );

  objs = byCount(
    data.filter(d => d.objectif !== NR),
    "objectif"
  );

  const tools = byCount(
    data.filter(d => d.outil !== NR),
    "outil"
  );

  const pal = d3.scaleOrdinal(d3.schemeTableau10)
    .domain(objs);

  colorObj = o => o === NR ? "#9a9a9a" : pal(o);

  const palT = d3.scaleOrdinal(d3.schemeTableau10)
    .domain(tools);

  colorTool = t => t === NR ? "#9a9a9a" : palT(t);

  // Menus des filtres
  const fill = (key, values) => {
    d3.select("#f-" + key)
      .selectAll("option")
      .data(["", ...values])
      .join("option")
      .attr("value", d => d)
      .text(d => d === "" ? "Tous" : d);
  };

  fill("type", ["Étudiant", "Professionnel"]);
  fill("edu", EDU);
  fill("pays", paysOrder);
  fill("outil", tools);
  fill("objectif", objs);

  // Événements des filtres
  for (const key of Object.keys(KEY)) {
    d3.select("#f-" + key)
      .on("change", function () {
        F[key] = this.value || null;
        renderAll();
      });
  }

  d3.select("#f-cap")
    .on("change", function () {
      F.cap = this.checked;
      renderAll();
    });

  d3.select("#metric")
    .on("change", function () {
      metric = this.value;
      renderAll();
    });

  // Réinitialisation
  d3.select("#reset")
    .on("click", () => {
      Object.keys(KEY).forEach(k => F[k] = null);

      F.cap = false;
      selectedDetail = null;

      renderAll();
    });

  // Navigation
  d3.select("#btn-overview")
    .on("click", () => switchView("overview"));

  d3.select("#btn-detail")
    .on("click", () => switchView("detail"));

  // Redimensionnement des graphiques
  const draws = {
    c0: drawBubble,
    c1: drawScatter,
    c2: drawHeat,
    c3: drawHist,
    c4: drawObjBars,
    c5: drawToolBars,
    c6: drawOverviewTools,
    c7: drawOverviewObjectives,
    c8: drawProfileComparison
  };

  for (const [id, fn] of Object.entries(draws)) {
    const element = document.getElementById(id);

    if (element) {
      new ResizeObserver(() => fn()).observe(element);
    }
  }

  renderAll();
}


/* ============================================================
   9. ACTUALISATION GÉNÉRALE
   ============================================================ */

function renderAll() {
  for (const key of Object.keys(KEY)) {
    d3.select("#f-" + key)
      .property("value", F[key] || "");
  }

  d3.select("#f-cap")
    .property("checked", F.cap);

  d3.select("#metric")
    .property("value", metric);

  d3.select("#count")
    .text(`${filtered().length} / ${data.length} utilisateurs`);

  updateKpis();

  drawBubble();
  drawScatter();
  drawHeat();
  drawHist();
  drawObjBars();
  drawToolBars();

  drawOverviewTools();
  drawOverviewObjectives();
  drawProfileComparison();

  if (selectedDetail) {
    d3.select("#detail-title")
      .text(selectedDetail.title);

    d3.select("#detail-content")
      .html(selectedDetail.html);
  }
}


/* ============================================================
   10. GRAPHIQUE : PRÉCISION × SATISFACTION
   ============================================================ */

function drawBubble() {
  const { svg, w, h } = svgIn("#c0");

  if (!svg) return;

  const rows = filtered(["outil"]).filter(d =>
    d.outil !== NR &&
    Number.isFinite(d.prec) &&
    Number.isFinite(d.sat)
  );

  const tools = d3.rollups(
    rows,
    group => ({
      n: group.length,
      prec: mean(group, "prec"),
      sat: mean(group, "sat")
    }),
    d => d.outil
  )
    .map(([outil, values]) => ({ outil, ...values }))
    .sort((a, b) => b.n - a.n);

  if (!tools.length) {
    return empty(svg, w, h);
  }

  const m = {
    top: 10,
    right: 18,
    bottom: 36,
    left: 42
  };

  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;

  const pad = (extent, p) => {
    const diff = extent[1] - extent[0];

    return diff < 1e-6
      ? [extent[0] - 0.5, extent[1] + 0.5]
      : [
          extent[0] - diff * p,
          extent[1] + diff * p
        ];
  };

  const x = d3.scaleLinear()
    .domain(pad(d3.extent(tools, d => d.prec), 0.25))
    .range([0, iw]);

  const y = d3.scaleLinear()
    .domain(pad(d3.extent(tools, d => d.sat), 0.25))
    .range([ih, 0]);

  const r = d3.scaleSqrt()
    .domain([0, d3.max(tools, d => d.n)])
    .range([0, Math.min(iw, ih) * 0.13]);

  const g = svg.append("g")
    .attr("transform", `translate(${m.left},${m.top})`);

  g.append("g")
    .attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).ticks(5));

  g.append("g")
    .call(d3.axisLeft(y).ticks(5));

  g.append("text")
    .attr("x", iw / 2)
    .attr("y", ih + 30)
    .attr("text-anchor", "middle")
    .text("Précision perçue moyenne (1 à 5)");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -ih / 2)
    .attr("y", -32)
    .attr("text-anchor", "middle")
    .text("Satisfaction moyenne (1 à 10)");

  const faded = d => F.outil && F.outil !== d.outil;
  const rad = d => Math.max(4, r(d.n));

  g.selectAll("circle")
    .data(tools)
    .join("circle")
    .style("cursor", "pointer")
    .attr("cx", d => x(d.prec))
    .attr("cy", d => y(d.sat))
    .attr("r", rad)
    .attr("fill", d => colorTool(d.outil))
    .attr("fill-opacity", d => faded(d) ? 0.2 : 0.75)
    .attr("stroke", d => d.outil === F.outil ? "#000" : "#fff")
    .attr("stroke-width", d => d.outil === F.outil ? 2.5 : 1)

    .on("mousemove", (e, d) => {
      showTip(
        e,
        `<b>${d.outil}</b><br>
        ${d.n} utilisateurs<br>
        Précision : ${f2(d.prec)} / 5<br>
        Satisfaction : ${f2(d.sat)} / 10`
      );
    })

    .on("mouseout", hideTip)

    .on("click", (e, d) => {
      showToolDetail(d.outil);
      toggle("outil", d.outil);
    });

  const right = d => x(d.prec) > iw * 0.7;

  g.selectAll("text.lab")
    .data(tools)
    .join("text")
    .attr("class", "lab")
    .style("pointer-events", "none")
    .attr("x", d =>
      right(d)
        ? x(d.prec) - rad(d) - 4
        : x(d.prec) + rad(d) + 4
    )
    .attr("text-anchor", d => right(d) ? "end" : "start")
    .attr("y", d => y(d.sat) + 3.5)
    .style("paint-order", "stroke")
    .style("stroke", "#fff")
    .style("stroke-width", "3px")
    .attr("opacity", d => faded(d) ? 0.4 : 1)
    .text(d => d.outil);
}


/* ============================================================
   11. GRAPHIQUE : UTILISATION QUOTIDIENNE × GAIN HEBDOMADAIRE
   ============================================================ */

function drawScatter() {
  const { svg, w, h } = svgIn("#c1");

  if (!svg) return;

  const base = filtered(["objectif"]).filter(d =>
    Number.isFinite(d.heures) &&
    Number.isFinite(d.gainTemps)
  );

  if (!base.length) {
    return empty(svg, w, h);
  }

  const m = {
    top: 15,
    right: 15,
    bottom: 42,
    left: 48
  };

  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;

  const xmax = d3.max(base, d => d.heures) || 1;
  const ymax = d3.max(base, d => d.gainTemps) || 1;

  const x = d3.scaleLinear()
    .domain([0, xmax * 1.05])
    .range([0, iw]);

  const y = d3.scaleLinear()
    .domain([0, ymax * 1.1])
    .range([ih, 0]);

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
    .text("Gain de temps hebdomadaire (heures/semaine)");

  // La sélection par objectif est mise en évidence.
  const selected = base.filter(d =>
    !F.objectif || d.objectif === F.objectif
  );

  const other = base.filter(d =>
    F.objectif && d.objectif !== F.objectif
  );

  function drawPoints(arr, opacity) {
    g.append("g")
      .selectAll("circle")
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
        showTip(
          e,
          `<b>${d.id}</b><br>
          ${d.type}<br>
          ${d.outil}<br>
          Objectif : ${d.objectif}<br>
          Utilisation : ${f2(d.heures)} h/jour<br>
          Gain de temps : ${f2(d.gainTemps)} h/semaine`
        );
      })

      .on("mouseout", hideTip)

      .on("click", (e, d) => {
        showUserDetail(d);
        switchView("detail");
      });
  }

  drawPoints(other, 0.12);
  drawPoints(selected, 0.7);

  // Corrélation de Pearson calculée sur la sélection visible.
  const n = selected.length;

  const mx = mean(selected, "heures");
  const my = mean(selected, "gainTemps");

  let label = `n = ${n}`;

  if (n > 2 && Number.isFinite(mx) && Number.isFinite(my)) {
    const sxy = d3.sum(selected, d =>
      (d.heures - mx) * (d.gainTemps - my)
    );

    const sxx = d3.sum(selected, d =>
      (d.heures - mx) ** 2
    );

    const syy = d3.sum(selected, d =>
      (d.gainTemps - my) ** 2
    );

    if (sxx > 0 && syy > 0) {
      const r = sxy / Math.sqrt(sxx * syy);

      const slope = sxy / sxx;
      const intercept = my - slope * mx;

      g.append("line")
        .attr("x1", x(0))
        .attr("x2", x(xmax * 1.05))
        .attr("y1", y(intercept))
        .attr("y2", y(intercept + slope * xmax * 1.05))
        .attr("stroke", "#333")
        .attr("stroke-dasharray", "5 4");

      label = `r de Pearson = ${r.toFixed(2)} · n = ${n}`;
    }
  }

  g.append("text")
    .attr("x", iw - 4)
    .attr("y", 12)
    .attr("text-anchor", "end")
    .style("font-weight", 600)
    .text(label);
}


/* ============================================================
   12. HEATMAP : PAYS × NIVEAU D'ÉDUCATION
   ============================================================ */

function drawHeat() {
  const { svg, w, h } = svgIn("#c2");

  if (!svg) return;

  const base = filtered(["pays", "edu"])
    .filter(d => d.pays !== NR && d.edu !== NR);

  const cells = [];

  for (const p of paysOrder) {
    for (const e of EDU.filter(value => value !== NR)) {
      const group = base.filter(d =>
        d.pays === p && d.edu === e
      );

      cells.push({
        p,
        e,
        n: group.length,
        h: mean(group, "heures")
      });
    }
  }

  cells.forEach(c => {
    c.value = metric === "n" ? c.n : c.h;
  });

  const vmax = d3.max(
    cells.filter(c => Number.isFinite(c.value)),
    c => c.value
  ) || 1;

  const color = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, vmax]);

  d3.select("#lgmax")
    .text(f1(vmax).replace(".0", ""));

  const m = {
    top: 22,
    right: 4,
    bottom: 4,
    left: 70
  };

  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;

  const x = d3.scaleBand()
    .domain(EDU.filter(e => e !== NR))
    .range([0, iw])
    .padding(0.06);

  const y = d3.scaleBand()
    .domain(paysOrder)
    .range([0, ih])
    .padding(0.06);

  const g = svg.append("g")
    .attr("transform", `translate(${m.left},${m.top})`);

  g.append("g")
    .call(
      d3.axisTop(x)
        .tickSize(0)
        .tickFormat(e => EDU_SHORT[e] || e)
    )
    .call(a => a.select(".domain").remove());

  g.append("g")
    .call(d3.axisLeft(y).tickSize(0))
    .call(a => a.select(".domain").remove());

  const active = c =>
    (!F.pays || c.p === F.pays) &&
    (!F.edu || c.e === F.edu);

  const anySel = F.pays || F.edu;
  const exact = F.pays && F.edu;

  const has = c =>
    Number.isFinite(c.value) &&
    !(metric === "n" && c.n === 0);

  const cg = g.selectAll("g.c")
    .data(cells)
    .join("g")
    .attr("class", "c")
    .style("cursor", "pointer")
    .attr("opacity", c => anySel && !active(c) ? 0.35 : 1);

  cg.append("rect")
    .attr("x", c => x(c.e))
    .attr("y", c => y(c.p))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", c => has(c) ? color(c.value) : "#ececec")
    .attr("stroke", c => exact && active(c) ? "#000" : "none")
    .attr("stroke-width", 2);

  cg.append("text")
    .attr("x", c => x(c.e) + x.bandwidth() / 2)
    .attr("y", c => y(c.p) + y.bandwidth() / 2 + 3.5)
    .attr("text-anchor", "middle")
    .style("fill", c =>
      has(c) && c.value > vmax * 0.55 ? "#fff" : "#222"
    )
    .text(c =>
      !has(c)
        ? ""
        : metric === "n"
          ? c.n
          : f2(c.value)
    );

  cg.on("mousemove", (ev, c) => {
    showTip(
      ev,
      `<b>${c.p} · ${c.e}</b><br>
      ${c.n} répondants<br>
      Usage moyen : ${Number.isFinite(c.h) ? f2(c.h) + " h/jour" : "—"}`
    );
  })
    .on("mouseout", hideTip)
    .on("click", (ev, c) => {
      if (F.pays === c.p && F.edu === c.e) {
        F.pays = null;
        F.edu = null;
      } else {
        F.pays = c.p;
        F.edu = c.e;
      }

      renderAll();
    });
}


/* ============================================================
   13. HISTOGRAMME : SATISFACTION
   ============================================================ */

function drawHist() {
  const rows = filtered()
    .filter(d => Number.isFinite(d.sat));

  d3.select("#t3")
    .text("Distribution des notes de satisfaction");

  d3.select("#s3")
    .text(
      rows.length
        ? `Moyenne : ${f2(mean(rows, "sat"))} / 10 · n = ${rows.length}`
        : ""
    );

  const { svg, w, h } = svgIn("#c3");

  if (!svg) return;

  if (!rows.length) {
    return empty(svg, w, h);
  }

  const counts = d3.rollup(
    rows,
    group => group.length,
    d => Math.round(d.sat)
  );

  const items = d3.range(3, 11).map(k => ({
    k,
    v: counts.get(k) || 0
  }));

  const m = {
    top: 6,
    right: 8,
    bottom: 30,
    left: 32
  };

  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;

  const x = d3.scaleBand()
    .domain(items.map(d => d.k))
    .range([0, iw])
    .padding(0.15);

  const y = d3.scaleLinear()
    .domain([0, d3.max(items, d => d.v) || 1])
    .nice()
    .range([ih, 0]);

  const g = svg.append("g")
    .attr("transform", `translate(${m.left},${m.top})`);

  g.append("g")
    .attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).tickSize(0));

  g.append("g")
    .call(
      d3.axisLeft(y)
        .ticks(4)
        .tickFormat(d3.format("d"))
    );

  g.selectAll("rect")
    .data(items)
    .join("rect")
    .attr("x", d => x(d.k))
    .attr("y", d => y(d.v))
    .attr("width", x.bandwidth())
    .attr("height", d => ih - y(d.v))
    .attr("fill", F.outil ? colorTool(F.outil) : "#4e79a7")
    .on("mousemove", (e, d) => {
      showTip(e, `Note arrondie ${d.k} : ${d.v} utilisateurs`);
    })
    .on("mouseout", hideTip);

  g.append("text")
    .attr("x", iw / 2)
    .attr("y", ih + 26)
    .attr("text-anchor", "middle")
    .text("Note de satisfaction arrondie");
}


/* ============================================================
   14. SATISFACTION MOYENNE PAR OBJECTIF
   ============================================================ */

function drawObjBars() {
  const rows = filtered(["objectif"])
    .filter(d => Number.isFinite(d.sat));

  const items = objs
    .map(o => {
      const group = rows.filter(d => d.objectif === o);

      return {
        o,
        n: group.length,
        mean: mean(group, "sat")
      };
    })
    .filter(d => d.n > 0 && Number.isFinite(d.mean))
    .sort((a, b) => b.mean - a.mean)
    .map(d => ({
      key: d.o,
      label: `${d.o} (${d.n})`,
      value: d.mean,
      text: f2(d.mean),
      color: colorObj(d.o),
      faded: F.objectif && F.objectif !== d.o,
      tip: `<b>${d.o}</b><br>
        ${d.n} utilisateurs<br>
        Satisfaction moyenne : ${f2(d.mean)} / 10`
    }));

  hbar("#c4", items, {
    domain: [0, 10],

    onClick: key => {
      showObjectiveDetail(key);
      toggle("objectif", key);
    }
  });
}


/* ============================================================
   15. OUTILS UTILISÉS DANS LA SÉLECTION
   ============================================================ */

function drawToolBars() {
  const rows = filtered();

  const students = rows.filter(d =>
    d.type === "Étudiant"
  ).length;

  const validHours = validCount(rows, "heures");

  d3.select("#s5")
    .text(
      rows.length
        ? `${rows.length} utilisateurs · ${Math.round(100 * students / rows.length)} % étudiants · ${validHours ? f2(mean(rows, "heures")) + " h/jour" : "—"} · clic = filtrer`
        : "Aucun utilisateur"
    );

  const items = d3.rollups(
    rows.filter(d => d.outil !== NR),
    group => group.length,
    d => d.outil
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tool, n]) => ({
      key: tool,
      label: tool,
      value: n,
      text: n,
      color: colorTool(tool),
      faded: F.outil && F.outil !== tool,
      tip: `<b>${tool}</b><br>${n} utilisateurs`
    }));

  hbar("#c5", items, {
    onClick: key => {
      showToolDetail(key);
      toggle("outil", key);
    }
  });
}


/* ============================================================
   16. VUE GLOBALE : OUTILS LES PLUS UTILISÉS
   ============================================================ */

function drawOverviewTools() {
  const rows = filtered(["outil"]);

  const items = d3.rollups(
    rows.filter(d => d.outil !== NR),
    group => group.length,
    d => d.outil
  )
    .sort((a, b) => b[1] - a[1])
    .map(([tool, n]) => ({
      key: tool,
      label: tool,
      value: n,
      text: n,
      color: colorTool(tool),
      faded: F.outil && F.outil !== tool,
      tip: `<b>${tool}</b><br>${n} utilisateurs`
    }));

  hbar("#c6", items, {
    onClick: tool => {
      showToolDetail(tool);
      toggle("outil", tool);
    }
  });
}


/* ============================================================
   17. VUE GLOBALE : OBJECTIFS LES PLUS FRÉQUENTS
   ============================================================ */

function drawOverviewObjectives() {
  const rows = filtered(["objectif"]);

  const items = d3.rollups(
    rows.filter(d => d.objectif !== NR),
    group => group.length,
    d => d.objectif
  )
    .sort((a, b) => b[1] - a[1])
    .map(([objective, n]) => ({
      key: objective,
      label: objective,
      value: n,
      text: n,
      color: colorObj(objective),
      faded: F.objectif && F.objectif !== objective,
      tip: `<b>${objective}</b><br>${n} utilisateurs`
    }));

  hbar("#c7", items, {
    onClick: objective => {
      showObjectiveDetail(objective);
      toggle("objectif", objective);
    }
  });
}


/* ============================================================
   18. VUE GLOBALE : COMPARAISON ÉTUDIANTS / PROFESSIONNELS
   ============================================================ */

function drawProfileComparison() {
  const { svg, w, h } = svgIn("#c8");

  if (!svg) return;

  // On ignore le filtre de type pour toujours comparer
  // les deux populations, même lorsqu'un type est sélectionné.
  const rows = filtered(["type"]);

  const profiles = [
    "Étudiant",
    "Professionnel"
  ];

  const metrics = [
    {
      key: "heures",
      label: "Utilisation quotidienne",
      unit: "h/jour",
      color: "#4e79a7"
    },
    {
      key: "sat",
      label: "Satisfaction moyenne",
      unit: "/ 10",
      color: "#59a14f"
    }
  ];

  const summary = metrics.map(metric => ({
    ...metric,

    values: profiles.map(type => {
      const group = rows.filter(d =>
        d.type === type &&
        Number.isFinite(d[metric.key])
      );

      return {
        type,
        n: group.length,
        value: mean(group, metric.key)
      };
    })
  }));

  // Diagnostic des valeurs utilisées par le graphique
  console.table(
    summary.flatMap(metric =>
      metric.values.map(d => ({
        indicateur: metric.label,
        profil: d.type,
        effectif: d.n,
        moyenne: d.value
      }))
    )
  );

  if (!rows.length) {
    return empty(svg, w, h);
  }

  const gap = 28;
  const panelWidth = (w - gap) / 2;

  const top = 42;
  const bottom = 28;

  const labelWidth = Math.min(105, panelWidth * 0.38);
  const right = 35;

  const chartWidth = Math.max(
    10,
    panelWidth - labelWidth - right
  );

  const rowHeight = Math.min(
    48,
    (h - top - bottom) / 2.5
  );

  summary.forEach((metric, index) => {
    const panelX = index * (panelWidth + gap);

    const panel = svg.append("g")
      .attr("transform", `translate(${panelX}, 0)`);

    panel.append("text")
      .attr("x", panelWidth / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-weight", 600)
      .text(metric.label);

    const validValues = metric.values
      .filter(d => Number.isFinite(d.value))
      .map(d => d.value);

    const maxValue = d3.max(validValues) || 1;

    const x = d3.scaleLinear()
      .domain([0, maxValue * 1.2])
      .range([0, chartWidth]);

    metric.values.forEach((d, i) => {
      const y = top + i * rowHeight;

      const group = panel.append("g")
        .attr("transform", `translate(0, ${y})`)
        .style("cursor", "pointer")
        .attr("opacity", F.type && F.type !== d.type ? 0.3 : 1);

      group.append("text")
        .attr("x", labelWidth - 7)
        .attr("y", 15)
        .attr("text-anchor", "end")
        .text(
          d.type === "Étudiant"
            ? "Étudiants"
            : "Professionnels"
        );

      if (Number.isFinite(d.value)) {
        group.append("rect")
          .attr("x", labelWidth)
          .attr("y", 0)
          .attr("width", x(d.value))
          .attr("height", 23)
          .attr("rx", 3)
          .attr("fill", metric.color)
          .attr("stroke", F.type === d.type ? "#222" : "none")
          .attr("stroke-width", 2);

        group.append("text")
          .attr("x", labelWidth + x(d.value) + 5)
          .attr("y", 16)
          .text(`${f2(d.value)} ${metric.unit}`);
      } else {
        group.append("text")
          .attr("x", labelWidth)
          .attr("y", 16)
          .text("Donnée indisponible");
      }

      group.on("mousemove", event => {
        showTip(
          event,
          `<b>${d.type}</b><br>
          Moyenne : ${Number.isFinite(d.value) ? f2(d.value) + " " + metric.unit : "—"}<br>
          Répondants valides : ${d.n}`
        );
      })
        .on("mouseout", hideTip)
        .on("click", () => {
          toggle("type", d.type);
        });
    });
  });
}
