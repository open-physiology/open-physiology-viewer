const orthogonalConnector2 = (function () {
  function t(t, s) {
      return { x: t, y: s };
  }
  class s {
      constructor(t, s, e, o) {
          (this.left = t), (this.top = s), (this.width = e), (this.height = o);
      }
      static get empty() {
          return new s(0, 0, 0, 0);
      }
      static fromRect(t) {
          return new s(t.left, t.top, t.width, t.height);
      }
      static fromLTRB(t, e, o, n) {
          return new s(t, e, o - t, n - e);
      }
      contains(t) {
          return t.x >= this.left && t.x <= this.right && t.y >= this.top && t.y <= this.bottom;
      }
      inflate(t, e) {
          return s.fromLTRB(this.left - t, this.top - e, this.right + t, this.bottom + e);
      }
      intersects(t) {
          let s = this.left,
              e = this.top,
              o = this.width,
              n = this.height,
              r = t.left,
              i = t.top,
              h = t.width,
              c = t.height;
          return r < s + o && s < r + h && i < e + n && e < i + c;
      }
      union(t) {
          const e = [this.left, this.right, t.left, t.right],
              o = [this.top, this.bottom, t.top, t.bottom];
          return s.fromLTRB(Math.min(...e), Math.min(...o), Math.max(...e), Math.max(...o));
      }
      get center() {
          return { x: this.left + this.width / 2, y: this.top + this.height / 2 };
      }
      get right() {
          return this.left + this.width;
      }
      get bottom() {
          return this.top + this.height;
      }
      get location() {
          return t(this.left, this.top);
      }
      get northEast() {
          return { x: this.right, y: this.top };
      }
      get southEast() {
          return { x: this.right, y: this.bottom };
      }
      get southWest() {
          return { x: this.left, y: this.bottom };
      }
      get northWest() {
          return { x: this.left, y: this.top };
      }
      get east() {
          return t(this.right, this.center.y);
      }
      get north() {
          return t(this.center.x, this.top);
      }
      get south() {
          return t(this.center.x, this.bottom);
      }
      get west() {
          return t(this.left, this.center.y);
      }
      get size() {
          return { width: this.width, height: this.height };
      }
  }
  class e {
      constructor(t) {
          (this.data = t), (this.distance = Number.MAX_SAFE_INTEGER), (this.shortestPath = []), (this.adjacentNodes = new Map());
      }
  }
  class o {
      constructor() {
          this.index = {};
      }
      add(t) {
          const { x: s, y: o } = t,
              n = s.toString(),
              r = o.toString();
          n in this.index || (this.index[n] = {}), r in this.index[n] || (this.index[n][r] = new e(t));
      }
      getLowestDistanceNode(t) {
          let s = null,
              e = Number.MAX_SAFE_INTEGER;
          for (const o of t) {
              const t = o.distance;
              t < e && ((e = t), (s = o));
          }
          return s;
      }
      inferPathDirection(t) {
          return 0 == t.shortestPath.length ? null : this.directionOfNodes(t.shortestPath[t.shortestPath.length - 1], t);
      }
      calculateShortestPathFromSource(t, s) {
          s.distance = 0;
          const e = new Set(),
              o = new Set();
          for (o.add(s); 0 != o.size; ) {
              const t = this.getLowestDistanceNode(o);
              o.delete(t);
              for (const [s, n] of t.adjacentNodes) e.has(s) || (this.calculateMinimumDistance(s, n, t), o.add(s));
              e.add(t);
          }
          return t;
      }
      calculateMinimumDistance(t, s, e) {
          const o = e.distance,
              n = this.inferPathDirection(e),
              r = this.directionOfNodes(e, t),
              i = n && r && n != r ? Math.pow(s + 1, 2) : 0;
          if (o + s + i < t.distance) {
              t.distance = o + s + i;
              const n = [...e.shortestPath];
              n.push(e), (t.shortestPath = n);
          }
      }
      directionOf(t, s) {
          return t.x === s.x ? "h" : t.y === s.y ? "v" : null;
      }
      directionOfNodes(t, s) {
          return this.directionOf(t.data, s.data);
      }
      connect(t, s) {
          const e = this.get(t),
              o = this.get(s);
          if (!e || !o) throw new Error("A point was not found");
          e.adjacentNodes.set(
              o,
              (function (t, s) {
                  return Math.sqrt(Math.pow(s.x - t.x, 2) + Math.pow(s.y - t.y, 2));
              })(t, s)
          );
      }
      has(t) {
          const { x: s, y: e } = t,
              o = s.toString(),
              n = e.toString();
          return o in this.index && n in this.index[o];
      }
      get(t) {
          const { x: s, y: e } = t,
              o = s.toString(),
              n = e.toString();
          return o in this.index && n in this.index[o] ? this.index[o][n] : null;
      }
  }
  function n(e) {
      const o = s.fromRect(e.shape);
      switch (e.side) {
          case "bottom":
              return t(o.left + o.width * e.distance, o.bottom);
          case "top":
              return t(o.left + o.width * e.distance, o.top);
          case "left":
              return t(o.left, o.top + o.height * e.distance);
          case "right":
              return t(o.right, o.top + o.height * e.distance);
      }
  }
  function r(s, e) {
      const { x: o, y: r } = n(s);
      switch (s.side) {
          case "top":
              return t(o, r - e);
          case "right":
              return t(o + e, r);
          case "bottom":
              return t(o, r + e);
          case "left":
              return t(o - e, r);
      }
  }
  function i(t) {
      return "top" == t || "bottom" == t;
  }
  function h(s, e) {
      const o = [];
      for (const [t, e] of s.data) {
          const n = 0 == t,
              r = t == s.rows - 1;
          for (const [t, i] of e) {
              const e = 0 == t,
                  h = t == s.columns - 1,
                  c = n && h,
                  a = r && h,
                  u = r && e;
              (e && n) || c || a || u
                  ? o.push(i.northWest, i.northEast, i.southWest, i.southEast)
                  : n
                  ? o.push(i.northWest, i.north, i.northEast)
                  : r
                  ? o.push(i.southEast, i.south, i.southWest)
                  : e
                  ? o.push(i.northWest, i.west, i.southWest)
                  : h
                  ? o.push(i.northEast, i.east, i.southEast)
                  : o.push(i.northWest, i.north, i.northEast, i.east, i.southEast, i.south, i.southWest, i.west, i.center);
          }
      }
      return (function (s) {
          const e = [],
              o = new Map();
          s.forEach((t) => {
              const { x: s, y: e } = t;
              let n = o.get(e) || o.set(e, []).get(e);
              n.indexOf(s) < 0 && n.push(s);
          });
          for (const [s, n] of o) for (const o of n) e.push(t(o, s));
          return e;
      })(o).filter((t) => !((t) => e.filter((s) => s.contains(t)).length > 0)(t));
  }
  function c(t, s, e) {
      const o = t.get(s),
          n = t.get(e);
      if (!o) throw new Error(`Origin node {${s.x},${s.y}} not found`);
      if (!n) throw new Error(`Origin node {${s.x},${s.y}} not found`);
      return t.calculateShortestPathFromSource(t, o), n.shortestPath.map((t) => t.data);
  }
  function a(t, s, e) {
      const o = t.x === s.x && s.x === e.x,
          n = t.y === s.y && s.y === e.y,
          r = t.y === s.y,
          i = t.x === s.x,
          h = s.y === e.y,
          c = s.x === e.x;
      if (o || n) return "none";
      if ((!i && !r) || (!c && !h)) return "unknown";
      if (r && c) return e.y > s.y ? "s" : "n";
      if (i && h) return e.x > s.x ? "e" : "w";
      throw new Error("Nope");
  }
  class u {
      constructor() {
          (this._rows = 0), (this._cols = 0), (this.data = new Map());
      }
      set(t, s, e) {
          (this._rows = Math.max(this.rows, t + 1)), (this._cols = Math.max(this.columns, s + 1)), (this.data.get(t) || this.data.set(t, new Map()).get(t)).set(s, e);
      }
      get(t, s) {
          const e = this.data.get(t);
          return (e && e.get(s)) || null;
      }
      rectangles() {
          const t = [];
          for (const [s, e] of this.data) for (const [s, o] of e) t.push(o);
          return t;
      }
      get columns() {
          return this._cols;
      }
      get rows() {
          return this._rows;
      }
  }
  class f {
      static route(e) {
          const { pointA: f, pointB: d, globalBoundsMargin: l } = e,
              g = [],
              p = [],
              m = [],
              x = i(f.side),
              w = i(d.side),
              y = n(f),
              b = n(d),
              M = s.fromRect(f.shape),
              E = s.fromRect(d.shape),
              R = s.fromRect(e.globalBounds);
          let S = e.shapeMargin,
              N = M.inflate(S, S),
              B = E.inflate(S, S);
          N.intersects(B) && ((S = 0), (N = M), (B = E));
          const O = N.union(B).inflate(l, l),
              P = s.fromLTRB(Math.max(O.left, R.left), Math.max(O.top, R.top), Math.min(O.right, R.right), Math.min(O.bottom, R.bottom));
          for (const t of [N, B]) p.push(t.left), p.push(t.right), m.push(t.top), m.push(t.bottom);
          (x ? p : m).push(x ? y.x : y.y), (w ? p : m).push(w ? b.x : b.y);
          for (const s of [f, d]) {
              const e = n(s),
                  o = (s, o) => g.push(t(e.x + s, e.y + o));
              switch (s.side) {
                  case "top":
                      o(0, -S);
                      break;
                  case "right":
                      o(S, 0);
                      break;
                  case "bottom":
                      o(0, S);
                      break;
                  case "left":
                      o(-S, 0);
              }
          }
          p.sort((t, s) => t - s), m.sort((t, s) => t - s);
          const L = (function (t, e, o) {
                  const n = new u();
                  t.sort((t, s) => t - s), e.sort((t, s) => t - s);
                  let r = o.left,
                      i = o.top,
                      h = 0,
                      c = 0;
                  for (const a of e) {
                      for (const e of t) n.set(c, h++, s.fromLTRB(r, i, e, a)), (r = e);
                      n.set(c, h, s.fromLTRB(r, i, o.right, a)), (r = o.left), (i = a), (h = 0), c++;
                  }
                  r = o.left;
                  for (const e of t) n.set(c, h++, s.fromLTRB(r, i, e, o.bottom)), (r = e);
                  return n.set(c, h, s.fromLTRB(r, i, o.right, o.bottom)), n;
              })(p, m, P),
              T = h(L, [N, B]);
          g.push(...T);
          const { graph: W, connections: _ } = (function (s) {
                  const e = [],
                      n = [],
                      r = new o(),
                      i = [];
                  s.forEach((t) => {
                      const { x: s, y: o } = t;
                      e.indexOf(s) < 0 && e.push(s), n.indexOf(o) < 0 && n.push(o), r.add(t);
                  }),
                      e.sort((t, s) => t - s),
                      n.sort((t, s) => t - s);
                  const h = (t) => r.has(t);
                  for (let s = 0; s < n.length; s++)
                      for (let o = 0; o < e.length; o++) {
                          const c = t(e[o], n[s]);
                          if (h(c)) {
                              if (o > 0) {
                                  const a = t(e[o - 1], n[s]);
                                  h(a) && (r.connect(a, c), r.connect(c, a), i.push({ a: a, b: c }));
                              }
                              if (s > 0) {
                                  const a = t(e[o], n[s - 1]);
                                  h(a) && (r.connect(a, c), r.connect(c, a), i.push({ a: a, b: c }));
                              }
                          }
                      }
                  return { graph: r, connections: i };
              })(g),
              A = r(f, S),
              D = r(d, S),
              k = n(f),
              F = n(d);
          return (
              (this.byproduct.spots = g),
              (this.byproduct.vRulers = p),
              (this.byproduct.hRulers = m),
              (this.byproduct.grid = L.rectangles()),
              (this.byproduct.connections = _),
              c(W, A, D).length > 0
                  ? (function (t) {
                        if (t.length <= 2) return t;
                        const s = [t[0]];
                        for (let e = 1; e < t.length; e++) {
                            const o = t[e];
                            if (e === t.length - 1) {
                                s.push(o);
                                break;
                            }
                            "none" !== a(t[e - 1], o, t[e + 1]) && s.push(o);
                        }
                        return s;
                    })([k, ...c(W, A, D), F])
                  : []
          );
      }
  }
  return (f.byproduct = { hRulers: [], vRulers: [], spots: [], grid: [], connections: [] }), f;
})();  

export default orthogonalConnector2;