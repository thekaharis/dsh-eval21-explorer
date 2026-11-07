/* 21cmEVAL explorer - Client half (plain JavaScript, no build step). */
window.__ModuleLoader__.load({
  id: 'dsh-eval21-explorer',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useMemo, useRef, useCallback, useImperativeHandle } = React;
    const NS = 'eval21';
    const API = '/eval21-api/';
    const RECENT_KEY = 'dsh.eval21.recent';
    const LAST_KEY = 'dsh.eval21.last';

    const EN = {
      panel: '21cmEVAL',
      subtitle: 'Lightcone evaluation runs, local or over SSH',
      open: 'Open data',
      openBody: 'Choose a folder of eval21-run HDF5 files, a single run file, or a legacy run tree. Remote folders are read through your own SSH configuration and keys.',
      choose: 'Choose a folder',
      browse: 'Browse…',
      ssh: 'SSH',
      local: 'Local',
      user: 'User',
      userHint: 'optional — from ssh config by default',
      host: 'Host',
      hostHint: 'ssh config alias or hostname',
      folder: 'Folder or .h5 file',
      connect: 'Connect',
      connecting: 'Connecting…',
      recent: 'Recent',
      defaults: 'Suggested',
      overview: 'Overview',
      charts: 'Charts',
      cones: 'Cones',
      figures: 'Figures',
      group: 'Group',
      allGroups: 'All groups',
      pass: 'Target',
      models: 'Models',
      stage: 'Stage',
      refresh: 'Refresh',
      change: 'Change',
      emptyRuns: 'No eval21 runs here',
      emptyFigures: 'No figures here',
      emptyBody: 'A new-style run is an eval21-run/1 HDF5 file; legacy runs contain results.json or curves.npz. Figures can be PNG, GIF, WebP, SVG, or PDF.',
      loading: 'Reading data…',
      error: 'Could not open the data',
      retry: 'Retry',
      noData: 'No data for this selection',
      selectModels: 'Select at least one model',
      clickRows: 'Select model rows to compare them in Charts and Cones.',
      figureAll: 'All',
      back: 'Back',
      reset: 'Reset view',
      openPdf: 'Open PDF',
      all: 'All',
      none: 'None',
      metric: 'Metric',
      xAxis: 'x axis',
      yAxis: 'y axis',
      points: 'points',
      loadingCurves: 'Loading run data…',
      noFiguresHint: 'This folder has no result figures.',
      remoteBrowse: 'Browse remote…',
      useFolder: 'Use this folder',
      up: 'Up',
      remove: 'Remove',
      vizNote: 'Includes viz passes',
      includeViz: 'Include viz passes',
      zoomHint: 'Scroll to zoom · drag to pan · double-click to reset',
      pdfHint: 'PDF figures open in a new tab.',
      downloadJpg: 'Download diagram as JPG',
    };

    const DE = {
      panel: '21cmEVAL',
      subtitle: 'Lightcone-Auswertungen, lokal oder über SSH',
      open: 'Daten öffnen',
      openBody: 'Wähle einen Ordner mit eval21-run-HDF5-Dateien, eine einzelne Laufdatei oder einen älteren Laufordner. Entfernte Ordner werden über deine SSH-Konfiguration gelesen.',
      choose: 'Ordner wählen',
      browse: 'Durchsuchen…',
      ssh: 'SSH',
      local: 'Lokal',
      user: 'Benutzer',
      userHint: 'optional — sonst aus der SSH-Konfiguration',
      host: 'Host',
      hostHint: 'SSH-Alias oder Hostname',
      folder: 'Ordner oder .h5-Datei',
      connect: 'Verbinden',
      connecting: 'Verbinde…',
      recent: 'Zuletzt verwendet',
      defaults: 'Vorschläge',
      overview: 'Übersicht',
      charts: 'Diagramme',
      cones: 'Cones',
      figures: 'Abbildungen',
      group: 'Gruppe',
      allGroups: 'Alle Gruppen',
      pass: 'Ziel',
      models: 'Modelle',
      stage: 'Phase',
      refresh: 'Aktualisieren',
      change: 'Wechseln',
      emptyRuns: 'Keine eval21-Läufe',
      emptyFigures: 'Keine Abbildungen',
      emptyBody: 'Ein neuer Lauf ist eine eval21-run/1-HDF5-Datei; ältere Läufe enthalten results.json oder curves.npz. Abbildungen können PNG, GIF, WebP, SVG oder PDF sein.',
      loading: 'Daten werden gelesen…',
      error: 'Daten konnten nicht geöffnet werden',
      retry: 'Wiederholen',
      noData: 'Keine Daten für diese Auswahl',
      selectModels: 'Mindestens ein Modell auswählen',
      clickRows: 'Modellzeilen auswählen, um sie in Diagrammen und Cones zu vergleichen.',
      figureAll: 'Alle',
      back: 'Zurück',
      reset: 'Ansicht zurücksetzen',
      openPdf: 'PDF öffnen',
      all: 'Alle',
      none: 'Keine',
      metric: 'Metrik',
      xAxis: 'x-Achse',
      yAxis: 'y-Achse',
      points: 'Punkte',
      loadingCurves: 'Laufdaten werden geladen…',
      noFiguresHint: 'Dieser Ordner enthält keine Ergebnisabbildungen.',
      remoteBrowse: 'Entfernt durchsuchen…',
      useFolder: 'Diesen Ordner verwenden',
      up: 'Hoch',
      remove: 'Entfernen',
      vizNote: 'Mit viz-Läufen',
      includeViz: 'viz-Läufe einbeziehen',
      zoomHint: 'Scrollen zum Zoomen · ziehen zum Verschieben · Doppelklick zum Zurücksetzen',
      pdfHint: 'PDF-Abbildungen öffnen sich in einem neuen Tab.',
      downloadJpg: 'Diagramm als JPG herunterladen',
    };

    const PANEL_ID = 'eval21';
    const MODEL_COLORS = ['#4c78a8', '#f58518', '#54a24b', '#e45756', '#72b7b2', '#eeca3b', '#b279a2', '#ff9da6'];
    const TRUTH_COLOR = '#8a949e';
    const TRUTH_LINE_WIDTH = 3.4;
    const fmt = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 4 });

    function tr(dict, key, fallback) {
      return dict && typeof dict[key] === 'string' ? dict[key] : (fallback || key);
    }

    function cx() {
      return Array.from(arguments).filter(Boolean).join(' ');
    }

    function isNum(value) {
      return typeof value === 'number' && Number.isFinite(value);
    }

    function formatNumber(value, digits) {
      if (!isNum(value)) return '–';
      const abs = Math.abs(value);
      if (abs === 0) return '0';
      if (abs >= 1000) return fmt.format(value);
      if (abs >= 1) {
        const text = value.toFixed(digits === undefined ? 3 : digits);
        return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
      }
      if (abs >= 0.001) {
        const text = value.toFixed(3);
        return text.replace(/0+$/, '').replace(/\.$/, '');
      }
      return value.toExponential(2);
    }

    function formatTick(value) {
      if (!isNum(value)) return '';
      const abs = Math.abs(value);
      if (abs === 0) return '0';
      if (abs >= 1000) return value.toExponential(1).replace('e+', 'e');
      if (abs < 0.001) return value.toExponential(0);
      if (abs < 0.01) return value.toFixed(3);
      if (abs < 1) return value.toFixed(2);
      if (abs < 100) return value.toFixed(1).replace(/\.0$/, '');
      return value.toFixed(0);
    }

    function withUnit(value, suffix) {
      return isNum(value) ? `${formatNumber(value)}${suffix ? ` ${suffix}` : ''}` : '–';
    }

    function shortPath(value, home) {
      if (!value) return '';
      if (home && value.startsWith(home + '/')) return '~' + value.slice(home.length);
      return value;
    }

    function sourceLabel(source) {
      if (!source) return '';
      const root = source.root || '';
      const base = root.replace(/\/+$/, '').split('/').pop() || root;
      return source.kind === 'ssh' ? `${source.host}:${base || '/'}` : (base || root);
    }

    function sourceKey(source) {
      if (!source) return '';
      return `${source.kind}:${source.host || ''}:${source.root || ''}`;
    }

    function sourceTitle(source) {
      if (!source) return '';
      return source.kind === 'ssh' ? `${source.host}:${source.root}` : source.root;
    }

    function sourceQuery(source) {
      const bytes = new TextEncoder().encode(JSON.stringify(source));
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function apiUrl(action, params) {
      const url = new URL(API + action, window.location.origin);
      for (const [key, value] of Object.entries(params || {})) {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
      }
      return url;
    }

    async function apiJson(action, params, signal) {
      const response = await fetch(apiUrl(action, params), {
        cache: 'no-store',
        credentials: 'same-origin',
        signal,
      });
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (!response.ok) {
        throw new Error(data && data.error ? data.error : `HTTP ${response.status}`);
      }
      if (!data) throw new Error('The explorer API returned an empty response');
      return data;
    }

    function imageUrl(source, file) {
      return apiUrl('file', { source: sourceQuery(source), path: file }).toString();
    }

    function readLocalJson(key, fallback) {
      try {
        const value = window.localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch {
        return fallback;
      }
    }

    function writeLocalJson(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Local storage can be full or disabled; the panel still works.
      }
    }

    function runKey(model, group, pass, variant) {
      return `${model}|${group}|${pass}|${variant || ''}`;
    }

    function runsFor(manifest, model, group, pass, includeViz) {
      if (!manifest) return [];
      return manifest.runs.filter((run) => run.model === model
        && run.pass === pass
        && (group === 'all' || run.group === group)
        && (includeViz || !run.variant));
    }

    function findRun(manifest, model, group, pass, includeViz) {
      return runsFor(manifest, model, group, pass, includeViz)[0] || null;
    }

    function groupIds(manifest) {
      if (!manifest) return [];
      const ids = new Set(Object.keys(manifest.groups || {}));
      for (const run of manifest.runs) {
        if (run.group) ids.add(run.group);
      }
      return [...ids].sort((a, b) => a.localeCompare(b));
    }

    function passLabel(pass) {
      return pass === 'tb' ? 'T_b' : 'x_HI';
    }

    function groupDisplay(group) {
      if (!group) return '';
      if (group === 'all') return 'All groups';
      const match = /^G(\d+)[_]z(.+)$/i.exec(group);
      if (match) return `G${match[1]}, z = ${match[2]}`;
      return group;
    }

    function stageLabel(label) {
      if (!label) return '';
      return String(label)
        .replace(/xbar_HI/g, 'x̄_HI')
        .replace(/xbar/g, 'x̄')
        .replace(/(\d)-(\d)/g, '$1–$2');
    }

    function stageSuffix(label) {
      return String(label).trim().replace(/\s+/g, '_').replace(/\./g, 'p').replace(/-/g, '_');
    }

    function modelColor(model) {
      return model && model.color ? model.color : MODEL_COLORS[0];
    }

    function displayColor(color) {
      return color ? `color-mix(in srgb, ${color} 62%, var(--dsw-alias-label-primary))` : 'var(--dsw-alias-label-primary)';
    }

    function quantile(sorted, ratio) {
      if (!sorted.length) return null;
      if (sorted.length === 1) return sorted[0];
      const position = (sorted.length - 1) * ratio;
      const lower = Math.floor(position);
      const upper = Math.ceil(position);
      if (lower === upper) return sorted[lower];
      const weight = position - lower;
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }

    function columnStats(matrix) {
      if (!Array.isArray(matrix) || matrix.length === 0) return { median: [], low: [], high: [] };
      const width = Math.max(...matrix.map((row) => (Array.isArray(row) ? row.length : 0)));
      const median = new Array(width);
      const low = new Array(width);
      const high = new Array(width);
      for (let index = 0; index < width; index += 1) {
        const values = matrix
          .map((row) => (Array.isArray(row) ? row[index] : null))
          .filter(isNum)
          .sort((a, b) => a - b);
        median[index] = quantile(values, 0.5);
        low[index] = quantile(values, 0.16);
        high[index] = quantile(values, 0.84);
      }
      return { median, low, high };
    }

    function meanColumns(matrix) {
      if (!Array.isArray(matrix) || matrix.length === 0) return [];
      const width = Math.max(...matrix.map((row) => (Array.isArray(row) ? row.length : 0)));
      const result = new Array(width).fill(null);
      for (let index = 0; index < width; index += 1) {
        const values = matrix.map((row) => (Array.isArray(row) ? row[index] : null)).filter(isNum);
        if (values.length) result[index] = values.reduce((sum, value) => sum + value, 0) / values.length;
      }
      return result;
    }

    function stripArrays(arrays, model) {
      const prefix = `${model}__`;
      const output = {};
      for (const [key, value] of Object.entries(arrays || {})) {
        if (key.startsWith(prefix)) output[key.slice(prefix.length)] = value;
      }
      return output;
    }

    function linePath(points, xScale, yScale) {
      let path = '';
      let started = false;
      for (const point of points) {
        if (!isNum(point.x) || !isNum(point.y)) continue;
        const px = xScale(point.x);
        const py = yScale(point.y);
        if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
        path += started ? `L${px.toFixed(2)},${py.toFixed(2)}` : `M${px.toFixed(2)},${py.toFixed(2)}`;
        started = true;
      }
      return path;
    }

    function stepPath(points, xScale, yScale) {
      let path = '';
      let previous = null;
      for (const point of points) {
        if (!isNum(point.x) || !isNum(point.y)) continue;
        const px = xScale(point.x);
        const py = yScale(point.y);
        if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
        if (!previous) path += `M${px.toFixed(2)},${py.toFixed(2)}`;
        else path += `L${px.toFixed(2)},${previous.toFixed(2)}L${px.toFixed(2)},${py.toFixed(2)}`;
        previous = py;
      }
      return path;
    }

    function bandPath(points, xScale, yScale) {
      const valid = points.filter((point) => isNum(point.x) && isNum(point.low) && isNum(point.high));
      if (valid.length < 2) return '';
      let path = '';
      for (let index = 0; index < valid.length; index += 1) {
        const px = xScale(valid[index].x);
        const py = yScale(valid[index].high);
        path += index === 0 ? `M${px.toFixed(2)},${py.toFixed(2)}` : `L${px.toFixed(2)},${py.toFixed(2)}`;
      }
      for (let index = valid.length - 1; index >= 0; index -= 1) {
        const px = xScale(valid[index].x);
        const py = yScale(valid[index].low);
        path += `L${px.toFixed(2)},${py.toFixed(2)}`;
      }
      return path ? `${path}Z` : '';
    }

    let chartSerial = 0;

    function useSize(ref) {
      const [size, setSize] = useState({ width: 0, height: 0 });
      useEffect(() => {
        const element = ref.current;
        if (!element) return undefined;
        const update = () => setSize({
          width: Math.max(0, element.clientWidth),
          height: Math.max(0, element.clientHeight),
        });
        update();
        if (typeof ResizeObserver === 'undefined') {
          window.addEventListener('resize', update);
          return () => window.removeEventListener('resize', update);
        }
        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => observer.disconnect();
      }, [ref]);
      return size;
    }

    function niceStep(range, count) {
      const rough = range / Math.max(1, count);
      const power = Math.pow(10, Math.floor(Math.log10(rough)));
      const fraction = rough / power;
      const multiplier = fraction >= 5 ? 5 : fraction >= 2 ? 2 : 1;
      return multiplier * power;
    }

    function linearTicks(domain, count) {
      const [min, max] = domain;
      if (!isNum(min) || !isNum(max) || min === max) return [min];
      const step = niceStep(max - min, count);
      const start = Math.ceil(min / step) * step;
      const ticks = [];
      for (let value = start; value <= max + step * 0.001 && ticks.length < 24; value += step) {
        ticks.push(Math.abs(value) < step * 1e-9 ? 0 : value);
      }
      return ticks;
    }

    function logTicks(domain) {
      const [min, max] = domain;
      if (!(min > 0) || !(max > 0)) return [];
      const low = Math.floor(Math.log10(min));
      const high = Math.ceil(Math.log10(max));
      const ticks = [];
      for (let exponent = low; exponent <= high; exponent += 1) {
        for (const mantissa of [1, 2, 5]) {
          const value = mantissa * Math.pow(10, exponent);
          if (value >= min * 0.999 && value <= max * 1.001) ticks.push(value);
        }
      }
      return ticks;
    }

    function ticksFor(domain, type, count) {
      return type === 'log' ? logTicks(domain) : linearTicks(domain, count);
    }

    function makeScale(domain, range, type) {
      const [d0, d1] = domain;
      const [r0, r1] = range;
      if (type === 'log') {
        const a = Math.log10(Math.max(d0, 1e-300));
        const b = Math.log10(Math.max(d1, 1e-300));
        return (value) => r0 + ((Math.log10(Math.max(value, 1e-300)) - a) / (b - a || 1)) * (r1 - r0);
      }
      return (value) => r0 + ((value - d0) / (d1 - d0 || 1)) * (r1 - r0);
    }

    function invertScale(pixel, domain, range, type) {
      const [d0, d1] = domain;
      const [r0, r1] = range;
      const ratio = (pixel - r0) / (r1 - r0 || 1);
      if (type === 'log') return Math.pow(10, Math.log10(Math.max(d0, 1e-300)) + ratio * (Math.log10(Math.max(d1, 1e-300)) - Math.log10(Math.max(d0, 1e-300))));
      return d0 + ratio * (d1 - d0);
    }

    function collectValues(series, axis, type) {
      const values = [];
      for (const item of series) {
        if (!item || item.hidden) continue;
        for (const point of item.points || []) {
          const value = point[axis];
          if (!isNum(value)) continue;
          if (type === 'log' && value <= 0) continue;
          values.push(value);
        }
        if (axis === 'y' && item.band) {
          for (const point of item.band) {
            for (const key of ['low', 'high']) {
              const value = point[key];
              if (isNum(value) && (type !== 'log' || value > 0)) values.push(value);
            }
          }
        }
      }
      return values;
    }

    function paddedDomain(values, type) {
      if (!values.length) return type === 'log' ? [0.1, 10] : [0, 1];
      let min = Math.min(...values);
      let max = Math.max(...values);
      if (!Number.isFinite(min) || !Number.isFinite(max)) return type === 'log' ? [0.1, 10] : [0, 1];
      if (min === max) {
        if (type === 'log') return [min / 1.5, max * 1.5];
        const pad = Math.abs(min) * 0.1 || 0.5;
        return [min - pad, max + pad];
      }
      if (type === 'log') {
        const low = Math.log10(min);
        const high = Math.log10(max);
        const pad = (high - low) * 0.05;
        return [Math.pow(10, low - pad), Math.pow(10, high + pad)];
      }
      const pad = (max - min) * 0.05;
      return [min - pad, max + pad];
    }

    function zoomAxis(domain, type, anchor, factor) {
      if (type === 'log') {
        const a = Math.log10(Math.max(domain[0], 1e-300));
        const b = Math.log10(Math.max(domain[1], 1e-300));
        const p = Math.log10(Math.max(anchor, 1e-300));
        return [Math.pow(10, p + (a - p) * factor), Math.pow(10, p + (b - p) * factor)];
      }
      return [anchor + (domain[0] - anchor) * factor, anchor + (domain[1] - anchor) * factor];
    }

    function safeRange(domain, type) {
      const [a, b] = domain;
      if (type === 'log') return a > 0 && b > 0 && b / a > 1.0001;
      return Math.abs(b - a) > 1e-12;
    }

    const EXPORT_FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';
    const EXPORT_MEASURE_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
    const EXPORT_WIDTH = 1600;
    const EXPORT_PLOT_HEIGHT = 760;
    const EXPORT_TITLE_SIZE = 40;
    const EXPORT_SUBTITLE_SIZE = 22;
    const EXPORT_LEGEND_SIZE = 20;
    const EXPORT_TICK_SIZE = 19;
    const EXPORT_AXIS_SIZE = 23;
    const EXPORT_FOOTER_SIZE = 16;
    const EXPORT_REFERENCE_SIZE = 17;
    let exportMeasureContext = null;

    function escapeXml(value) {
      return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      }[character]));
    }

    function exportColor(series) {
      if (series && series.exportColor) return series.exportColor;
      const value = series && typeof series.color === 'string' ? series.color : '';
      if (value && !value.startsWith('var(') && !value.startsWith('color-mix')) return value;
      return '#5f6368';
    }

    function exportMeasure(text, size, weight) {
      const value = String(text === undefined || text === null ? '' : text);
      if (!exportMeasureContext) {
        try {
          const canvas = document.createElement('canvas');
          exportMeasureContext = canvas.getContext('2d');
        } catch {
          exportMeasureContext = null;
        }
      }
      if (!exportMeasureContext) return value.length * size * 0.56;
      exportMeasureContext.font = `${weight || 400} ${size}px ${EXPORT_MEASURE_FONT}`;
      return exportMeasureContext.measureText(value).width;
    }

    function fitExportText(text, size, weight, maxWidth) {
      let value = String(text === undefined || text === null ? '' : text);
      if (exportMeasure(value, size, weight) <= maxWidth) return value;
      let guard = 0;
      while (value.length > 1 && exportMeasure(value + '…', size, weight) > maxWidth && guard < 400) {
        value = value.slice(0, -1);
        guard += 1;
      }
      return `${value}…`;
    }

    function exportDateStamp() {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    function buildExportSvg(options) {
      const {
        series, domain, xType, yType, xLabel, yLabel, referenceLines,
        xTickFormat, yTickFormat, title, subtitle, meta, note, plotHeight = EXPORT_PLOT_HEIGHT,
      } = options || {};
      if (!Array.isArray(series) || series.length === 0 || !domain || !safeRange(domain.x, xType) || !safeRange(domain.y, yType)) return null;
      const width = EXPORT_WIDTH;
      const margin = 80;
      const innerWidth = width - margin * 2;
      const xFormat = xTickFormat || formatTick;
      const yFormat = yTickFormat || formatTick;
      const titleText = fitExportText(title || '21cmEVAL diagram', EXPORT_TITLE_SIZE, 500, innerWidth);
      const subtitleText = subtitle ? fitExportText(subtitle, EXPORT_SUBTITLE_SIZE, 400, innerWidth) : '';
      const legendItems = series
        .filter((item) => (item.points || []).some((point) => isNum(point.x) && isNum(point.y)) || (item.band || []).length)
        .map((item) => {
          const color = exportColor(item);
          const fullLabel = item.label || 'series';
          const label = fitExportText(fullLabel, EXPORT_LEGEND_SIZE, 400, 360);
          return {
            item,
            color,
            label,
            width: 28 + 10 + exportMeasure(label, EXPORT_LEGEND_SIZE, 400),
          };
        });
      const legendTop = 126;
      const legendRows = [];
      let rowEntries = [];
      let rowWidth = 0;
      for (const entry of legendItems) {
        const gap = rowEntries.length === 0 ? 0 : 38;
        if (rowEntries.length > 0 && rowWidth + gap + entry.width > innerWidth) {
          legendRows.push({ entries: rowEntries, width: rowWidth });
          rowEntries = [];
          rowWidth = 0;
        }
        rowWidth += (rowEntries.length === 0 ? 0 : 38) + entry.width;
        rowEntries.push(entry);
      }
      if (rowEntries.length > 0) legendRows.push({ entries: rowEntries, width: rowWidth });
      const legendHeight = legendRows.length * 40;
      const plotTop = legendTop + legendHeight + 28;
      const plotLeft = 140;
      const plotRight = width - 80;
      const plotWidth = plotRight - plotLeft;
      const plotBottom = plotTop + plotHeight;
      const totalHeight = plotBottom + (note ? 174 : 144);
      const xRange = [plotLeft, plotRight];
      const yRange = [plotBottom, plotTop];
      const xScale = makeScale(domain.x, xRange, xType);
      const yScale = makeScale(domain.y, yRange, yType);
      const xTicks = ticksFor(domain.x, xType, 8);
      const yTicks = ticksFor(domain.y, yType, 6);
      const clipId = 'e21-export-plot';
      const parts = [];
      parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}" font-family="${EXPORT_FONT}">`);
      parts.push(`<defs><clipPath id="${clipId}"><rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}"/></clipPath></defs>`);
      parts.push(`<rect x="0" y="0" width="${width}" height="${totalHeight}" fill="#ffffff"/>`);
      parts.push(`<text x="${width / 2}" y="66" font-size="${EXPORT_TITLE_SIZE}" font-weight="500" fill="#111111" text-anchor="middle">${escapeXml(titleText)}</text>`);
      if (subtitleText) {
        parts.push(`<text x="${width / 2}" y="102" font-size="${EXPORT_SUBTITLE_SIZE}" fill="#555b63" text-anchor="middle">${escapeXml(subtitleText)}</text>`);
      }
      for (let rowIndex = 0; rowIndex < legendRows.length; rowIndex += 1) {
        const legendRow = legendRows[rowIndex];
        const baseline = legendTop + rowIndex * 40 + 25;
        let cursor = (width - legendRow.width) / 2;
        for (const entry of legendRow.entries) {
          const y = baseline - 6;
          if (entry.item.kind === 'scatter') {
            parts.push(`<circle cx="${cursor + 12}" cy="${y}" r="6" fill="${escapeXml(entry.color)}"/>`);
          } else {
            parts.push(`<line x1="${cursor}" y1="${y}" x2="${cursor + 28}" y2="${y}" stroke="${escapeXml(entry.color)}" stroke-width="${Math.min(3.6, entry.item.width || 3)}"${entry.item.dash ? ` stroke-dasharray="${escapeXml(entry.item.dash)}"` : ''} stroke-linecap="round"/>`);
          }
          parts.push(`<text x="${cursor + 38}" y="${baseline}" font-size="${EXPORT_LEGEND_SIZE}" fill="#33383f">${escapeXml(entry.label)}</text>`);
          cursor += entry.width + 38;
        }
      }
      parts.push('<g>');
      for (const tick of yTicks) {
        const y = yScale(tick);
        if (!Number.isFinite(y)) continue;
        parts.push(`<line x1="${plotLeft}" y1="${y.toFixed(2)}" x2="${plotRight}" y2="${y.toFixed(2)}" stroke="#ededed" stroke-width="1"/>`);
      }
      for (const tick of xTicks) {
        const x = xScale(tick);
        if (!Number.isFinite(x)) continue;
        parts.push(`<line x1="${x.toFixed(2)}" y1="${plotTop}" x2="${x.toFixed(2)}" y2="${plotBottom}" stroke="#ededed" stroke-width="1"/>`);
      }
      parts.push('</g>');
      parts.push(`<g clip-path="url(#${clipId})">`);
      for (const item of series) {
        if (!item.band || item.band.length === 0) continue;
        const path = bandPath(item.band, xScale, yScale);
        if (path) parts.push(`<path d="${path}" fill="${escapeXml(exportColor(item))}" fill-opacity="0.12" stroke="none"/>`);
      }
      for (const item of series) {
        const color = exportColor(item);
        if (item.kind === 'scatter') continue;
        const path = item.kind === 'step' ? stepPath(item.points || [], xScale, yScale) : linePath(item.points || [], xScale, yScale);
        if (!path) continue;
        parts.push(`<path d="${path}" fill="none" stroke="${escapeXml(color)}" stroke-width="${item.width || 2.2}" stroke-opacity="${item.opacity || 1}"${item.dash ? ` stroke-dasharray="${escapeXml(item.dash)}"` : ''} stroke-linecap="round" stroke-linejoin="round"/>`);
      }
      for (const item of series) {
        const color = exportColor(item);
        const points = (item.points || []).filter((point) => isNum(point.x) && isNum(point.y));
        const showPoints = item.kind === 'scatter' || (item.showPoints !== false && points.length <= 160);
        if (!showPoints) continue;
        const radius = item.pointRadius || (item.kind === 'scatter' ? 3.6 : 2.1);
        for (const point of points) {
          const x = xScale(point.x);
          const y = yScale(point.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          parts.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius}" fill="${escapeXml(color)}" fill-opacity="0.9" stroke="#ffffff" stroke-width="0.6"/>`);
        }
      }
      for (const reference of referenceLines || []) {
        const y = yScale(reference.value);
        if (!Number.isFinite(y)) continue;
        parts.push(`<line x1="${plotLeft}" y1="${y.toFixed(2)}" x2="${plotRight}" y2="${y.toFixed(2)}" stroke="#9aa0a6" stroke-width="1" stroke-dasharray="${escapeXml(reference.dash || '5 5')}"/>`);
        if (reference.label) parts.push(`<text x="${plotRight - 5}" y="${y - 9}" font-size="${EXPORT_REFERENCE_SIZE}" fill="#6f757c" text-anchor="end">${escapeXml(reference.label)}</text>`);
      }
      parts.push('</g>');
      parts.push(`<line x1="${plotLeft}" y1="${plotTop}" x2="${plotLeft}" y2="${plotBottom}" stroke="#b8bcc2" stroke-width="1"/>`);
      parts.push(`<line x1="${plotLeft}" y1="${plotBottom}" x2="${plotRight}" y2="${plotBottom}" stroke="#b8bcc2" stroke-width="1"/>`);
      for (const tick of yTicks) {
        const y = yScale(tick);
        if (!Number.isFinite(y)) continue;
        parts.push(`<text x="${plotLeft - 16}" y="${(y + 6).toFixed(2)}" font-size="${EXPORT_TICK_SIZE}" fill="#555b63" text-anchor="end">${escapeXml(yFormat(tick))}</text>`);
      }
      for (const tick of xTicks) {
        const x = xScale(tick);
        if (!Number.isFinite(x)) continue;
        parts.push(`<text x="${x.toFixed(2)}" y="${plotBottom + 36}" font-size="${EXPORT_TICK_SIZE}" fill="#555b63" text-anchor="middle">${escapeXml(xFormat(tick))}</text>`);
      }
      if (xLabel) {
        parts.push(`<text x="${plotLeft + plotWidth / 2}" y="${plotBottom + 84}" font-size="${EXPORT_AXIS_SIZE}" font-weight="500" fill="#33383f" text-anchor="middle">${escapeXml(xLabel)}</text>`);
      }
      if (yLabel) {
        const center = plotTop + plotHeight / 2;
        parts.push(`<text x="44" y="${center}" font-size="${EXPORT_AXIS_SIZE}" font-weight="500" fill="#33383f" text-anchor="middle" transform="rotate(-90 44 ${center})">${escapeXml(yLabel)}</text>`);
      }
      const caption = [meta, exportDateStamp()].filter(Boolean).join(', ');
      const captionBaseline = note ? plotBottom + 148 : plotBottom + 118;
      if (note) {
        parts.push(`<text x="${width / 2}" y="${plotBottom + 118}" font-size="${EXPORT_FOOTER_SIZE}" fill="#777d84" text-anchor="middle">${escapeXml(fitExportText(note, EXPORT_FOOTER_SIZE, 400, innerWidth * 0.82))}</text>`);
      }
      if (caption) {
        parts.push(`<text x="${width / 2}" y="${captionBaseline}" font-size="${EXPORT_FOOTER_SIZE}" fill="#6b7077" text-anchor="middle">${escapeXml(fitExportText(caption, EXPORT_FOOTER_SIZE, 400, innerWidth * 0.9))}</text>`);
      }
      parts.push('</svg>');
      return { svg: parts.join(''), width, height: totalHeight };
    }

    const Chart = React.forwardRef(function Chart(props, ref) {
      const {
        series, xLabel, yLabel, xType = 'linear', yType = 'linear',
        height = 360, empty, onPointClick, xFormat, yFormat,
        referenceLines, tooltipWidth = 240, hint,
        exportTitle, exportSubtitle, exportMeta, exportFileName, exportNote,
      } = props;
      const containerRef = useRef(null);
      const svgRef = useRef(null);
      const size = useSize(containerRef);
      const chartIdRef = useRef(null);
      if (chartIdRef.current === null) {
        chartSerial += 1;
        chartIdRef.current = `e21-chart-${chartSerial}`;
      }
      const [view, setView] = useState(null);
      const [hidden, setHidden] = useState({});
      const [hover, setHover] = useState(null);
      const [exportError, setExportError] = useState('');
      const exportingRef = useRef(false);
      const dragRef = useRef(null);

      const visibleSeries = useMemo(
        () => series.filter((item) => !hidden[item.id]),
        [series, hidden],
      );

      const baseDomain = useMemo(() => {
        const xValues = collectValues(series, 'x', xType);
        const yValues = collectValues(series, 'y', yType);
        for (const reference of referenceLines || []) {
          if (isNum(reference.value) && (yType !== 'log' || reference.value > 0)) yValues.push(reference.value);
        }
        const xDomain = paddedDomain(xValues, xType);
        const yDomain = paddedDomain(yValues, yType);
        return { x: xDomain, y: yDomain };
      }, [series, xType, yType, referenceLines]);

      const seriesKey = useMemo(
        () => series.map((item) => {
          const points = item.points || [];
          const first = points[0] || {};
          const last = points[points.length - 1] || {};
          return `${item.id}:${points.length}:${(item.band || []).length}:${first.x}:${first.y}:${last.x}:${last.y}`;
        }).join('|'),
        [series],
      );

      useEffect(() => {
        setView(null);
        setHover(null);
        setExportError('');
      }, [seriesKey, xType, yType]);

      const domain = view && safeRange(view.x, xType) && safeRange(view.y, yType) ? view : baseDomain;
      const margin = { top: 28, right: 16, bottom: 42, left: 58 };
      const width = size.width;
      const chartHeight = size.height || height;
      const plotLeft = margin.left;
      const plotTop = margin.top;
      const plotWidth = Math.max(10, width - margin.left - margin.right);
      const plotHeight = Math.max(10, chartHeight - margin.top - margin.bottom);
      const xRange = [plotLeft, plotLeft + plotWidth];
      const yRange = [plotTop + plotHeight, plotTop];
      const xScale = makeScale(domain.x, xRange, xType);
      const yScale = makeScale(domain.y, yRange, yType);
      const xTicks = ticksFor(domain.x, xType, Math.max(3, Math.floor(plotWidth / 82)));
      const yTicks = ticksFor(domain.y, yType, Math.max(3, Math.floor(plotHeight / 46)));
      const xTickFormat = xFormat || formatTick;
      const yTickFormat = yFormat || formatTick;

      const applyZoom = useCallback((factor, clientX, clientY) => {
        const element = containerRef.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const px = Math.max(plotLeft, Math.min(plotLeft + plotWidth, clientX - rect.left));
        const py = Math.max(plotTop, Math.min(plotTop + plotHeight, clientY - rect.top));
        const anchorX = invertScale(px, domain.x, xRange, xType);
        const anchorY = invertScale(py, domain.y, yRange, yType);
        setView({
          x: zoomAxis(domain.x, xType, anchorX, factor),
          y: zoomAxis(domain.y, yType, anchorY, factor),
        });
      }, [domain, plotLeft, plotTop, plotWidth, plotHeight, xType, yType]);

      useEffect(() => {
        const element = containerRef.current;
        if (!element) return undefined;
        const onWheel = (event) => {
          event.preventDefault();
          const factor = Math.exp(event.deltaY * 0.0015);
          applyZoom(Math.max(0.35, Math.min(2.8, factor)), event.clientX, event.clientY);
        };
        element.addEventListener('wheel', onWheel, { passive: false });
        return () => element.removeEventListener('wheel', onWheel);
      }, [applyZoom]);

      const onPointerDown = (event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
          x: event.clientX,
          y: event.clientY,
          domain,
          pointerId: event.pointerId,
          moved: false,
        };
      };

      const onPointerMove = (event) => {
        const drag = dragRef.current;
        if (drag && drag.pointerId === event.pointerId) {
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          if (Math.abs(dx) + Math.abs(dy) > 3) {
            drag.moved = true;
            const next = { x: drag.domain.x.slice(), y: drag.domain.y.slice() };
            if (xType === 'log') {
              const logSpan = Math.log10(next.x[1] / next.x[0]);
              const shift = (dx / plotWidth) * logSpan;
              next.x = [next.x[0] / Math.pow(10, shift), next.x[1] / Math.pow(10, shift)];
            } else {
              const shift = -(dx / plotWidth) * (next.x[1] - next.x[0]);
              next.x = [next.x[0] + shift, next.x[1] + shift];
            }
            if (yType === 'log') {
              const logSpan = Math.log10(next.y[1] / next.y[0]);
              const shift = -(dy / plotHeight) * logSpan;
              next.y = [next.y[0] / Math.pow(10, shift), next.y[1] / Math.pow(10, shift)];
            } else {
              const shift = (dy / plotHeight) * (next.y[1] - next.y[0]);
              next.y = [next.y[0] + shift, next.y[1] + shift];
            }
            if (safeRange(next.x, xType) && safeRange(next.y, yType)) setView(next);
            setHover(null);
            return;
          }
        }
        if (!size.width) return;
        const rect = containerRef.current.getBoundingClientRect();
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        if (px < plotLeft - 2 || px > plotLeft + plotWidth + 2 || py < plotTop - 2 || py > plotTop + plotHeight + 2) {
          setHover(null);
          return;
        }
        let best = null;
        for (const item of visibleSeries) {
          for (const point of item.points || []) {
            if (!isNum(point.x) || !isNum(point.y)) continue;
            const sx = xScale(point.x);
            const sy = yScale(point.y);
            if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
            if (sx < plotLeft - 2 || sx > plotLeft + plotWidth + 2 || sy < plotTop - 2 || sy > plotTop + plotHeight + 2) continue;
            const distance = Math.hypot(sx - px, sy - py);
            if (!best || distance < best.distance) best = { item, point, sx, sy, distance };
          }
        }
        if (!best || best.distance > 22) {
          setHover(null);
          return;
        }
        setHover({
          seriesId: best.item.id,
          series: best.item,
          point: best.point,
          sx: best.sx,
          sy: best.sy,
        });
      };

      const onPointerUp = (event) => {
        if (dragRef.current && dragRef.current.pointerId === event.pointerId) {
          const wasMoved = dragRef.current.moved;
          dragRef.current = null;
          if (wasMoved) return;
        }
        if (hover && onPointClick) {
          onPointClick(hover.series, hover.point);
        }
      };

      const resetView = () => {
        setView(null);
        setHover(null);
      };

      const tooltip = useMemo(() => {
        if (!hover) return null;
        const info = hover.series.tooltip
          ? hover.series.tooltip(hover.point, hover.series)
          : {
            title: hover.series.label,
            rows: [
              [xLabel || 'x', xTickFormat(hover.point.x)],
              [yLabel || 'y', yTickFormat(hover.point.y)],
            ],
          };
        if (!info) return null;
        let left = hover.sx + 14;
        let top = hover.sy - 8;
        if (left + tooltipWidth > width - 12) left = Math.max(8, hover.sx - tooltipWidth - 14);
        top = Math.max(8, Math.min(chartHeight - 40, top));
        return { info, left, top };
      }, [hover, width, chartHeight, xLabel, yLabel, xTickFormat, yTickFormat, tooltipWidth]);

      const hasPoints = visibleSeries.some((item) => (item.points || []).some((point) => isNum(point.x) && isNum(point.y)
        && xScale(point.x) >= plotLeft - 1 && xScale(point.x) <= plotLeft + plotWidth + 1
        && yScale(point.y) >= plotTop - 1 && yScale(point.y) <= plotTop + plotHeight + 1));

      const downloadJpeg = useCallback(() => {
        if (exportingRef.current) return;
        if (!hasPoints) {
          setExportError('There are no visible points in the current view to export.');
          return;
        }
        setExportError('');
        const exportTitleText = exportTitle || [yLabel, xLabel].filter(Boolean).join(' vs ') || '21cmEVAL diagram';
        let exportDomain = view && safeRange(view.x, xType) && safeRange(view.y, yType) ? view : null;
        if (!exportDomain) {
          const exportX = collectValues(visibleSeries, 'x', xType);
          const exportY = collectValues(visibleSeries, 'y', yType);
          for (const reference of referenceLines || []) {
            if (isNum(reference.value) && (yType !== 'log' || reference.value > 0)) exportY.push(reference.value);
          }
          exportDomain = { x: paddedDomain(exportX, xType), y: paddedDomain(exportY, yType) };
        }
        let generated;
        try {
          generated = buildExportSvg({
            series: visibleSeries,
            domain: exportDomain,
            xType,
            yType,
            xLabel,
            yLabel,
            referenceLines,
            xTickFormat,
            yTickFormat,
            title: exportTitleText,
            subtitle: exportSubtitle || '',
            meta: exportMeta || '',
            note: exportNote || '',
          });
        } catch (error) {
          setExportError(error instanceof Error ? error.message : 'Could not build the diagram.');
          return;
        }
        if (!generated) {
          setExportError('There is no data to export in the current view.');
          return;
        }
        const sourceName = exportFileName || [exportTitleText, exportSubtitle].filter(Boolean).join('-') || 'eval21-diagram';
        const baseName = String(sourceName)
          .replace(/\.jpe?g$/i, '')
          .replace(/[^A-Za-z0-9._-]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^[.-]+|[.-]+$/g, '')
          .slice(0, 90) || 'eval21-diagram';
        const fileName = `${baseName}.jpg`;
        exportingRef.current = true;
        try {
        const svgBlob = new Blob([generated.svg], { type: 'image/svg+xml;charset=utf-8' });
        const objectUrl = URL.createObjectURL(svgBlob);
        const image = new Image();
        image.onload = () => {
          try {
            const scale = 2;
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(generated.width * scale);
            canvas.height = Math.round(generated.height * scale);
            const context = canvas.getContext('2d');
            if (!context) throw new Error('The browser could not create a canvas.');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const download = (href, revoke) => {
              const anchor = document.createElement('a');
              anchor.href = href;
              anchor.download = fileName;
              document.body.appendChild(anchor);
              anchor.click();
              anchor.remove();
              if (revoke) setTimeout(() => URL.revokeObjectURL(href), 2000);
            };
            if (typeof canvas.toBlob === 'function') {
              canvas.toBlob((fileBlob) => {
                exportingRef.current = false;
                if (!fileBlob) {
                  setExportError('The browser could not encode the JPG.');
                  return;
                }
                download(URL.createObjectURL(fileBlob), true);
              }, 'image/jpeg', 0.92);
            } else {
              download(canvas.toDataURL('image/jpeg', 0.92), false);
              exportingRef.current = false;
            }
          } catch (error) {
            exportingRef.current = false;
            setExportError(error instanceof Error ? error.message : 'Could not render the JPG.');
          } finally {
            URL.revokeObjectURL(objectUrl);
          }
        };
        image.onerror = () => {
          exportingRef.current = false;
          URL.revokeObjectURL(objectUrl);
          setExportError('The diagram could not be rasterized by this browser.');
        };
        image.src = objectUrl;
        } catch (error) {
          exportingRef.current = false;
          setExportError(error instanceof Error ? error.message : 'Could not start the JPG download.');
        }
      }, [visibleSeries, view, xType, yType, xLabel, yLabel, referenceLines, xTickFormat, yTickFormat, exportTitle, exportSubtitle, exportMeta, exportFileName, exportNote, hasPoints]);

      useImperativeHandle(ref, () => ({ downloadJpeg }), [downloadJpeg]);

      return h('div', { className: 'e21-chart-wrap' },
        series.length > 1 && h('div', { className: 'e21-legend', role: 'group', 'aria-label': 'Legend' },
          series.map((item) => h('button', {
            key: item.id,
            type: 'button',
            className: cx('e21-legend-item', hidden[item.id] && 'is-off'),
            onClick: () => setHidden((previous) => ({ ...previous, [item.id]: !previous[item.id] })),
            title: hidden[item.id] ? 'Show series' : 'Hide series',
          },
          h('span', {
            className: cx('e21-legend-swatch', item.kind === 'scatter' && 'is-dot'),
            style: {
              background: displayColor(item.color),
              borderTopStyle: item.dash ? 'dashed' : 'solid',
            },
          }),
          h('span', { className: 'e21-legend-label' }, item.label)))),
        h('div', {
          ref: containerRef,
          className: 'e21-chart',
          style: { height: `${height}px` },
        },
        h('svg', {
          ref: svgRef,
          width: size.width || 600,
          height: chartHeight,
          role: 'img',
          'aria-label': `${yLabel || 'value'} against ${xLabel || 'x'}`,
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerCancel: () => { dragRef.current = null; setHover(null); },
          onPointerLeave: () => { if (!dragRef.current) setHover(null); },
          onDoubleClick: resetView,
          style: { touchAction: 'none' },
        },
        h('defs', null,
          h('clipPath', { id: chartIdRef.current },
            h('rect', { x: plotLeft, y: plotTop, width: plotWidth, height: plotHeight }))),
        h('g', { className: 'e21-grid' },
          yTicks.map((tick) => {
            const py = yScale(tick);
            return h('line', { key: `gy-${tick}`, x1: plotLeft, x2: plotLeft + plotWidth, y1: py, y2: py });
          }),
          xTicks.map((tick) => {
            const px = xScale(tick);
            return h('line', { key: `gx-${tick}`, x1: px, x2: px, y1: plotTop, y2: plotTop + plotHeight });
          })),
        h('g', { className: 'e21-axes' },
          yTicks.map((tick) => h('text', {
            key: `ty-${tick}`, x: plotLeft - 8, y: yScale(tick) + 3, textAnchor: 'end',
          }, yTickFormat(tick))),
          xTicks.map((tick) => h('text', {
            key: `tx-${tick}`, x: xScale(tick), y: plotTop + plotHeight + 18, textAnchor: 'middle',
          }, xTickFormat(tick))),
          h('line', {
            x1: plotLeft, x2: plotLeft + plotWidth, y1: plotTop + plotHeight, y2: plotTop + plotHeight,
            className: 'e21-axis-line',
          }),
          h('line', {
            x1: plotLeft, x2: plotLeft, y1: plotTop, y2: plotTop + plotHeight,
            className: 'e21-axis-line',
          }),
          xLabel && h('text', {
            x: plotLeft + plotWidth / 2, y: chartHeight - 6, textAnchor: 'middle', className: 'e21-axis-label',
          }, xLabel),
          yLabel && h('text', {
            x: 13, y: plotTop + plotHeight / 2, textAnchor: 'middle', className: 'e21-axis-label',
            transform: `rotate(-90 13 ${plotTop + plotHeight / 2})`,
          }, yLabel)),
        h('g', { clipPath: `url(#${chartIdRef.current})` },
          (referenceLines || []).map((reference, index) => {
            const py = yScale(reference.value);
            if (!Number.isFinite(py)) return null;
            return h('g', { key: `ref-${index}` },
              h('line', {
                x1: plotLeft, x2: plotLeft + plotWidth, y1: py, y2: py,
                className: 'e21-reference-line',
                strokeDasharray: reference.dash || '4 4',
              }),
              reference.label && h('text', {
                x: plotLeft + plotWidth - 4, y: py - 5, textAnchor: 'end', className: 'e21-reference-label',
              }, reference.label));
          }),
          visibleSeries.map((item) => {
            const band = item.band ? bandPath(item.band, xScale, yScale) : '';
            return band ? h('path', {
              key: `band-${item.id}`,
              d: band,
              style: { fill: displayColor(item.color) },
              fillOpacity: 0.1,
              stroke: 'none',
            }) : null;
          }),
          visibleSeries.map((item) => {
            const color = displayColor(item.color);
            if (item.kind === 'scatter') return null;
            const path = item.kind === 'step'
              ? stepPath(item.points || [], xScale, yScale)
              : linePath(item.points || [], xScale, yScale);
            if (!path) return null;
            return h('path', {
              key: `line-${item.id}`,
              d: path,
              fill: 'none',
              style: { stroke: color },
              strokeWidth: item.width || 1.6,
              strokeDasharray: item.dash || undefined,
              strokeOpacity: item.opacity || 1,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            });
          }),
          visibleSeries.map((item) => {
            const color = displayColor(item.color);
            const points = (item.points || []).filter((point) => isNum(point.x) && isNum(point.y));
            const pointRadius = item.pointRadius || (item.kind === 'scatter' ? 3.2 : 1.8);
            const showPoints = item.kind === 'scatter' || (item.showPoints !== false && points.length <= 160);
            if (!showPoints) return null;
            return h('g', { key: `points-${item.id}` },
              points.map((point, index) => {
                const px = xScale(point.x);
                const py = yScale(point.y);
                if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
                const active = hover && hover.seriesId === item.id && hover.point === point;
                return h('circle', {
                  key: index,
                  cx: px,
                  cy: py,
                  r: active ? pointRadius + 1.6 : pointRadius,
                  style: { fill: color },
                  fillOpacity: item.kind === 'scatter' ? 0.8 : 0.9,
                  stroke: active ? 'var(--dsw-alias-bg-base)' : 'none',
                  strokeWidth: active ? 1.4 : 0,
                });
              }));
          })),
        hover && h('circle', {
          cx: hover.sx,
          cy: hover.sy,
          r: 7,
          fill: 'none',
          style: { stroke: displayColor(hover.series.color) },
          strokeWidth: 1,
          opacity: 0.6,
        })),
        !hasPoints && h('div', { className: 'e21-chart-empty' }, empty || 'No data'),
        tooltip && h('div', {
          className: 'e21-tooltip',
          style: { left: `${tooltip.left}px`, top: `${tooltip.top}px`, width: `${tooltipWidth}px` },
          role: 'status',
        },
        h('div', { className: 'e21-tooltip-title' }, tooltip.info.title),
        (tooltip.info.rows || []).map((row, index) => h('div', { key: index, className: 'e21-tooltip-row' },
          h('span', null, row[0]),
          h('span', null, row[1])))),
        h('div', { className: 'e21-chart-controls' },
          h('button', {
            type: 'button', className: 'e21-icon-btn', title: 'Zoom out', 'aria-label': 'Zoom out',
            onClick: () => applyZoom(1.5, plotLeft + plotWidth / 2, plotTop + plotHeight / 2),
          }, '−'),
          h('button', {
            type: 'button', className: 'e21-icon-btn', title: 'Zoom in', 'aria-label': 'Zoom in',
            onClick: () => applyZoom(0.67, plotLeft + plotWidth / 2, plotTop + plotHeight / 2),
          }, '+'),
          h('button', {
            type: 'button', className: 'e21-text-btn', onClick: resetView, title: 'Reset view',
          }, 'Reset'))),
        hint && h('div', { className: 'e21-chart-hint' }, hint),
        exportError && h('div', { className: 'e21-error e21-export-error', role: 'status' }, exportError),
      );
    });

    function IconRefresh({ size }) {
      return h('svg', { width: size || 16, height: size || 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', 'aria-hidden': true },
        h('path', { d: 'M20 11a8 8 0 1 0-2.3 5.7' }),
        h('path', { d: 'M20 5v6h-6' }));
    }

    function IconFolder({ size }) {
      return h('svg', { width: size || 16, height: size || 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', 'aria-hidden': true },
        h('path', { d: 'M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 18 21H6a2.5 2.5 0 0 1-2.5-2.5v-11Z' }));
    }

    function IconTerminal({ size }) {
      return h('svg', { width: size || 16, height: size || 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('rect', { x: 3.5, y: 4, width: 17, height: 16, rx: 2.5 }),
        h('path', { d: 'm7 9 3 3-3 3M12.5 15H17' }));
    }

    function IconChevron({ size }) {
      return h('svg', { width: size || 14, height: size || 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', 'aria-hidden': true },
        h('path', { d: 'm8 10 4 4 4-4' }));
    }

    function IconClose({ size }) {
      return h('svg', { width: size || 16, height: size || 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', 'aria-hidden': true },
        h('path', { d: 'M6 6l12 12M18 6 6 18' }));
    }

    function IconArrowLeft({ size }) {
      return h('svg', { width: size || 16, height: size || 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M15 5l-7 7 7 7' }));
    }

    function IconExternal({ size }) {
      return h('svg', { width: size || 15, height: size || 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M14 4h6v6M20 4l-9 9M11 5H6.5A2.5 2.5 0 0 0 4 7.5v10A2.5 2.5 0 0 0 6.5 20h10a2.5 2.5 0 0 0 2.5-2.5V13' }));
    }

    function IconDownload({ size }) {
      return h('svg', { width: size || 14, height: size || 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5' }),
        h('path', { d: 'M5 20h14' }));
    }

    function ExplorerIcon({ size }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M3 20.4 12 3.2l9 17.2', stroke: 'currentColor', strokeWidth: 1.35, strokeLinejoin: 'round', opacity: 0.9 }),
        h('path', { d: 'M6.4 14.3h11.2M8.4 9.8h7.2M10.5 5.7h3', stroke: 'currentColor', strokeWidth: 1.1, strokeLinecap: 'round', opacity: 0.55 }),
        h('circle', { cx: '9.1', cy: '17.1', r: '1.05', fill: 'currentColor' }),
        h('circle', { cx: '13.8', cy: '12.1', r: '1.05', fill: 'currentColor' }),
        h('circle', { cx: '11.4', cy: '7.5', r: '1.05', fill: 'currentColor' }),
        h('circle', { cx: '16.6', cy: '19.3', r: '1.05', fill: 'currentColor', opacity: 0.55 }),
        h('circle', { cx: '6.6', cy: '19.3', r: '1.05', fill: 'currentColor', opacity: 0.55 }));
    }

    function Segmented({ value, options, onChange, ariaLabel }) {
      return h('div', { className: 'e21-segmented', role: 'group', 'aria-label': ariaLabel },
        options.map((option) => h('button', {
          key: option.id,
          type: 'button',
          className: cx('e21-segment', value === option.id && 'is-active'),
          'aria-pressed': value === option.id,
          disabled: option.disabled,
          onClick: () => onChange(option.id),
        }, option.label)));
    }

    function Select({ label, value, options, onChange, title }) {
      return h('label', { className: 'e21-select', title: title || label },
        label && h('span', { className: 'e21-select-label' }, label),
        h('span', { className: 'e21-select-shell' },
          h('select', {
            value,
            onChange: (event) => onChange(event.target.value),
            'aria-label': label || title,
          }, options.map((option) => h('option', { key: option.value, value: option.value }, option.label))),
          h('span', { className: 'e21-select-chevron' }, h(IconChevron, { size: 12 }))));
    }

    function ModelPicker({ models, selected, onChange, t }) {
      const selectedSet = new Set(selected);
      const toggle = (key) => {
        const next = new Set(selectedSet);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        onChange([...next]);
      };
      return h('details', { className: 'e21-models-picker' },
        h('summary', { className: 'e21-summary-btn' },
          h('span', { className: 'e21-summary-dot', 'aria-hidden': true }),
          `${t('models')} · ${selected.length}`,
          h('span', { className: 'e21-summary-chevron' }, h(IconChevron, { size: 12 }))),
        h('div', { className: 'e21-models-menu' },
          h('div', { className: 'e21-models-actions' },
            h('button', { type: 'button', className: 'e21-text-btn', onClick: () => onChange(models.map((model) => model.key)) }, t('all')),
            h('button', { type: 'button', className: 'e21-text-btn', onClick: () => onChange([]) }, t('none'))),
          models.map((model) => h('label', { key: model.key, className: 'e21-model-row' },
            h('input', {
              type: 'checkbox',
              checked: selectedSet.has(model.key),
              onChange: () => toggle(model.key),
            }),
            h('span', { className: 'e21-model-swatch', style: { background: displayColor(model.color) } }),
            h('span', { className: 'e21-model-name', title: model.key }, model.label)))));
    }

    function ModelDots({ models, selected }) {
      const chosen = models.filter((model) => selected.includes(model.key));
      if (!chosen.length) return null;
      return h('span', { className: 'e21-model-dots', 'aria-hidden': true },
        chosen.slice(0, 6).map((model) => h('span', {
          key: model.key,
          className: 'e21-model-dot',
          style: { background: displayColor(model.color) },
          title: model.label,
        })));
    }

    function SourceBar({ source, t, onEdit, onRefresh, busy }) {
      return h('div', { className: 'e21-sourcebar' },
        h('button', {
          type: 'button',
          className: 'e21-source-chip',
          onClick: onEdit,
          title: sourceTitle(source),
        },
        h('span', { className: 'e21-source-dot', 'aria-hidden': true }),
        h('span', { className: 'e21-source-name' }, sourceLabel(source)),
        source && source.kind === 'ssh' && h('span', { className: 'e21-source-kind' }, 'ssh'),
        h('span', { className: 'e21-source-change' }, t('change'))),
        h('button', {
          type: 'button',
          className: 'e21-icon-btn e21-refresh',
          title: t('refresh'),
          'aria-label': t('refresh'),
          onClick: onRefresh,
          disabled: busy,
        }, h(IconRefresh, { size: 15 })));
    }

    function Welcome({ t, defaults, recent, onOpen, onEdit, onRemove, busy }) {
      const open = (source) => onOpen(source);
      return h('div', { className: 'e21-welcome' },
        h('div', { className: 'e21-hero' },
          h('div', { className: 'e21-hero-mark' }, h(ExplorerIcon, { size: 42 })),
          h('h2', null, t('open')),
          h('p', null, t('openBody')),
          h('div', { className: 'e21-hero-actions' },
            h('button', {
              type: 'button', className: 'e21-btn e21-btn-primary', disabled: busy,
              onClick: () => onEdit('local'),
            }, h(IconFolder, { size: 15 }), t('choose')),
            h('button', {
              type: 'button', className: 'e21-btn', disabled: busy,
              onClick: () => onEdit('ssh'),
            }, h(IconTerminal, { size: 15 }), t('ssh')))),
        defaults.length > 0 && h('section', { className: 'e21-suggestions' },
          h('h3', null, t('defaults')),
          defaults.map((root) => h('button', {
            key: root.path,
            type: 'button',
            className: 'e21-path-row',
            onClick: () => open({ kind: 'local', root: root.path }),
          },
          h(IconFolder, { size: 15 }),
          h('span', { className: 'e21-path-label' }, root.label),
          h('span', { className: 'e21-path-value' }, root.path)))),
        recent.length > 0 && h('section', { className: 'e21-suggestions' },
          h('h3', null, t('recent')),
          recent.map((source) => h('div', { key: sourceKey(source), className: 'e21-recent-row' },
            h('button', {
              type: 'button', className: 'e21-path-row', onClick: () => open(source),
            },
            source.kind === 'ssh' ? h(IconTerminal, { size: 15 }) : h(IconFolder, { size: 15 }),
            h('span', { className: 'e21-path-label' }, sourceLabel(source)),
            h('span', { className: 'e21-path-value' }, sourceTitle(source))),
            h('button', {
              type: 'button', className: 'e21-icon-btn e21-recent-remove',
              title: t('remove'), 'aria-label': t('remove'),
              onClick: () => onRemove(source),
            }, h(IconClose, { size: 13 }))))));
    }

    function splitSshDestination(value) {
      const text = String(value || '').trim();
      const at = text.lastIndexOf('@');
      if (at > 0) return { user: text.slice(0, at), host: text.slice(at + 1) };
      return { user: '', host: text };
    }

    function composeSshDestination(user, host) {
      const userText = String(user || '').trim();
      const hostText = String(host || '').trim();
      if (!hostText) return '';
      if (!userText) return hostText;
      const hostname = hostText.includes('@') ? hostText.slice(hostText.lastIndexOf('@') + 1) : hostText;
      return `${userText}@${hostname}`;
    }

    function SourceEditor({ ctx, t, initial, onConnect, onClose }) {
      const initialSsh = initial && initial.kind === 'ssh'
        ? splitSshDestination(initial.host)
        : { user: '', host: '' };
      const [mode, setMode] = useState(initial && initial.kind === 'ssh' ? 'ssh' : 'local');
      const [localPath, setLocalPath] = useState(initial && initial.kind === 'local' ? initial.root : '');
      const [user, setUser] = useState(initialSsh.user);
      const [host, setHost] = useState(initialSsh.host);
      const [remotePath, setRemotePath] = useState(initial && initial.kind === 'ssh' ? initial.root : '');
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const [browser, setBrowser] = useState(null);
      const [browseBusy, setBrowseBusy] = useState(false);

      const pickDirectory = async () => {
        const workspace = typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : ctx.uiWorkspace;
        if (workspace && typeof workspace.pickDirectory === 'function') {
          return workspace.pickDirectory();
        }
        const remote = typeof ctx.get === 'function' ? ctx.get('remote') : ctx.remote;
        if (remote && remote.directoryPicker && typeof remote.directoryPicker.pick === 'function') {
          const answer = await remote.directoryPicker.pick();
          if (answer && typeof answer === 'object' && 'ok' in answer) {
            if (!answer.ok) throw new Error(answer.error && answer.error.message ? answer.error.message : 'Folder picker failed');
            return answer.value;
          }
          return answer;
        }
        throw new Error('The host folder picker is not available here. Type the path instead.');
      };

      const browseLocal = async () => {
        setError('');
        try {
          const picked = await pickDirectory();
          if (picked) setLocalPath(picked);
        } catch (pickError) {
          setError(pickError.message);
        }
      };

      const connect = async () => {
        setError('');
        const destination = composeSshDestination(user, host);
        const source = mode === 'local'
          ? { kind: 'local', root: localPath.trim() }
          : { kind: 'ssh', host: destination, root: remotePath.trim() };
        if (!source.root) {
          setError(mode === 'local' ? 'Choose a folder first.' : 'Enter the remote folder.');
          return;
        }
        if (mode === 'ssh' && !source.host) {
          setError('Enter an SSH host.');
          return;
        }
        setBusy(true);
        try {
          const ok = await onConnect(source);
          if (!ok) setBusy(false);
        } catch (connectError) {
          setError(connectError.message);
          setBusy(false);
        }
      };

      const browseRemote = async (target) => {
        setError('');
        setBrowseBusy(true);
        try {
          const destination = composeSshDestination(user, host);
          if (!destination) throw new Error('Enter an SSH host.');
          const answer = await apiJson('list', { host: destination, path: target || '~' });
          if (answer.error) throw new Error(answer.error);
          setBrowser(answer);
        } catch (browseError) {
          setError(browseError.message);
        } finally {
          setBrowseBusy(false);
        }
      };

      const onEnter = (event) => {
        if (event.key === 'Enter') connect();
      };

      const source = mode === 'local' ? { kind: 'local', root: localPath } : { kind: 'ssh', host: composeSshDestination(user, host), root: remotePath };

      return h('div', { className: 'e21-editor' },
        h('div', { className: 'e21-editor-head' },
          h('div', { className: 'e21-editor-title' }, t('open')),
          h('button', {
            type: 'button', className: 'e21-icon-btn', title: 'Close', 'aria-label': 'Close',
            onClick: onClose,
          }, h(IconClose, { size: 15 }))),
        h(Segmented, {
          value: mode,
          ariaLabel: 'Source type',
          options: [{ id: 'local', label: t('local') }, { id: 'ssh', label: t('ssh') }],
          onChange: (next) => { setMode(next); setError(''); setBrowser(null); },
        }),
        mode === 'local'
          ? h('div', { className: 'e21-editor-body' },
            h('label', { className: 'e21-field' },
              h('span', null, t('folder')),
              h('div', { className: 'e21-input-row' },
                h('input', {
                  type: 'text',
                  value: localPath,
                  placeholder: '/path/to/results or run.xhi.h5',
                  spellCheck: false,
                  onChange: (event) => setLocalPath(event.target.value),
                  onKeyDown: onEnter,
                }),
                h('button', { type: 'button', className: 'e21-btn', onClick: browseLocal, disabled: busy }, t('browse')))),
            h('div', { className: 'e21-editor-actions' },
              h('button', { type: 'button', className: 'e21-btn e21-btn-primary', onClick: connect, disabled: busy },
                busy ? t('connecting') : t('connect'))))
          : h('div', { className: 'e21-editor-body' },
            h('label', { className: 'e21-field' },
              h('span', null, t('user')),
              h('input', {
                type: 'text',
                value: user,
                placeholder: t('userHint'),
                autoComplete: 'username',
                spellCheck: false,
                onChange: (event) => { setUser(event.target.value); setBrowser(null); },
                onKeyDown: onEnter,
              })),
            h('label', { className: 'e21-field' },
              h('span', null, t('host')),
              h('input', {
                type: 'text',
                value: host,
                placeholder: t('hostHint'),
                spellCheck: false,
                onChange: (event) => { setHost(event.target.value); setBrowser(null); },
                onKeyDown: onEnter,
              })),
            h('label', { className: 'e21-field' },
              h('span', null, t('folder')),
              h('div', { className: 'e21-input-row' },
                h('input', {
                  type: 'text',
                  value: remotePath,
                  placeholder: '/pfs/.../results or run.xhi.h5',
                  spellCheck: false,
                  onChange: (event) => { setRemotePath(event.target.value); setBrowser(null); },
                  onKeyDown: onEnter,
                }),
                h('button', {
                  type: 'button', className: 'e21-btn', disabled: busy || browseBusy || !composeSshDestination(user, host),
                  onClick: () => browseRemote(remotePath.trim() || '~'),
                }, browseBusy ? '…' : t('browse')))),
            h('p', { className: 'e21-hint' }, 'Uses your ssh config and keys. Leave User empty to use the configured user. Key-based, non-interactive login is required. Folders and single .h5 run files both work.'),
            browser && h('div', { className: 'e21-browser' },
              h('div', { className: 'e21-browser-head' },
                h('button', {
                  type: 'button', className: 'e21-icon-btn', title: t('up'), 'aria-label': t('up'),
                  onClick: () => browseRemote(browser.parent),
                }, h(IconArrowLeft, { size: 14 })),
                h('span', { className: 'e21-browser-path', title: browser.path }, browser.path)),
              h('div', { className: 'e21-browser-list' },
                browser.dirs && browser.dirs.length > 0
                  ? browser.dirs.map((dir) => h('button', {
                    key: dir.path, type: 'button', className: 'e21-browser-row',
                    onClick: () => browseRemote(dir.path),
                  }, h(IconFolder, { size: 14 }), dir.name))
                  : h('p', { className: 'e21-muted' }, 'No subfolders')),
              h('button', {
                type: 'button', className: 'e21-btn e21-btn-primary e21-browser-use',
                onClick: () => { setRemotePath(browser.path); setBrowser(null); },
              }, t('useFolder'))),
            h('div', { className: 'e21-editor-actions' },
              h('button', { type: 'button', className: 'e21-btn e21-btn-primary', onClick: connect, disabled: busy },
                busy ? t('connecting') : t('connect')))),
        error && h('div', { className: 'e21-error' }, error),
        source && source.root && h('div', { className: 'e21-editor-preview' }, sourceTitle(source)));
    }

    const HEADLINE_METRICS = [
      { key: 'voxel.rmse', label: 'RMSE', dir: 'lower', digits: 3 },
      { key: 'voxel.r2', label: 'R²', dir: 'higher', digits: 3 },
      { key: 'spectrum.active.coherence_ref', label: 'r(k_ref)', dir: 'higher', digits: 3 },
      { key: 'spectrum.active.ratio_ref', label: 'P ratio', dir: 'ideal', ideal: 1, digits: 2 },
      { key: 'spectrum.active.highk_logmse', label: 'high-k logMSE', dir: 'lower', digits: 2 },
      { key: 'morphology.iou.f0.5', label: 'IoU f0.5', dir: 'higher', digits: 3, passes: ['xhi'] },
      { key: 'bubble.active.wasserstein_med_mpc', label: 'W₁', dir: 'lower', digits: 2, unit: 'Mpc', passes: ['xhi'] },
      { key: 'history.tau.error_med', label: '|Δτ|/σ', dir: 'lower', digits: 3, passes: ['xhi'] },
      { key: 'front.front_width_excess_mpc', label: 'front Δ', dir: 'lower', digits: 2, unit: 'Mpc', passes: ['xhi'] },
    ];

    function metricUnit(metric, pass) {
      if (metric.unit) return metric.unit;
      if (metric.key === 'voxel.rmse') return pass === 'tb' ? 'mK' : '';
      return '';
    }

    function aggregateMetric(runs, key) {
      let total = 0;
      let weight = 0;
      for (const run of runs) {
        const value = run.metrics && run.metrics[key];
        if (!isNum(value)) continue;
        const w = Number(run.nSamples) > 0 ? Number(run.nSamples) : 1;
        total += value * w;
        weight += w;
      }
      return weight > 0 ? total / weight : null;
    }

    function Overview({ t, manifest, pass, setPass, group, setGroup, selected, toggleModel, openCharts }) {
      const passes = useMemo(() => {
        const found = new Set(manifest.runs.map((run) => run.pass).filter(Boolean));
        return ['xhi', 'tb'].filter((value) => found.has(value));
      }, [manifest]);
      const groups = useMemo(() => groupIds(manifest), [manifest]);
      const columns = useMemo(
        () => HEADLINE_METRICS.filter((metric) => !metric.passes || metric.passes.includes(pass))
          .filter((metric) => manifest.runs.some((run) => run.pass === pass && isNum(run.metrics?.[metric.key]))),
        [manifest, pass],
      );
      const rows = useMemo(() => {
        const output = [];
        for (const model of manifest.models) {
          const matching = manifest.runs.filter((run) => run.model === model.key
            && run.pass === pass
            && !run.variant
            && (group === 'all' || run.group === group));
          if (!matching.length) continue;
          const metrics = {};
          for (const metric of columns) {
            metrics[metric.key] = group === 'all'
              ? aggregateMetric(matching, metric.key)
              : (isNum(matching[0].metrics?.[metric.key]) ? matching[0].metrics[metric.key] : null);
          }
          output.push({ model, metrics, nSamples: matching.reduce((sum, run) => sum + (Number(run.nSamples) || 0), 0) });
        }
        return output;
      }, [manifest, pass, group, columns]);

      const scales = useMemo(() => {
        const map = {};
        for (const metric of columns) {
          const values = rows.map((row) => row.metrics[metric.key]).filter(isNum);
          if (!values.length) {
            map[metric.key] = { min: 0, max: 1 };
            continue;
          }
          const min = Math.min(...values);
          const max = Math.max(...values);
          map[metric.key] = { min, max, ideal: metric.ideal };
        }
        return map;
      }, [rows, columns]);

      if (!rows.length) {
        return h('div', { className: 'e21-empty' }, h('p', null, t('emptyRuns')), h('p', { className: 'e21-muted' }, t('emptyBody')));
      }

      const headerCells = h('thead', null,
        h('tr', null,
          h('th', { className: 'e21-th-model', scope: 'col' }, t('models')),
          columns.map((metric) => {
            const direction = metric.dir === 'ideal' ? '≈ 1' : metric.dir === 'lower' ? '↓' : '↑';
            const unit = metricUnit(metric, pass);
            return h('th', {
              key: metric.key,
              scope: 'col',
              title: `${metric.label}${unit ? ` [${unit}]` : ''} · ${metric.dir === 'ideal' ? '1 is ideal' : metric.dir === 'lower' ? 'lower is better' : 'higher is better'}`,
            },
            h('span', { className: 'e21-th-label' }, metric.label),
            h('span', { className: 'e21-th-meta' },
              unit && h('span', { className: 'e21-th-unit' }, unit),
              h('span', { className: 'e21-th-dir' }, direction)));
          })));

      const maxDeviationFor = (metric) => Math.max(0.001, ...rows.map((item) => {
        const value = item.metrics[metric.key];
        return isNum(value) ? Math.abs(value - metric.ideal) : 0;
      }));

      const bodyRows = rows.map((row) => {
        const selectedRow = selected.includes(row.model.key);
        const cells = columns.map((metric) => {
          const value = row.metrics[metric.key];
          const scale = scales[metric.key];
          let fraction = 0;
          if (isNum(value)) {
            if (metric.dir === 'ideal') {
              fraction = Math.max(0.04, 1 - Math.abs(value - metric.ideal) / maxDeviationFor(metric));
            } else if (scale.max > scale.min) {
              fraction = (value - scale.min) / (scale.max - scale.min);
            } else {
              fraction = 1;
            }
            fraction = Math.max(0.02, Math.min(1, fraction));
          }
          return h('td', {
            key: metric.key,
            className: 'e21-td-metric',
            title: `${row.model.label} · ${metric.label}: ${withUnit(value, metricUnit(metric, pass))}`,
          },
          h('span', { className: 'e21-value' }, withUnit(value, '')),
          h('span', { className: 'e21-bar', 'aria-hidden': true },
            h('span', {
              className: 'e21-bar-fill',
              style: { width: isNum(value) ? `${fraction * 100}%` : '0%', background: displayColor(row.model.color) },
            })));
        });
        return h('tr', {
          key: row.model.key,
          className: cx(selectedRow && 'is-selected'),
          onClick: () => toggleModel(row.model.key),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleModel(row.model.key);
            }
          },
          tabIndex: 0,
          'aria-pressed': selectedRow,
          title: `Select ${row.model.label}`,
        },
        h('td', { className: 'e21-td-model' },
          h('span', { className: 'e21-row-check', 'aria-hidden': true },
            selectedRow ? h('span', { className: 'e21-check-mark' }, '✓') : null),
          h('span', { className: 'e21-row-swatch', style: { background: displayColor(row.model.color) } }),
          h('span', { className: 'e21-row-name' }, row.model.label)),
        cells);
      });

      return h('section', { className: 'e21-section' },
        h('div', { className: 'e21-controls' },
          passes.length > 1 && h(Segmented, {
            value: pass,
            ariaLabel: t('pass'),
            options: passes.map((value) => ({ id: value, label: passLabel(value) })),
            onChange: setPass,
          }),
          h('div', { className: 'e21-controls-spacer' }),
          h(Select, {
            label: t('group'),
            value: group,
            onChange: setGroup,
            options: [{ value: 'all', label: t('allGroups') }, ...groups.map((id) => ({ value: id, label: id }))],
          })),
        h('div', { className: 'e21-scorecard' },
          h('table', { className: 'e21-table' }, headerCells, h('tbody', null, bodyRows))),
        h('div', { className: 'e21-scorecard-foot' },
          h('span', null, group === 'all' ? 'Weighted across groups by cone count.' : `Group ${group}.`),
          h('span', null, t('clickRows'))),
        selected.length > 0 && h('div', { className: 'e21-selected-strip' },
          h('span', null, `${selected.length} selected`),
          h(ModelDots, { models: manifest.models, selected }),
          h('button', {
            type: 'button', className: 'e21-text-btn', onClick: openCharts,
          }, 'Open in Charts')));

    }

    function useRunCurves(source, ids) {
      const idsKey = ids.join('|');
      const cacheRef = useRef(new Map());
      const sourceKeyRef = useRef(null);
      const [, setVersion] = useState(0);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const failedRef = useRef({});
      useEffect(() => {
        const nextSourceKey = sourceKey(source);
        if (sourceKeyRef.current !== nextSourceKey) {
          cacheRef.current.clear();
          failedRef.current = {};
          sourceKeyRef.current = nextSourceKey;
        }
        if (!source || !ids.length) {
          setLoading(false);
          setError('');
          return undefined;
        }
        const missing = ids.filter((id) => !cacheRef.current.has(id) && !failedRef.current[id]);
        if (!missing.length) {
          setLoading(false);
          setError('');
          setVersion((value) => value + 1);
          return undefined;
        }
        const controller = new AbortController();
        let cancelled = false;
        let cursor = 0;
        const failures = [];
        setLoading(true);
        setError('');
        const worker = async () => {
          while (!cancelled) {
            const index = cursor;
            cursor += 1;
            if (index >= missing.length) return;
            const id = missing[index];
            try {
              const data = await apiJson('run', { source: sourceQuery(source), id }, controller.signal);
              cacheRef.current.set(id, data.arrays || {});
            } catch (runError) {
              if (!cancelled) {
                failures.push(runError);
                failedRef.current[id] = true;
              }
            }
            if (!cancelled) setVersion((value) => value + 1);
          }
        };
        Promise.all(Array.from({ length: Math.min(4, missing.length) }, worker)).then(() => {
          if (cancelled) return;
          setLoading(false);
          if (failures.length) setError(failures[0].message || 'Could not read run data');
        });
        return () => {
          cancelled = true;
          controller.abort();
        };
      }, [sourceKey(source), idsKey]);
      const arrays = {};
      for (const id of ids) arrays[id] = cacheRef.current.get(id) || null;
      return { arrays, loading, error };
    }

    const CHART_KINDS = [
      { id: 'spectra', label: 'Spectra', passes: ['xhi', 'tb'] },
      { id: 'history', label: 'History', passes: ['xhi'] },
      { id: 'pdf', label: 'x_HI PDF', passes: ['xhi'] },
      { id: 'bubble', label: 'Bubbles', passes: ['xhi'] },
      { id: 'front', label: 'Fronts', passes: ['xhi'] },
    ];

    function arraysFor(pair) {
      return stripArrays(pair.arrays, pair.run.model);
    }

    function seriesMeta(model, manifest) {
      return manifest.models.find((entry) => entry.key === model) || { key: model, label: model, color: MODEL_COLORS[0], dash: '' };
    }

    function buildSpectra(pairs, manifest, stageIndex, metric) {
      if (!pairs.length) return null;
      const first = arraysFor(pairs[0]);
      const k = first.spectrum__spectrum_k;
      if (!Array.isArray(k)) return null;
      const stages = pairs[0].run.stages || [];
      const stage = stages[Math.min(stageIndex, Math.max(0, stages.length - 1))] || stages[0] || '';
      const suffix = stageSuffix(stage);
      const series = [];
      if (metric === 'power') {
        const truthMatrix = first[`spectrum__spectrum_delta2_truth_${suffix}`];
        if (Array.isArray(truthMatrix)) {
          const stats = columnStats(truthMatrix);
          series.push({
            id: 'truth',
            label: 'truth',
            color: TRUTH_COLOR,
            exportColor: TRUTH_COLOR,
            dash: '',
            width: TRUTH_LINE_WIDTH,
            pointRadius: 2.8,
            kind: 'line',
            points: k.map((value, index) => ({ x: value, y: stats.median[index] })),
            tooltip: (point) => ({
              title: 'truth',
              rows: [['k [Mpc⁻¹]', formatNumber(point.x)], ['Δ²', formatNumber(point.y)], ['stage', stageLabel(stage)]],
            }),
          });
        }
        for (const pair of pairs) {
          const model = seriesMeta(pair.run.model, manifest);
          const arrays = arraysFor(pair);
          const matrix = arrays[`spectrum__spectrum_delta2_pred_${suffix}`];
          if (!Array.isArray(matrix)) continue;
          const stats = columnStats(matrix);
          series.push({
            id: `pred-${pair.run.id}`,
            label: model.label,
            color: model.color,
            dash: model.dash || '',
            kind: 'line',
            points: k.map((value, index) => ({ x: value, y: stats.median[index] })),
            tooltip: (point) => ({
              title: model.label,
              rows: [['k [Mpc⁻¹]', formatNumber(point.x)], ['Δ²', formatNumber(point.y)], ['stage', stageLabel(stage)]],
            }),
          });
        }
        return {
          series,
          xLabel: 'k [Mpc⁻¹]',
          yLabel: 'Δ²',
          xType: 'log',
          yType: 'log',
          referenceLines: [],
          subtitle: `${stageLabel(stage)} · true and predicted power`,
          note: 'Median over cones.',
        };
      }
      for (const pair of pairs) {
        const model = seriesMeta(pair.run.model, manifest);
        const arrays = arraysFor(pair);
        const matrix = metric === 'coherence'
          ? arrays[`spectrum__spectrum_coherence_${suffix}`]
          : arrays[`spectrum__spectrum_ratio_${suffix}`];
        if (!Array.isArray(matrix)) continue;
        const stats = columnStats(matrix);
        series.push({
          id: `${metric}-${pair.run.id}`,
          label: model.label,
          color: model.color,
          dash: model.dash || '',
          kind: 'line',
          points: k.map((value, index) => ({ x: value, y: stats.median[index] })),
          tooltip: (point) => ({
            title: model.label,
            rows: [
              ['k [Mpc⁻¹]', formatNumber(point.x)],
              [metric === 'coherence' ? 'r(k)' : 'P / P_true', formatNumber(point.y)],
              ['stage', stageLabel(stage)],
            ],
          }),
        });
      }
      return {
        series,
        xLabel: 'k [Mpc⁻¹]',
        yLabel: metric === 'coherence' ? 'r(k)' : 'P_pred / P_true',
        xType: 'log',
        yType: metric === 'coherence' ? 'linear' : 'log',
        referenceLines: metric === 'coherence'
          ? [{ value: 0.9, label: '0.9', dash: '4 4' }]
          : [{ value: 1, label: '1', dash: '4 4' }],
        subtitle: `${stageLabel(stage)} · ${metric === 'coherence' ? 'coherence' : 'power ratio'}`,
        note: 'Median over cones.',
      };
    }

    function buildHistory(pairs, manifest) {
      if (!pairs.length) return null;
      const first = arraysFor(pairs[0]);
      const z = first.history__history_z;
      const truth = first.observable__observable_xbar_truth;
      if (!Array.isArray(z) || !Array.isArray(truth)) return null;
      const series = [];
      for (const pair of pairs) {
        const model = seriesMeta(pair.run.model, manifest);
        const arrays = arraysFor(pair);
        const pred = arrays.observable__observable_xbar_pred;
        if (!Array.isArray(pred) || !Array.isArray(truth)) continue;
        const differences = pred.map((row, sampleIndex) => row.map((value, index) => {
          const reference = truth[sampleIndex] ? truth[sampleIndex][index] : null;
          return isNum(value) && isNum(reference) ? value - reference : null;
        }));
        const stats = columnStats(differences);
        series.push({
          id: `history-${pair.run.id}`,
          label: model.label,
          color: model.color,
          dash: model.dash || '',
          kind: 'line',
          showPoints: false,
          points: z.map((value, index) => ({ x: value, y: stats.median[index] })),
          band: z.map((value, index) => ({ x: value, low: stats.low[index], high: stats.high[index] })),
          tooltip: (point) => {
            const index = z.indexOf(point.x);
            return {
              title: model.label,
              rows: [
                ['z', formatNumber(point.x)],
                ['Δx̄_HI', formatNumber(point.y)],
                ['16–84%', `${formatNumber(stats.low[index])} … ${formatNumber(stats.high[index])}`],
              ],
            };
          },
        });
      }
      return {
        series,
        xLabel: 'z',
        yLabel: 'x̄_HI,pred − x̄_HI,true',
        xType: 'linear',
        yType: 'linear',
        referenceLines: [{ value: 0, label: '0', dash: '4 4' }],
        subtitle: 'Global history error · median and 16–84% over cones',
        note: 'Median and 16–84% interval over cones.',
      };
    }

    function buildPdf(pairs, manifest, stageIndex) {
      if (!pairs.length) return null;
      const first = arraysFor(pairs[0]);
      const edges = first.observable__observable_xhi_edges;
      if (!Array.isArray(edges) || edges.length < 2) return null;
      const centers = edges.slice(0, -1).map((value, index) => (value + edges[index + 1]) / 2);
      const stages = pairs[0].run.stages || [];
      const stage = stages[Math.min(stageIndex, Math.max(0, stages.length - 1))] || '';
      const suffix = stageSuffix(stage);
      const truth = first[`observable__observable_xhi_hist_truth_${suffix}`];
      if (!Array.isArray(truth)) return null;
      const series = [{
        id: 'pdf-truth',
        label: 'truth',
        color: TRUTH_COLOR,
        exportColor: TRUTH_COLOR,
        dash: '',
        width: TRUTH_LINE_WIDTH,
        showPoints: false,
        kind: 'step',
        points: centers.map((value, index) => ({ x: value, y: truth[index] })),
        tooltip: (point) => ({
          title: 'truth',
          rows: [['x_HI', formatNumber(point.x)], ['PDF', formatNumber(point.y)], ['stage', stageLabel(stage)]],
        }),
      }];
      for (const pair of pairs) {
        const model = seriesMeta(pair.run.model, manifest);
        const arrays = arraysFor(pair);
        const values = arrays[`observable__observable_xhi_hist_pred_${suffix}`];
        if (!Array.isArray(values)) continue;
        series.push({
          id: `pdf-${pair.run.id}`,
          label: model.label,
          color: model.color,
          dash: model.dash || '',
          kind: 'step',
          showPoints: false,
          points: centers.map((value, index) => ({ x: value, y: values[index] })),
          tooltip: (point) => ({
            title: model.label,
            rows: [['x_HI', formatNumber(point.x)], ['PDF', formatNumber(point.y)], ['stage', stageLabel(stage)]],
          }),
        });
      }
      return {
        series,
        xLabel: 'x_HI',
        yLabel: 'PDF',
        xType: 'linear',
        yType: 'linear',
        referenceLines: [],
        subtitle: `${stageLabel(stage)} · neutral-fraction PDF`,
        note: 'Bin-wise neutral-fraction histogram.',
      };
    }

    function buildBubble(pairs, manifest) {
      if (!pairs.length) return null;
      const first = arraysFor(pairs[0]);
      const radius = first.bubble__bubble_radius_mpc;
      if (!Array.isArray(radius)) return null;
      const truth = meanColumns(first.bubble__bubble_mass_truth_active);
      if (!truth.length) return null;
      const series = [{
        id: 'bubble-truth',
        label: 'truth',
        color: TRUTH_COLOR,
        exportColor: TRUTH_COLOR,
        dash: '',
        width: TRUTH_LINE_WIDTH,
        pointRadius: 2.8,
        kind: 'line',
        points: radius.map((value, index) => ({ x: value, y: truth[index] })),
        tooltip: (point) => ({
          title: 'truth',
          rows: [['radius [Mpc]', formatNumber(point.x)], ['mass fraction', formatNumber(point.y)]],
        }),
      }];
      for (const pair of pairs) {
        const model = seriesMeta(pair.run.model, manifest);
        const arrays = arraysFor(pair);
        const values = meanColumns(arrays.bubble__bubble_mass_pred_active);
        if (!values.length) continue;
        series.push({
          id: `bubble-${pair.run.id}`,
          label: model.label,
          color: model.color,
          dash: model.dash || '',
          kind: 'line',
          points: radius.map((value, index) => ({ x: value, y: values[index] })),
          tooltip: (point) => ({
            title: model.label,
            rows: [['radius [Mpc]', formatNumber(point.x)], ['mass fraction', formatNumber(point.y)]],
          }),
        });
      }
      return {
        series,
        xLabel: 'bubble radius [Mpc]',
        yLabel: 'mass fraction',
        xType: 'log',
        yType: 'linear',
        referenceLines: [],
        subtitle: 'Active stage · mean-free-path bubble mass distribution',
        note: 'Mean over cones.',
      };
    }

    function buildFront(pairs, manifest, metric) {
      if (!pairs.length) return null;
      const first = arraysFor(pairs[0]);
      const distance = first.front__front_d_mpc;
      if (!Array.isArray(distance)) return null;
      const truth = first.front__front_mean_truth;
      const series = [];
      if (metric === 'mean' && Array.isArray(truth)) {
        series.push({
          id: 'front-truth',
          label: 'truth',
          color: TRUTH_COLOR,
          exportColor: TRUTH_COLOR,
          dash: '',
          width: TRUTH_LINE_WIDTH,
          pointRadius: 2.8,
          kind: 'line',
          points: distance.map((value, index) => ({ x: value, y: truth[index] })),
          tooltip: (point) => ({
            title: 'truth',
            rows: [['distance [Mpc]', formatNumber(point.x)], ['mean x_HI', formatNumber(point.y)]],
          }),
        });
      }
      for (const pair of pairs) {
        const model = seriesMeta(pair.run.model, manifest);
        const arrays = arraysFor(pair);
        const values = metric === 'mean' ? arrays.front__front_mean_pred : arrays.front__front_rmse;
        if (!Array.isArray(values)) continue;
        series.push({
          id: `front-${pair.run.id}`,
          label: model.label,
          color: model.color,
          dash: model.dash || '',
          kind: 'line',
          points: distance.map((value, index) => ({ x: value, y: values[index] })),
          tooltip: (point) => ({
            title: model.label,
            rows: [
              ['distance [Mpc]', formatNumber(point.x)],
              [metric === 'mean' ? 'mean x_HI' : 'RMSE', formatNumber(point.y)],
            ],
          }),
        });
      }
      return {
        series,
        xLabel: 'distance from front [Mpc]',
        yLabel: metric === 'mean' ? 'mean x_HI' : 'RMSE',
        xType: 'linear',
        yType: 'linear',
        referenceLines: [],
        subtitle: metric === 'mean' ? 'Reionization front profile' : 'Front RMSE profile',
        note: 'Profile from eval21 results.',
      };
    }

    function Charts({ t, manifest, source, selected, setSelected, initialPass, initialGroup }) {
      const passes = useMemo(() => {
        const found = new Set(manifest.runs.map((run) => run.pass).filter(Boolean));
        return ['xhi', 'tb'].filter((value) => found.has(value));
      }, [manifest]);
      const groups = useMemo(() => groupIds(manifest), [manifest]);
      const [pass, setPass] = useState(passes.includes(initialPass) ? initialPass : (passes[0] || 'xhi'));
      const [kind, setKind] = useState('spectra');
      const [group, setGroup] = useState(groups.includes(initialGroup) ? initialGroup : (groups[0] || ''));
      const [stageIndex, setStageIndex] = useState(999);
      const [spectraMetric, setSpectraMetric] = useState('ratio');
      const [frontMetric, setFrontMetric] = useState('mean');
      const chartRef = useRef(null);

      const availableKinds = CHART_KINDS.filter((entry) => entry.passes.includes(pass));
      useEffect(() => {
        if (!availableKinds.some((entry) => entry.id === kind)) setKind(availableKinds[0].id);
      }, [pass, kind, availableKinds]);
      useEffect(() => {
        if (!passes.includes(pass) && passes.length) setPass(passes[0]);
      }, [passes, pass]);
      useEffect(() => {
        if (!groups.includes(group) && groups.length) setGroup(groups[0]);
      }, [groups, group]);

      const sampleModel = selected[0]
        || manifest.models.find((model) => findRun(manifest, model.key, groups[0] || '', pass, false))?.key
        || manifest.models[0]?.key;
      const sampleRun = sampleModel ? findRun(manifest, sampleModel, group, pass, false) : null;
      const stages = sampleRun?.stages || [];
      useEffect(() => {
        if (stageIndex === 999 && stages.length) setStageIndex(stages.length - 1);
        else if (stages.length && stageIndex >= stages.length) setStageIndex(stages.length - 1);
      }, [stages.length, stageIndex]);

      const runs = useMemo(() => selected
        .map((key) => findRun(manifest, key, group, pass, false))
        .filter(Boolean), [selected, manifest, group, pass]);
      const ids = runs.map((run) => run.id);
      const curvesState = useRunCurves(source, ids);
      const pairs = runs
        .map((run) => ({ run, arrays: curvesState.arrays[run.id] }))
        .filter((pair) => pair.arrays);
      const currentStage = Math.min(stageIndex === 999 ? Math.max(0, stages.length - 1) : stageIndex, Math.max(0, stages.length - 1));

      const built = useMemo(() => {
        if (!pairs.length) return null;
        if (kind === 'spectra') return buildSpectra(pairs, manifest, currentStage, spectraMetric);
        if (kind === 'history') return buildHistory(pairs, manifest);
        if (kind === 'pdf') return buildPdf(pairs, manifest, currentStage);
        if (kind === 'bubble') return buildBubble(pairs, manifest);
        if (kind === 'front') return buildFront(pairs, manifest, frontMetric);
        return null;
      }, [pairs, kind, currentStage, spectraMetric, frontMetric, manifest]);

      const kindLabel = availableKinds.find((entry) => entry.id === kind)?.label || kind;
      const chartTitle = built
        ? `${kindLabel} · ${group || '—'}`
        : kindLabel;

      const controlsTop = h('div', { className: 'e21-controls e21-controls-wrap' },
        h(Segmented, {
          value: kind,
          ariaLabel: 'Chart type',
          options: availableKinds.map((entry) => ({ id: entry.id, label: entry.label })),
          onChange: setKind,
        }),
        h('div', { className: 'e21-controls-spacer' }),
        passes.length > 1 && h(Segmented, {
          value: pass,
          ariaLabel: t('pass'),
          options: passes.map((value) => ({ id: value, label: passLabel(value) })),
          onChange: setPass,
        }));

      const controlsBottom = h('div', { className: 'e21-controls e21-controls-wrap' },
        groups.length > 0 && h(Select, {
          label: t('group'),
          value: group,
          onChange: setGroup,
          options: groups.map((id) => ({ value: id, label: id })),
        }),
        (kind === 'spectra' || kind === 'pdf') && h(Select, {
          label: t('stage'),
          value: String(currentStage),
          onChange: (value) => setStageIndex(Number(value)),
          options: stages.map((stage, index) => ({ value: String(index), label: stageLabel(stage) })),
        }),
        kind === 'spectra' && h(Segmented, {
          value: spectraMetric,
          ariaLabel: t('metric'),
          options: [
            { id: 'ratio', label: 'P ratio' },
            { id: 'coherence', label: 'r(k)' },
            { id: 'power', label: 'Δ²' },
          ],
          onChange: setSpectraMetric,
        }),
        kind === 'front' && h(Segmented, {
          value: frontMetric,
          ariaLabel: t('metric'),
          options: [{ id: 'mean', label: 'Mean' }, { id: 'rmse', label: 'RMSE' }],
          onChange: setFrontMetric,
        }),
        manifest.models.length > 0 && h(ModelPicker, {
          models: manifest.models,
          selected,
          onChange: setSelected,
          t,
        }));

      const exportStage = (kind === 'spectra' || kind === 'pdf') && stages[currentStage]
        ? stageSuffix(stages[currentStage])
        : '';
      const exportGroup = group === 'all' ? 'All groups' : groupDisplay(group);
      const exportPass = passLabel(pass);
      const exportStageLabel = (kind === 'spectra' || kind === 'pdf') && stages[currentStage]
        ? stageLabel(stages[currentStage])
        : '';
      let exportTitleText = chartTitle;
      let exportSubtitleText = built ? built.subtitle : '';
      if (kind === 'spectra') {
        const metricTitle = spectraMetric === 'ratio'
          ? 'Power spectrum ratio'
          : spectraMetric === 'coherence'
            ? 'Power spectrum coherence'
            : 'Dimensionless power spectrum';
        exportTitleText = `${metricTitle} (${exportPass})`;
        exportSubtitleText = [exportGroup, exportStageLabel].filter(Boolean).join(', ');
      } else if (kind === 'history') {
        exportTitleText = `Global history error (${exportPass})`;
        exportSubtitleText = [exportGroup].filter(Boolean).join(', ');
      } else if (kind === 'pdf') {
        exportTitleText = 'Neutral hydrogen fraction PDF';
        exportSubtitleText = [exportGroup, exportStageLabel].filter(Boolean).join(', ');
      } else if (kind === 'bubble') {
        exportTitleText = `Bubble mass distribution (${exportPass})`;
        exportSubtitleText = [exportGroup, 'active stage'].filter(Boolean).join(', ');
      } else if (kind === 'front') {
        exportTitleText = `${frontMetric === 'mean' ? 'Reionization front profile' : 'Reionization front RMSE'} (${exportPass})`;
        exportSubtitleText = [exportGroup].filter(Boolean).join(', ');
      }
      const exportMeta = `${sourceLabel(source)}, ${selected.length} model${selected.length === 1 ? '' : 's'}${runs[0]?.nSamples ? `, ${runs[0].nSamples} cones` : ''}`;
      const exportFileName = ['eval21', kind, group, pass,
        kind === 'spectra' ? spectraMetric : null,
        kind === 'front' ? frontMetric : null,
        exportStage,
      ].filter(Boolean).join('-');
      const chartBody = selected.length === 0
        ? h('div', { className: 'e21-empty e21-empty-chart' }, h('p', null, t('selectModels')))
        : built
          ? h(Chart, {
            ref: chartRef,
            series: built.series,
            xLabel: built.xLabel,
            yLabel: built.yLabel,
            xType: built.xType,
            yType: built.yType,
            referenceLines: built.referenceLines,
            height: 380,
            empty: t('noData'),
            hint: t('zoomHint'),
            exportTitle: exportTitleText,
            exportSubtitle: exportSubtitleText,
            exportMeta,
            exportFileName,
            exportNote: built.note || '',
          })
          : h('div', { className: 'e21-empty e21-empty-chart' }, h('p', null, curvesState.loading ? t('loadingCurves') : t('noData')));

      return h('section', { className: 'e21-section' },
        controlsTop,
        controlsBottom,
        h('div', { className: 'e21-chart-card' },
          h('div', { className: 'e21-chart-head' },
            h('div', null,
              h('h3', null, exportTitleText),
              h('p', null, exportSubtitleText)),
            h('div', { className: 'e21-chart-meta' },
              h(ModelDots, { models: manifest.models, selected }),
              h('span', null, `${selected.length} model${selected.length === 1 ? '' : 's'}`),
              built && built.series.length > 0 && h('button', {
                type: 'button',
                className: 'e21-btn e21-export-btn',
                title: t('downloadJpg'),
                'aria-label': t('downloadJpg'),
                disabled: curvesState.loading,
                onClick: () => chartRef.current && chartRef.current.downloadJpeg(),
              }, h(IconDownload, { size: 13 }), 'JPG'))),
          curvesState.error && h('div', { className: 'e21-error' }, curvesState.error),
          curvesState.loading && h('div', { className: 'e21-status' }, t('loadingCurves')),
          chartBody,
          h('div', { className: 'e21-chart-foot' },
            h('span', null, (built && built.note) || 'Derived from eval21 results.'),
            built && built.series.length > 0 && h('span', null,
              `${built.series.reduce((sum, item) => sum + (item.points ? item.points.length : 0), 0).toLocaleString()} plotted points`))));

    }

    const CONE_METRICS = [
      {
        id: 'rmse', label: 'RMSE', passes: ['xhi', 'tb'],
        value: (arrays) => arrays.voxel__rmse_per_sample,
      },
      {
        id: 'r2', label: 'R²', passes: ['xhi', 'tb'],
        value: (arrays) => arrays.voxel__r2_per_sample,
      },
      {
        id: 'iou', label: 'IoU f0.5', passes: ['xhi'],
        value: (arrays) => arrays['morphology__morphology_iou_f0.5'],
      },
      {
        id: 'front', label: 'Front width [Mpc]', passes: ['xhi'],
        value: (arrays) => arrays.front__front_width_pred,
      },
      {
        id: 'tau', label: 'τ error', passes: ['xhi'],
        value: (arrays) => {
          const truth = arrays.history__history_tau_truth;
          const pred = arrays.history__history_tau_pred;
          if (!Array.isArray(truth) || !Array.isArray(pred)) return null;
          return pred.map((value, index) => (isNum(value) && isNum(truth[index]) ? value - truth[index] : null));
        },
      },
      {
        id: 'delta_z', label: 'Δz(x_HI = 0.5) error', passes: ['xhi'],
        value: (arrays) => {
          const truth = arrays.history__history_z_xhi50_truth;
          const pred = arrays.history__history_z_xhi50_pred;
          if (!Array.isArray(truth) || !Array.isArray(pred)) return null;
          return pred.map((value, index) => (isNum(value) && isNum(truth[index]) ? value - truth[index] : null));
        },
      },
      {
        id: 'xbar', label: 'mean |Δx̄_HI|', passes: ['xhi'],
        value: (arrays) => {
          const truth = arrays.observable__observable_xbar_truth;
          const pred = arrays.observable__observable_xbar_pred;
          if (!Array.isArray(truth) || !Array.isArray(pred)) return null;
          return pred.map((row, sample) => {
            const reference = truth[sample];
            if (!Array.isArray(row) || !Array.isArray(reference)) return null;
            let sum = 0;
            let count = 0;
            for (let index = 0; index < Math.min(row.length, reference.length); index += 1) {
              if (isNum(row[index]) && isNum(reference[index])) {
                sum += Math.abs(row[index] - reference[index]);
                count += 1;
              }
            }
            return count ? sum / count : null;
          });
        },
      },
    ];

    function Cones({ t, manifest, source, selected, setSelected, onOpenRun }) {
      const passes = useMemo(() => {
        const found = new Set(manifest.runs.map((run) => run.pass).filter(Boolean));
        return ['xhi', 'tb'].filter((value) => found.has(value));
      }, [manifest]);
      const groups = useMemo(() => groupIds(manifest), [manifest]);
      const [pass, setPass] = useState(passes[0] || 'xhi');
      const [group, setGroup] = useState('all');
      const [xMetric, setXMetric] = useState('rmse');
      const [yMetric, setYMetric] = useState('r2');
      const [pinned, setPinned] = useState(null);
      const chartRef = useRef(null);

      useEffect(() => {
        if (!passes.includes(pass) && passes.length) setPass(passes[0]);
      }, [passes, pass]);
      useEffect(() => {
        setPinned(null);
      }, [sourceKey(source), manifest]);
      useEffect(() => {
        const available = CONE_METRICS.filter((metric) => metric.passes.includes(pass));
        if (!available.some((metric) => metric.id === xMetric)) setXMetric(available[0]?.id || 'rmse');
        if (!available.some((metric) => metric.id === yMetric)) setYMetric(available[1]?.id || available[0]?.id || 'r2');
      }, [pass, xMetric, yMetric]);

      const metricOptions = CONE_METRICS.filter((metric) => metric.passes.includes(pass));
      const runs = useMemo(() => selected.flatMap((key) => manifest.runs.filter((run) => run.model === key
        && run.pass === pass
        && !run.variant
        && (group === 'all' || run.group === group))), [selected, manifest, pass, group]);
      const ids = runs.map((run) => run.id);
      const curvesState = useRunCurves(source, ids);
      const xDefinition = metricOptions.find((metric) => metric.id === xMetric) || metricOptions[0];
      const yDefinition = metricOptions.find((metric) => metric.id === yMetric) || metricOptions[1] || metricOptions[0];

      const data = useMemo(() => {
        if (!xDefinition || !yDefinition) return { series: [], points: [] };
        const series = [];
        const allPoints = [];
        for (const model of manifest.models) {
          if (!selected.includes(model.key)) continue;
          const points = [];
          for (const run of runs.filter((item) => item.model === model.key)) {
            const arrays = stripArrays(curvesState.arrays[run.id], run.model);
            if (!arrays) continue;
            const xs = xDefinition.value(arrays);
            const ys = yDefinition.value(arrays);
            if (!Array.isArray(xs) || !Array.isArray(ys)) continue;
            const knowCones = manifest.groups[run.group]?.cones || [];
            const count = Math.min(xs.length, ys.length);
            for (let index = 0; index < count; index += 1) {
              const x = xs[index];
              const y = ys[index];
              if (!isNum(x) || !isNum(y)) continue;
              const cone = knowCones[index] !== undefined ? knowCones[index] : index + 1;
              const point = {
                x,
                y,
                meta: {
                  model: model.label,
                  modelKey: model.key,
                  cone,
                  group: run.group,
                  runId: run.id,
                  run,
                  xLabel: xDefinition.label,
                  yLabel: yDefinition.label,
                },
              };
              points.push(point);
              allPoints.push(point);
            }
          }
          if (points.length) {
            series.push({
              id: `cones-${model.key}`,
              label: model.label,
              color: model.color,
              dash: model.dash || '',
              kind: 'scatter',
              points,
              tooltip: (point) => {
                const meta = point.meta;
                return {
                  title: meta.model,
                  rows: [
                    ['cone', `${meta.cone}${meta.group ? ` · ${meta.group}` : ''}`],
                    [meta.xLabel, formatNumber(point.x)],
                    [meta.yLabel, formatNumber(point.y)],
                  ],
                };
              },
            });
          }
        }
        return { series, points: allPoints };
      }, [manifest, selected, runs, curvesState.arrays, xDefinition, yDefinition]);

      const handlePointClick = (seriesEntry, point) => {
        setPinned(point.meta);
      };

      const conesTitle = `Held-out cones: ${xDefinition?.label || ''} vs ${yDefinition?.label || ''}`;
      const conesGroup = group === 'all' ? 'All groups' : groupDisplay(group);
      const conesSubtitle = [conesGroup, passLabel(pass)].filter(Boolean).join(', ');
      const exportMeta = `${sourceLabel(source)}, ${selected.length} model${selected.length === 1 ? '' : 's'}, ${data.points.length} cones`;
      const exportFileName = ['eval21', 'cones', group, pass, xMetric, yMetric].filter(Boolean).join('-');

      return h('section', { className: 'e21-section' },
        h('div', { className: 'e21-controls e21-controls-wrap' },
          passes.length > 1 && h(Segmented, {
            value: pass,
            ariaLabel: t('pass'),
            options: passes.map((value) => ({ id: value, label: passLabel(value) })),
            onChange: setPass,
          }),
          h(Select, {
            label: t('group'),
            value: group,
            onChange: setGroup,
            options: [{ value: 'all', label: t('allGroups') }, ...groups.map((id) => ({ value: id, label: id }))],
          }),
          h('div', { className: 'e21-controls-spacer' }),
          h(Select, {
            label: t('xAxis'),
            value: xMetric,
            onChange: setXMetric,
            options: metricOptions.map((metric) => ({ value: metric.id, label: metric.label })),
          }),
          h(Select, {
            label: t('yAxis'),
            value: yMetric,
            onChange: setYMetric,
            options: metricOptions.map((metric) => ({ value: metric.id, label: metric.label })),
          }),
          h(ModelPicker, { models: manifest.models, selected, onChange: setSelected, t })),
        h('div', { className: 'e21-chart-card' },
          h('div', { className: 'e21-chart-head' },
            h('div', null,
              h('h3', null, conesTitle),
              h('p', null, `${conesSubtitle}${data.points.length ? `, ${data.points.length} points` : ''}`)),
            h('div', { className: 'e21-chart-meta' },
              h(ModelDots, { models: manifest.models, selected }),
              h('span', null, `${selected.length} model${selected.length === 1 ? '' : 's'}`),
              data.series.length > 0 && h('button', {
                type: 'button',
                className: 'e21-btn e21-export-btn',
                title: t('downloadJpg'),
                'aria-label': t('downloadJpg'),
                disabled: curvesState.loading,
                onClick: () => chartRef.current && chartRef.current.downloadJpeg(),
              }, h(IconDownload, { size: 13 }), 'JPG'))),
          curvesState.error && h('div', { className: 'e21-error' }, curvesState.error),
          curvesState.loading && h('div', { className: 'e21-status' }, t('loadingCurves')),
          selected.length === 0
            ? h('div', { className: 'e21-empty e21-empty-chart' }, h('p', null, t('selectModels')))
            : data.series.length === 0
              ? h('div', { className: 'e21-empty e21-empty-chart' }, h('p', null, curvesState.loading ? t('loadingCurves') : t('noData')))
              : h(Chart, {
                ref: chartRef,
                series: data.series,
                xLabel: xDefinition?.label || '',
                yLabel: yDefinition?.label || '',
                xType: 'linear',
                yType: 'linear',
                height: 400,
                empty: t('noData'),
                hint: t('zoomHint'),
                onPointClick: handlePointClick,
                exportTitle: conesTitle,
                exportSubtitle: conesSubtitle,
                exportMeta,
                exportFileName,
                exportNote: 'Each point is one held-out cone.',
              }),
          pinned && h('div', { className: 'e21-pinned' },
            h('div', { className: 'e21-pinned-body' },
              h('strong', null, pinned.model),
              h('span', { className: 'e21-sep' }, '·'),
              h('span', null, `cone ${pinned.cone}`),
              h('span', { className: 'e21-sep' }, '·'),
              h('span', null, pinned.group),
              h('span', { className: 'e21-sep' }, '·'),
              h('span', null, `${pinned.xLabel} ${formatNumber(pinned.x)}`),
              h('span', { className: 'e21-sep' }, '·'),
              h('span', null, `${pinned.yLabel} ${formatNumber(pinned.y)}`)),
            h('div', { className: 'e21-pinned-actions' },
              h('button', {
                type: 'button', className: 'e21-text-btn', onClick: () => setPinned(null),
              }, 'Clear'),
              h('button', {
                type: 'button', className: 'e21-text-btn', onClick: () => onOpenRun(pinned.run),
              }, 'Open in Charts'))),
          h('div', { className: 'e21-chart-foot' },
            h('span', null, 'Each point is one held-out cone. Hover a point to identify it; click to pin it.'),
            h('span', null, group === 'all' ? 'Combining groups.' : `Group ${group}.`))));
    }

    function FigureCard({ t, source, figure, onOpen }) {
      const [failed, setFailed] = useState(false);
      const url = imageUrl(source, figure.path);
      const isPdf = figure.ext === '.pdf';
      return h('button', {
        type: 'button',
        className: 'e21-figure-card',
        onClick: () => onOpen(figure),
        title: figure.path,
      },
      h('span', { className: 'e21-figure-thumb' },
        isPdf
          ? h('span', { className: 'e21-pdf-mark' }, 'PDF')
          : failed
            ? h('span', { className: 'e21-muted' }, 'Preview unavailable')
            : h('img', {
              src: url,
              alt: figure.name,
              loading: 'lazy',
              decoding: 'async',
              onError: () => setFailed(true),
            })),
      h('span', { className: 'e21-figure-caption' },
        h('span', { className: 'e21-figure-name' }, figure.name),
        h('span', { className: 'e21-figure-dir' }, figure.dir || 'root')));
    }

    function FigureViewer({ t, source, figure, onClose }) {
      const [scale, setScale] = useState(1);
      const [translate, setTranslate] = useState({ x: 0, y: 0 });
      const [dimensions, setDimensions] = useState(null);
      const [loaded, setLoaded] = useState(false);
      const [failed, setFailed] = useState(false);
      const stageRef = useRef(null);
      const dragRef = useRef(null);
      const scaleRef = useRef(1);
      const translateRef = useRef({ x: 0, y: 0 });
      const url = imageUrl(source, figure.path);

      useEffect(() => {
        scaleRef.current = scale;
        translateRef.current = translate;
      }, [scale, translate]);

      useEffect(() => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
        setDimensions(null);
        setLoaded(false);
        setFailed(false);
      }, [figure.path]);

      useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return undefined;
        const onWheel = (event) => {
          event.preventDefault();
          const current = scaleRef.current;
          const next = Math.max(1, Math.min(8, current * Math.exp(-event.deltaY * 0.0015)));
          if (next === current) return;
          const rect = stage.getBoundingClientRect();
          const dx = event.clientX - rect.left - rect.width / 2;
          const dy = event.clientY - rect.top - rect.height / 2;
          const ratio = next / current;
          const previous = translateRef.current;
          const shifted = next === 1
            ? { x: 0, y: 0 }
            : {
              x: dx * (1 - ratio) + previous.x * ratio,
              y: dy * (1 - ratio) + previous.y * ratio,
            };
          translateRef.current = shifted;
          scaleRef.current = next;
          setTranslate(shifted);
          setScale(next);
        };
        stage.addEventListener('wheel', onWheel, { passive: false });
        return () => stage.removeEventListener('wheel', onWheel);
      }, []);

      useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [onClose]);

      const startDrag = (event) => {
        if (scale <= 1) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { x: event.clientX, y: event.clientY, tx: translate.x, ty: translate.y, pointerId: event.pointerId };
      };
      const moveDrag = (event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        setTranslate({ x: drag.tx + event.clientX - drag.x, y: drag.ty + event.clientY - drag.y });
      };
      const endDrag = (event) => {
        if (dragRef.current && dragRef.current.pointerId === event.pointerId) dragRef.current = null;
      };
      const reset = () => {
        scaleRef.current = 1;
        translateRef.current = { x: 0, y: 0 };
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      };
      const zoomBy = (factor) => {
        const next = Math.max(1, Math.min(8, scale * factor));
        if (next === scale) return;
        if (next === 1) {
          reset();
          return;
        }
        scaleRef.current = next;
        setScale(next);
      };

      return h('div', { className: 'e21-viewer' },
        h('div', { className: 'e21-viewer-head' },
          h('button', { type: 'button', className: 'e21-btn e21-btn-ghost', onClick: onClose },
            h(IconArrowLeft, { size: 15 }), t('back')),
          h('div', { className: 'e21-viewer-title' },
            h('strong', null, figure.name),
            h('span', { className: 'e21-muted' }, dimensions ? `${dimensions.width} × ${dimensions.height}px` : figure.dir || 'root')),
          h('div', { className: 'e21-viewer-actions' },
            h('button', {
              type: 'button', className: 'e21-icon-btn', onClick: () => zoomBy(1 / 1.3),
              title: 'Zoom out', 'aria-label': 'Zoom out',
            }, '−'),
            h('span', { className: 'e21-zoom-value' }, `${Math.round(scale * 100)}%`),
            h('button', {
              type: 'button', className: 'e21-icon-btn', onClick: () => zoomBy(1.3),
              title: 'Zoom in', 'aria-label': 'Zoom in',
            }, '+'),
            h('button', { type: 'button', className: 'e21-text-btn', onClick: reset }, t('reset')),
            h('button', {
              type: 'button', className: 'e21-btn e21-btn-ghost', onClick: () => window.open(url, '_blank', 'noopener'),
            }, h(IconExternal, { size: 14 }), 'Open'))),
        h('div', {
          ref: stageRef,
          className: cx('e21-figure-stage', scale > 1 && 'is-zoomed'),
          onPointerDown: startDrag,
          onPointerMove: moveDrag,
          onPointerUp: endDrag,
          onPointerCancel: endDrag,
          onDoubleClick: reset,
        },
        !loaded && !failed && h('div', { className: 'e21-stage-status' }, 'Loading figure…'),
        failed
          ? h('div', { className: 'e21-stage-status' }, 'This figure could not be loaded.')
          : h('img', {
            src: url,
            alt: figure.name,
            draggable: false,
            style: { transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})` },
            onLoad: (event) => {
              setLoaded(true);
              setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
            },
            onError: () => setFailed(true),
          })),
        h('div', { className: 'e21-viewer-foot' }, t('zoomHint')));
    }

    function Figures({ t, manifest, source }) {
      const [directory, setDirectory] = useState('all');
      const [active, setActive] = useState(null);
      const figures = useMemo(() => {
        const all = manifest.figures || [];
        const pngStems = new Set(all.filter((figure) => figure.ext !== '.pdf').map((figure) => `${figure.dir}/${figure.name.replace(/\.[^.]+$/, '')}`));
        return all.filter((figure) => !(figure.ext === '.pdf' && pngStems.has(`${figure.dir}/${figure.name.replace(/\.pdf$/i, '')}`)));
      }, [manifest]);
      const directories = useMemo(() => {
        const found = new Set(figures.map((figure) => figure.dir).filter(Boolean));
        return [...found].sort((a, b) => a.localeCompare(b));
      }, [figures]);
      const visible = directory === 'all' ? figures : figures.filter((figure) => figure.dir === directory);
      useEffect(() => {
        if (active && !figures.some((figure) => figure.path === active.path)) setActive(null);
      }, [figures, active]);

      if (!figures.length) {
        return h('div', { className: 'e21-empty' },
          h('p', null, t('emptyFigures')),
          h('p', { className: 'e21-muted' }, t('emptyBody')));
      }

      if (active) {
        return h('section', { className: 'e21-section' }, h(FigureViewer, { t, source, figure: active, onClose: () => setActive(null) }));
      }

      return h('section', { className: 'e21-section' },
        h('div', { className: 'e21-controls' },
          h('div', { className: 'e21-chip-row' },
            h('button', {
              type: 'button', className: cx('e21-chip', directory === 'all' && 'is-active'), onClick: () => setDirectory('all'),
            }, `${t('figureAll')} · ${figures.length}`),
            directories.map((dir) => h('button', {
              key: dir, type: 'button', className: cx('e21-chip', directory === dir && 'is-active'),
              onClick: () => setDirectory(dir),
            }, `${dir} · ${figures.filter((figure) => figure.dir === dir).length}`))),
          h('div', { className: 'e21-controls-spacer' }),
          h('span', { className: 'e21-muted' }, t('pdfHint'))),
        h('div', { className: 'e21-gallery' },
          visible.map((figure) => h(FigureCard, {
            key: figure.path, t, source, figure, onOpen: (entry) => {
              if (entry.ext === '.pdf') {
                window.open(imageUrl(source, entry.path), '_blank', 'noopener');
              } else {
                setActive(entry);
              }
            },
          }))));
    }

    function App({ ctx, t }) {
      const [source, setSource] = useState(() => readLocalJson(LAST_KEY, null));
      const [manifest, setManifest] = useState(null);
      const [scanState, setScanState] = useState({ status: source ? 'loading' : 'idle', error: '' });
      const [editor, setEditor] = useState(null);
      const [defaults, setDefaults] = useState([]);
      const [recent, setRecent] = useState(() => readLocalJson(RECENT_KEY, []));
      const [tab, setTab] = useState('overview');
      const [pass, setPass] = useState('xhi');
      const [group, setGroup] = useState('all');
      const [selected, setSelected] = useState([]);
      const [chartPass, setChartPass] = useState('xhi');
      const [chartGroup, setChartGroup] = useState('');
      const [dataEpoch, setDataEpoch] = useState(0);
      const scanRef = useRef(null);
      const sourceRef = useRef(source);

      useEffect(() => { sourceRef.current = source; }, [source]);

      useEffect(() => {
        let cancelled = false;
        apiJson('defaults', {}, undefined)
          .then((data) => { if (!cancelled) setDefaults(Array.isArray(data.roots) ? data.roots : []); })
          .catch(() => {});
        return () => { cancelled = true; };
      }, []);

      const addRecent = useCallback((nextSource) => {
        setRecent((previous) => {
          const next = [nextSource, ...previous.filter((item) => sourceKey(item) !== sourceKey(nextSource))].slice(0, 6);
          writeLocalJson(RECENT_KEY, next);
          return next;
        });
      }, []);

      const scan = useCallback(async (target, refresh) => {
        if (!target) return false;
        if (scanRef.current) scanRef.current.abort();
        const controller = new AbortController();
        scanRef.current = controller;
        if (!sourceRef.current || sourceKey(sourceRef.current) !== sourceKey(target)) {
          setManifest(null);
        }
        sourceRef.current = target;
        setSource(target);
        setScanState({ status: 'loading', error: '' });
        try {
          const data = await apiJson('scan', {
            source: sourceQuery(target),
            refresh: refresh ? '1' : undefined,
          }, controller.signal);
          if (controller.signal.aborted) return false;
          setSource(target);
          writeLocalJson(LAST_KEY, target);
          addRecent(target);
          setManifest(data);
          setScanState({ status: 'ready', error: '' });
          setDataEpoch((value) => value + 1);
          setEditor(null);
          return true;
        } catch (scanError) {
          if (scanError.name === 'AbortError' || controller.signal.aborted) return false;
          setScanState({ status: 'error', error: scanError.message });
          return false;
        }
      }, [addRecent]);

      useEffect(() => {
        const last = readLocalJson(LAST_KEY, null);
        if (last && (last.kind === 'local' || last.kind === 'ssh')) {
          setSource(last);
          scan(last, false);
        }
        return () => { if (scanRef.current) scanRef.current.abort(); };
      }, [scan]);

      useEffect(() => {
        if (!manifest) return;
        setSelected((previous) => {
          const valid = previous.filter((key) => manifest.models.some((model) => model.key === key));
          if (valid.length) return valid;
          const preferred = ['reference', 'b8_pointwise'].filter((key) => manifest.models.some((model) => model.key === key));
          if (preferred.length) return preferred;
          return manifest.models.slice(0, 2).map((model) => model.key);
        });
        const availablePasses = ['xhi', 'tb'].filter((value) => manifest.runs.some((run) => run.pass === value));
        setPass((previous) => (availablePasses.includes(previous) ? previous : (availablePasses[0] || 'xhi')));
        const groups = groupIds(manifest);
        setGroup((previous) => (previous === 'all' || groups.includes(previous) ? previous : 'all'));
        setChartGroup((previous) => (groups.includes(previous) ? previous : (groups[0] || '')));
        setChartPass((previous) => (availablePasses.includes(previous) ? previous : (availablePasses[0] || 'xhi')));
      }, [manifest]);

      const tabs = useMemo(() => {
        if (!manifest) return [];
        const entries = [];
        if (manifest.runs.length) {
          entries.push({ id: 'overview', label: t('overview') });
          entries.push({ id: 'charts', label: t('charts') });
          entries.push({ id: 'cones', label: t('cones') });
        }
        if (manifest.figures.length) entries.push({ id: 'figures', label: t('figures') });
        return entries;
      }, [manifest, t]);

      useEffect(() => {
        if (!tabs.length) return;
        if (!tabs.some((entry) => entry.id === tab)) setTab(tabs[0].id);
      }, [tabs, tab]);

      const toggleModel = (key) => {
        setSelected((previous) => (previous.includes(key)
          ? previous.filter((value) => value !== key)
          : [...previous, key]));
      };

      const openCharts = () => {
        const groups = manifest ? groupIds(manifest) : [];
        setChartGroup(group === 'all' ? (groups[0] || '') : group);
        setChartPass(pass);
        setTab('charts');
      };

      const focusRun = (run) => {
        if (!run) return;
        setSelected((previous) => (previous.includes(run.model) ? previous : [...previous, run.model]));
        setChartGroup(run.group);
        setChartPass(run.pass);
        setTab('charts');
      };

      const openEditor = (mode) => {
        const requested = mode || (source && source.kind === 'ssh' ? 'ssh' : 'local');
        let initial = { kind: requested, root: '', host: '' };
        if (source && source.kind === requested) initial = source;
        setEditor(initial);
      };

      const removeRecent = (item) => {
        setRecent((previous) => {
          const next = previous.filter((entry) => sourceKey(entry) !== sourceKey(item));
          writeLocalJson(RECENT_KEY, next);
          return next;
        });
      };

      const editorInitial = editor || null;
      const busy = scanState.status === 'loading';
      const showWelcome = !source && !manifest;
      const showError = scanState.status === 'error';

      const body = [];
      if (showWelcome) {
        body.push(h(Welcome, {
          key: 'welcome',
          t,
          defaults,
          recent,
          busy,
          onOpen: (nextSource) => scan(nextSource, false),
          onEdit: openEditor,
          onRemove: removeRecent,
        }));
      } else if (busy && !manifest) {
        body.push(h('div', { key: 'loading', className: 'e21-loading' },
          h('span', { className: 'e21-spinner', 'aria-hidden': true }),
          h('p', null, t('loading')),
          source && h('p', { className: 'e21-muted' }, sourceTitle(source))));
      } else if (showError && !manifest) {
        body.push(h('div', { key: 'error', className: 'e21-empty' },
          h('p', { className: 'e21-error-title' }, t('error')),
          h('p', { className: 'e21-muted' }, scanState.error),
          h('div', { className: 'e21-empty-actions' },
            h('button', { type: 'button', className: 'e21-btn e21-btn-primary', onClick: () => scan(source, true) }, t('retry')),
            h('button', { type: 'button', className: 'e21-btn', onClick: () => openEditor() }, t('change')))));
      } else if (manifest) {
        if (!tabs.length) {
          body.push(h('div', { key: 'empty-folder', className: 'e21-empty' },
            h('p', null, t('emptyRuns')),
            h('p', { className: 'e21-muted' }, t('emptyBody')),
            h('div', { className: 'e21-empty-actions' },
              h('button', { type: 'button', className: 'e21-btn e21-btn-primary', onClick: () => openEditor() }, t('change')))));
          return h('div', { className: 'e21-page' },
            h('div', { className: 'e21-scroll' },
              h('div', { className: 'e21-content' },
                h('header', { className: 'e21-header' },
                  h('div', { className: 'e21-heading' },
                    h('div', null,
                      h('h1', null, t('panel')),
                      h('p', { className: 'e21-subtitle' }, t('subtitle'))),
                    source && h(SourceBar, { source, t, busy, onEdit: () => openEditor(), onRefresh: () => scan(source, true) }))),
                editor && h(SourceEditor, { key: 'editor', ctx, t, initial: editorInitial, onConnect: async (nextSource) => scan(nextSource, false), onClose: () => setEditor(null) }),
                body)));
        }
        body.push(h('div', { key: 'tabs', className: 'e21-tabs', role: 'tablist' },
          tabs.map((entry) => h('button', {
            key: entry.id,
            type: 'button',
            role: 'tab',
            'aria-selected': tab === entry.id,
            className: cx('e21-tab', tab === entry.id && 'is-active'),
            onClick: () => setTab(entry.id),
          }, entry.label))));
        if (tab === 'overview') {
          body.push(h(Overview, {
            key: 'overview', t, manifest, pass, setPass, group, setGroup, selected, toggleModel, openCharts,
          }));
        } else if (tab === 'charts') {
          body.push(h(Charts, {
            key: `charts-${chartPass}-${chartGroup}-${dataEpoch}`,
            t,
            manifest,
            source,
            selected,
            setSelected,
            initialPass: chartPass,
            initialGroup: chartGroup,
          }));
        } else if (tab === 'cones') {
          body.push(h(Cones, {
            key: `cones-${dataEpoch}`, t, manifest, source, selected, setSelected, onOpenRun: focusRun,
          }));
        } else if (tab === 'figures') {
          body.push(h(Figures, { key: 'figures', t, manifest, source }));
        }
      }

      return h('div', { className: 'e21-page' },
        h('div', { className: 'e21-scroll' },
          h('div', { className: 'e21-content' },
            h('header', { className: 'e21-header' },
              h('div', { className: 'e21-heading' },
                h('div', null,
                  h('h1', null, t('panel')),
                  h('p', { className: 'e21-subtitle' }, t('subtitle'))),
                source && h(SourceBar, {
                  source, t, busy, onEdit: () => openEditor(), onRefresh: () => scan(source, true),
                })),
              manifest && h('div', { className: 'e21-summary' },
                manifest.counts.models > 0 && h('span', null, `${manifest.counts.models} models`),
                manifest.counts.runs > 0 && h('span', null, `${manifest.counts.runs} runs`),
                manifest.counts.groups > 0 && h('span', null, `${manifest.counts.groups} groups`),
                manifest.counts.figures > 0 && h('span', null, `${manifest.counts.figures} figures`),
                h('span', { className: 'e21-summary-rule', 'aria-hidden': true }))),
            editor && h(SourceEditor, {
              key: 'editor',
              ctx,
              t,
              initial: editorInitial,
              onConnect: async (nextSource) => scan(nextSource, false),
              onClose: () => setEditor(null),
            }),
            showError && manifest && h('div', { className: 'e21-error e21-error-banner' }, scanState.error),
            body)));
    }

    const CSS = `
.e21-page {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  font-size: 14px;
  line-height: 1.5;
}
.e21-scroll {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
}
.e21-content {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 clamp(20px, 4vw, 44px) 56px;
}
.e21-header { padding-top: 28px; }
[data-platform="darwin"] .e21-header { padding-top: calc(28px + var(--dsh-frame-top-clearance, 0px)); }
.e21-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}
.e21-heading h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  line-height: 28px;
  letter-spacing: -0.01em;
}
.e21-subtitle {
  margin: 3px 0 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12.5px;
  line-height: 20px;
}
.e21-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding-bottom: 10px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
}
.e21-summary-rule { flex: 1; }
.e21-sourcebar { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.e21-source-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  max-width: min(62vw, 440px);
  padding: 0 12px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}
@media (hover: hover) { .e21-source-chip:hover { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); } }
.e21-source-dot { width: 6px; height: 6px; flex: none; border-radius: 50%; background: var(--dsw-alias-state-success-primary); }
.e21-source-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); }
.e21-source-kind { padding: 0 5px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: 4px; font-size: 10px; line-height: 16px; text-transform: uppercase; letter-spacing: .04em; }
.e21-source-change { flex: none; color: var(--dsw-alias-label-secondary); font-size: 11.5px; }
.e21-refresh { flex: none; }
.e21-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: none;
  padding: 0;
  border: 0.5px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 15px;
  cursor: pointer;
}
@media (hover: hover) { .e21-icon-btn:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); color: var(--dsw-alias-label-primary); } }
.e21-icon-btn:disabled { opacity: .4; cursor: default; }
.e21-tabs {
  display: flex;
  gap: 2px;
  margin: 8px 0 20px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
}
.e21-tab {
  position: relative;
  padding: 8px 10px 10px;
  border: 0;
  border-radius: 6px 6px 0 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
@media (hover: hover) { .e21-tab:hover { color: var(--dsw-alias-label-primary); background: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent); } }
.e21-tab.is-active { color: var(--dsw-alias-label-primary); }
.e21-tab.is-active::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-brand-primary);
}
.e21-section { display: flex; flex-direction: column; gap: 14px; }
.e21-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.e21-controls-wrap { row-gap: 8px; }
.e21-controls-spacer { flex: 1 1 auto; }
.e21-segmented {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-1);
}
.e21-segment {
  height: 26px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
@media (hover: hover) { .e21-segment:hover { color: var(--dsw-alias-label-primary); } }
.e21-segment.is-active {
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 0 0 0.5px var(--dsw-alias-border-l2);
}
.e21-select { display: inline-flex; align-items: center; gap: 6px; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.e21-select-label { white-space: nowrap; }
.e21-select-shell { position: relative; display: inline-flex; }
.e21-select select {
  appearance: none;
  height: 30px;
  padding: 0 26px 0 9px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  outline: none;
}
.e21-select select:focus-visible { border-color: var(--dsw-alias-brand-primary); }
.e21-select-chevron { position: absolute; right: 7px; top: 50%; display: flex; transform: translateY(-50%); color: var(--dsw-alias-label-secondary); pointer-events: none; }
.e21-models-picker { position: relative; }
.e21-models-picker > summary { list-style: none; }
.e21-models-picker > summary::-webkit-details-marker { display: none; }
.e21-summary-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 9px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.e21-summary-btn:hover { border-color: var(--dsw-alias-border-l2); }
.e21-summary-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-brand-primary); }
.e21-summary-chevron { display: flex; margin-left: 1px; }
.e21-models-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 30;
  min-width: 250px;
  max-width: 320px;
  max-height: 340px;
  overflow: auto;
  padding: 8px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 10px 28px rgba(0, 0, 0, .16);
}
.e21-models-actions { display: flex; gap: 8px; padding: 2px 6px 8px; border-bottom: 0.5px solid var(--dsw-alias-border-l1); margin-bottom: 4px; }
.e21-model-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  border-radius: 6px;
  color: var(--dsw-alias-label-primary);
  font-size: 12.5px;
  cursor: pointer;
}
@media (hover: hover) { .e21-model-row:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent); } }
.e21-model-row input { accent-color: var(--dsw-alias-brand-primary); }
.e21-model-swatch { width: 8px; height: 8px; flex: none; border-radius: 2px; }
.e21-model-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.e21-model-dots { display: inline-flex; align-items: center; gap: 3px; }
.e21-model-dot { width: 6px; height: 6px; border-radius: 50%; }
.e21-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  padding: 0 11px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
@media (hover: hover) { .e21-btn:hover { background: var(--dsw-alias-bg-layer-2); } }
.e21-btn:disabled { opacity: .45; cursor: default; }
.e21-btn-primary {
  border-color: transparent;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary-foreground, #fff);
}
@media (hover: hover) { .e21-btn-primary:hover { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 88%, var(--dsw-alias-label-primary)); } }
.e21-btn-ghost { border-color: transparent; background: transparent; color: var(--dsw-alias-label-secondary); }
.e21-export-btn { height: 26px; padding: 0 8px; gap: 4px; font-size: 11px; }
.e21-export-btn svg { flex: none; color: var(--dsw-alias-label-secondary); }
.e21-export-error { margin-top: 6px; }
.e21-text-btn {
  padding: 3px 6px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
}
@media (hover: hover) { .e21-text-btn:hover { color: var(--dsw-alias-label-primary); background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent); } }
.e21-chip-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.e21-chip {
  height: 26px;
  padding: 0 9px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
}
.e21-chip.is-active { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.e21-welcome { display: flex; flex-direction: column; gap: 26px; padding-top: 10px; }
.e21-hero {
  max-width: 760px;
  padding: 28px 28px 26px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 16px;
  background: var(--dsw-alias-bg-layer-1);
}
.e21-hero-mark { color: var(--dsw-alias-brand-primary); margin-bottom: 10px; }
.e21-hero h2 { margin: 0 0 8px; font-size: 18px; font-weight: 500; line-height: 26px; }
.e21-hero p { max-width: 620px; margin: 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 1.7; }
.e21-hero-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.e21-suggestions h3 {
  margin: 0 0 8px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.e21-path-row {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
}
@media (hover: hover) { .e21-path-row:hover { border-color: var(--dsw-alias-border-l2); } }
.e21-path-row > svg { flex: none; color: var(--dsw-alias-label-secondary); }
.e21-path-label { flex: none; font-weight: 500; }
.e21-path-value { min-width: 0; margin-left: auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-secondary); font-size: 11.5px; }
.e21-recent-row { display: flex; gap: 6px; align-items: center; }
.e21-recent-row .e21-path-row { flex: 1; }
.e21-recent-remove { flex: none; }
.e21-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 14px 0 20px;
  padding: 16px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1);
}
.e21-editor-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.e21-editor-title { font-size: 13px; font-weight: 500; }
.e21-editor-body { display: flex; flex-direction: column; gap: 10px; }
.e21-field { display: flex; flex-direction: column; gap: 5px; color: var(--dsw-alias-label-secondary); font-size: 11.5px; }
.e21-field input {
  height: 34px;
  padding: 0 10px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  outline: none;
}
.e21-field input:focus { border-color: var(--dsw-alias-brand-primary); }
.e21-input-row { display: flex; gap: 8px; align-items: center; }
.e21-input-row input { flex: 1; min-width: 0; }
.e21-editor-actions { display: flex; justify-content: flex-end; gap: 8px; }
.e21-hint { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 11.5px; line-height: 1.55; }
.e21-browser { padding: 8px; border: 0.5px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-base); }
.e21-browser-head { display: flex; align-items: center; gap: 8px; min-width: 0; color: var(--dsw-alias-label-secondary); font-size: 11.5px; }
.e21-browser-path { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.e21-browser-list { max-height: 220px; overflow: auto; padding: 6px 0; }
.e21-browser-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
@media (hover: hover) { .e21-browser-row:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent); } }
.e21-browser-use { align-self: flex-end; margin-top: 4px; }
.e21-editor-preview { color: var(--dsw-alias-label-secondary); font-size: 11px; overflow-wrap: anywhere; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.e21-error { color: var(--dsw-alias-state-error-primary); font-size: 12px; line-height: 1.55; }
.e21-error-title { color: var(--dsw-alias-label-primary); font-weight: 500; margin: 0; }
.e21-error-banner {
  margin-bottom: 12px;
  padding: 8px 10px;
  border: 0.5px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 7%, transparent);
}
.e21-loading { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 72px 20px; color: var(--dsw-alias-label-secondary); font-size: 12.5px; }
.e21-spinner {
  width: 16px;
  height: 16px;
  border: 1.5px solid color-mix(in srgb, var(--dsw-alias-label-primary) 20%, transparent);
  border-top-color: var(--dsw-alias-brand-primary);
  border-radius: 50%;
  animation: e21-spin .8s linear infinite;
}
@keyframes e21-spin { to { transform: rotate(360deg); } }
.e21-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 48px 20px; color: var(--dsw-alias-label-secondary); font-size: 13px; text-align: center; }
.e21-empty p { margin: 0; }
.e21-empty-actions { display: flex; gap: 8px; margin-top: 12px; }
.e21-empty-chart { min-height: 320px; justify-content: center; }
.e21-muted { color: var(--dsw-alias-label-secondary); }
.e21-scorecard { overflow-x: auto; border: 0.5px solid var(--dsw-alias-border-l1); border-radius: 14px; background: var(--dsw-alias-bg-layer-1); }
.e21-table { width: 100%; min-width: 880px; border-collapse: collapse; font-size: 12.5px; }
.e21-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 10px 12px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
}
.e21-table th:first-child { text-align: left; }
.e21-th-label { display: block; color: var(--dsw-alias-label-primary); font-size: 12px; }
.e21-th-meta { display: flex; justify-content: flex-end; gap: 5px; margin-top: 2px; font-size: 10px; color: var(--dsw-alias-label-secondary); }
.e21-th-dir { opacity: .85; }
.e21-table td { padding: 8px 12px; border-bottom: 0.5px solid color-mix(in srgb, var(--dsw-alias-border-l1) 65%, transparent); vertical-align: middle; }
.e21-table tbody tr:last-child td { border-bottom: 0; }
.e21-table tbody tr { cursor: pointer; }
.e21-table tbody tr:focus-visible { outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary)); outline-offset: -2px; }
@media (hover: hover) { .e21-table tbody tr:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent); } }
.e21-table tbody tr.is-selected { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 7%, transparent); }
.e21-td-model { white-space: nowrap; }
.e21-row-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-right: 7px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 4px;
  vertical-align: middle;
  color: var(--dsw-alias-label-primary-foreground, #fff);
  font-size: 9px;
  line-height: 1;
}
tr.is-selected .e21-row-check { border-color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-brand-primary); }
.e21-row-swatch { display: inline-block; width: 8px; height: 8px; margin-right: 7px; border-radius: 2px; vertical-align: middle; }
.e21-row-name { font-weight: 500; }
.e21-td-metric { min-width: 86px; text-align: right; font-variant-numeric: tabular-nums; }
.e21-value { display: block; position: relative; z-index: 1; }
.e21-bar { display: block; height: 2px; margin-top: 4px; overflow: hidden; border-radius: 1px; background: color-mix(in srgb, var(--dsw-alias-border-l1) 55%, transparent); }
.e21-bar-fill { display: block; height: 100%; border-radius: 1px; opacity: .78; }
.e21-scorecard-foot { display: flex; justify-content: space-between; gap: 16px; padding: 0 4px; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.e21-selected-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
}
.e21-selected-strip .e21-text-btn { margin-left: auto; }
.e21-chart-card { position: relative; padding: 14px 16px 10px; border: 0.5px solid var(--dsw-alias-border-l1); border-radius: 14px; background: var(--dsw-alias-bg-layer-1); }
.e21-chart-head { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 4px; }
.e21-chart-head h3 { margin: 0; font-size: 13.5px; font-weight: 500; line-height: 20px; }
.e21-chart-head p { margin: 2px 0 0; color: var(--dsw-alias-label-secondary); font-size: 11.5px; line-height: 18px; }
.e21-chart-meta { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; flex: none; color: var(--dsw-alias-label-secondary); font-size: 11px; white-space: nowrap; }
.e21-chart-wrap { position: relative; }
.e21-legend { display: flex; flex-wrap: wrap; gap: 2px 8px; padding: 4px 0 0; }
.e21-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
@media (hover: hover) { .e21-legend-item:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent); color: var(--dsw-alias-label-primary); } }
.e21-legend-item.is-off { opacity: .35; }
.e21-legend-swatch { display: inline-block; width: 14px; height: 2px; border-top: 1.5px solid currentColor; background: currentColor; }
.e21-legend-swatch.is-dot { width: 7px; height: 7px; border: 0; border-radius: 50%; }
.e21-legend-label { white-space: nowrap; }
.e21-chart { position: relative; width: 100%; user-select: none; }
.e21-grid line { stroke: var(--dsw-alias-border-l1); stroke-width: 0.5; opacity: .72; }
.e21-axes text { fill: var(--dsw-alias-label-secondary); font-size: 10.5px; font-family: inherit; }
.e21-axis-line { stroke: var(--dsw-alias-border-l2); stroke-width: 0.5; }
.e21-axis-label { fill: var(--dsw-alias-label-secondary); font-size: 11px; font-family: inherit; }
.e21-reference-line { stroke: var(--dsw-alias-border-l2); stroke-width: 0.8; opacity: .8; }
.e21-reference-label { fill: var(--dsw-alias-label-secondary); font-size: 9.5px; font-family: inherit; }
.e21-chart-empty { position: absolute; left: 58px; right: 16px; top: 42px; bottom: 42px; display: flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-secondary); font-size: 12px; pointer-events: none; }
.e21-tooltip {
  position: absolute;
  z-index: 10;
  padding: 8px 10px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .16);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 1.6;
  pointer-events: none;
}
.e21-tooltip-title { margin-bottom: 3px; overflow: hidden; color: var(--dsw-alias-label-primary); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.e21-tooltip-row { display: flex; justify-content: space-between; gap: 14px; }
.e21-tooltip-row span:last-child { color: var(--dsw-alias-label-primary); font-variant-numeric: tabular-nums; }
.e21-chart-hint { margin-top: 2px; color: var(--dsw-alias-label-secondary); font-size: 10px; }
.e21-chart-controls {
  position: absolute;
  right: 6px;
  top: 6px;
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 2px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 82%, transparent);
}
.e21-chart-controls .e21-icon-btn { width: 24px; height: 24px; font-size: 14px; }
.e21-chart-controls .e21-text-btn { font-size: 10.5px; }
.e21-chart-foot { display: flex; justify-content: space-between; gap: 16px; margin-top: 6px; padding-top: 8px; border-top: 0.5px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); font-size: 10.5px; }
.e21-status { padding: 4px 0; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.e21-pinned {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
.e21-pinned-body { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.e21-pinned-body strong { color: var(--dsw-alias-label-primary); font-weight: 500; }
.e21-pinned-actions { display: flex; gap: 4px; }
.e21-sep { opacity: .4; }
.e21-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
.e21-figure-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  padding: 6px;
  overflow: hidden;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color .15s, transform .15s;
}
@media (hover: hover) { .e21-figure-card:hover { border-color: var(--dsw-alias-border-l2); transform: translateY(-1px); } }
.e21-figure-thumb { display: flex; align-items: center; justify-content: center; height: 150px; overflow: hidden; border-radius: 8px; background: var(--dsw-alias-bg-base); }
.e21-figure-thumb img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
.e21-figure-caption { display: flex; flex-direction: column; gap: 1px; min-width: 0; padding: 0 4px 3px; }
.e21-figure-name { overflow: hidden; color: var(--dsw-alias-label-primary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.e21-figure-dir { overflow: hidden; color: var(--dsw-alias-label-secondary); font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }
.e21-pdf-mark { padding: 4px 8px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: 6px; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.e21-viewer { display: flex; flex-direction: column; gap: 8px; }
.e21-viewer-head { display: flex; align-items: center; gap: 12px; min-width: 0; }
.e21-viewer-title { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.e21-viewer-title strong { overflow: hidden; font-size: 13px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.e21-viewer-title .e21-muted { overflow: hidden; font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }
.e21-viewer-actions { display: flex; align-items: center; gap: 3px; flex: none; }
.e21-zoom-value { min-width: 36px; color: var(--dsw-alias-label-secondary); font-size: 10.5px; font-variant-numeric: tabular-nums; text-align: center; }
.e21-figure-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: min(68vh, 700px);
  overflow: hidden;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-2);
  cursor: zoom-in;
  touch-action: none;
}
.e21-figure-stage.is-zoomed { cursor: grab; }
.e21-figure-stage img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; transform-origin: center; user-select: none; }
.e21-stage-status { color: var(--dsw-alias-label-secondary); font-size: 12px; }
.e21-viewer-foot { color: var(--dsw-alias-label-secondary); font-size: 10.5px; text-align: center; }
.e21-page :focus-visible { outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary)); outline-offset: 2px; }
@media (max-width: 760px) {
  .e21-content { padding-inline: 20px; }
  .e21-heading { flex-direction: column; }
  .e21-gallery { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .e21-chart-card { padding: 12px 12px 8px; }
  .e21-scorecard-foot { flex-direction: column; gap: 3px; }
  .e21-chart-head { flex-direction: column; gap: 4px; }
}
@media (prefers-reduced-motion: reduce) {
  .e21-spinner { animation: none; }
  .e21-figure-card { transition: none; }
}
`;

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { en: EN, de: DE }), 'eval21: dictionary');
      ctx.effect(() => {
        const tag = document.createElement('style');
        tag.dataset.plugin = '@local/dsh-eval21-explorer';
        tag.dataset.pluginCss = '@local/dsh-eval21-explorer/style';
        tag.textContent = CSS;
        document.head.appendChild(tag);
        return () => tag.remove();
      }, 'eval21: styles');
      const t = ctx.locale.bind(NS);
      const Main = () => h(App, { ctx, t });
      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
      }, Main));
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 5,
        locale: NS,
        label: () => t('panel'),
      }, ExplorerIcon));
    }

    return { inject: ['slots', 'locale'], apply };
  },
});
