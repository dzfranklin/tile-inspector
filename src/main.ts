import './style.css';
import ml from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { $, createElement } from './domutil';
import '@maplibre/maplibre-gl-inspect/dist/maplibre-gl-inspect.css';
import MaplibreInspect from '@maplibre/maplibre-gl-inspect';

const form = $<HTMLFormElement>('#form')!;
form.addEventListener('submit', (ev) => {
  ev.preventDefault();

  const data = new FormData(form);
  const tilejsonURL = data.get('tilejson')! as string;

  if (!tilejsonURL.startsWith('https://')) {
    alert('URL must start with https://');
    return;
  }

  form.style.display = 'none';

  main({
    type: 'vector',
    url: tilejsonURL,
  });
});

function main(source: ml.VectorSourceSpecification) {
  const map = new ml.Map({
    container: $('#map')!,
    style: {
      version: 8,
      layers: [],
      sources: {
        source,
      },
    },
    center: [0, 0],
    zoom: 1,
  });
  map.showTileBoundaries = true;
  map.addControl(new ml.NavigationControl());
  map.addControl(
    new MaplibreInspect({
      showInspectMap: true,
      showInspectButton: false,
      showMapPopup: true,
      renderPopup,
      popup: new ml.Popup({
        closeButton: false,
        closeOnClick: false,
      }),
    })
  );
}

type GeoJSONFeatureWithSourceLayer = ml.MapGeoJSONFeature & {
  layer: {
    'source-layer'?: string;
  };
};

function renderPopup(
  features: GeoJSONFeatureWithSourceLayer[]
): string | HTMLElement {
  return createElement({
    tag: 'div',
    className: 'maplibregl-inspect_popup',
    contents: features.map((ft) => ({
      tag: 'div',
      className: 'maplibregl-inspect_feature',
      contents: [
        {
          tag: 'div',
          className: 'maplibregl-inspect_layer',
          contents: ft.layer['source-layer'] || ft.layer.source,
        },
        renderProperty('$id', ft.id),
        renderProperty('$type', ft.geometry.type),
        ...Object.entries(ft.properties).map(([k, v]) => renderProperty(k, v)),
      ],
    })),
  });
}

function renderProperty(propertyName: string, property: unknown): HTMLElement {
  return createElement({
    tag: 'div',
    className: 'maplibregl-inspect_property',
    contents: [
      {
        tag: 'div',
        className: 'maplibregl-inspect_property-name',
        contents: propertyName,
      },
      {
        tag: 'div',
        className: 'maplibregl-inspect_property-value',
        contents: displayValue(property),
      },
    ],
  });
}

function displayValue(value: unknown) {
  return JSON.stringify(value);
}
