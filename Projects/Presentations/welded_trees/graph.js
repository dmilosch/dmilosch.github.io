/* SVG diagrams for the welded-tree presentation.
 * All modes share the same 62 vertices and one alternating 32-edge weld cycle.
 * A wavefront is a schematic column state, not a simulated walk distribution.
 * Column diagrams use only essential column indices.
 */
(function (root) {
  'use strict';

  const C = {
    ink: '#182331', blue: '#2563eb', teal: '#138a78', coral: '#d75a4a',
    muted: '#aebbc6', purple: '#7860ba', paper: '#ffffff'
  };
  const COLUMN_COLORS = ['#2563eb', '#be7b19', '#8054b3', '#b84182', '#1588a5',
    '#c8653a', '#7f9025', '#587a9c', '#a65b4f', '#138a78'];
  const columnColor = column => COLUMN_COLORS[Math.max(0, Math.min(9, Math.floor(Number(column) || 0)))];
  const columnX = column => column <= 4 ? 70 + column * 100 : 650 + (column - 5) * 100;
  let serial = 0;

  // One presentation-wide split: equal fixed depth from each root.
  // Edge eligibility, guide placement and escape stopping share this region.
  function middleRegion(model) {
    const depth = Math.max(...model.nodes.map(node => node.depth));
    const lastColumn = Math.max(...model.nodes.map(node => node.column));
    const columns = [depth / 2, lastColumn - depth / 2];
    const positions = columns.map(column => model.nodes.find(node => node.column === column).x);
    const rootPositions = ['L0-0', 'R0-0'].map(id => model.byId[id].x);
    const containsVertex = id => {
      const column = model.byId[id].column;
      return column >= columns[0] && column <= columns[1];
    };
    const containsEdge = edge => containsVertex(edge.a) && containsVertex(edge.b);
    const isBoundary = id => columns.includes(model.byId[id].column);
    return { columns, positions, rootPositions, containsVertex, containsEdge, isBoundary };
  }

  function random(seed) {
    let s = seed >>> 0;
    return function () {
      s += 0x6D2B79F5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(values, rng) {
    const a = values.slice();
    for (let i = a.length - 1; i > 0; --i) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildModel(options) {
    const o = options || {};
    const seed = Number.isFinite(Number(o.seed)) ? Number(o.seed) : 17;
    const rng = random(seed);
    const nodes = [], edges = [], byId = Object.create(null);
    ['L', 'R'].forEach(side => {
      for (let depth = 0; depth <= 4; depth++) {
        const count = 2 ** depth;
        for (let index = 0; index < count; index++) {
          const firstLeaf = index * (16 / count);
          const lastLeaf = (index + 1) * (16 / count) - 1;
          const node = {
            id: side + depth + '-' + index, side, depth, index,
            column: side === 'L' ? depth : 9 - depth,
            x: side === 'L' ? 70 + depth * 100 : 1050 - depth * 100,
            y: 40 + (firstLeaf + lastLeaf) * 12,
            uprightX: (side === 'L' ? 65 : 625) + (firstLeaf + lastLeaf) * (430 / 30),
            uprightY: 38 + depth * 86,
            neighbors: []
          };
          nodes.push(node);
          byId[node.id] = node;
          if (depth > 0) addEdge(side + (depth - 1) + '-' + Math.floor(index / 2), node.id, 'tree');
        }
      }
    });

    function addEdge(a, b, kind) {
      const edge = { id: a + ':' + b, a, b, kind };
      edges.push(edge);
      byId[a].neighbors.push(b);
      byId[b].neighbors.push(a);
      return edge;
    }

    const left = shuffle(Array.from({ length: 16 }, (_, i) => 'L4-' + i), rng);
    const right = shuffle(Array.from({ length: 16 }, (_, i) => 'R4-' + i), rng);
    const cycle = [];
    for (let i = 0; i < 16; i++) {
      cycle.push(left[i], right[i]);
      addEdge(left[i], right[i], 'weld');
      addEdge(right[i], left[(i + 1) % 16], 'weld');
    }

    // A visible route through one actual weld edge, with no invented graph edges.
    const entranceLeaf = 'L4-5';
    const leftIndex = left.indexOf(entranceLeaf);
    const exitLeaf = right[leftIndex];
    function ancestors(id) {
      const result = [];
      let node = byId[id];
      while (node) {
        result.push(node.id);
        node = node.depth ? byId[node.side + (node.depth - 1) + '-' + Math.floor(node.index / 2)] : null;
      }
      return result;
    }
    const entrancePath = ancestors(entranceLeaf).reverse();
    const exitPath = ancestors(exitLeaf);
    const path = entrancePath.concat(exitPath);
    const edgeBetween = (a, b) => edges.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a));
    return { nodes, edges, byId, cycle, entranceLeaf, exitLeaf, entrancePath, exitPath, path, edgeBetween };
  }

  // Recorded components keep the coordinates and edges of the welded-tree instance.
  function recordedForest(options) {
    const model = buildModel(options);
    const { byId, entrancePath, exitPath } = model;
    function component(routes) {
      const nodes = Array.from(new Set(routes.flat()));
      const edges = new Map();
      routes.forEach(route => route.slice(1).forEach((id, i) => {
        const edge = model.edgeBetween(route[i], id);
        if (!edge) throw new Error('Recorded forest must use actual graph edges.');
        edges.set(edge.id, edge);
      }));
      return { routes, nodes, edges: Array.from(edges.values()) };
    }
    const first = component([
      entrancePath.slice(2).concat(exitPath.slice(0, 2)),
      [entrancePath[3], 'L4-' + (byId[model.entranceLeaf].index ^ 1)]
    ]);
    const occupied = new Set(first.nodes);
    const candidates = [];
    model.nodes.filter(node => node.side === 'R' && node.depth === 4).forEach(right => {
      right.neighbors.filter(id => byId[id].side === 'L').forEach(leftId => {
        const parentIndex = Math.floor(right.index / 2);
        const parent = 'R3-' + parentIndex;
        const grandparent = 'R2-' + Math.floor(right.index / 4);
        const candidate = component([
          [grandparent, parent, right.id, leftId, 'L3-' + Math.floor(byId[leftId].index / 2)],
          [parent, 'R4-' + (right.index ^ 1)],
          [grandparent, 'R3-' + (parentIndex ^ 1)]
        ]);
        if (candidate.nodes.some(id => occupied.has(id))) return;
        candidate.height = candidate.nodes.reduce((sum, id) => sum + byId[id].y, 0) / candidate.nodes.length;
        candidates.push(candidate);
      });
    });
    candidates.sort((a, b) => b.height - a.height);
    if (!candidates.length) throw new Error('No disjoint recorded component found.');
    return { model, components: [first, candidates[0]] };
  }

  // Histories, rather than distinct endpoints: different nonbacktracking walks
  // may meet again in the finite illustrated graph and must still be counted.
  function uphillRoutes(options, k) {
    const o = options || {};
    const requested = Number(k === undefined ? (o.stage === undefined ? 0 : o.stage) : k);
    const steps = Number.isFinite(requested) ? Math.max(0, Math.min(4, Math.floor(requested))) : 0;
    const model = buildModel(o);
    let histories = [[model.exitLeaf]];
    for (let step = 0; step < steps; step++) {
      histories = histories.flatMap(history => {
        const current = history[history.length - 1];
        const previous = history.length === 1 ? model.entranceLeaf : history[history.length - 2];
        return model.byId[current].neighbors.filter(next => next !== previous).map(next => history.concat(next));
      });
    }
    const good = model.exitPath.slice(0, steps + 1);
    const bad = histories.filter(history => history.some((id, index) => id !== good[index]));
    return { steps, histories, good, bad, initialPath: model.path.slice(0, 6), model };
  }

  function collisionExploration(options) {
    const model = buildModel(options);
    const source = model.entranceLeaf;
    const visitedTarget = model.exitLeaf;
    const otherLeaf = model.byId[visitedTarget].neighbors.find(id => model.byId[id].side === 'L' && id !== source);
    const branch = [];
    let node = model.byId[otherLeaf];
    while (node) {
      branch.push(node.id);
      node = node.depth ? model.byId['L' + (node.depth - 1) + '-' + Math.floor(node.index / 2)] : null;
    }
    branch.reverse();
    branch.push(visitedTarget);
    const knownPaths = [model.entrancePath.slice(), branch];
    const edgeMap = new Map();
    knownPaths.forEach(route => route.slice(1).forEach((id,index) => {
      const edge = model.edgeBetween(route[index], id);
      edgeMap.set(edge.id, edge);
    }));
    return {
      model, source, visitedTargets: [visitedTarget], otherLeaf, knownPaths,
      knownNodes: Array.from(new Set(knownPaths.flat())), knownEdges: Array.from(edgeMap.values()),
      candidates: model.nodes.filter(n => n.column === 5).map(n => n.id)
    };
  }

  function interferenceNeighborhood(options) {
    const model = buildModel(options);
    const a = model.byId['R2-0'], b = model.byId['R2-1'], c = model.byId['R1-0'];
    return { model, a, b, c, edges: [model.edgeBetween(a.id, c.id), model.edgeBetween(b.id, c.id)] };
  }

  function interferenceSvg(options) {
    const variant = options.variant || 'source';
    const source = variant === 'source', recording = variant === 'recording';
    const { model, a, b, c, edges: pairEdges } = interferenceNeighborhood(options);
    const positions = source ? Object.fromEntries(model.nodes.map(n => [n.id, [n.x, n.y]])) :
      { [a.id]: [110, 48], [b.id]: [110, 172], [c.id]: [350, 110] };
    const parts = ['<svg xmlns="http://www.w3.org/2000/svg" class="welded-graph" viewBox="' + (source ? '0 0 1120 440' : '0 0 460 220') + '" role="img" aria-label="' +
      (source ? 'Two sibling vertices a and b in the welded tree have the same adjacent parent c.' : recording ? 'The same two edges into c, with separate records of a to c and b to c retained.' : 'The same two edges into c, with previous vertices unmarked and both contributions combined at c.') + '">'];
    const edgePath = edge => {
      const [x1,y1] = positions[edge.a], [x2,y2] = positions[edge.b];
      const direction = x2 > x1 ? 1 : -1;
      return edge.kind === 'weld' ? 'M'+x1+' '+y1+'C'+(x1+65*direction)+' '+y1+' '+(x2-65*direction)+' '+y2+' '+x2+' '+y2 :
        'M'+x1+' '+y1+'L'+x2+' '+y2;
    };
    const mathLabel = (name, x, y, color, size) => {
      const math = root.katex.renderToString(name, {throwOnError:true, output:'html'});
      return '<foreignObject data-vertex-label="'+name+'" x="'+(x-28)+'" y="'+(y-25)+'" width="56" height="54"><div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:'+size+'px;color:'+color+'">'+math+'</div></foreignObject>';
    };
    if (source) {
      model.edges.forEach(edge => parts.push('<path class="wg-edge" d="'+edgePath(edge)+'" fill="none" stroke="'+C.muted+'" stroke-width="2.2" opacity="'+(edge.kind==='weld'?0.24:0.48)+'"/>'));
      model.nodes.forEach(node => parts.push('<circle data-context-node="'+node.id+'" cx="'+node.x+'" cy="'+node.y+'" r="4" fill="'+C.muted+'" opacity="0.55"/>'));
    }
    pairEdges.forEach((edge,index) => {
      const color = source || recording ? [C.blue,C.purple][index] : C.muted;
      parts.push('<path data-interference-edge="'+edge.id+'" data-source="'+[a.id,b.id][index]+'" data-target="'+c.id+'"'+(recording?' data-retained-edge="true"':'')+' d="'+edgePath(edge)+'" fill="none" stroke="white" stroke-width="8"/>');
      parts.push('<path d="'+edgePath(edge)+'" fill="none" stroke="'+color+'" stroke-width="'+(source?4:3.5)+'" stroke-linecap="round"/>');
    });
    [a,b,c].forEach((node,index) => {
      const [x,y] = positions[node.id], name = ['a','b','c'][index];
      const color = index===2 ? C.ink : source || recording ? [C.blue,C.purple][index] : C.muted;
      const current = source ? index<2 : index===2;
      parts.push('<circle data-interference-node="'+node.id+'" data-symbol="'+name+'" data-current-position="'+current+'" cx="'+x+'" cy="'+y+'" r="'+(current?10:7)+'" fill="'+(source&&index===2?'white':color)+'" stroke="'+(source&&index===2?C.ink:'white')+'" stroke-width="2"/>');
      const labelPosition = source ? [x+(index===2?30:-30),y+(index===0?-15:index===1?15:-12)] : [x+(index===2?29:-30),y];
      parts.push(mathLabel(name,...labelPosition,color,source?30:27));
    });
    parts.push('</svg>');
    return parts.join('');
  }

  // A proper three-edge coloring of the actual welded graph. Adding a temporary
  // edge between the degree-two roots makes the graph cubic and bipartite;
  // three successive perfect matchings give the colors. The extra edge is
  // never included in the displayed graph.
  function colorWeldedEdges(model) {
    const auxiliary = { id: '__root_matching_edge__', a: 'L0-0', b: 'R0-0', kind: 'auxiliary' };
    const available = new Set(model.edges.concat(auxiliary));
    const left = model.nodes.filter(node => node.column % 2 === 0);
    const rightEnd = edge => model.byId[edge.a].column % 2 ? edge.a : edge.b;
    const leftEnd = edge => model.byId[edge.a].column % 2 ? edge.b : edge.a;
    const colors = new Map();
    for (let color = 0; color < 3; color++) {
      const matching = new Map();
      const augment = (id, seen) => {
        for (const edge of available) {
          if (leftEnd(edge) !== id) continue;
          const other = rightEnd(edge);
          if (seen.has(other)) continue;
          seen.add(other);
          const previous = matching.get(other);
          if (!previous || augment(leftEnd(previous), seen)) {
            matching.set(other, edge);
            return true;
          }
        }
        return false;
      };
      left.forEach(node => {
        if (!augment(node.id, new Set())) throw new Error('Welded graph must have a perfect matching.');
      });
      matching.forEach(edge => {
        available.delete(edge);
        if (edge !== auxiliary) colors.set(edge.id, color);
      });
    }
    return colors;
  }

  // One concrete compatible edge permutation: exchange two parent endpoints
  // in the same right-tree child-column/color class. Vertex positions and the
  // weld cycle stay fixed, and the changed adjacency is still a welded tree.
  function permutationDatabases(options) {
    const model = buildModel(options);
    const colors = colorWeldedEdges(model);
    const oriented = model.edges.map(edge => {
      const a = model.byId[edge.a], b = model.byId[edge.b];
      const tail = edge.kind === 'tree' ? (a.depth > b.depth ? a : b) :
        (a.side === 'L' ? a : b);
      const head = tail.id === edge.a ? b : a;
      return { ...edge, tail: tail.id, head: head.id,
        childColumn: edge.kind === 'tree' ? tail.column : null,
        color: colors.get(edge.id) };
    });
    const eligible = oriented.filter(edge => edge.kind === 'tree' && edge.childColumn === 6);
    const pairs = [];
    eligible.forEach((first, i) => eligible.slice(i + 1).forEach(second => {
      if (first.color !== second.color || first.head === second.head) return;
      const dy = model.byId[second.tail].y - model.byId[first.tail].y;
      pairs.push({ first: dy > 0 ? first : second, second: dy > 0 ? second : first, span: Math.abs(dy) });
    }));
    pairs.sort((a, b) => b.span - a.span);
    if (!pairs.length) throw new Error('No nontrivial compatible right-tree permutation found.');
    const { first, second } = pairs[0];
    // The chosen color is always blue, keeping the graph and ledger consistent.
    const colorOrder = [first.color].concat([0, 1, 2].filter(color => color !== first.color));
    oriented.forEach(edge => { edge.color = colorOrder.indexOf(edge.color); });
    const permuteTreeEndpoints = !options || options.permuteTreeEndpoints !== false;
    const rewired = oriented.map(edge => {
      const target = !permuteTreeEndpoints ? edge : edge.id === first.id ? second : edge.id === second.id ? first : edge;
      return { ...edge, a: edge.tail, b: target.head, head: target.head,
        image: target.id, changed: target.id !== edge.id };
    });
    const middle = middleRegion(model);
    const inMiddle = middle.containsEdge;
    return {
      model, baseEdges: oriented, rewiredEdges: rewired,
      classEdges: oriented.filter(edge => edge.kind === 'tree' && edge.childColumn === 6 && edge.color === 0),
      sourceEdge: first, imageEdge: permuteTreeEndpoints ? second : first, vertex: model.byId[first.tail],
      demonstrationSwapEdges: [first.id, second.id],
      recordedEdge: rewired.find(edge => edge.id === first.id),
      labelRecord: { input: 'v_1', output: '\\ell_1', vertex: first.tail },
      edgeRecord: { input: 'e_1', output: permuteTreeEndpoints ? 'e_2' : 'e_1', source: first.id, image: permuteTreeEndpoints ? second.id : first.id },
      middle, inMiddle
    };
  }

  function permutationDatabasesSvg(options) {
    const stage = Math.max(0, Math.min(6, Number(options.stage) || 0));
    const example = permutationDatabases(options);
    const { model, sourceEdge, imageEdge, vertex } = example;
    const edges = stage >= 4 ? example.rewiredEdges : example.baseEdges;
    const palette = [C.blue, C.teal, C.coral];
    const diagramId = 'wg-permutations-' + (++serial);
    const parts = ['<svg xmlns="http://www.w3.org/2000/svg" class="welded-graph wg-permutation-databases" viewBox="0 0 1120 500" role="img" aria-labelledby="' + diagramId + '-title ' + diagramId + '-desc">'];
    parts.push('<title id="' + diagramId + '-title">Label and compatible edge-permutation databases</title>');
    parts.push('<desc id="' + diagramId + '-desc">The same welded tree is properly edge-colored. A red ring records one vertex label. Two same-color edges with child column six exchange their parent endpoints. Only the edge represented by the displayed database entry is emphasized as recorded. Final guides are equally far from the two roots, at columns two and seven. Edges entirely between the guides are eligible for permutation; the two outer tree levels on each side are fixed. Neither root is marked as known.</desc>');
    const edgePath = edge => {
      const a = model.byId[edge.a], b = model.byId[edge.b];
      const sign = b.x > a.x ? 1 : -1;
      return edge.kind === 'weld' ?
        'M' + a.x + ' ' + a.y + 'C' + (a.x + sign * 65) + ' ' + a.y + ' ' + (b.x - sign * 65) + ' ' + b.y + ' ' + b.x + ' ' + b.y :
        'M' + a.x + ' ' + a.y + 'L' + b.x + ' ' + b.y;
    };
    const math = (value, x, y, color, width = 100, size = 34) => {
      const rendered = root.katex ? root.katex.renderToString(value, { throwOnError: true, output: 'html' }) : value;
      return '<foreignObject x="' + (x - width / 2) + '" y="' + (y - 25) + '" width="' + width + '" height="60"><div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:' + size + 'px;color:' + color + '">' + rendered + '</div></foreignObject>';
    };
    if (stage >= 3 && stage <= 5) {
      // A dashed scope marks a class, rather than suggesting its edges are
      // already present in the compressed database.
      parts.push('<rect class="wg-compatible-class" x="718" y="10" width="164" height="420" rx="15" fill="none" stroke="' + C.blue + '" stroke-width="1.7" stroke-dasharray="7 8" opacity=".55"/>');
    }
    if (stage >= 6) {
      example.middle.columns.forEach((column, index) => {
        const x = example.middle.positions[index];
        parts.push('<path class="wg-permutation-cutoff" data-display-boundary-column="' + column + '" d="M' + x + ' 10V433" fill="none" stroke="' + C.ink + '" stroke-width="1.7" stroke-dasharray="6 8" opacity=".5"/>');
        const rootX = example.middle.rootPositions[index];
        const x1 = Math.min(rootX, x), x2 = Math.max(rootX, x);
        parts.push('<path d="M' + x1 + ' 439V449H' + x2 + 'V439" fill="none" stroke="' + C.ink + '" stroke-width="1.5" opacity=".6"/>');
        parts.push(math('\\frac n2', (x1 + x2) / 2, 473, C.ink, 140, 33));
      });
    }
    edges.forEach(edge => {
      const selectedClass = edge.kind === 'tree' && edge.childColumn === 6 && edge.color === 0;
      const fixed = stage >= 6 && !example.inMiddle(edge);
      const color = stage === 0 || fixed ? C.muted : palette[edge.color];
      let opacity = stage <= 1 ? (edge.kind === 'weld' ? .55 : .9) : .27;
      if (stage >= 3 && stage <= 4 && selectedClass) opacity = .95;
      if (stage >= 5 && selectedClass) opacity = .45;
      if (stage >= 6) opacity = fixed ? .2 : .55;
      parts.push('<path class="wg-edge" data-edge="' + edge.id + '" data-tail="' + edge.tail + '" data-head="' + edge.head + '" data-color="' + edge.color + '" data-child-column="' + edge.childColumn + '" data-middle="' + example.inMiddle(edge) + '" data-permuted="' + Boolean(edge.changed) + '" d="' + edgePath(edge) + '" fill="none" stroke="' + color + '" stroke-width="' + (stage >= 3 && stage <= 4 && selectedClass ? 2.8 : 2.1) + '" opacity="' + opacity + '"/>');
    });
    if (stage >= 5) {
      const recorded = example.recordedEdge;
      parts.push('<path class="wg-recorded-permutation-edge" data-source-edge="' + sourceEdge.id + '" data-image-edge="' + imageEdge.id + '" data-tail="' + recorded.tail + '" data-head="' + recorded.head + '" d="' + edgePath(recorded) + '" fill="none" stroke="white" stroke-width="8"/>');
      parts.push('<path class="wg-recorded-permutation-edge" data-recorded="true" d="' + edgePath(recorded) + '" fill="none" stroke="' + C.blue + '" stroke-width="4.8"/>');
    }
    model.nodes.forEach(node => {
      const labeled = stage >= 2 && node.id === vertex.id;
      const endpoint = stage >= 5 && node.id === example.recordedEdge.head;
      const radius = labeled || endpoint ? 7 : 4.3;
      parts.push('<circle class="wg-node" data-node="' + node.id + '" cx="' + node.x + '" cy="' + node.y + '" r="' + radius + '" fill="' + C.muted + '" stroke="white" stroke-width="1.5"/>');
      if (labeled) parts.push('<circle class="wg-random-label-ring" data-label-node="' + node.id + '" cx="' + node.x + '" cy="' + node.y + '" r="' + radius + '" fill="none" stroke="#d52c35" stroke-width="2.5"/>');
    });
    if (stage >= 2) {
      parts.push(math('v_1', vertex.x - 42, vertex.y - 24, C.ink, 70, 32));
      parts.push(math('\\ell_1', vertex.x - 43, vertex.y + 20, '#d52c35', 70, 32));
    }
    if (stage >= 3) {
      // These names identify base edge ports. They stay beside the corresponding
      // tail and head even when the connecting edge changes.
      const tail = model.byId[sourceEdge.tail], head = model.byId[imageEdge.head];
      parts.push(math('e_1', tail.x + 30, tail.y - 30, C.blue, 70, 32));
      parts.push(math('e_2', head.x - 25, head.y + 32, C.blue, 70, 32));
    }
    parts.push('</svg>');
    return parts.join('');
  }

  // Proof diagrams use a valid identity completion of the tree permutations,
  // without carrying over the earlier endpoint-swap demonstration. The weld,
  // colors, vertex positions and symmetric fixed outer regions stay the same.
  function proofExample(options) {
    return permutationDatabases(Object.assign({}, options || {}, { permuteTreeEndpoints: false }));
  }

  // Only edges eligible for permutation have C records, including identity
  // assignments. The fixed outer tree edges never need C records.
  function recordedPathExample(options) {
    const example = proofExample(options);
    const { model, rewiredEdges } = example;
    const welds = rewiredEdges.filter(edge => edge.kind === 'weld' && edge.head === 'R4-0');
    const weld = welds.find(edge => edge.color === 0) || welds[0];
    const ancestors = id => {
      const result = [id];
      let current = id;
      while (model.byId[current].depth > 0) {
        const edge = rewiredEdges.find(item => item.kind === 'tree' && item.tail === current);
        if (!edge) throw new Error('The permuted tree must have one parent per child.');
        current = edge.head;
        result.push(current);
      }
      return result;
    };
    const left = ancestors(weld.tail).reverse();
    const right = ancestors(weld.head);
    const path = left.concat(right);
    const pathEdges = path.slice(1).map((id, index) => {
      const previous = path[index];
      const edge = rewiredEdges.find(item =>
        (item.a === previous && item.b === id) || (item.b === previous && item.a === id));
      if (!edge) throw new Error('Every recorded path edge must belong to the permuted instance.');
      return edge;
    });
    const records = pathEdges.filter(example.inMiddle).map(edge => ({
      block: edge.kind === 'weld' ? ['wld', edge.color] : ['tr', edge.childColumn, edge.color],
      source: edge.id, image: edge.image, tail: edge.tail, head: edge.head,
      from: path.indexOf(edge.tail), to: path.indexOf(edge.head)
    }));
    return {
      ...example, path, pathEdges, records, weld,
      labels: path.map((vertex, index) => ({ vertex, input: 'v_' + index, output: '\\ell_' + index })),
      displayBoundaryColumns: example.middle.columns
    };
  }

  // Show the union of the source's two available weld query colors. Every
  // opposite leaf is eligible for at least one of them. Dashed candidates are
  // alternative assignments, not simultaneous graph edges. A fixed-color
  // query still uses only its own compatible permutation class.
  // Solid context and recorded edges always come from the same fixed instance.
  function freshnessExample(options) {
    const example = recordedPathExample(options);
    const { model, rewiredEdges, weld } = example;
    const source = weld.tail;
    const parentEdge = rewiredEdges.find(edge => edge.kind === 'tree' && edge.tail === source);
    const recorded = rewiredEdges.filter(edge =>
      edge.kind === 'tree' && (
        edge.head === parentEdge.head ||
        edge.head === 'R3-2' ||
        edge.head === 'R3-4'
      ));
    const support = new Set(recorded.flatMap(edge => [edge.tail, edge.head]));
    const queryEdges = example.baseEdges.filter(edge => edge.kind === 'weld' && edge.tail === source);
    const byTarget = new Map();
    queryEdges.forEach(queryEdge => {
      example.baseEdges.filter(edge => edge.kind === 'weld' && edge.color === queryEdge.color).forEach(edge => {
        if (!byTarget.has(edge.head)) byTarget.set(edge.head, {
          source, target: edge.head, assignment: edge.id, assignments: [],
          forbidden: support.has(edge.head)
        });
        byTarget.get(edge.head).assignments.push({ source: queryEdge.id, image: edge.id, color: edge.color });
      });
    });
    const candidates = Array.from(byTarget.values()).sort((a, b) => model.byId[a.target].y - model.byId[b.target].y);
    const freshSide = example.path.slice(example.path.indexOf(weld.head));
    const escapePath = freshSide.slice(0, freshSide.findIndex(example.middle.isBoundary) + 1);
    if (!candidates.some(candidate => candidate.target === weld.head && !candidate.forbidden))
      throw new Error('The illustrated inserted weld must have a fresh compatible endpoint.');
    if (escapePath.some(id => support.has(id)))
      throw new Error('The illustrated new branch must avoid the old recorded support.');
    return { ...example, source, recorded, support, candidates, escapePath };
  }

  function recordedProofSvg(options) {
    const mode = options.mode;
    const stage = Math.max(0, Number(options.stage) || 0);
    const middlePath = mode === 'middle-path';
    const accentCrossings = middlePath && options.accentCrossings === true;
    const fresh = mode === 'fresh-records' || mode === 'fresh-escape';
    const example = fresh ? freshnessExample(options) : recordedPathExample(options);
    const { model, rewiredEdges } = example;
    const parts = ['<svg xmlns="http://www.w3.org/2000/svg" class="welded-graph wg-recorded-proof" viewBox="0 0 1120 500" role="img" aria-labelledby="wg-proof-title-' + (++serial) + '">'];
    const titles = {
      'recorded-path': 'A successful entrance-to-exit path and its vertex labels in a welded tree with ordinary tree edges.',
      'fresh-records': 'A recorded subgraph and one queried source. Every opposite leaf is a possible destination for at least one of the two available weld query colors.',
      'fresh-escape': 'A surviving weld is inserted at a fresh endpoint, then an actual branch grows toward the outer boundary.',
      'middle-path': 'A full path crosses the weld and two cuts at equal distances from the roots. Blue middle edges are eligible for permutation; outer tree edges stay gray.' + (accentCrossings ? ' The weld is coral and both cuts are teal.' : '')
    };
    parts.push('<title id="wg-proof-title-' + serial + '">' + titles[mode] + '</title>');
    const edgePath = edge => {
      const a = model.byId[edge.a || edge.source], b = model.byId[edge.b || edge.target];
      const sign = b.x > a.x ? 1 : -1;
      return edge.kind === 'weld' || edge.assignment ?
        'M' + a.x + ' ' + a.y + 'C' + (a.x + sign * 65) + ' ' + a.y + ' ' + (b.x - sign * 65) + ' ' + b.y + ' ' + b.x + ' ' + b.y :
        'M' + a.x + ' ' + a.y + 'L' + b.x + ' ' + b.y;
    };
    const math = (value, x, y, color, width = 110, size = 31) => {
      const rendered = root.katex ? root.katex.renderToString(value, { throwOnError: true, output: 'html' }) : value;
      return '<foreignObject x="' + (x - width / 2) + '" y="' + (y - 25) + '" width="' + width + '" height="56"><div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:' + size + 'px;color:' + color + '">' + rendered + '</div></foreignObject>';
    };
    const strokeEdge = (edge, color, width, attributes = '') => {
      parts.push('<path d="' + edgePath(edge) + '" fill="none" stroke="white" stroke-width="' + (width + 4) + '" stroke-linecap="round"/>');
      parts.push('<path ' + attributes + ' d="' + edgePath(edge) + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-linecap="round"/>');
    };
    const circle = (id, color, radius = 7, attributes = '') => {
      const node = model.byId[id];
      parts.push('<circle ' + attributes + ' data-node="' + id + '" cx="' + node.x + '" cy="' + node.y + '" r="' + radius + '" fill="' + color + '" stroke="white" stroke-width="1.7"/>');
    };
    const boundaries = (brackets = false) => {
      example.middle.columns.forEach((column, index) => {
        const x = example.middle.positions[index];
        parts.push('<path data-display-boundary-column="' + column + '" d="M' + x + ' 15V432" fill="none" stroke="' + (accentCrossings ? C.teal : C.ink) + '" stroke-width="1.6" stroke-dasharray="7 9" opacity="' + (accentCrossings ? '.8' : '.45') + '"/>');
      });
      if (brackets) {
        [[example.middle.rootPositions[0], example.middle.positions[0]],
          [example.middle.positions[1], example.middle.rootPositions[1]]].forEach(([x1, x2]) => {
          parts.push('<path d="M' + x1 + ' 441V453H' + x2 + 'V441" fill="none" stroke="' + C.ink + '" stroke-width="1.5" opacity=".6"/>');
          parts.push(math('\\frac n2', (x1 + x2) / 2, 473, C.ink, 100, 30));
        });
      }
    };

    // Shared proof scaffold: the endpoint-swap demonstration is not carried over.
    rewiredEdges.forEach(edge => {
      const permutable = example.middle.containsEdge(edge);
      const color = middlePath && permutable ? (accentCrossings && edge.kind === 'weld' ? C.coral : C.blue) : C.muted;
      const opacity = middlePath && permutable ? (edge.kind === 'weld' ? '.25' : '.42') : (edge.kind === 'weld' ? '.18' : '.34');
      parts.push('<path class="wg-edge" data-context-edge="' + edge.id + '" data-tail="' + edge.tail + '" data-head="' + edge.head + '" data-middle="' + permutable + '" d="' + edgePath(edge) + '" fill="none" stroke="' + color + '" stroke-width="1.8" opacity="' + opacity + '"/>');
    });
    model.nodes.forEach(node => circle(node.id, '#d6dde3', 4.1, 'data-context-node="true"'));

    if (mode === 'recorded-path' || mode === 'middle-path') {
      if (mode === 'middle-path') boundaries(true);
      const showPath = mode === 'recorded-path' || stage >= 1;
      (showPath ? example.pathEdges : []).forEach(edge => {
        const inDisplayMiddle = example.middle.containsEdge(edge);
        const color = middlePath && stage >= 1 && !inDisplayMiddle ? C.muted : accentCrossings && edge.kind === 'weld' ? C.coral : C.blue;
        strokeEdge(edge, color, 4.8, 'data-successful-path-edge="' + edge.id + '" data-image-edge="' + edge.image + '"');
      });
      (showPath ? example.path : []).forEach(id => {
        const color = middlePath && stage >= 1 && !example.middle.containsVertex(id) ? C.muted :
          accentCrossings && example.middle.isBoundary(id) ? C.teal :
          accentCrossings && (id === example.weld.tail || id === example.weld.head) ? C.coral : C.blue;
        circle(id, color, 6.5, 'data-successful-path-node="true"');
      });
      if (mode === 'recorded-path') {
        // Two neighboring symbols connect the actual path to the indexed L
        // ledger. Endpoint labels identify the complete successful output.
        example.path.slice(1).forEach(id => {
          const node = model.byId[id];
          parts.push('<circle data-label-record="' + id + '" cx="' + node.x + '" cy="' + node.y + '" r="6.5" fill="none" stroke="#d52c35" stroke-width="2.3"/>');
        });
        [4, 5].forEach(index => {
          const node = model.byId[example.path[index]];
          const x = node.x + (index === 4 ? -47 : 42);
          parts.push(math('v_' + index, x, node.y - 20, C.ink, 78, 30));
          parts.push(math('\\ell_' + index, x, node.y + 20, '#d52c35', 78, 30));
        });
        const entrance = model.byId[example.path[0]];
        const exit = model.byId[example.path[example.path.length - 1]];
        parts.push(math('0', entrance.x, entrance.y + 32, C.blue, 78, 30));
        parts.push(math('\\ell_m', exit.x, exit.y + 32, '#d52c35', 78, 30));
      }
    }

    if (fresh) {
      const showingCandidates = mode === 'fresh-records' || stage === 0;
      const candidateStage = mode === 'fresh-escape' ? 2 : Math.min(2, stage);
      if (showingCandidates) {
        // A marker points only to the adjacent right leaf column. These are
        // alternatives in the compression superposition, not revealed edges.
        const marker = 'fresh-tip-' + serial;
        parts.push('<defs><marker id="' + marker + '" viewBox="0 0 7 7" refX="6" refY="3.5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7" fill="context-stroke"/></marker></defs>');
        example.candidates.forEach(candidate => {
          if (candidateStage >= 2 && candidate.forbidden) return;
          const color = candidateStage === 0 ? C.blue : candidate.forbidden ? '#d52c35' : C.teal;
          parts.push('<path data-candidate-assignment="' + candidate.assignment + '" data-query-colors="' + candidate.assignments.map(assignment => assignment.color).join(',') + '" data-candidate-target="' + candidate.target + '" data-forbidden="' + candidate.forbidden + '" d="' + edgePath(candidate) + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-dasharray="5 6" opacity="' + (candidateStage === 0 ? '.62' : '.78') + '" marker-end="url(#' + marker + ')"/>');
        });
      }
      example.recorded.forEach(edge =>
        strokeEdge(edge, '#66717c', 3.6, 'data-recorded-edge="' + edge.id + '" data-image-edge="' + edge.image + '"')
      );
      example.support.forEach(id => circle(id, '#8b969f', 6, 'data-old-support="true"'));

      if (showingCandidates) {
        example.candidates.forEach(candidate => {
          const color = candidateStage === 0 ? C.blue : candidate.forbidden ? '#d52c35' : C.teal;
          const node = model.byId[candidate.target];
          parts.push('<circle data-compatible-endpoint="' + node.id + '" data-forbidden="' + candidate.forbidden + '" cx="' + node.x + '" cy="' + node.y + '" r="6.4" fill="' + (candidate.forbidden && candidateStage > 0 ? '#f5d9dc' : 'white') + '" stroke="' + color + '" stroke-width="2.5"/>');
        });
      }
      circle(example.source, C.blue, 8.5, 'data-fresh-source="true"');

      if (mode === 'fresh-escape' && stage >= 1) {
        boundaries(false);
        strokeEdge(example.weld, C.blue, 5.1, 'data-surviving-weld="true"');
        circle(example.source, C.blue, 8.5, 'data-fresh-source="true"');
        const growCount = Math.min(stage - 1, example.escapePath.length - 1);
        const grownPath = example.escapePath.slice(0, growCount + 1);
        grownPath.slice(1).forEach((id, index) => {
          const previous = grownPath[index];
          const edge = rewiredEdges.find(item => item.kind === 'tree' &&
            ((item.a === previous && item.b === id) || (item.b === previous && item.a === id)));
          if (!edge) throw new Error('Fresh growth must use an actual permuted tree edge.');
          strokeEdge(edge, C.teal, 5.1, 'data-grown-edge="' + edge.id + '" data-image-edge="' + edge.image + '"');
        });
        grownPath.forEach(id => circle(id, C.teal, 7, 'data-grown-node="true"'));
        const a = model.byId[example.weld.tail], b = model.byId[example.weld.head];
        parts.push(math('\\rho', (a.x + b.x) / 2, (a.y + b.y) / 2 - 26, C.blue, 76, 31));
      }
    }
    parts.push('</svg>');
    return parts.join('');
  }

  // Different final databases can have the same canonical weld. The last
  // example crosses three times, with its selected weld last along the path.
  // Insertion time and direction are history data, not final-database classes.
  function weldGroupingExamples(options) {
    const example = proofExample(options);
    const { model, rewiredEdges } = example;
    // Keep the six established illustrations stable when the shared region
    // changes. Gray outer edges are known fixed context, not C records.
    const establishedBranches = [
      [['L1-0:L2-1', 'L2-0:L3-0', 'L2-1:L3-2', 'L2-1:L3-3', 'L3-0:L4-0'],
        ['R2-3:R3-7', 'R3-1:R4-3', 'R3-7:R4-14', 'R3-7:R4-15']],
      [['L1-0:L2-0', 'L2-1:L3-2', 'L2-0:L3-1', 'L2-0:L3-0', 'L3-3:L4-6'],
        ['R2-2:R3-5', 'R3-5:R4-11', 'R3-5:R4-10', 'R3-4:R4-9', 'L1-0:L2-0', 'L2-1:L3-2']],
      [['L1-1:L2-2', 'L2-2:L3-4', 'L2-2:L3-5', 'L2-3:L3-6'],
        ['R2-0:R3-0', 'R3-0:R4-0', 'R3-0:R4-1', 'R3-6:R4-13', 'L1-1:L2-2', 'L2-2:L3-4', 'L2-2:L3-5']]
    ];
    const seed = options && Number.isFinite(Number(options.seed)) ? Number(options.seed) : 17;
    const ancestors = id => {
      const chain = [id];
      while (model.byId[id].depth > 0) {
        const edge = rewiredEdges.find(item => item.kind === 'tree' && item.tail === id);
        id = edge.head;
        chain.push(id);
      }
      return chain;
    };
    const edgeBetween = (a, b) => rewiredEdges.find(edge =>
      (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a));
    const possible = rewiredEdges.filter(edge => edge.kind === 'weld').map(weld => {
      const path = ancestors(weld.tail).reverse().concat(ancestors(weld.head));
      const pathEdges = path.slice(1).map((id, index) => edgeBetween(path[index], id));
      const tail = model.byId[weld.tail], head = model.byId[weld.head];
      return { weld, path, pathEdges, height: (tail.y + head.y) / 2,
        span: Math.abs(tail.y - head.y), changed: pathEdges.some(edge => example.demonstrationSwapEdges.includes(edge.id)) };
    });
    const used = new Set();
    const groups = [95, 220, 345].map((height, group) => {
      // Keep the established weld choices and six distinct recorded examples.
      // Only their shared tree scaffold loses the demonstration transposition.
      const chosen = possible.filter(item => !used.has(item.weld.id)).sort((a, b) =>
        (Math.abs(a.height - height) + a.span * 1.7 + (a.changed ? 180 : 0)) -
        (Math.abs(b.height - height) + b.span * 1.7 + (b.changed ? 180 : 0))
      )[0];
      used.add(chosen.weld.id);
      const pathNodes = new Set(chosen.path);
      const pathEdges = new Set(chosen.pathEdges.map(edge => edge.id));
      const extras = ['L', 'R'].map((side, variant) => {
        if (seed === 17) return establishedBranches[group][variant]
          .map(id => rewiredEdges.find(edge => edge.id === id));
        // Give each database a visibly different recorded shape: one is
        // left-heavy, the other right-heavy, with distinct sizes and forks.
        // All additions grow from the path on actual randomized tree edges.
        const count = [[5, 4], [7, 6], [4, 7]][group][variant];
        const known = new Set(pathNodes);
        const added = [], usedEdges = new Set(pathEdges);
        while (added.length < count) {
          const candidates = rewiredEdges.filter(edge =>
            edge.kind === 'tree' && example.inMiddle(edge) && !usedEdges.has(edge.id) &&
            (known.has(edge.a) !== known.has(edge.b))
          );
          candidates.sort((a, b) => {
            const va = model.byId[a.tail], vb = model.byId[b.tail];
            const sidePreference = Number(va.side !== side) - Number(vb.side !== side);
            return sidePreference || va.depth - vb.depth ||
              (group % 2 ? vb.y - va.y : va.y - vb.y);
          });
          if (!candidates.length) throw new Error('Not enough actual off-path tree edges for the recorded shape.');
          const edge = candidates[0];
          added.push(edge);
          usedEdges.add(edge.id);
          known.add(edge.a);
          known.add(edge.b);
        }
        return added;
      });
      return { ...chosen, group,
        record: { color: chosen.weld.color, source: chosen.weld.id, image: chosen.weld.image },
        variants: extras.map((extraEdges, variant) => {
          // The bottom-right example follows existing edges left -> right ->
          // left -> right. Each short return through a tree uses two sibling
          // leaves, stays inside the cuts, and never revisits a vertex.
          const path = seed === 17 && group === 2 && variant === 1
            ? ancestors('L4-7').reverse()
              .concat(['R4-8', 'R3-4', 'R4-9', 'L4-15', 'L3-7', 'L4-14'])
              .concat(ancestors(chosen.weld.head))
            : chosen.path;
          const pathEdges = path.slice(1).map((id, index) => edgeBetween(path[index], id));
          return {
            id: 'weld-group-' + group + '-record-' + variant, group, variant, extraEdges,
            path, pathEdges,
            recordedEdges: extraEdges.filter(example.inMiddle),
            fixedContextEdges: extraEdges.filter(edge => !example.inMiddle(edge))
          };
        })
      };
    });
    return { ...example, groups };
  }

  function weldGroupingSvg(options) {
    const stage = Math.max(0, Math.min(2, Number(options.stage) || 0));
    const example = weldGroupingExamples(options);
    const { model, rewiredEdges, groups } = example;
    const diagramId = 'wg-weld-groups-' + (++serial);
    const accent = C.coral;
    const parts = ['<svg xmlns="http://www.w3.org/2000/svg" class="welded-graph wg-weld-groups" viewBox="0 0 1120 460" role="img" aria-labelledby="' + diagramId + '-title">'];
    parts.push('<title id="' + diagramId + '-title">' + [
      'Six recorded graphs are grouped by a selected weld. The bottom-right path crosses the weld three times: left to right, right to left, then left to right.',
      'Group outlines appear around the same six stationary recorded graphs.',
      'All six graphs remain unchanged. The middle group is selected, and arrows mark a left-to-right last insertion of its retained weld.'
    ][stage] + '</title>');
    const path = edge => {
      const a = model.byId[edge.a], b = model.byId[edge.b];
      const sign = b.x > a.x ? 1 : -1;
      return edge.kind === 'weld'
        ? 'M' + a.x + ' ' + a.y + 'C' + (a.x + sign * 65) + ' ' + a.y + ' ' + (b.x - sign * 65) + ' ' + b.y + ' ' + b.x + ' ' + b.y
        : 'M' + a.x + ' ' + a.y + 'L' + b.x + ' ' + b.y;
    };
    const math = (value, x, y) => {
      const rendered = root.katex ? root.katex.renderToString(value, { throwOnError: true, output: 'html' }) : value;
      return '<foreignObject x="' + (x - 90) + '" y="' + y + '" width="180" height="47"><div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:27px;color:' + accent + '">' + rendered + '</div></foreignObject>';
    };
    function diagram(group, variant, x, y, scale, showDirection) {
      parts.push('<g class="wg-record-example" data-example="' + variant.id + '" data-canonical-weld="' + group.weld.id + '" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">');
      rewiredEdges.forEach(edge => parts.push('<path data-context-edge="' + edge.id + '" d="' + path(edge) + '" fill="none" stroke="#c8d1d9" stroke-width="2.4" opacity="' + (edge.kind === 'weld' ? '.25' : '.53') + '"/>'));
      model.nodes.forEach(node => parts.push('<circle cx="' + node.x + '" cy="' + node.y + '" r="4.7" fill="#d7dfe5"/>'));
      variant.extraEdges.forEach(edge => {
        const attribute = example.inMiddle(edge) ? 'data-extra-record' : 'data-fixed-context-edge';
        parts.push('<path ' + attribute + '="' + edge.id + '" d="' + path(edge) + '" fill="none" stroke="#718191" stroke-width="8" stroke-linecap="round"/>');
        [edge.a, edge.b].forEach(id => {
          const node = model.byId[id];
          parts.push('<circle cx="' + node.x + '" cy="' + node.y + '" r="7.6" fill="#718191"/>');
        });
      });
      variant.pathEdges.forEach(edge => {
        if (edge.id === group.weld.id) return;
        parts.push('<path data-crossing-path-edge="' + edge.id + '" d="' + path(edge) + '" fill="none" stroke="white" stroke-width="13" stroke-linecap="round"/>');
        parts.push('<path d="' + path(edge) + '" fill="none" stroke="' + C.blue + '" stroke-width="8" stroke-linecap="round"/>');
      });
      const a = model.byId[group.weld.tail], b = model.byId[group.weld.head];
      parts.push('<path d="' + path(group.weld) + '" fill="none" stroke="white" stroke-width="16" stroke-linecap="round"/>');
      parts.push('<path data-selected-weld="' + group.weld.id + '" d="' + path(group.weld) + '" fill="none" stroke="' + accent + '" stroke-width="10" stroke-linecap="round"/>');
      variant.path.forEach(id => {
        const node = model.byId[id];
        const isWeld = id === a.id || id === b.id;
        const color = isWeld ? accent : C.blue;
        parts.push('<circle cx="' + node.x + '" cy="' + node.y + '" r="' + (isWeld ? 10.5 : 7.6) + '" fill="' + color + '" stroke="white" stroke-width="2.2"/>');
      });
      parts.push('</g>');
      if (showDirection) {
        // This arrow marks the chosen HISTORY insertion direction. It is not
        // an orientation inferred from the final undirected database graph,
        // and is a separate annotation: no graph element changes across stages.
        const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
        const angle = Math.atan2(b.y - a.y, (b.x - a.x) * .65) * 180 / Math.PI;
        parts.push('<g class="wg-insertion-annotation" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')"><path data-insertion-direction="right" d="M-42 0H36M20 -12L38 0L20 12" transform="translate(' + midX + ' ' + (midY - 33) + ') rotate(' + angle + ')" fill="none" stroke="' + accent + '" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/></g>');
      }
    }
    if (stage >= 1) groups.forEach((group, index) => {
      const selected = stage === 2 && index === 1;
      parts.push('<rect data-weld-group="' + group.weld.id + '" x="' + (index * 380 + 3) + '" y="3" width="354" height="440" rx="10" fill="none" stroke="' + (selected ? accent : '#dce3e8') + '" stroke-width="' + (selected ? 2.5 : 1.7) + '"/>');
      parts.push(math('\\rho_' + (index + 1), index * 380 + 180, 7));
    });
    // The same six diagrams retain their exact positions, scale, shape and
    // colors throughout. Only surrounding grouping cues and arrows appear.
    const order = [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]];
    order.forEach(([group, variant], position) =>
      diagram(groups[group], groups[group].variants[variant], (position % 3) * 380 + 10, position < 3 ? 61 : 255, .30, stage === 2 && group === 1)
    );
    parts.push('</svg>');
    return parts.join('');
  }

  function svg(options) {
    const o = options || {};
    if (o.mode === 'weld-groups') return weldGroupingSvg(o);
    let mode = o.mode || 'full';
    if (mode === 'interference') return interferenceSvg(o);
    if (mode === 'permutation-databases') return permutationDatabasesSvg(o);
    if (['recorded-path', 'fresh-records', 'fresh-escape', 'middle-path'].includes(mode)) return recordedProofSvg(o);
    const stage = Number.isFinite(Number(o.stage)) ? Math.max(0, Number(o.stage)) : 2;
    if (mode === 'construction') mode = stage < 1 ? 'upright' : stage < 2 ? 'trees' : 'full';
    const forest = mode === 'recorded-forest' ? recordedForest(o) : null;
    const model = forest ? forest.model : buildModel(o);
    const { nodes, edges, byId, entrancePath, exitPath, path } = model;
    const upright = mode === 'upright';
    const hideWeld = upright || mode === 'trees';
    const diagramId = 'wg-' + (++serial);
    const parts = [];
    const highlightedNodes = new Map(), highlightedEdges = new Map(), frontiers = [];
    const collision = mode === 'collision' ? collisionExploration(o) : null;
    const region = middleRegion(model);
    const [middleStart, middleEnd] = region.columns;
    const middle = ['middle', 'fresh', 'seed', 'escape'].includes(mode);
    const focus = ['path', 'uphill', 'collision', 'rooted', 'recorded-forest', 'twofronts', 'seed', 'escape'].includes(mode);
    const outputPath = mode === 'path' && o.finishOnly && o.outputNodes && stage >= 1;
    const columnMode = ['columns', 'column-split', 'column-line'].includes(mode);
    const coloredColumns = columnMode && (mode !== 'columns' || stage >= 1);
    const wave = mode === 'walk' || columnMode;
    const activeColumn = mode === 'columns' ? -1 : mode === 'column-split' ? 2 :
      mode === 'column-line' ? (stage < 1 ? 2 : -1) :
      Number.isFinite(Number(o.column)) ? Math.max(0, Math.min(9, Number(o.column))) : Math.min(9, Math.floor(stage) * 3);
    const point = node => upright ? [node.uprightX, node.uprightY] : [node.x, node.y];
    const number = value => Math.round(value * 100) / 100;

    function markRoute(ids, color, frontier) {
      ids.forEach(id => highlightedNodes.set(id, color));
      for (let i = 1; i < ids.length; i++) {
        const edge = model.edgeBetween(ids[i - 1], ids[i]);
        if (edge) highlightedEdges.set(edge.id, color);
      }
      if (frontier && ids.length) frontiers.push({ id: ids[ids.length - 1], color });
    }

    if (mode === 'access') {
      if (stage >= 2) byId['L0-0'].neighbors.forEach(id => markRoute(['L0-0', id], C.purple, false));
      if (stage >= 1) highlightedNodes.set('L0-0', C.blue);
      if (stage >= 3) highlightedNodes.set('R0-0', C.teal);
    } else if (mode === 'column-split') {
      edges.forEach(edge => {
        const a = byId[edge.a], b = byId[edge.b];
        const neighbor = a.column === 2 ? b.column : b.column === 2 ? a.column : -1;
        if ((neighbor === 1 && stage >= 2) || (neighbor === 3 && stage >= 3)) highlightedEdges.set(edge.id, columnColor(neighbor));
      });
    } else if (mode === 'path') {
      if (o.stopAtWeld) {
        const route = stage < 1 ? entrancePath.slice(0, 3) : stage < 2 ? entrancePath : path.slice(0, 6);
        markRoute(route, C.blue, true);
      } else if (o.finishOnly) {
        if (stage >= 1) {
          markRoute(path, C.blue, true);
          if (outputPath) {
            path.forEach(id => highlightedNodes.set(id, C.teal));
            frontiers.forEach(frontier => { frontier.color = C.teal; });
          }
        }
      } else {
        markRoute(stage < 1 ? entrancePath : stage < 2 ? path.slice(0, 6) : path, C.blue, true);
      }
    } else if (mode === 'uphill') {
      const routes = uphillRoutes(o, stage);
      routes.bad.forEach(history => markRoute(history, C.coral, false));
      // Keep the familiar approach visible even when a wrong history revisits it.
      markRoute(routes.initialPath, C.blue, routes.steps === 0);
      if (routes.steps > 0) markRoute(routes.good, C.teal, true);
    } else if (mode === 'collision') {
      collision.knownPaths.forEach(route => markRoute(route, C.blue, false));
      highlightedNodes.set(collision.source, C.purple);
      frontiers.push({ id: collision.source, color: C.purple });
      if (stage >= 2) collision.visitedTargets.forEach(id => highlightedNodes.set(id, '#d52c35'));
    } else if (mode === 'recorded-forest') {
      forest.components.forEach((component, index) => {
        component.routes.forEach(route => markRoute(route, index === 0 ? C.teal : C.purple, false));
      });
    } else if (mode === 'rooted') {
      // One connected, branching tree crosses the weld, but does not reach the exit.
      markRoute(entrancePath.concat(exitPath.slice(0, 3)), C.blue, true);
      const leftLeaf = byId[model.entranceLeaf], rightLeaf = byId[model.exitLeaf];
      markRoute([entrancePath[3], 'L4-' + (leftLeaf.index ^ 1)], C.blue, false);
      const leftBranch = byId['L3-' + (byId[entrancePath[3]].index ^ 1)];
      markRoute([entrancePath[2], leftBranch.id, 'L4-' + (2 * leftBranch.index)], C.blue, false);
      markRoute([exitPath[1], 'R4-' + (rightLeaf.index ^ 1)], C.blue, false);
    } else if (mode === 'twofronts') {
      const length = Math.min(4, Math.floor(stage) + 2);
      markRoute(entrancePath.slice(0, length), C.blue, true);
      markRoute(exitPath.slice().reverse().slice(0, length), C.teal, true);
    } else if (mode === 'seed') {
      const route = [model.entranceLeaf, model.exitLeaf];
      if (stage >= 1) route.push(exitPath[1]);
      markRoute(route, C.teal, false);
      if (stage >= 2) {
        const leaf = byId[model.exitLeaf];
        const sibling = 'R4-' + (leaf.index ^ 1);
        markRoute([exitPath[1], sibling], C.teal, true);
      }
      frontiers.push({ id: model.entranceLeaf, color: C.coral });
    } else if (mode === 'escape') {
      const towardEntrance = entrancePath.slice().reverse();
      const boundaryIndex = Math.max(1, Math.min(towardEntrance.length - 1, 4 - Math.round(middleStart)));
      const reach = stage < 1 ? 0 : stage < 2 ? Math.min(1, boundaryIndex) : boundaryIndex;
      markRoute([model.exitLeaf].concat(towardEntrance.slice(0, reach + 1)), C.coral, true);
    }

    const descriptions = {
      full: 'Two depth-four binary trees, joined at their leaves by one random alternating cycle.',
      access: o.randomLabels === false ? 'A gray welded-tree graph, before the random labels, given information, and goal are introduced.' : 'A gray welded tree has a red border touching every vertex to indicate random labels. These borders remain throughout the slide as the given entrance turns blue, local neighbor access is highlighted in purple, and the exit target turns green when the goal is introduced. Its label remains unknown.',
      trees: 'Two depth-four binary trees facing each other before their leaves are welded.',
      upright: 'Two binary trees with their roots above their leaves.',
      walk: 'Schematic quantum wavefront, with equal emphasis on every vertex of a column. This is not a numerical simulation.',
      path: 'One actual path from the entrance toward the exit of a welded-tree graph.',
      uphill: 'The blue approach reaches the weld. Among all nonbacktracking continuations, one green route keeps moving toward the exit; red routes deviate and continue growing through the same graph.',
      collision: 'One known tree grows from the entrance to a left leaf and, through a different left leaf, to one previously visited right leaf. Possible endpoints of the pending weld query lie only in the adjacent right leaf column. Dashed alternatives represent mutually exclusive hidden completions, not simultaneous edges. One red alternative returns to the already visited leaf. The exit has not been found.',
      columns: 'The graph starts gray with column numbers below. Column colors appear next, followed by the normalized uniform column-state definition. The colors indicate column membership, not probabilities.',
      'column-split': 'Column two is selected. The in-place shift is introduced first, then the uniform column state. Next the four edges toward column one are highlighted, followed by the eight edges toward column three. Normalizing by the column sizes and the uniform edge-color states gives the same in-place-shift overlap, square root of two divided by three, in both directions. These overlaps are not a fifty-fifty measurement outcome.',
      'column-line': 'The ten column states form a line with the same colors and positions as the full graph. Symmetric interior-coupling arrows appear only in the first stage. The walk stage removes them; the final repetition stage includes a two-neighbor query check excluding the already known entrance. Column positions do not expose vertex labels.',
      middle: 'The middle region of a welded-tree graph, delimited by two vertical boundaries.',
      fresh: 'A faded welded-tree graph with its middle region marked.',
      rooted: 'One connected blue tree starts at the entrance, branches, crosses the weld, and continues into the other tree. Every highlighted vertex remains connected to the entrance. The exit remains unknown and gray.',
      'recorded-forest': 'Two disconnected recorded components of the same welded-tree graph. The teal component branches from left to right; the purple component has a different shape and branches from right to left. Each uses an actual weld crossing. Unrecorded vertices and edges, including both roots, are faint gray.',
      twofronts: 'After the exit has been found, two separate explored paths grow from the entrance and the exit. These paths have not met.',
      seed: 'A small connected subtree rooted at a weld vertex.',
      escape: 'A connected path crossing a weld edge and reaching the boundary of the middle region.'
    };
    const viewBox = mode === 'column-split' ? '0 -35 1120 515' : columnMode ? '0 -75 1120 555' : '0 0 1120 440';
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" class="welded-graph" viewBox="' + viewBox + '" role="img" aria-labelledby="' + diagramId + '-title ' + diagramId + '-desc">');
    parts.push('<title id="' + diagramId + '-title">Welded-tree graph</title><desc id="' + diagramId + '-desc">' + (descriptions[mode] || descriptions.full) + '</desc>');
    parts.push('<g fill="none" stroke-linecap="round" stroke-linejoin="round">');

    if (collision && stage >= 1) parts.push('<rect x="620" y="18" width="60" height="404" rx="16" fill="' + C.purple + '" opacity="0.035"/>');

    if (columnMode) {
      for (let column = 0; column < 10; column++) {
        const x = columnX(column), color = coloredColumns ? columnColor(column) : C.muted;
        const selected = column === activeColumn;
        const couplingEmphasis = (mode === 'column-split' && stage >= 2) || (mode === 'column-line' && stage < 1);
        const neighbor = couplingEmphasis && (column === 1 || (column === 3 && (mode !== 'column-split' || stage >= 3)));
        if (coloredColumns) parts.push('<rect class="wg-column-band" data-column="' + column + '" x="' + (x - 36) + '" y="17" width="72" height="406" rx="14" fill="' + color + '" opacity="' + (selected ? 0.115 : neighbor ? 0.075 : 0.045) + '"/>');
        parts.push('<text class="wg-column-label" data-column="' + column + '" x="' + x + '" y="459" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="24" font-weight="600" fill="' + color + '">' + column + '</text>');
      }
      if ((mode === 'column-split' && stage >= 2) || (mode === 'column-line' && stage === 0)) {
        parts.push('<defs><marker id="' + diagramId + '-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L8 4L0 8Z" fill="' + C.ink + '"/></marker></defs>');
        ['M270 2C249 -34 192 -34 170 2', 'M270 2C291 -34 348 -34 370 2'].forEach((d, index) => {
          if (mode === 'column-split' && index === 1 && stage < 3) return;
          parts.push('<path class="wg-split-arrow" data-target-column="' + (index === 0 ? 1 : 3) + '" d="' + d + '" stroke="' + C.ink + '" stroke-width="2.5" marker-end="url(#' + diagramId + '-arrow)"/>');
        });
        parts.push('<circle cx="270" cy="2" r="4.5" fill="' + columnColor(2) + '"/>');
      }
    }

    if (middle) {
      const [startX, endX] = region.positions;
      parts.push('<rect x="' + startX + '" y="16" width="' + (endX - startX) + '" height="408" fill="' + C.teal + '" opacity="0.045"/>');
      [startX, endX].forEach((x, index) => parts.push('<path data-display-boundary-column="' + region.columns[index] + '" d="M' + x + ' 17V423" stroke="' + C.teal + '" stroke-width="1.5" stroke-dasharray="4 7" opacity="0.65"/>'));
    }

    if (wave && !columnMode && activeColumn >= 0) {
      const x = activeColumn <= 4 ? 70 + activeColumn * 100 : 650 + (activeColumn - 5) * 100;
      parts.push('<rect x="' + (x - 27) + '" y="21" width="54" height="398" rx="27" fill="' + C.teal + '" opacity="0.065"/>');
    }

    if (mode === 'column-line') {
      parts.push('<path class="wg-column-line" d="M70 220H1050" stroke="' + C.muted + '" stroke-width="3"/>');
      for (let column = 0; column < 10; column++) {
        const selected = column === activeColumn, exiting = stage >= 2 && column === 9;
        const color = columnColor(column), x = columnX(column);
        if (selected || exiting) parts.push('<circle cx="' + x + '" cy="220" r="23" fill="' + color + '" opacity="0.1"/>');
        parts.push('<circle class="wg-line-node" data-column="' + column + '" cx="' + x + '" cy="220" r="' + (selected || exiting ? 12 : 9) + '" fill="' + color + '" stroke="' + C.paper + '" stroke-width="2"/>');
        if (exiting) parts.push('<circle data-possible-measurement="exit" cx="' + x + '" cy="220" r="21" stroke="' + color + '" stroke-width="2" opacity="0.7"/>');
      }
      if (stage >= 2) {
        // This inset is an oracle-neighborhood check on the measured vertex,
        // separate from the reduced line's column states.
        parts.push('<g data-neighborhood-check="degree-two">');
        parts.push('<path d="M1050 244Q1061 302 965 326" stroke="' + C.muted + '" stroke-width="1.7" stroke-dasharray="4 7"/>');
        parts.push('<rect x="838" y="284" width="190" height="120" rx="18" fill="white" stroke="' + C.muted + '" stroke-width="1.3" opacity="0.96"/>');
        [[880,308],[880,380]].forEach(([x,y],index) => {
          parts.push('<path data-checked-edge="' + index + '" d="M966 344L' + x + ' ' + y + '" stroke="' + C.muted + '" stroke-width="3"/>');
          parts.push('<circle data-checked-neighbor="' + index + '" cx="' + x + '" cy="' + y + '" r="8" fill="' + C.muted + '" stroke="white" stroke-width="1.5"/>');
        });
        parts.push('<circle data-checked-vertex="measured" cx="966" cy="344" r="12" fill="' + C.teal + '"/><circle cx="966" cy="344" r="20" stroke="' + C.teal + '" stroke-width="1.7" opacity="0.65"/>');
        parts.push('</g>');
        parts.push('<g data-entrance-excluded="true" stroke="' + C.blue + '" stroke-width="1.8"><circle cx="70" cy="220" r="20"/><path d="M55 235L85 205"/></g>');
      }
      parts.push('</g></svg>');
      return parts.join('');
    }

    function edgePath(edge) {
      const [ax, ay] = point(byId[edge.a]), [bx, by] = point(byId[edge.b]);
      if (edge.kind === 'weld') {
        const direction = bx > ax ? 1 : -1;
        return 'M' + ax + ' ' + ay + 'C' + (ax + 65 * direction) + ' ' + ay + ' ' + (bx - 65 * direction) + ' ' + by + ' ' + bx + ' ' + by;
      }
      return 'M' + number(ax) + ' ' + number(ay) + 'L' + number(bx) + ' ' + number(by);
    }

    // The cycle stays behind the trees and the highlighted connected routes.
    edges.slice().sort((a, b) => (a.kind === 'weld' ? 0 : 1) - (b.kind === 'weld' ? 0 : 1)).forEach(edge => {
      if (hideWeld && edge.kind === 'weld') return;
      if (collision && edge.kind === 'weld') return;
      let color = edge.kind === 'weld' ? C.coral : C.muted;
      let opacity = edge.kind === 'weld' ? 0.55 : 0.88;
      if (mode === 'access') { color = C.muted; opacity = edge.kind === 'weld' ? 0.62 : 0.9; }
      if (focus) { opacity = edge.kind === 'weld' ? 0.25 : 0.68; }
      if (mode === 'fresh') { color = C.muted; opacity = 0.25; }
      if (mode === 'middle' && stage >= 1 && edge.kind === 'weld') opacity = 0.58;
      if (wave) { opacity = edge.kind === 'weld' ? 0.3 : 0.85; }
      if (columnMode) { color = C.muted; opacity = edge.kind === 'weld' ? 0.6 : 0.9; }
      if (collision || mode === 'rooted') { color = C.muted; opacity = 0.38; }
      if (forest) { color = C.muted; opacity = 0.32; }
      parts.push('<path class="wg-edge" d="' + edgePath(edge) + '" stroke="' + color + '" stroke-width="' + (edge.kind === 'weld' ? 1.8 : 2.35) + '" opacity="' + opacity + '"/>');
    });

    if (collision && stage >= 1) {
      collision.candidates.forEach(target => {
        const returning = stage >= 2 && collision.visitedTargets.includes(target);
        const d = edgePath({ a: collision.source, b: target, kind: 'weld' });
        parts.push('<path data-candidate-edge="' + target + '" data-source="' + collision.source + '" data-source-column="4" data-target="' + target + '" data-target-column="5" data-collision-candidate="' + Boolean(collision.visitedTargets.includes(target)) + '" d="' + d + '" stroke="' + (returning ? '#d52c35' : C.purple) + '" stroke-width="' + (returning ? 3.3 : 2.3) + '" stroke-dasharray="' + (returning ? '6 7' : '5 6') + '" opacity="' + (returning ? 1 : 0.8) + '"/>');
      });
    }

    const routePriority = color => color === C.coral ? 0 : color === C.blue ? 1 : 2;
    const orderedRoutes = Array.from(highlightedEdges.entries());
    if (mode === 'uphill') orderedRoutes.sort((a, b) => routePriority(a[1]) - routePriority(b[1]));
    orderedRoutes.forEach(([id, color]) => {
      const edge = edges.find(e => e.id === id);
      const d = edgePath(edge);
      const wrong = mode === 'uphill' && color === C.coral;
      const upward = mode === 'uphill' && color === C.teal;
      const kind = mode === 'uphill' ? ' data-route-kind="' + (wrong ? 'wrong' : upward ? 'upward' : 'approach') + '"' : forest ? ' data-forest-component="' + (color === C.teal ? 1 : 2) + '"' : collision ? ' data-explored-edge="' + id + '" data-source="' + edge.a + '" data-target="' + edge.b + '"' : '';
      parts.push('<path d="' + d + '" stroke="' + C.paper + '" stroke-width="' + (wrong ? 5 : 7) + '" opacity="' + (wrong ? 0.6 : 0.9) + '"/>');
      parts.push('<path class="wg-route"' + kind + ' data-edge="' + id + '" d="' + d + '" stroke="' + (wrong ? '#d52c35' : color) + '" stroke-width="' + (wrong ? 3.6 : upward ? 4 : 3.3) + '" opacity="1"/>');
    });

    if (collision && stage >= 1) collision.candidates.forEach(id => {
      const node = byId[id], returning = stage >= 2 && collision.visitedTargets.includes(id);
      parts.push('<circle data-candidate-endpoint="' + id + '" data-column="5" data-previously-visited="' + Boolean(collision.visitedTargets.includes(id)) + '" cx="' + node.x + '" cy="' + node.y + '" r="' + (returning ? 10 : 7) + '" stroke="' + (returning ? '#d52c35' : C.purple) + '" stroke-width="' + (returning ? 2 : 1.6) + '" opacity="' + (returning ? 1 : 0.85) + '"/>');
    });

    nodes.forEach(node => {
      const [x, y] = point(node);
      const isRoot = node.depth === 0;
      const emphasizeRoot = isRoot && !forest && ((!collision && mode !== 'rooted') || node.side === 'L');
      const selected = highlightedNodes.get(node.id);
      const active = wave && node.column === activeColumn;
      let fill = C.muted;
      let opacity = 1;
      if (focus || wave) { fill = C.muted; opacity = 0.96; }
      if (collision) opacity = 0.45;
      if (forest) opacity = 0.35;
      if (mode === 'fresh') { fill = C.muted; opacity = 0.4; }
      if (selected) { fill = selected; opacity = 1; }
      if (mode === 'uphill' && selected === C.coral) { fill = '#d52c35'; opacity = 1; }
      if (active) { fill = C.teal; opacity = 1; }
      if (columnMode) { fill = coloredColumns ? columnColor(node.column) : C.muted; opacity = 1; }
      if (emphasizeRoot) {
        const color = outputPath && selected ? selected : columnMode ? fill : mode === 'access' ? (node.side === 'L' ? (stage >= 1 ? C.blue : C.muted) : (stage >= 3 ? C.teal : C.muted)) : (node.side === 'L' ? C.blue : C.teal);
        if (mode !== 'columns') parts.push('<circle cx="' + number(x) + '" cy="' + number(y) + '" r="16" fill="' + color + '" opacity="0.085"/>');
        // Endpoint colors stay fixed unless the completed output marks all path vertices.
        fill = color;
      }
      if (active) parts.push('<circle cx="' + number(x) + '" cy="' + number(y) + '" r="10" fill="' + (columnMode ? columnColor(node.column) : C.teal) + '" opacity="0.105"/>');
      const radius = emphasizeRoot ? (mode === 'access' ? 11 : 7.6) : active || selected ? (mode === 'access' || forest ? 7 : 5.2) : node.depth === 4 ? 4 : 4.5;
      const collisionNode = collision ? ' data-explored="' + collision.knownNodes.includes(node.id) + '"' + (node.id === collision.source ? ' data-candidate-source="true"' : '') : '';
      parts.push('<circle class="wg-node" data-node="' + node.id + '" data-column="' + node.column + '"' + collisionNode + ' cx="' + number(x) + '" cy="' + number(y) + '" r="' + radius + '" fill="' + fill + '" stroke="' + C.paper + '" stroke-width="' + (selected || active || emphasizeRoot ? 1.5 : 1) + '" opacity="' + opacity + '"/>');
      if (mode === 'access' && o.randomLabels !== false) parts.push('<circle class="wg-random-label-ring" data-label-node="' + node.id + '" cx="' + number(x) + '" cy="' + number(y) + '" r="' + radius + '" fill="none" stroke="#d52c35" stroke-width="2.2"/>');
    });

    frontiers.forEach(frontier => {
      const node = byId[frontier.id], [x, y] = point(node);
      parts.push('<circle cx="' + x + '" cy="' + y + '" r="11.5" stroke="' + frontier.color + '" stroke-width="1.5" opacity="0.6"/>');
    });
    parts.push('</g></svg>');
    return parts.join('');
  }

  function render(element, options) {
    if (!element || typeof element.innerHTML !== 'string') throw new TypeError('WeldedGraph.render requires a DOM element.');
    const o = options || {};
    const oldSvg = element.firstElementChild;
    const oldStage = Number(element.dataset.graphStage);
    const newStage = Number.isFinite(Number(o.stage)) ? Math.max(0, Number(o.stage)) : 2;
    const printMode = root.location && new URLSearchParams(root.location.search).has('print-pdf');
    const reducedMotion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const morph = oldSvg && o.mode === 'construction' && element.dataset.graphMode === 'construction' &&
      ((oldStage === 0 && newStage === 1) || (oldStage === 1 && newStage === 0)) &&
      element.closest('section.present') && !printMode && !reducedMotion;
    element.innerHTML = svg(o);
    element.dataset.graphMode = o.mode || 'full';
    element.dataset.graphStage = String(newStage);
    const newSvg = element.firstElementChild;
    if (morph) {
      // SMIL changes only animated values: every base attribute remains the final
      // geometry, so serialization and interrupted rerenders cannot save a half-morph.
      const animate = (target, attribute, from, to) => {
        if (from === to || from === null || to === null) return;
        const animation = element.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animation.setAttribute('attributeName', attribute);
        animation.setAttribute('from', from);
        animation.setAttribute('to', to);
        animation.setAttribute('dur', '500ms');
        animation.setAttribute('begin', 'indefinite');
        animation.setAttribute('fill', 'remove');
        animation.setAttribute('calcMode', 'spline');
        animation.setAttribute('keyTimes', '0;1');
        animation.setAttribute('keySplines', '0.22 0.61 0.36 1');
        animation.addEventListener('endEvent', () => animation.remove(), { once: true });
        target.appendChild(animation);
        if (typeof animation.beginElement === 'function') animation.beginElement();
        else animation.remove();
      };
      const oldEdges = oldSvg.querySelectorAll('.wg-edge');
      newSvg.querySelectorAll('.wg-edge').forEach((edge, index) => {
        if (oldEdges[index]) animate(edge, 'd', oldEdges[index].getAttribute('d'), edge.getAttribute('d'));
      });
      // Include root halos, not just the circles with the wg-node class.
      const oldCircles = oldSvg.querySelectorAll('circle');
      newSvg.querySelectorAll('circle').forEach((circle, index) => {
        if (!oldCircles[index]) return;
        ['cx', 'cy'].forEach(attribute => animate(circle, attribute, oldCircles[index].getAttribute(attribute), circle.getAttribute(attribute)));
      });
    }
    return newSvg;
  }

  const api = { render, svg, buildModel, middleRegion, uphillRoutes, columnColor, collisionExploration, interferenceNeighborhood, recordedForest, colorWeldedEdges, permutationDatabases, recordedPathExample, freshnessExample, weldGroupingExamples };
  root.WeldedGraph = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
