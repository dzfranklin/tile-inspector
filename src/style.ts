import type {
  LayerSpecification,
  RasterSourceSpecification,
  SourceSpecification,
  StyleSpecification,
  VectorSourceSpecification,
} from 'maplibre-gl';
import { schemeSet3 } from 'd3-scale-chromatic';

interface StyleOptions {
  layerOpacity: number;
}

const baseStyle: StyleSpecification = {
  version: 8,
  sources: {
    maplibre: {
      url: 'https://demotiles.maplibre.org/tiles/tiles.json',
      type: 'vector',
    },
  },
  glyphs: 'https://cdn.protomaps.com/fonts/pbf/{fontstack}/{range}.pbf',
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#333333',
      },
    },
    {
      id: 'country_fill',
      type: 'fill',
      paint: {
        'fill-color': '#141414',
      },
      source: 'maplibre',
      'source-layer': 'countries',
    },
    {
      id: 'country_border',
      type: 'line',
      paint: {
        'line-color': '#707070',
        'line-width': 0.5,
      },
      source: 'maplibre',
      'source-layer': 'countries',
    },
    {
      id: 'country_label',
      type: 'symbol',
      paint: {
        'text-color': '#999999',
      },
      filter: ['all'],
      layout: {
        'text-font': ['Noto Sans Medium'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 4, 12, 6, 16],
        'text-field': ['step', ['zoom'], ['get', 'ABBREV'], 4, ['get', 'NAME']],
        'text-max-width': 10,
      },
      source: 'maplibre',
      'source-layer': 'centroids',
    },
  ],
};

export function generateVectorStyle(
  source: VectorSourceSpecification,
  vectorLayers: { id: string }[],
  options: StyleOptions
): StyleSpecification {
  const style = structuredClone(baseStyle);

  style.sources.source = source;

  for (const [i, layer] of vectorLayers.entries()) {
    style.layers.push({
      id: `generated_${layer.id}_fill`,
      type: 'fill',
      source: 'source',
      'source-layer': layer.id,
      paint: {
        'fill-color': schemeSet3[i % 12],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          options.layerOpacity + 0.15,
          options.layerOpacity,
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
    style.layers.push({
      id: `generated_${layer.id}_stroke`,
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
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          options.layerOpacity + 0.15,
          options.layerOpacity,
        ],
      },
      filter: ['==', ['geometry-type'], 'LineString'],
    });
    style.layers.push({
      id: `generated_${layer.id}_point`,
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
        'circle-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          options.layerOpacity + 0.15,
          options.layerOpacity,
        ],
      },
      filter: ['==', ['geometry-type'], 'Point'],
    });
  }

  return style;
}

export function generateRasterStyle(
  source: RasterSourceSpecification,
  options: StyleOptions
): StyleSpecification {
  const style = structuredClone(baseStyle);
  style.sources.source = source;
  style.layers.push({
    id: 'generated_raster',
    type: 'raster',
    source: 'source',
    paint: {
      'raster-opacity': options.layerOpacity,
    },
  });
  return style;
}
