/* A fixed retained weld and its actual color-sequence continuations.
 * Geometry comes from the same welded-tree proof instance as the preceding
 * six-database slide. Green/red indicate boundary status, never oracle colors.
 */
(function (root) {
  'use strict';

  const COLORS = {
    context: '#c8d1d9', node: '#d7dfe5', known: '#718191',
    retained: '#d75a4a', reached: '#138a78', pending: '#d52c35',
    oracle: ['#2563eb', '#138a78', '#d75a4a']
  };
  let serial = 0;

  function graphApi() {
    if (root.WeldedGraph) return root.WeldedGraph;
    if (typeof require !== 'undefined') return require('./graph.js');
    throw new Error('The welded-tree graph renderer must be loaded first.');
  }

  function example(options) {
    const graph = graphApi();
    const base = graph.weldGroupingExamples(options || { seed: 17 });
    const chosen = base.groups[1];
    const variant = chosen.variants[0];
    const { model, rewiredEdges } = base;
    const region = graph.middleRegion(model);
    const weld = chosen.weld;
    const edgeBetween = (a, b) => rewiredEdges.find(edge =>
      (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a));
    // Keep the outside component small enough that the full remembered shape
    // has a good placement even in this 62-vertex illustration. These two
    // off-path leaf records are omitted consistently from the proof example.
    const omittedOutsideEdges = new Set(['L3-2:L4-5', 'L3-2:L4-4']);
    const knownEdges = chosen.pathEdges.concat(variant.extraEdges).filter(edge =>
      edge.kind === 'tree' && model.byId[edge.a].side === 'L' &&
      !omittedOutsideEdges.has(edge.id));
    const knownVertices = new Set(knownEdges.flatMap(edge => [edge.a, edge.b]));
    const pathInfo = vertices => {
      const edges = vertices.slice(1).map((id, index) => edgeBetween(vertices[index], id));
      return {
        vertices, edges, colors: edges.map(edge => edge.color),
        word: edges.map(edge => '\\alpha_' + (edge.color + 1)).join(''),
        escaped: vertices.some(region.isBoundary),
        endpoint: vertices[vertices.length - 1]
      };
    };
    // One illustrative component, grown in an uneven but repeatable order.
    // Each reveal adds two actual edges, sometimes returning to an earlier
    // vertex to start a branch. This is not a breadth-first search or a sampler
    // of the quantum state. The three final branches have lengths 2, 4 and 4.
    // The last edge is fixed outer geometry, shown to make escape visible.
    const additions = [
      [weld.head, 'L4-14'], ['L4-14', 'L3-7'],
      [weld.head, 'R3-4'], ['R3-4', 'R4-9'],
      ['L3-7', 'L4-15'], ['L4-15', 'R4-0'],
      ['L3-7', 'L2-3'], ['L2-3', 'L1-1']
    ];
    const stages = [[pathInfo([weld.head])]];
    const rootPaths = new Map([[weld.head, [weld.head]]]);
    const tips = new Set([weld.head]);
    additions.forEach(([from, to], index) => {
      if (!rootPaths.has(from) ||
          rootPaths.has(to) || knownVertices.has(to) || !edgeBetween(from, to)) {
        throw new Error('A growth reveal must attach one fresh vertex along an actual edge.');
      }
      rootPaths.set(to, rootPaths.get(from).concat(to));
      tips.delete(from);
      tips.add(to);
      if (index % 2 === 1) {
        stages.push(Array.from(tips, tip => pathInfo(rootPaths.get(tip)))
          .sort((a, b) => a.colors.join(',').localeCompare(b.colors.join(','))));
      }
    });
    const paths = stages[stages.length - 1];
    const prefixWords = new Map([['', []]]);
    paths.forEach(path => {
      for (let length = 1; length <= path.colors.length; length++) {
        const colors = path.colors.slice(0, length);
        prefixWords.set(colors.join(','), colors);
      }
    });
    const prefixes = Array.from(prefixWords.values()).map(colors => ({
      colors,
      paths: paths.filter(path => colors.every((color, index) => path.colors[index] === color))
    }));
    return { ...base, region, chosen, variant, weld, knownEdges, knownVertices, stages, paths, prefixes, edgeBetween };
  }

  function goodExample(options) {
    options = options || {};
    const data = example(options);
    const { baseEdges, model, region, weld } = data;
    // Four complete placements of the SAME remembered prefix tree. Their
    // closed neighborhoods are disjoint in the base graph, not the rewired
    // graph. The latter necessarily connects consecutive assigned vertices.
    const variant = ((Math.floor(Number(options.goodVariant) || 0) % 4) + 4) % 4;
    const vertexByPrefix = {
      '': weld.head, '0': 'R3-3', '1': 'L4-9',
      '0,2': variant >= 2 ? 'R4-5' : 'R4-1',
      '1,0': variant % 2 ? 'R4-13' : 'R4-2',
      '1,0,1': 'R3-7', '1,0,2': 'L4-10',
      '1,0,1,2': variant >= 2 ? 'R4-1' : 'R4-5',
      '1,0,2,0': variant % 2 ? 'R4-2' : 'R4-13'
    };
    const assignments = data.prefixes.filter(prefix => prefix.colors.length).map(prefix => {
      const colors = prefix.colors, parentPrefix = colors.slice(0, -1);
      const from = vertexByPrefix[parentPrefix.join(',')];
      const to = vertexByPrefix[colors.join(',')], color = colors[colors.length - 1];
      const baseEdge = baseEdges.find(edge => edge.color === color &&
        (edge.tail === from || edge.head === from));
      const fromTail = baseEdge.tail === from;
      const edgeClass = baseEdges.filter(edge => edge.color === color &&
        edge.kind === baseEdge.kind && edge.childColumn === baseEdge.childColumn);
      const candidates = edgeClass.map(edge => ({
        vertex: fromTail ? edge.head : edge.tail,
        probability: 1 / edgeClass.length,
        sourceEdge: fromTail ? baseEdge.id : edge.id,
        assignmentEdge: fromTail ? edge.id : baseEdge.id
      }));
      const selected = candidates.find(candidate => candidate.vertex === to);
      if (!selected) throw new Error('The chosen good placement must be compatible with the base edge class.');
      return { prefix: colors.slice(), parentPrefix, prefixKey: colors.join(','),
        from, to, color, baseEdge, fromTail, edgeClass, candidates,
        sourceEdge: selected.sourceEdge, assignmentEdge: selected.assignmentEdge,
        probability: selected.probability };
    });

    // Complete the assigned partial permutations by same-class endpoint
    // transpositions. No recorded outside edge or retained weld may change.
    const rewiredEdges = data.rewiredEdges.map(edge => ({ ...edge }));
    const locked = new Set([weld.id, ...data.knownEdges.map(edge => edge.id)]);
    const swaps = [];
    const transpose = (a, b) => {
      if (a.kind !== b.kind || a.color !== b.color || a.childColumn !== b.childColumn ||
          locked.has(a.id) || locked.has(b.id)) throw new Error('Invalid good-placement completion.');
      swaps.push([a.id, b.id]);
      [a.head, b.head] = [b.head, a.head];
      [a.image, b.image] = [b.image, a.image];
      [a, b].forEach(edge => {
        edge.a = edge.tail; edge.b = edge.head;
        edge.changed = edge.image !== edge.id;
      });
    };
    assignments.forEach(assignment => {
      const edge = rewiredEdges.find(item => item.id === assignment.sourceEdge);
      if (edge.image !== assignment.assignmentEdge) {
        transpose(edge, rewiredEdges.find(item => item.image === assignment.assignmentEdge));
      }
      locked.add(edge.id);
      assignment.edge = edge;
    });
    const weldComponents = () => {
      const edges = rewiredEdges.filter(edge => edge.kind === 'weld');
      const remaining = new Set(edges.flatMap(edge => [edge.a, edge.b]));
      const components = [];
      while (remaining.size) {
        const stack = [remaining.values().next().value], component = new Set(stack);
        while (stack.length) {
          const vertex = stack.pop();
          edges.filter(edge => edge.a === vertex || edge.b === vertex).forEach(edge => {
            const neighbor = edge.a === vertex ? edge.b : edge.a;
            if (!component.has(neighbor)) { component.add(neighbor); stack.push(neighbor); }
          });
        }
        component.forEach(vertex => remaining.delete(vertex));
        components.push(component);
      }
      return components;
    };
    let components = weldComponents();
    while (components.length > 1) {
      const available = rewiredEdges.filter(edge => edge.kind === 'weld' && !locked.has(edge.id));
      let pair;
      for (const a of available) {
        const b = available.find(edge => edge.color === a.color &&
          components.find(component => component.has(edge.tail)) !==
          components.find(component => component.has(a.tail)));
        if (b) { pair = [a, b]; break; }
      }
      if (!pair) throw new Error('Cannot complete the good placement to one weld cycle.');
      transpose(pair[0], pair[1]);
      components = weldComponents();
    }
    const edgeBetween = (u, v) => rewiredEdges.find(edge =>
      (edge.a === u && edge.b === v) || (edge.a === v && edge.b === u));
    const paths = data.paths.map(path => {
      const vertices = [weld.head, ...path.colors.map((_, index) =>
        vertexByPrefix[path.colors.slice(0, index + 1).join(',')])];
      const edges = vertices.slice(1).map((vertex, index) => edgeBetween(vertices[index], vertex));
      return { ...path, vertices, edges,
        endpoint: vertices[vertices.length - 1],
        escaped: vertices.some(vertex => !region.containsVertex(vertex) || region.isBoundary(vertex)) };
    });
    const prefixes = data.prefixes.map(prefix => ({ colors: prefix.colors,
      paths: paths.filter(path => prefix.colors.every((color, index) => path.colors[index] === color)) }));
    const vertices = prefixes.map(prefix => vertexByPrefix[prefix.colors.join(',')]);
    const neighborhoods = vertices.map(vertex => new Set([vertex, ...baseEdges
      .filter(edge => edge.a === vertex || edge.b === vertex)
      .map(edge => edge.a === vertex ? edge.b : edge.a)]));
    const outsideSupport = new Set([...data.knownVertices, weld.tail, weld.head]);
    const intersects = (a, b) => [...a].some(vertex => b.has(vertex));
    const good = {
      inside: vertices.every(vertex => region.containsVertex(vertex) && !region.isBoundary(vertex)),
      separated: neighborhoods.every((set, index) => neighborhoods.slice(index + 1)
        .every(other => !intersects(set, other))),
      outside: neighborhoods.slice(1).every(set => !intersects(set, outsideSupport)),
      compatible: assignments.every(assignment => assignment.edge && assignment.edge.color === assignment.color)
    };
    if (!Object.values(good).every(Boolean)) throw new Error('The illustrative placement must satisfy every goodness condition.');

    // Lay out the actual completed binary trees, rather than drawing their
    // permuted edges at the old base-tree coordinates. Only vertical positions
    // change: columns, records, colors, and both retained endpoints stay fixed.
    // Keep the two long colored branches in the same vertical order at the weld.
    ['L', 'R'].forEach(side => {
      const leaves = [], spans = new Map();
      const visit = vertex => {
        const children = rewiredEdges.filter(edge => edge.kind === 'tree' &&
          (edge.a === vertex || edge.b === vertex))
          .map(edge => model.byId[edge.a === vertex ? edge.b : edge.a])
          .filter(node => node.depth > model.byId[vertex].depth)
          .sort((a, b) => a.index - b.index);
        if (vertex === 'R2-3') children.reverse();
        const first = leaves.length;
        if (children.length) children.forEach(node => visit(node.id));
        else leaves.push(vertex);
        spans.set(vertex, [first, leaves.length - 1]);
      };
      visit(side + '0-0');
      const anchor = side === 'L' ? weld.tail : weld.head;
      const pivot = leaves.indexOf(anchor), anchorY = model.byId[anchor].y;
      const positions = leaves.map((_, index) => index <= pivot
        ? 40 + (anchorY - 40) * index / pivot
        : anchorY + (400 - anchorY) * (index - pivot) / (leaves.length - 1 - pivot));
      spans.forEach(([first, last], vertex) => {
        model.byId[vertex].y = (positions[first] + positions[last]) / 2;
      });
    });
    return { ...data, rewiredEdges, completedEdges: rewiredEdges, edgeBetween, paths, prefixes,
      stages: [paths], vertices, vertexByPrefix, neighborhoods, outsideSupport, good,
      assignments, swaps, goodVariant: variant,
      probability: assignments.reduce((probability, assignment) => probability * assignment.probability, 1) };
  }

  function comparisonExample(options) {
    return goodExample(options);
  }

  function svg(mode, requestedStage, options) {
    if (typeof mode === 'object') {
      options = mode;
      requestedStage = mode.stage;
      mode = mode.mode;
    }
    mode = mode || 'growth';
    options = options || {};
    const data = options.placement === 1 ? comparisonExample(options) : example(options);
    const lastGrowthStage = data.stages.length - 1;
    const stage = Math.max(0, Math.min(mode === 'sequences' ? 2 : lastGrowthStage, Math.floor(Number(requestedStage) || 0)));
    const { model, region, rewiredEdges, weld, knownEdges, knownVertices } = data;
    const inserted = mode !== 'setup';
    const sequenceMode = mode === 'sequences';
    const showLabels = sequenceMode && (options.labels ||
      (options.labelsFrom !== undefined && stage >= options.labelsFrom));
    const paths = data.stages[mode === 'sequences' ? lastGrowthStage : stage];
    const id = 'escape-records-' + (++serial);
    const parts = [
      '<svg xmlns="http://www.w3.org/2000/svg" class="welded-graph escape-records" viewBox="0 0 1120 465" role="img" aria-labelledby="' + id + '-title">',
      '<title id="' + id + '-title">' + (mode === 'setup'
        ? 'The same known left records remain fixed before the selected weld is inserted.'
        : sequenceMode
          ? (options.placement === 1
            ? 'A good compatible welded-tree instance places the same color sequences and external labels strictly inside the middle. Closed neighborhoods in the base graph are pairwise disjoint, and nonroot neighborhoods avoid the fixed outside records. The retained weld stays fixed.'
            : 'The exact graph from the escape slide now displays its actual oracle edge colors, including one fixed outer edge beyond the left boundary.')
          : 'One possible recorded component grows unevenly, two actual edges per reveal. The escaped branch extends one fixed outer edge beyond the left boundary; both boundaries remain n/2 levels from their respective roots.') + '</title>'
    ];
    const edgePath = edge => {
      const a = model.byId[edge.a], b = model.byId[edge.b];
      const sign = b.x > a.x ? 1 : -1;
      return edge.kind === 'weld'
        ? 'M' + a.x + ' ' + a.y + 'C' + (a.x + sign * 65) + ' ' + a.y + ' ' +
          (b.x - sign * 65) + ' ' + b.y + ' ' + b.x + ' ' + b.y
        : 'M' + a.x + ' ' + a.y + 'L' + b.x + ' ' + b.y;
    };
    const stroke = (edge, color, width, attr) =>
      '<path ' + (attr || '') + ' d="' + edgePath(edge) + '" fill="none" stroke="' + color +
      '" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round"/>';
    const node = (vertexId, color, radius, attr) => {
      const vertex = model.byId[vertexId];
      return '<circle ' + (attr || '') + ' cx="' + vertex.x + '" cy="' + vertex.y +
        '" r="' + radius + '" fill="' + color + '" stroke="white" stroke-width="1.5"/>';
    };
    const math = (value, x, y, color, width, fontSize) => {
      const html = root.katex
        ? root.katex.renderToString(value, { throwOnError: true, output: 'html' })
        : value;
      return '<foreignObject x="' + (x - width / 2) + '" y="' + y + '" width="' + width +
        '" height="42"><div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:' + (fontSize || 24) + 'px;color:' +
        color + '">' + html + '</div></foreignObject>';
    };

    // Use the same root-relative cut on each side for the guides, the
    // permuted region, and the boundary-reaching event.
    if (!options.hideBoundaryGuides) region.positions.forEach((x, index) => {
      parts.push('<path data-middle-boundary="' + region.columns[index] +
        '" d="M' + x + ' 15V404" fill="none" stroke="#afbbc6" stroke-width="1.5" stroke-dasharray="5 7" opacity=".7"/>');
      const rootX = region.rootPositions[index];
      parts.push('<path data-fixed-level-bracket="' + index + '" d="M' + rootX +
        ' 414V424M' + rootX + ' 419H' + x + 'M' + x +
        ' 414V424" fill="none" stroke="#afbbc6" stroke-width="1.5"/>');
      parts.push(math('n/2', (rootX + x) / 2, 421, '#718191', 120));
    });

    rewiredEdges.forEach(edge => {
      // The next slide adds the distinguished weld itself. Other unrecorded
      // edges stay as faint context and do not indicate known oracle records.
      if (!inserted && edge.id === weld.id) return;
      parts.push('<g opacity="' + (edge.kind === 'weld' ? '.27' : '.53') + '">' +
        stroke(edge, COLORS.context, 1.6, 'data-context-edge="' + edge.id + '"') + '</g>');
    });
    model.nodes.forEach(vertex => parts.push(node(vertex.id, COLORS.node, 4.2)));

    knownEdges.forEach(edge => {
      parts.push(stroke(edge, 'white', 8));
      parts.push(stroke(edge, COLORS.known, 4.5, 'data-known-edge="' + edge.id + '"'));
    });
    knownVertices.forEach(vertexId => parts.push(node(vertexId, COLORS.known, 5.5)));

    if (inserted) {
      // Reaching either symmetric boundary is the proof's escape event.
      // One more fixed outer edge makes that escape visible. Shared prefixes
      // stay green; terminal dots give the status of each route.
      const edgeStatus = new Map();
      const vertexStatus = new Map();
      paths.forEach(path => {
        path.edges.forEach(edge => {
          const old = edgeStatus.get(edge.id);
          edgeStatus.set(edge.id, { edge, reached: path.escaped || (old && old.reached) });
        });
        path.vertices.forEach(vertexId => vertexStatus.set(vertexId,
          path.escaped || vertexStatus.get(vertexId) || false));
      });
      edgeStatus.forEach(({ edge }) => parts.push(stroke(edge, 'white', 9)));
      edgeStatus.forEach(({ edge, reached }) => parts.push(stroke(edge,
        sequenceMode ? COLORS.oracle[edge.color] : reached ? COLORS.reached : COLORS.pending, 4.8,
        'data-continuation-edge="' + edge.id + '" data-oracle-color="' + edge.color + '"')));
      vertexStatus.forEach((reached, vertexId) => {
        if (vertexId === weld.head) return;
        parts.push(node(vertexId, sequenceMode ? COLORS.known : reached ? COLORS.reached : COLORS.pending, 5.6));
      });
      paths.forEach(path => {
        if (!path.edges.length) return;
        const color = sequenceMode ? COLORS.oracle[path.colors[path.colors.length - 1]]
          : path.escaped ? COLORS.reached : COLORS.pending;
        parts.push(node(path.endpoint, color, 7,
          'data-path-endpoint="' + path.endpoint + '" data-reached-boundary="' + path.escaped + '"'));
      });

      parts.push(stroke(weld, 'white', 12));
      parts.push(stroke(weld, COLORS.retained, 6.5, 'data-retained-weld="' + weld.id + '"'));
      [weld.tail, weld.head].forEach(vertexId => parts.push(node(vertexId, COLORS.retained, 7.7)));
      const a = model.byId[weld.tail], b = model.byId[weld.head];
      const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
      const angle = Math.atan2(b.y - a.y, (b.x - a.x) * .65) * 180 / Math.PI;
      parts.push('<path data-insertion-direction="right" d="M-28 0H25M14 -8L26 0L14 8" transform="translate(' +
        midX + ' ' + (midY - 29) + ') rotate(' + angle + ')" fill="none" stroke="' +
        COLORS.retained + '" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>');
      parts.push(math('\\rho', midX, midY - 81, COLORS.retained, 90));
      if (showLabels) paths.forEach((path, index) => {
        const vertex = model.byId[path.endpoint];
        const dx = options.placement === 1 ? 45 : index === 2 ? -36 : 35;
        const dy = options.placement === 1 ? (index === 0 ? -45 : 3) : index === 0 ? 1 : -39;
        parts.push('<g data-terminal-label="' + (index + 1) + '" data-structural-vertex="' + path.endpoint + '">' +
          math('\\ell_' + (index + 1), vertex.x + dx, vertex.y + dy, COLORS.known, 80, options.compact ? 36 : 28) + '</g>');
      });
    }
    parts.push('</svg>');
    return parts.join('');
  }

  function render(el, stage) {
    const options = JSON.parse(el.getAttribute('data-escape-records') || '{}');
    const effectiveStage = options.stage === undefined ? stage : options.stage;
    el.innerHTML = svg(options.mode, effectiveStage, options);
    return el.querySelector('svg');
  }

  const api = { example, goodExample, comparisonExample, svg, render, colors: COLORS, stages: { setup: 0, growth: 4, sequences: 2 } };
  root.EscapeRecords = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
