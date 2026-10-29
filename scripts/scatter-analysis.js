/* Strict same-month statistics, independent of legacy correlation/lag calculations. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./macro-analysis.js'));
  else root.ScatterAnalysis = factory(root.MacroAnalysis);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (M) {
  'use strict';
  const THRESHOLD = 1.75, MIN_SAMPLE = 4;
  function index(series) {
    const result = new Map();
    for (const p of series || []) {
      const month = M.monthKey(p.date);
      if (result.has(month)) throw new Error('Duplicate observation month ' + month);
      result.set(month, {value:p.value, date:p.date});
    }
    return result;
  }
  function join(xSeries, ySeries, from, to) {
    const x = index(xSeries), y = index(ySeries);
    if (from) from = M.monthKey(from);
    if (to) to = M.monthKey(to);
    if (from && to && from > to) throw new Error('From month must not be after To month.');
    const months = [...new Set([...x.keys(), ...y.keys()])].sort();
    const points = [];
    let excluded = 0;
    for (const month of months) {
      if ((from && month < from) || (to && month > to)) continue;
      const a = x.get(month), b = y.get(month);
      if (typeof a?.value !== 'number' || !Number.isFinite(a.value) || typeof b?.value !== 'number' || !Number.isFinite(b.value)) {excluded++; continue;}
      points.push({month, x:a.value, y:b.value, xDate:a.date, yDate:b.date});
    }
    return {points, months, excluded};
  }
  function statistics(points) {
    const n = points.length;
    const unavailable = reason => ({n, r:null, r2:null, slope:null, intercept:null, line:[], residuals:[], reason});
    if (points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error('Statistics require finite paired observations.');
    if (n < MIN_SAMPLE) return unavailable('At least 4 paired months are required for statistics and OLS.');
    const mx = points.reduce((s,p) => s+p.x/n,0), my = points.reduce((s,p) => s+p.y/n,0);
    const sx = Math.max(...points.map(p => Math.abs(p.x-mx))), sy = Math.max(...points.map(p => Math.abs(p.y-my)));
    if (!sx || !sy) return unavailable('Constant series: correlation, R² and regression diagnostics are unavailable.');
    // Scale centred values to avoid overflowing squared observations.
    let xx=0, yy=0, xy=0;
    for (const p of points) {const x=(p.x-mx)/sx, y=(p.y-my)/sy; xx+=x*x; yy+=y*y; xy+=x*y;}
    const r = Math.max(-1, Math.min(1, xy/Math.sqrt(xx*yy)));
    const normalizedSlope=xy/xx, slope=normalizedSlope*(sy/sx), intercept=my-slope*mx;
    const errors=points.map(p => (p.y-my)/sy-normalizedSlope*((p.x-mx)/sx));
    const sd=Math.sqrt(errors.reduce((s,e)=>s+e*e,0)/(n-1));
    const residuals=errors.map((e,i)=>({month:points[i].month, residual:e*sy,
      score:sd>1e-12 ? e/sd : null, flagged:sd>1e-12 && Math.abs(e/sd)>=THRESHOLD}));
    const lo=Math.min(...points.map(p=>p.x)), hi=Math.max(...points.map(p=>p.x));
    const line=[lo,hi].map(x=>({x,y:my+normalizedSlope*((x-mx)/sx)*sy}));
    if (![r,slope,intercept,...line.map(p=>p.y)].every(Number.isFinite)) return unavailable('Numerical range is too large for reliable statistics.');
    return {n,r,r2:r*r,slope,intercept,line,residuals,reason:null};
  }
  return {THRESHOLD,MIN_SAMPLE,index,join,statistics};
});
