// Trois questions pour les managers / RH, chacune avec un graphique adapté :
// 1. nuage de points (usage -> productivité)  2. heatmap (métier x intensité d'usage)  3. bulles (coût -> valeur)
// Cliquer sur un métier (heatmap ou bulle) filtre les autres blocs sur ce métier.
import { metier } from './metiers.js';

const ID = 'cout-productivite';
const C = {
  gain: 'Gain de temps par semaine', use: 'Utilisation par jour', cost: 'Coût mensuel', inc: 'Revenu mensuel',
  hrs: "Heures de travail ou d'étude par jour", prod: 'Score de productivité', prof: 'Profession', type: "Type d'utilisateur",
};
const METRICS = { [C.gain]: 'Gain de temps (h / semaine)', [C.prod]: 'Productivité perçue (/ 10)' };
const UNITS = { [C.gain]: 'h de gain par semaine', [C.prod]: 'point de productivité' };
const W = 760, M = { t: 14, r: 24, b: 46, l: 56 };
const CSS = `
.cp-sec{margin:0 0 34px}.cp-sec h2{font-size:18px;margin:0 0 4px}.cp-answer{margin:0 0 8px;font-weight:600}
.cp-kpis{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0 12px}
.cp-kpi{flex:1;min-width:190px;border:1px solid var(--line);border-radius:10px;padding:10px 14px}
.cp-kpi b{display:block;font-size:26px;color:var(--accent)}.cp-kpi span{color:var(--muted);font-size:12px}
.cp svg text{font-size:12px;fill:#1f2933}.cp-hint{color:var(--muted);font-size:12px;margin:4px 0}
.cp-dot{fill:#0072B2;fill-opacity:.55}.cp-dot.off{fill-opacity:.1}.cp-trend{stroke:#D55E00;stroke-width:2.5;fill:none}
.cp-ref{stroke:#D55E00;stroke-width:1.5;stroke-dasharray:5 4}.cp-bub{fill:#0072B2;fill-opacity:.6;stroke:#004f7c}
.cp-b.off,.cp-row.off{opacity:.25}.cp details{color:var(--muted);font-size:12px}.cp-ctl{display:flex;gap:18px;flex-wrap:wrap;margin:6px 0 18px}`;

export default {
  id: ID,
  title: 'Productivité et rentabilité (managers / RH)',
  mount(root, { d3, store, on }) {
    const o = { group: 'Métier', metric: C.gain, sel: null };
    const fr = d3.formatLocale({ decimal: ',', thousands: '\u202f', grouping: [3], currency: ['', ''] });
    const f0 = fr.format(',.0f'), f1 = fr.format('.1f'), f2 = fr.format('.2f');
    const avg = (a, fn) => (a.length ? f1(d3.mean(a, fn)) : '–');

    function frame(parent, h, x, y, xl, yl) {
      const svg = parent.append('svg').attr('viewBox', `0 0 ${W} ${h}`);
      svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - M.b})`).call(d3.axisBottom(x).ticks(8));
      svg.append('g').attr('class', 'axis').attr('transform', `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(6));
      svg.append('text').attr('x', (M.l + W - M.r) / 2).attr('y', h - 8).attr('text-anchor', 'middle').text(xl);
      svg.append('text').attr('transform', `translate(14,${(M.t + h - M.b) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text(yl);
      return svg;
    }

    function draw() {
      const box = d3.select(root).html('').append('div').attr('class', 'cp');
      box.append('style').text(CSS);
      const cols = store.rows[0] ? Object.keys(store.rows[0]) : [];
      const need = [C.gain, C.use, C.cost, C.inc, C.hrs];
      const missing = need.filter(c => !cols.includes(c));
      if (missing.length || !store.rows.length) {
        box.append('p').attr('class', 'error').text(`Cette visualisation a besoin des colonnes : ${need.join(', ')}. Manquantes : ${missing.join(', ') || 'aucune donnée chargée'}.`);
        return;
      }
      const groupOpts = ['Métier', ...store.schema.categorical.filter(c => c !== C.type)];
      if (!groupOpts.includes(o.group)) o.group = 'Métier';
      if (!cols.includes(o.metric)) o.metric = C.gain;

      const pros = store.rows.filter(r => r[C.type] === 'Professionnel');
      const rows = (pros.length ? pros : store.rows)
        .map(r => ({ ...r, Métier: metier(r[C.prof]), valeur: (r[C.gain] * 4.33 * r[C.inc]) / (r[C.hrs] * 22) }))
        .filter(r => r[C.gain] != null && r[C.use] != null && r[C.cost] != null && Number.isFinite(r.valeur));
      if (!rows.length) { box.append('p').attr('class', 'error').text('Aucune ligne exploitable.'); return; }
      const cur = o.sel ? rows.filter(r => r[o.group] === o.sel) : rows;
      const toggle = d => { o.sel = o.sel === d.key ? null : d.key; draw(); };

      const hint = box.append('p').attr('class', 'cp-hint')
        .text(`${rows.length} répondants analysés${o.sel ? ` · filtre actif : ${o.sel}` : ''}`);
      if (o.sel) hint.append('button').text('Retirer le filtre').style('margin-left', '10px').on('click', () => { o.sel = null; draw(); });
      const ctl = box.append('div').attr('class', 'cp-ctl');
      const pick = (label, opts, val, cb) => {
        const l = ctl.append('label').text(label + ' ');
        l.append('select').on('change', e => cb(e.target.value)).selectAll('option').data(opts).join('option')
          .attr('value', d => d).property('selected', d => d === val).text(d => METRICS[d] ?? d);
      };
      pick('Mesure', Object.keys(METRICS).filter(c => cols.includes(c)), o.metric, v => { o.metric = v; draw(); });
      pick('Regrouper par', groupOpts, o.group, v => { o.group = v; o.sel = null; draw(); });

      const section = t => { const s = box.append('section').attr('class', 'cp-sec'); s.append('h2').text(t); return s; };
      const kpis = (s, items) => {
        const k = s.append('div').attr('class', 'cp-kpis').selectAll('div').data(items).join('div').attr('class', 'cp-kpi');
        k.append('b').text(d => d[0]); k.append('span').text(d => d[1]);
      };
      const grp = d3.groups(rows, r => r[o.group]).map(([k, v]) => ({
        key: k, label: k, n: v.length, v: d3.mean(v, r => r[o.metric]), m: d3.mean(v, r => r[C.cost]), val: d3.mean(v, r => r.valeur),
      })).filter(d => d.n >= 3 && d.key !== 'Non renseigné');

      // 1. Nuage de points : usage -> productivité
      const s1 = section('1. Est-ce que l’utilisation de l’IA augmente la productivité ?');
      const pts = rows.filter(r => r[o.metric] != null), c1 = cur.filter(r => r[o.metric] != null);
      const mx = d3.mean(c1, r => r[C.use]), my = d3.mean(c1, r => r[o.metric]);
      const sxx = d3.sum(c1, r => (r[C.use] - mx) ** 2), syy = d3.sum(c1, r => (r[o.metric] - my) ** 2);
      const sxy = d3.sum(c1, r => (r[C.use] - mx) * (r[o.metric] - my));
      const okR = c1.length > 2 && sxx > 0 && syy > 0, slope = sxy / sxx, rr = sxy / Math.sqrt(sxx * syy);
      s1.append('p').attr('class', 'cp-answer').text(!okR ? 'Pas assez de données pour mesurer un lien.'
        : rr >= 0.4 ? `Oui, le lien est net : chaque heure d’usage en plus va avec ${f1(slope)} ${UNITS[o.metric]} (corrélation r = ${f2(rr)}).`
        : rr >= 0.2 ? `Le lien est modéré : ${f1(slope)} ${UNITS[o.metric]} par heure d’usage en plus (r = ${f2(rr)}).`
        : `Pas de lien net entre le temps d’usage et ce résultat (r = ${f2(rr)}).`);
      kpis(s1, [
        [`${avg(cur, r => r[C.gain])} h`, 'gagnées par semaine en moyenne'],
        [`${f0(d3.mean(cur, r => (r[C.gain] > 0 ? 1 : 0)) * 100)} %`, 'déclarent gagner du temps'],
        ...(cols.includes(C.prod) ? [[`${avg(cur, r => r[C.prod])} / 10`, 'productivité perçue moyenne']] : []),
      ]);
      const H1 = 340;
      const x1 = d3.scaleLinear(d3.extent(rows, r => r[C.use]), [M.l, W - M.r]).nice();
      const y1 = d3.scaleLinear([0, d3.max(pts, r => r[o.metric])], [H1 - M.b, M.t]).nice();
      const sv1 = frame(s1, H1, x1, y1, 'Temps passé avec l’IA (h / jour)', METRICS[o.metric]);
      sv1.selectAll('circle').data(pts, d => d.__id).join('circle')
        .attr('class', d => 'cp-dot' + (o.sel && d[o.group] !== o.sel ? ' off' : ''))
        .attr('cx', d => x1(d[C.use])).attr('cy', d => y1(d[o.metric])).attr('r', 4.5)
        .append('title').text(d => `${d.__id} : ${f1(d[C.use])} h/jour, ${f1(d[o.metric])}`);
      if (okR) {
        const [a, b] = d3.extent(c1, r => r[C.use]), yy = v => y1(my + slope * (v - mx));
        sv1.append('line').attr('class', 'cp-trend').attr('x1', x1(a)).attr('y1', yy(a)).attr('x2', x1(b)).attr('y2', yy(b));
      }
      s1.append('p').attr('class', 'cp-hint').text('Un point = un répondant. Droite orange = tendance. Valeurs déclarées : un lien n’est pas une preuve de cause.');

      // 2. Heatmap : métier x intensité d'usage
      const s2 = section('2. Pour quels métiers l’IA semble-t-elle améliorer le plus la productivité ?');
      const u = rows.map(r => r[C.use]).sort(d3.ascending);
      const q = [0.25, 0.5, 0.75].map(p => Math.round(d3.quantile(u, p) * 2) / 2);
      const lab = [`≤ ${q[0]} h`, `${q[0]}–${q[1]} h`, `${q[1]}–${q[2]} h`, `> ${q[2]} h`];
      const bk = h => (h <= q[0] ? 0 : h <= q[1] ? 1 : h <= q[2] ? 2 : 3);
      const hm = grp.map(g => {
        const cells = [0, 1, 2, 3].map(k => {
          const v = rows.filter(r => r[o.group] === g.key && bk(r[C.use]) === k && r[o.metric] != null);
          return { k, n: v.length, v: v.length >= 2 ? d3.mean(v, r => r[o.metric]) : null };
        });
        const ok = cells.filter(c => c.v != null);
        return { ...g, cells, eff: ok.length >= 2 ? ok.at(-1).v - ok[0].v : null };
      }).sort((a, b) => (b.eff ?? -Infinity) - (a.eff ?? -Infinity));
      const best = hm.find(g => g.eff != null);
      s2.append('p').attr('class', 'cp-answer').text(best
        ? `${best.label} : +${f1(best.eff)} ${UNITS[o.metric]} entre les usages faibles et les usages intensifs, l’écart le plus fort.`
        : 'Pas assez de données pour comparer les groupes.');
      s2.append('p').attr('class', 'cp-hint').text('Chaque case = moyenne pour un métier et un niveau d’usage quotidien (plus c’est foncé, plus c’est élevé). La colonne de droite compare usage fort et usage faible. Cliquez sur un métier pour filtrer ; « – » = moins de 2 personnes.');
      const rh = 36, L = 200, cw = (W - L - 120) / 4, top = 28;
      const sv2 = s2.append('svg').attr('viewBox', `0 0 ${W} ${top + hm.length * rh + 6}`);
      const vals = hm.flatMap(g => g.cells.map(c => c.v)).filter(v => v != null), dom = d3.extent(vals);
      const color = d3.scaleSequential(t => d3.interpolateBlues(0.12 + 0.88 * t)).domain(dom);
      lab.forEach((t, i) => sv2.append('text').attr('x', L + i * cw + cw / 2).attr('y', 16).attr('text-anchor', 'middle').text(t));
      sv2.append('text').attr('x', L + 4 * cw + 12).attr('y', 16).style('font-weight', 600).text('Écart fort − faible');
      sv2.selectAll('g').data(hm, d => d.key).join('g')
        .attr('class', d => 'cp-row' + (o.sel && o.sel !== d.key ? ' off' : ''))
        .attr('transform', (d, i) => `translate(0,${top + i * rh})`).style('cursor', 'pointer').on('click', (_, d) => toggle(d))
        .each(function (d) {
          const g = d3.select(this);
          g.append('text').attr('x', L - 8).attr('y', rh / 2 + 4).attr('text-anchor', 'end').text(`${d.label} (n = ${d.n})`);
          d.cells.forEach(c => {
            const t = c.v == null ? 0 : (c.v - dom[0]) / (dom[1] - dom[0] || 1);
            g.append('rect').attr('x', L + c.k * cw + 1).attr('y', 1).attr('width', cw - 2).attr('height', rh - 2).attr('rx', 3)
              .style('fill', c.v == null ? '#eceff2' : color(c.v))
              .append('title').text(`${d.label}, ${lab[c.k]} : ${c.v == null ? 'trop peu de données' : f1(c.v)} (n = ${c.n})`);
            g.append('text').attr('x', L + c.k * cw + cw / 2).attr('y', rh / 2 + 4).attr('text-anchor', 'middle')
              .style('fill', c.v != null && t > 0.55 ? '#fff' : '#1f2933').text(c.v == null ? '–' : f1(c.v));
          });
          g.append('text').attr('x', L + 4 * cw + 12).attr('y', rh / 2 + 4).style('font-weight', 600)
            .style('fill', d.eff == null ? '#6b7785' : d.eff > 0 ? '#007a5a' : '#b00020').text(d.eff == null ? '–' : (d.eff > 0 ? '+' : '') + f1(d.eff));
        });

      // 3. Bulles : coût -> valeur du temps gagné
      const s3 = section('3. Est-ce que l’utilisation de l’IA est rentable ?');
      const pay = cur.filter(r => r[C.cost] > 0), free = cur.filter(r => !(r[C.cost] > 0));
      const ratio = d3.sum(pay, r => r.valeur) / d3.sum(pay, r => r[C.cost]);
      const win = d3.mean(pay, r => (r.valeur > r[C.cost] ? 1 : 0));
      const dg = d3.mean(pay, r => r[C.gain]) - d3.mean(free, r => r[C.gain]);
      const cmp = !free.length ? '' : Math.abs(dg) < 1 ? ' Payer ne change presque pas le gain de temps par rapport aux outils gratuits.'
        : dg > 0 ? ' Les abonnés gagnent plus de temps que les utilisateurs d’outils gratuits.' : ' Les abonnés gagnent moins de temps que les utilisateurs d’outils gratuits.';
      s3.append('p').attr('class', 'cp-answer').text(pay.length
        ? `Oui : pour 1 dépensé en abonnement, environ ${f0(ratio)} de valeur de temps gagné ; ${f0(win * 100)} % des abonnés gagnent plus qu’ils ne paient.${cmp}`
        : 'Aucun abonné payant dans cette sélection : le coût est nul.');
      kpis(s3, pay.length ? [
        [`× ${f0(ratio)}`, 'valeur du temps gagné pour 1 dépensé (abonnés payants)'],
        [`${f0(win * 100)} %`, 'des abonnés gagnent plus qu’ils ne paient'],
        [`${avg(free, r => r[C.gain])} h vs ${avg(pay, r => r[C.gain])} h`, 'gain de temps par semaine : gratuit vs payant'],
      ] : [['–', 'pas d’abonné payant']]);
      s3.append('p').attr('class', 'cp-hint').text('Une bulle = un groupe ; sa taille = le nombre de répondants. Au-dessus de la ligne orange, l’IA rapporte plus qu’elle ne coûte (montants par mois, dans la monnaie du dataset). Cliquez sur une bulle pour filtrer.');
      if (grp.length) {
        const H3 = 360;
        const x3 = d3.scaleLinear([0, (d3.max(grp, d => d.m) || 1) * 1.2], [M.l, W - M.r]);
        const y3 = d3.scaleLinear([0, (d3.max(grp, d => d.val) || 1) * 1.15], [H3 - M.b, M.t]);
        const sv3 = frame(s3, H3, x3, y3, 'Coût moyen de l’abonnement (par mois)', 'Valeur du temps gagné (par mois)');
        const xm = Math.min(x3.domain()[1], y3.domain()[1]);
        sv3.append('line').attr('class', 'cp-ref').attr('x1', x3(0)).attr('y1', y3(0)).attr('x2', x3(xm)).attr('y2', y3(xm));
        sv3.append('text').attr('x', x3(xm) - 4).attr('y', y3(xm) - 6).attr('text-anchor', 'end').style('fill', '#D55E00').text('seuil de rentabilité (valeur = coût)');
        const rS = d3.scaleSqrt([0, d3.max(grp, d => d.n)], [5, 30]);
        const bub = sv3.selectAll('g.b').data(grp, d => d.key).join('g')
          .attr('class', d => 'cp-b' + (o.sel && o.sel !== d.key ? ' off' : '')).style('cursor', 'pointer').on('click', (_, d) => toggle(d));
        bub.append('circle').attr('class', 'cp-bub').attr('cx', d => x3(d.m)).attr('cy', d => y3(d.val)).attr('r', d => rS(d.n))
          .append('title').text(d => `${d.label} : coût ${f0(d.m)}, valeur ${f0(d.val)}, n = ${d.n}`);
        bub.append('text').attr('x', d => x3(d.m)).attr('y', d => y3(d.val) - rS(d.n) - 5).attr('text-anchor', 'middle').text(d => d.label);
      }

      box.append('details').html('<summary>Comment c’est calculé ?</summary><p>Valeur du temps gagné = gain de temps par semaine × 4,33 semaines × taux horaire, avec taux horaire = revenu mensuel ÷ (heures travaillées par jour × 22 jours). Les niveaux d’usage de la heatmap sont les quartiles du temps d’usage quotidien. Tous les chiffres sont déclarés par les répondants (rien n’est mesuré) et il n’y a pas de groupe témoin : on observe un lien, pas une preuve que l’IA est la cause. Les familles de métiers regroupent les intitulés libres de la colonne « Profession » (fichier metiers.js).</p>');
    }

    on('data', draw);
    draw();
  },
};
