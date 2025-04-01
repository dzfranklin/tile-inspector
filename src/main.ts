import './style.css';
import './inspectPopup.css';
import ml from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { $, createElement } from './domutil';
import {
  FileSource as PMTilesFileSource,
  FetchSource as PMTilesFetchSource,
  PMTiles,
  Protocol as PMTilesProtocol,
} from 'pmtiles';
import {
  generateHillshadingStyle,
  generateRasterStyle,
  generateVectorStyle,
} from './style';
import { ZoomDisplayControl } from './ZoomDisplayControl';
import { TileBoundariesControl } from './TileBoundariesControl';
import { tilejsonSpec } from './tilejson';
import { z, ZodIssueCode } from 'zod';

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

  urlForm.querySelector('button')!.innerText = 'Loading...';

  const tilejson = await (await fetch(tilejsonURL)).json();

  main(
    {
      url: tilejsonURL,
    },
    tilejson
  );
});

const pmtilesURLForm = $<HTMLFormElement>('#pmtiles-url-form')!;
pmtilesURLForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const data = new FormData(pmtilesURLForm);
  const pmtilesURL = data.get('url')! as string;
  if (location.protocol !== 'http:' && !pmtilesURL.startsWith('https://')) {
    alert('URL must start with https://');
    return;
  }

  pmtilesURLForm.querySelector('button')!.innerText = 'Loading...';

  const file = new PMTiles(new PMTilesFetchSource(pmtilesURL));
  const header = await file.getHeader();
  const metadata = (await file.getMetadata()) as any;
  pmtilesProtocol.add(file);

  main(
    {
      tiles: [`pmtiles://${file.source.getKey()}/{z}/{x}/{y}`],
      minzoom: header.minZoom,
      maxzoom: header.maxZoom,
      bounds: [header.minLon, header.minLat, header.maxLon, header.maxLat],
    },
    metadata
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

  main(
    {
      tiles: [`pmtiles://${file.source.getKey()}/{z}/{x}/{y}`],
      minzoom: header.minZoom,
      maxzoom: header.maxZoom,
      bounds: [header.minLon, header.minLat, header.maxLon, header.maxLat],
    },
    metadata
  );
}

function main(
  partialSource: Omit<ml.SourceSpecification, 'type'>,
  tilejson: any
) {
  console.info('partialSource', partialSource);
  console.info('tilejson', tilejson);
  try {
    _main(partialSource, tilejson);
  } catch (err) {
    let msg = err + '';
    if (err instanceof Error) msg = err.message;
    alert('Error: ' + msg);
    throw err;
  }
}

const optionsSpec = z.object({
  layerOpacity: z.string().transform((arg, ctx) => {
    const v = parseInt(arg);
    if (!Number.isFinite(v)) {
      ctx.addIssue({
        fatal: true,
        code: ZodIssueCode.custom,
        message: 'not a number',
      });
      return z.NEVER;
    }
    return v / 100;
  }),
  rasterFormat: z.enum(['raster', 'raster-dem-mapbox', 'raster-dem-terrarium']),
});

type Options = z.infer<typeof optionsSpec>;

function _main(
  partialSource: Omit<ml.SourceSpecification, 'type'>,
  rawTilejson: unknown
) {
  const tilejsonParseResult = tilejsonSpec.safeParse(rawTilejson);
  if (tilejsonParseResult.error) {
    const errors = tilejsonParseResult.error.flatten();
    throw new Error(
      'Failed to parse TileJSON: ' +
        [
          ...errors.formErrors,
          ...Object.entries(errors.fieldErrors).map(
            ([field, err]) => `${field} is ${err}`
          ),
        ].join(', ')
    );
  }
  const tilejson = tilejsonParseResult.data;

  const formData = Object.fromEntries(
    new FormData($<HTMLFormElement>('#options-form')!).entries()
  );
  const options = optionsSpec.parse(formData);
  console.info('options', options);

  formsContainer.style.display = 'none';

  let style: ml.StyleSpecification;
  if (!tilejson.format || tilejson.format === 'pbf') {
    if (!tilejson.vector_layers) {
      throw new Error('TileJSON is missing vector_layers');
    }
    style = generateVectorStyle(
      { ...partialSource, type: 'vector' },
      tilejson.vector_layers,
      options
    );
  } else if (options.rasterFormat === 'raster') {
    style = generateRasterStyle({ ...partialSource, type: 'raster' }, options);
  } else {
    let encoding: 'mapbox' | 'terrarium';
    switch (options.rasterFormat) {
      case 'raster-dem-mapbox':
        encoding = 'mapbox';
        break;
      case 'raster-dem-terrarium':
        encoding = 'terrarium';
        break;
    }
    style = generateHillshadingStyle(
      { ...partialSource, encoding, type: 'raster-dem' },
      options
    );
  }

  const map = new ml.Map({
    container: $('#map')!,
    style,
    center: [0, 0],
    zoom: 1,
    hash: true,
  });
  (window as any).map = map;

  map.addControl(new ZoomDisplayControl());
  map.addControl(new ml.NavigationControl());
  map.addControl(new TileBoundariesControl());

  map.on('style.load', () => {
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
  });
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
