// Trois questions pour les managers / RH, une réponse chiffrée + un graphique chacune :
// 1. L'IA fait-elle gagner du temps ?  2. Pour quels métiers ?  3. Est-ce rentable ?
// Cliquer sur un métier (bloc 2) filtre les blocs 1 et 3 sur ce métier.
import { metier } from './metiers.js';

const ID = 'cout-productivite';
const C = {
  gain: 'Gain de temps par semaine', use: 'Utilisation par jour', cost: 'Coût mensuel', inc: 'Revenu mensuel',
  hrs: "Heures de travail ou d'étude par jour", prod: 'Score de productivité', prof: 'Profession', type: "Type d'utilisateur",
};
const METRICS = { [C.gain]: 'Gain de temps (h / semaine)', [C.prod]: 'Productivité perçue (/ 10)' };
const CSS = `
.cp-sec{margin:0 0 30px}.cp-sec h2{font-size:18px;margin:0 0 4px}.cp-answer{margin:0 0 8px;font-weight:600}
.cp-kpis{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0 12px}
.cp-kpi{flex:1;min-width:190px;border:1px solid var(--line);border-radius:10px;padding:10px 14px}
.cp-kpi b{display:block;font-size:26px;color:var(--accent)}.cp-kpi span{color:var(--muted);font-size:12px}
.cp svg text{font-size:12px;fill:#1f2933}.cp-bar{fill:#0072B2}.cp-cost{fill:#E69F00}.cp-row.off{opacity:.3}
.cp-hint{color:var(--muted);font-size:12px;margin:4px 0}.cp-sw{display:inline-block;width:12px;height:12px;margin:0 5px 0 12px;border-radius:2px;vertical-align:-1px}
.cp details{color:var(--muted);font-size:12px}.cp-ctl{display:flex;gap:18px;flex-wrap:wrap;margin:6px 0}`;

export default {
  id: ID,
  title: 'Productivité et rentabilité (managers / RH)',
  mount(root, { d3, store, on }) {
    const o = { group: 'Métier', metric: C.gain, sel: null };
    const fr = d3.formatLocale({ decimal: ',', thousands: '\u202f', grouping: [3], currency: ['', ''] });
    const f0 = fr.format(',.0f'), f1 = fr.format('.1f');
    const avg = (a, fn) => (a.length ? f1(d3.mean(a, fn)) : '–');

    function hbars(parent, rows, { fmt, two = false, onClick }) {
      const rh = two ? 38 : 26, W = 760, L = 180, R = 120;
      const svg = parent.append('svg').attr('viewBox', `0 0 ${W} ${rows.length * rh + 6}`);
      const x = d3.scaleLinear([0, d3.max(rows, d => Math.max(d.v, d.m ?? 0)) || 1], [0, W - L - R]);
      const g = svg.selectAll('g').data(rows, d => d.key).join('g')
        .attr('class', d => 'cp-row' + (o.sel && o.sel !== d.key && onClick ? ' off' : ''))
        .attr('transform', (d, i) => `translate(0,${i * rh})`)
        .style('cursor', onClick ? 'pointer' : 'default').on('click', (_, d) => onClick?.(d));
      g.append('text').attr('x', L - 8).attr('y', rh / 2 + 4).attr('text-anchor', 'end').text(d => d.label);
      g.append('rect').attr('class', 'cp-bar').attr('x', L).attr('y', 3).attr('height', two ? 16 : 18).attr('width', d => Math.max(1, x(d.v)));
      g.append('text').attr('x', d => L + x(d.v) + 6).attr('y', two ? 16 : 17).text(d => `${fmt(d.v)}  (n = ${d.n})`);
      if (two) {
        g.append('rect').attr('class', 'cp-cost').attr('x', L).attr('y', 21).attr('height', 10).attr('width', d => Math.max(1, x(d.m)));
        g.append('text').attr('x', d => L + x(d.m) + 6).attr('y', 30).text(d => fmt(d.m));
      }
    }

    function draw() {
      const box = d3.select(root).html('').append('div').attr('class', 'cp');
      box.append('style').text(CSS);
      const cols = store.rows[0] ? Object.keys(store.rows[0]) : [];
      const missing = [C.gain, C.use, C.cost, C.inc, C.hrs].filter(c => !cols.includes(c));
      if (missing.length || !store.rows.length) {
        box.append('p').attr('class', 'error').text(`Cette visualisation a besoin des colonnes : ${[C.gain, C.use, C.cost, C.inc, C.hrs].join(', ')}. Manquantes : ${missing.join(', ') || 'aucune donnée chargée'}.`);
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
      const section = t => { const s = box.append('section').attr('class', 'cp-sec'); s.append('h2').text(t); return s; };
      const kpis = (s, items) => {
        const k = s.append('div').attr('class', 'cp-kpis').selectAll('div').data(items).join('div').attr('class', 'cp-kpi');
        k.append('b').text(d => d[0]); k.append('span').text(d => d[1]);
      };

      box.insert('p', 'section').attr('class', 'cp-hint').html('')
        .text(`${rows.length} répondants analysés${o.sel ? ` · filtre actif : ${o.sel}` : ''}`)
        .append('button').text(o.sel ? 'Retirer le filtre' : '').style('display', o.sel ? null : 'none').style('margin-left', '10px').on('click', () => { o.sel = null; draw(); });

      // 1. Gain de temps
      const s1 = section('1. L’IA fait-elle gagner du temps ?');
      const u = cur.map(r => r[C.use]).sort(d3.ascending);
      const q = [0.25, 0.5, 0.75].map(p => Math.round(d3.quantile(u, p) * 2) / 2);
      const lab = [`≤ ${q[0]} h / jour`, `${q[0]}–${q[1]} h / jour`, `${q[1]}–${q[2]} h / jour`, `> ${q[2]} h / jour`];
      const bk = h => (h <= q[0] ? 0 : h <= q[1] ? 1 : h <= q[2] ? 2 : 3);
      const us = d3.groups(cur, r => bk(r[C.use])).sort((a, b) => a[0] - b[0])
        .map(([k, v]) => ({ key: lab[k], label: lab[k], n: v.length, v: d3.mean(v, r => r[C.gain]) }));
      const first = us[0], last = us.at(-1);
      s1.append('p').attr('class', 'cp-answer').text(us.length > 1 && last.v > first.v
        ? `Oui, et plus on l’utilise, plus on gagne : ${f1(last.v)} h par semaine pour les plus gros utilisateurs, contre ${f1(first.v)} h pour les plus occasionnels.`
        : 'Le gain de temps déclaré ne varie pas nettement avec l’intensité d’usage.');
      kpis(s1, [
        [`${avg(cur, r => r[C.gain])} h`, 'gagnées par semaine en moyenne'],
        [`${f0(d3.mean(cur, r => (r[C.gain] > 0 ? 1 : 0)) * 100)} %`, 'déclarent gagner du temps'],
        ...(cols.includes(C.prod) ? [[`${avg(cur, r => r[C.prod])} / 10`, 'productivité perçue moyenne']] : []),
      ]);
      s1.append('p').attr('class', 'cp-hint').text('Gain de temps moyen (h / semaine) selon le temps passé avec l’IA chaque jour');
      hbars(s1, us, { fmt: f1 });

      // 2. Métiers
      const grp = d3.groups(rows, r => r[o.group]).map(([k, v]) => ({
        key: k, label: k, n: v.length, v: d3.mean(v, r => r[o.metric]), m: d3.mean(v, r => r[C.cost]), val: d3.mean(v, r => r.valeur),
      })).filter(d => d.n >= 3 && d.key !== 'Non renseigné');
      const s2 = section('2. Pour quels métiers l’IA aide-t-elle le plus ?');
      const g2 = [...grp].sort((a, b) => b.v - a.v);
      s2.append('p').attr('class', 'cp-answer').text(g2.length > 1
        ? `${g2[0].label} en tête (${f1(g2[0].v)}), ${g2.at(-1).label} en dernier (${f1(g2.at(-1).v)}).` : 'Pas assez de groupes pour comparer.');
      const ctl = s2.append('div').attr('class', 'cp-ctl');
      const pick = (label, opts, val, cb) => {
        const l = ctl.append('label').text(label + ' ');
        l.append('select').on('change', e => cb(e.target.value)).selectAll('option').data(opts).join('option')
          .attr('value', d => d).property('selected', d => d === val).text(d => METRICS[d] ?? d);
      };
      pick('Mesure', Object.keys(METRICS).filter(c => cols.includes(c)), o.metric, v => { o.metric = v; draw(); });
      pick('Regrouper par', groupOpts, o.group, v => { o.group = v; o.sel = null; draw(); });
      s2.append('p').attr('class', 'cp-hint').text('Cliquez sur une barre pour filtrer les autres blocs sur ce groupe. Les groupes de moins de 3 personnes sont masqués.');
      hbars(s2, g2, { fmt: f1, onClick: d => { o.sel = o.sel === d.key ? null : d.key; draw(); } });

      // 3. Rentabilité
      const s3 = section('3. Est-ce rentable ?');
      const pay = cur.filter(r => r[C.cost] > 0), free = cur.filter(r => !(r[C.cost] > 0));
      const ratio = d3.sum(pay, r => r.valeur) / d3.sum(pay, r => r[C.cost]);
      const win = d3.mean(pay, r => (r.valeur > r[C.cost] ? 1 : 0));
      const dg = d3.mean(pay, r => r[C.gain]) - d3.mean(free, r => r[C.gain]);
      const cmp = !free.length ? '' : Math.abs(dg) < 1 ? ' Payer ne change presque pas le gain de temps par rapport aux outils gratuits.'
        : dg > 0 ? ' Les abonnés gagnent plus de temps que les utilisateurs d’outils gratuits.' : ' Les abonnés gagnent moins de temps que les utilisateurs d’outils gratuits.';
      s3.append('p').attr('class', 'cp-answer').text(pay.length
        ? `Pour 1 dépensé en abonnement, environ ${f0(ratio)} de valeur de temps gagné ; ${f0(win * 100)} % des abonnés gagnent plus qu’ils ne paient.${cmp}`
        : 'Aucun abonné payant dans cette sélection : le coût est nul.');
      kpis(s3, pay.length ? [
        [`× ${f0(ratio)}`, 'valeur du temps gagné pour 1 dépensé (abonnés payants)'],
        [`${f0(win * 100)} %`, 'des abonnés gagnent plus qu’ils ne paient'],
        [`${avg(free, r => r[C.gain])} h vs ${avg(pay, r => r[C.gain])} h`, 'gain de temps par semaine : gratuit vs payant'],
      ] : [['–', 'pas d’abonné payant']]);
      s3.append('p').attr('class', 'cp-hint').html('<span class="cp-sw" style="background:#0072B2;margin-left:0"></span>Valeur du temps gagné, par mois<span class="cp-sw" style="background:#E69F00"></span>Coût de l’abonnement, par mois (montants dans la monnaie du dataset)');
      hbars(s3, [...grp].sort((a, b) => b.val - a.val).map(d => ({ ...d, v: d.val })), { fmt: f0, two: true });

      box.append('details').html('<summary>Comment c’est calculé ?</summary><p>Valeur du temps gagné = gain de temps par semaine × 4,33 semaines × taux horaire, avec taux horaire = revenu mensuel ÷ (heures travaillées par jour × 22 jours). Tous les chiffres sont déclarés par les répondants (rien n’est mesuré) et il n’y a pas de groupe témoin : on observe un lien, pas une preuve que l’IA est la cause. Les familles de métiers regroupent les intitulés libres de la colonne « Profession » (fichier metiers.js).</p>');
    }

    on('data', draw);
    draw();
  },
};
