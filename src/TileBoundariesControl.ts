import type { IControl, Map } from 'maplibre-gl';

export class TileBoundariesControl implements IControl {
  private _map: Map | undefined;
  private _container: HTMLDivElement | undefined;

  onAdd(map: Map): HTMLElement {
    this._map = map;

    this._container = document.createElement('div');
    this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

    const btn = document.createElement('button');
    btn.style.backgroundImage = `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23ff0000' viewBox='0 0 29 29'%3E%3Cpath d='M14.5 8.5c-.75 0-1.5.75-1.5 1.5v3h-3c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h3v3c0 .75.75 1.5 1.5 1.5S16 19.75 16 19v-3h3c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13h-3v-3c0-.75-.75-1.5-1.5-1.5'/%3E%3C/svg%3E")`;
    this._container.append(btn);

    btn.addEventListener('click', () => {
      if (!this._map) return;
      this._map.showTileBoundaries = !this._map.showTileBoundaries;
    });

    return this._container;
  }

  onRemove(_map: Map): void {
    this._container?.parentNode?.removeChild(this._container);
    this._map = undefined;
  }
}
