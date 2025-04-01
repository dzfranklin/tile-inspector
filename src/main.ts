import './style.css';
import './inspectPopup.css';
import ml from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { $, createElement } from './domutil';
import {
  FileSource as PMTilesFileSource,
  PMTiles,
  Protocol as PMTilesProtocol,
} from 'pmtiles';
import { generateVectorStyle } from './style';
import { ZoomDisplayControl } from './ZoomDisplayControl';
import { TileBoundariesControl } from './TileBoundariesControl';

const pmtilesProtocol = new PMTilesProtocol({ metadata: true });
ml.addProtocol('pmtiles', pmtilesProtocol.tile);

const formsContainer = $('#forms-container')!;

const urlForm = $<HTMLFormElement>('#url-form')!;
urlForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const data = new FormData(urlForm);
  const tilejsonURL = data.get('tilejson')! as string;
  if (location.protocol !== 'http:' && !tilejsonURL.startsWith('https://')) {
    alert('URL must start with https://');
    return;
  }

  const tilejson = await(await fetch(tilejsonURL)).json();
  if (!tilejson.vector_layers) {
    alert('TileJSON must have vector_layers property');
  }

  main(
    {
      type: 'vector',
      url: tilejsonURL,
    },
    tilejson.vector_layers
  );
});

const pmtilesFileInput = $<HTMLInputElement>('#pmtiles-file-input')!;
pmtilesFileInput.addEventListener('change', () => {
  loadPMTilesFileInput();
});
$('#pmtiles-file-form')!.addEventListener('submit', (ev) => {
  ev.preventDefault();
  loadPMTilesFileInput();
});
async function loadPMTilesFileInput() {
  if (!((pmtilesFileInput.files?.length ?? 0) > 0)) return;
  const f = pmtilesFileInput.files![0]!;
  const file = new PMTiles(new PMTilesFileSource(f));
  const header = await file.getHeader();
  const metadata = (await file.getMetadata()) as any;
  pmtilesProtocol.add(file);

  if (!metadata.vector_layers) {
    alert('TileJSON must have vector_layers property');
  }

  main(
    {
      type: 'vector',
      tiles: [`pmtiles://${file.source.getKey()}/{z}/{x}/{y}`],
      minzoom: header.minZoom,
      maxzoom: header.maxZoom,
      bounds: [header.minLon, header.minLat, header.maxLon, header.maxLat],
    },
    metadata.vector_layers
  );
}

function main(
  source: ml.VectorSourceSpecification,
  vectorLayers: ml.LayerSpecification[]
) {
  console.info('source', source);
  console.info('vectorLayers', vectorLayers);
  try {
    _main(source, vectorLayers);
  } catch (err) {
    alert('Error: ' + err);
    throw err;
  }
}

function _main(
  source: ml.VectorSourceSpecification,
  vectorLayers: ml.LayerSpecification[]
) {
  const options = new FormData($<HTMLFormElement>('#options-form')!);

  let layerOpacity = parseInt(options.get('layer-opacity') as string) / 100;
  if (Number.isNaN(layerOpacity)) layerOpacity = 1;

  formsContainer.style.display = 'none';

  const style = generateVectorStyle(source, vectorLayers, layerOpacity);

  const map = new ml.Map({
    container: $('#map')!,
    style,
    center: [0, 0],
    zoom: 1,
    hash: true,
  });
  (window as any).map = map;

  const queryBoxSize = 2;
  const queryRenderedFeatures = (p: ml.Point) =>
    map.queryRenderedFeatures(
      [
        [p.x - queryBoxSize / 2, p.y - queryBoxSize / 2],
        [p.x + queryBoxSize / 2, p.y + queryBoxSize / 2],
      ],
      {
        layers: style.layers
          .filter((l) => l.id.startsWith('generated_'))
          .map((l) => l.id),
      }
    );

  let hoverFs: ml.MapGeoJSONFeature[] = [];
  const clearHover = () => {
    hoverFs.forEach((f) => map.setFeatureState(f, { hover: false }));
    hoverFs = [];
  };
  const markHover = (fs: ml.MapGeoJSONFeature[]) => {
    clearHover();
    hoverFs = fs;
    hoverFs.forEach((f) => map.setFeatureState(f, { hover: true }));
  };
  map.on('mousemove', (ev) => markHover(queryRenderedFeatures(ev.point)));
  $('#map')!.addEventListener('mouseleave', () => clearHover());

  const inspectPopup = new ml.Popup();
  map.on('click', (ev) => {
    const fs = queryRenderedFeatures(ev.point);
    markHover(fs);

    if (fs.length === 0) {
      inspectPopup.remove();
    } else {
      inspectPopup.setLngLat(ev.lngLat);
      inspectPopup.setDOMContent(renderPopup(fs));
      inspectPopup.addTo(map);
    }
  });

  map.addControl(new ZoomDisplayControl());
  map.addControl(new ml.NavigationControl());
  map.addControl(new TileBoundariesControl());
}

type GeoJSONFeatureWithSourceLayer = ml.MapGeoJSONFeature & {
  layer: {
    'source-layer'?: string;
  };
};

function renderPopup(features: GeoJSONFeatureWithSourceLayer[]): HTMLElement {
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
