/* Reference assignments, base-graph goodness, and weighted good states.
 * All panels use the same full color-sequence tree as the escape example.
 * Candidate rings are alternative endpoints; only selected edges are drawn.
 */
(function (root) {
  'use strict';
  const C = { context: '#c8d1d9', node: '#d7dfe5', known: '#718191',
    retained: '#d75a4a', purple: '#7860ba', slate: '#30758b',
    oracle: ['#2563eb', '#138a78', '#d75a4a'] };
  let serial = 0;
  const escapeApi = () => root.EscapeRecords || require('./escape-records.js');
  const example = options => escapeApi().goodExample(options || {});

  function svg(requestedStage, options) {
    options = options || {};
    const mode = options.mode || 'sample';
    const stage = Math.max(0, Math.min(mode === 'conditions' ? 3 : 4, Number(requestedStage) || 0));
    const data = example(options);
    if (mode === 'state') return escapeApi().svg('sequences', 2, {
      placement: 1, goodVariant: options.goodVariant || 0,
      labels: true, compact: true, hideBoundaryGuides: true
    });
    const { model, region, weld, knownEdges, knownVertices, rewiredEdges, baseEdges, paths } = data;
    const first = data.assignments.find(a => a.prefixKey === '1');
    const second = data.assignments.find(a => a.prefixKey === '1,0');
    const neighborhoodView = mode === 'conditions' && (stage === 1 || stage === 2);
    const fullComponent = mode === 'conditions' || stage === 0 || stage === 4;
    const id = 'assignment-' + (++serial);
    const parts = [
      '<svg xmlns="http://www.w3.org/2000/svg" class="welded-graph good-assignments" viewBox="0 0 1120 465" role="img" aria-labelledby="' + id + '-title">',
      '<title id="' + id + '-title">' + (mode === 'conditions'
        ? ['A verified good assignment of all three color sequences stays strictly between the symmetric cuts.',
          'Two representative closed neighborhoods in the fixed base graph are disjoint and avoid every fixed outside record. All assigned vertices satisfy these conditions; the retained root is exempt from the outside-record condition.',
          'A nonroot base-graph neighborhood avoids every fixed outside record. The retained root is exempt.',
          'The same verified good assignment illustrates the probability bound; it does not represent the asymptotic fraction in this small graph.'][stage]
        : ['The good placement from the preceding comparison, with exactly the same words, labels and outside records.',
          'Column-level sampling illustration: equal rings mark every vertex in the adjacent column, including occupied vertices. Color-class restrictions are suppressed.',
          'One first edge is chosen. Equal rings mark every vertex in the next column, including occupied vertices. Color-class restrictions are suppressed.',
          'The first two chosen edges follow the highlighted color prefix.',
          'Repeat over all color-sequence prefixes to obtain a complete structural placement.'][stage]) + '</title>'
    ];
    const edgePath = edge => {
      const a = model.byId[edge.a], b = model.byId[edge.b], sign = b.x > a.x ? 1 : -1;
      return edge.kind === 'weld'
        ? 'M' + a.x + ' ' + a.y + 'C' + (a.x + sign * 65) + ' ' + a.y + ' ' +
          (b.x - sign * 65) + ' ' + b.y + ' ' + b.x + ' ' + b.y
        : 'M' + a.x + ' ' + a.y + 'L' + b.x + ' ' + b.y;
    };
    const stroke = (edge, color, width, attr) => '<path ' + (attr || '') + ' d="' + edgePath(edge) +
      '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round"/>';
    const node = (vertex, color, radius, attr) => {
      const p = model.byId[vertex];
      return '<circle ' + (attr || '') + ' cx="' + p.x + '" cy="' + p.y + '" r="' + radius +
        '" fill="' + color + '" stroke="white" stroke-width="1.5"/>';
    };
    const ring = (vertex, color, radius, attr) => {
      const p = model.byId[vertex];
      return '<circle ' + (attr || '') + ' cx="' + p.x + '" cy="' + p.y + '" r="' + radius +
        '" fill="white" fill-opacity=".85" stroke="' + color + '" stroke-width="2.5"/>';
    };
    const math = (tex, x, y, color, width, size) => {
      const html = root.katex ? root.katex.renderToString(tex, { throwOnError: true, output: 'html' }) : tex;
      return '<foreignObject x="' + (x - width / 2) + '" y="' + y + '" width="' + width +
        '" height="42"><div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:' +
        (size || 26) + 'px;color:' + color + '">' + html + '</div></foreignObject>';
    };
    if (mode === 'conditions' && stage === 0) region.positions.forEach((x, i) =>
      parts.push('<path data-middle-boundary="' + region.columns[i] + '" d="M' + x + ' 15V404" fill="none" stroke="#afbbc6" stroke-width="1.6" stroke-dasharray="5 7"/>'));
    const contextEdges = neighborhoodView ? baseEdges : rewiredEdges;
    contextEdges.forEach(edge => parts.push(stroke(edge, C.context, 1.5,
      'data-context-edge="' + edge.id + '" opacity=".38"')));
    model.nodes.forEach(p => parts.push(node(p.id, C.node, 4)));
    knownEdges.forEach(edge => {
      parts.push(stroke(edge, 'white', 8));
      parts.push(stroke(edge, C.known, 4.5, 'data-outside-edge="' + edge.id + '"'));
    });
    knownVertices.forEach(v => parts.push(node(v, C.known, 5.5)));

    const visibleEdges = new Map();
    if (fullComponent) paths.forEach(path => path.edges.forEach(edge => visibleEdges.set(edge.id, edge)));
    else {
      if (stage >= 2) visibleEdges.set(first.edge.id, first.edge);
      if (stage >= 3) visibleEdges.set(second.edge.id, second.edge);
    }
    // The neighborhood reveal uses the base graph. Omit the realized path
    // overlay entirely so its oracle colors cannot compete with the sets.
    if (!neighborhoodView) {
      parts.push('<g data-recorded-component="true">');
      const vertices = new Set([weld.head]);
      visibleEdges.forEach(edge => { parts.push(stroke(edge, 'white', 9)); vertices.add(edge.a); vertices.add(edge.b); });
      visibleEdges.forEach(edge => parts.push(stroke(edge, C.oracle[edge.color], 4.8,
        'data-assigned-edge="' + edge.id + '" data-oracle-color="' + edge.color + '"')));
      vertices.forEach(v => parts.push(node(v, C.known, 5.6)));
      if (fullComponent) paths.forEach(path => parts.push(node(path.endpoint, C.oracle[path.colors.at(-1)], 7)));
      parts.push('</g>');
    }

    if (neighborhoodView) {
      const centers = stage === 1 ? [first.to, second.to] : [first.to];
      centers.forEach((center, i) => {
        const color = i ? C.slate : C.purple;
        const edges = baseEdges.filter(e => e.a === center || e.b === center);
        const neighbors = new Set([center, ...edges.map(e => e.a === center ? e.b : e.a)]);
        parts.push('<g data-base-neighborhood="' + center + '">');
        edges.forEach(edge => {
          parts.push(stroke(edge, 'white', 7));
          parts.push(stroke(edge, color, 2.8, 'data-base-edge="' + edge.id + '"'));
        });
        neighbors.forEach(v => parts.push(ring(v, color, 8, 'data-neighborhood-vertex="' + v + '"')));
        parts.push(node(center, color, 5.8));
        parts.push('</g>');
      });
      data.outsideSupport.forEach(v => parts.push(ring(v, C.known, 7, 'data-outside-support="' + v + '"')));
    }
    parts.push(stroke(weld, 'white', 12));
    parts.push(stroke(weld, C.retained, 6.5, 'data-retained-weld="' + weld.id + '"'));
    [weld.tail, weld.head].forEach(v => parts.push(node(v, C.retained, 7.7)));
    const a = model.byId[weld.tail], b = model.byId[weld.head];
    const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
    const angle = Math.atan2(b.y - a.y, (b.x - a.x) * .65) * 180 / Math.PI;
    parts.push('<path d="M-28 0H25M14 -8L26 0L14 8" transform="translate(' + midX + ' ' + (midY - 29) +
      ') rotate(' + angle + ')" fill="none" stroke="' + C.retained + '" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>');
    parts.push(math('\\rho', midX, midY - 81, C.retained, 90, 24));
    if (fullComponent && !neighborhoodView) paths.forEach((path, i) => {
      const v = model.byId[path.endpoint];
      parts.push(math('\\ell_' + (i + 1), v.x + 45, v.y + (i === 0 ? -45 : 3), C.known, 80, 28));
    });
    if (mode === 'sample' && (stage === 1 || stage === 2)) {
      const assignment = stage === 1 ? first : second;
      // The talk uses a whole-column illustration of uniform sampling. Show
      // EVERY vertex, without filtering by color, occupancy, or goodness.
      // The exact reference distribution in goodExample still uses E_b;
      // this visual deliberately suppresses its color-class restrictions.
      const targetColumn = model.byId[assignment.to].column;
      const candidates = model.nodes.filter(vertex => vertex.column === targetColumn)
        .map(vertex => vertex.id);
      // Paint alternatives last, including occupied vertices, so retained
      // edges and recorded-node markers cannot obscure any valid choice.
      parts.push('<g data-complete-candidate-set="true" data-sampling-schematic="whole-column" data-candidate-count="' + candidates.length + '">');
      candidates.forEach(vertex => parts.push(ring(vertex, C.oracle[assignment.color], 7.5,
        'data-candidate-endpoint="' + vertex + '" data-illustrative-probability="' + (1 / candidates.length) + '"')));
      parts.push(ring(assignment.from, C.oracle[assignment.color], 11, 'data-active-source="' + assignment.from + '"'));
      parts.push('</g>');
    }
    parts.push('</svg>');
    return parts.join('');
  }
  function render(element, stage) {
    const options = JSON.parse(element.getAttribute('data-good-assignments') || '{}');
    element.innerHTML = svg(options.stage == null ? (Number(stage) || 0) + (Number(options.stageOffset) || 0) : options.stage, options);
  }
  const api = { example, svg, render, colors: C };
  root.GoodAssignments = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
