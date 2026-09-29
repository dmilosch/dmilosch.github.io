/* Quantum-walk bookkeeping on the presentation's actual welded-tree instance.
 *
 * Each frame depicts one representative branch of the ideal, coherent
 * column-direction evolution. It is not a claim that compression erases an
 * arbitrary basis database deterministically. The real two-query shift is
 * exponentially close to this ideal evolution on the column-direction
 * subspace; the slide's equation and notes state that qualification.
 */
(function (root) {
  'use strict';

  const colors = {
    current: '#2563eb',
    label: '#d52c35',
    context: '#aebbc6',
    white: '#ffffff'
  };
  let serial = 0;

  function graphAPI() {
    if (root.WeldedGraph) return root.WeldedGraph;
    if (typeof require === 'function') return require('./graph.js');
    throw new Error('WalkRecords requires graph.js.');
  }

  function state(stage, options) {
    const step = Math.max(0, Math.min(3, Math.floor(Number(stage) || 0)));
    const example = graphAPI().permutationDatabases(options || {});
    const edge = example.recordedEdge;
    const v = example.model.byId[edge.tail];
    const w = example.model.byId[edge.head];
    return {
      step, example, v, w, edge,
      current: step < 2 ? v.id : w.id,
      labels: step === 0 ? [v.id] : step === 3 ? [w.id] : [v.id, w.id],
      edgeRecorded: step === 1 || step === 2
    };
  }

  function svg(stage, options) {
    const frame = state(stage, options);
    const { step, example, v, w, edge, current, labels, edgeRecorded } = frame;
    const model = example.model;
    const id = 'walk-records-' + (++serial);
    const descriptions = [
      'The current position has one label record. No edge is recorded.',
      'Computing the neighbor temporarily records both endpoint labels and their connecting edge.',
      'Swapping the position and answer registers moves the current position to the neighbor. The two labels and edge are still present.',
      'Coherent uncomputation removes the previous label and temporary edge record. Only the new current position is recorded.'
    ];
    const parts = [
      '<svg xmlns="http://www.w3.org/2000/svg" class="welded-graph walk-records-graph" viewBox="0 0 1120 500" role="img" aria-labelledby="' + id + '-title ' + id + '-desc" data-walk-stage="' + step + '">',
      '<title id="' + id + '-title">The walk keeps its current position</title>',
      '<desc id="' + id + '-desc">' + descriptions[step] + ' This is a representative branch of coherent column-direction bookkeeping. The faint graph is the same welded-tree instance used on the preceding database slide; neither root is marked as known.</desc>'
    ];

    const edgePath = item => {
      const a = model.byId[item.a], b = model.byId[item.b];
      const sign = b.x > a.x ? 1 : -1;
      return item.kind === 'weld'
        ? 'M' + a.x + ' ' + a.y + 'C' + (a.x + sign * 65) + ' ' + a.y + ' ' + (b.x - sign * 65) + ' ' + b.y + ' ' + b.x + ' ' + b.y
        : 'M' + a.x + ' ' + a.y + 'L' + b.x + ' ' + b.y;
    };

    // The faint context and the highlighted record have the same realized
    // adjacency, including the earlier compatible permutation of parent ends.
    example.rewiredEdges.forEach(item => {
      parts.push('<path data-context-edge="' + item.id + '" data-tail="' + item.tail + '" data-head="' + item.head + '" d="' + edgePath(item) + '" fill="none" stroke="' + colors.context + '" stroke-width="2.1" opacity="' + (item.kind === 'weld' ? '.2' : '.4') + '"/>');
    });
    if (edgeRecorded) {
      parts.push('<path d="' + edgePath(edge) + '" fill="none" stroke="' + colors.white + '" stroke-width="8" stroke-linecap="round"/>');
      parts.push('<path data-recorded-edge="true" data-source-edge="' + example.sourceEdge.id + '" data-image-edge="' + example.imageEdge.id + '" data-tail="' + edge.tail + '" data-head="' + edge.head + '" d="' + edgePath(edge) + '" fill="none" stroke="' + colors.current + '" stroke-width="4.8" stroke-linecap="round"/>');
    }

    model.nodes.forEach(node => {
      const recorded = labels.includes(node.id);
      const isCurrent = node.id === current;
      const radius = recorded ? 8 : 4.3;
      parts.push('<circle data-node="' + node.id + '" data-current-position="' + isCurrent + '" data-label-record="' + recorded + '" cx="' + node.x + '" cy="' + node.y + '" r="' + radius + '" fill="' + (isCurrent ? colors.current : colors.context) + '" stroke="' + colors.white + '" stroke-width="1.5"/>');
      // The record rim touches the vertex rather than floating as a halo.
      if (recorded) parts.push('<circle data-label-rim="' + node.id + '" cx="' + node.x + '" cy="' + node.y + '" r="' + radius + '" fill="none" stroke="' + colors.label + '" stroke-width="2.6"/>');
    });

    function label(value, node, xOffset, yOffset) {
      const math = root.katex
        ? root.katex.renderToString(value, { throwOnError: true, output: 'html' })
        : value;
      parts.push('<foreignObject data-record-label="' + node.id + '" x="' + (node.x + xOffset - 40) + '" y="' + (node.y + yOffset - 28) + '" width="80" height="60"><div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:35px;color:' + colors.label + '">' + math + '</div></foreignObject>');
    }
    if (labels.includes(v.id)) label('\\ell', v, -35, -21);
    if (labels.includes(w.id)) label("\\ell'", w, 35, 23);

    parts.push('</svg>');
    return parts.join('');
  }

  function render(element, stage) {
    let options = {};
    const raw = element.getAttribute('data-walk-records');
    if (raw && raw.trim().startsWith('{')) options = JSON.parse(raw);
    element.innerHTML = svg(Number(stage) - Number(options.stageOffset || 0), options);
  }

  const api = { render, svg, state };
  root.WalkRecords = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
