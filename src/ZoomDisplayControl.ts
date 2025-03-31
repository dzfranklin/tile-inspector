import type { IControl, Map } from 'maplibre-gl';

export class ZoomDisplayControl implements IControl {
  private _map: Map | undefined;
  private _container: HTMLDivElement | undefined;
  private _btn: HTMLButtonElement | undefined;

  onAdd(map: Map): HTMLElement {
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    this._container.style.width = 'max-content';

    this._btn = document.createElement('button');
    this._btn.style.width = 'max-content';
    this._btn.style.padding = '4px 6px';
    this._container.append(this._btn);

    this._btn.addEventListener('click', () => {
      const input = prompt('Zoom level');
      if (!input) return;
      const level = parseFloat(input);
      if (Number.isNaN(level)) {
        alert('Invalid input');
        return;
      }
      this._map?.setZoom(level);
    });

    this._map.on('zoom', () => this._render());
    this._render();

    return this._container;
  }

  onRemove(_map: Map): void {
    this._container?.parentNode?.removeChild(this._container);
    this._map = undefined;
  }

  private _render() {
    if (!this._btn || !this._map) return;
    this._btn.textContent = 'Zoom: ' + this._map.getZoom().toFixed(1);
  }
}
