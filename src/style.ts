import type {
  LayerSpecification,
  SourceSpecification,
  StyleSpecification,
} from 'maplibre-gl';
import { schemeSet3 } from 'd3-scale-chromatic';

export function generateVectorStyle(
  source: SourceSpecification,
  vectorLayers: LayerSpecification[]
): StyleSpecification {
  let baseOpacity = 0.35;

  const layers: LayerSpecification[] = [];

  layers.push({
    id: 'background',
    type: 'background',
    paint: {
      'background-color': '#333333',
    },
  });

  for (const [i, layer] of vectorLayers.entries()) {
    layers.push({
      id: `${layer.id}_fill`,
      type: 'fill',
      source: 'source',
      'source-layer': layer.id,
      paint: {
        'fill-color': schemeSet3[i % 12],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          baseOpacity,
          baseOpacity - 0.15,
        ],
        'fill-outline-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          'hsl(0,100%,90%)',
          'rgba(0,0,0,0.2)',
        ],
      },
      filter: ['==', ['geometry-type'], 'Polygon'],
    });
    layers.push({
      id: `${layer.id}_stroke`,
      type: 'line',
      source: 'source',
      'source-layer': layer.id,
      paint: {
        'line-color': schemeSet3[i % 12],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          2,
          0.5,
        ],
      },
      filter: ['==', ['geometry-type'], 'LineString'],
    });
    layers.push({
      id: `${layer.id}_point`,
      type: 'circle',
      source: 'source',
      'source-layer': layer.id,
      paint: {
        'circle-color': schemeSet3[i % 12],
        'circle-radius': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          6,
          5,
        ],
      },
      filter: ['==', ['geometry-type'], 'Point'],
    });
  }

  return {
    version: 8,
    sources: {
      source,
    },
    glyphs: 'https://cdn.protomaps.com/fonts/pbf/{fontstack}/{range}.pbf',
    layers: layers,
  };
}
