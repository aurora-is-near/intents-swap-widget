/**
 * The inspector's own fixed, neutral look: no theme tokens, so no edit can
 * make it unreadable.
 */
export const INSPECTOR_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.panel {
  position: fixed; top: 12px; right: 12px; width: 360px;
  max-height: calc(100vh - 24px); overflow: auto;
  background: #151515; color: #e6e6e6; color-scheme: dark;
  font: 12px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif;
  border-radius: 10px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
}
.panel.left { right: auto; left: 12px; }
header {
  position: sticky; top: 0; z-index: 1;
  display: flex; align-items: center; gap: 6px;
  padding: 9px 12px; background: #151515; border-bottom: 1px solid #262626;
}
h2 { flex: 1; margin: 0; font-size: 12px; font-weight: 600; }
h3 {
  margin: 0 0 6px; color: #8a8a8a; font-size: 10.5px; font-weight: 600;
  letter-spacing: 0.05em; text-transform: uppercase;
}
section { padding: 10px 12px; border-bottom: 1px solid #222; }
p { margin: 0 0 8px; color: #a3a3a3; }
.badge {
  padding: 1px 6px; border-radius: 4px; background: #262626; color: #bdbdbd;
  font: 10.5px ui-monospace, SFMono-Regular, Menlo, monospace;
}
button {
  padding: 3px 8px; border: 0; border-radius: 6px; background: #2a2a2a;
  color: inherit; font: inherit; cursor: pointer;
}
button:hover { background: #363636; }
button.icon { padding: 0 4px; background: none; color: #8a8a8a; }
button.icon:hover { color: #e6e6e6; }
button.primary { background: #e6e6e6; color: #151515; font-weight: 600; }
button.primary:hover { background: #fff; }
.mono, .name, .source, .num, input[type='text'], select, pre {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.row {
  display: grid; grid-template-columns: 92px minmax(0, 1fr) 84px 14px;
  align-items: center; gap: 6px; min-height: 27px;
}
.name { overflow: hidden; color: #b5b5b5; font-size: 11px; text-overflow: ellipsis; }
.control { display: flex; align-items: center; gap: 6px; min-width: 0; }
.source {
  overflow: hidden; color: #707070; font-size: 10px;
  text-overflow: ellipsis; white-space: nowrap;
}
.source.edit { color: #f5a524; }
input[type='text'], select {
  flex: 1; min-width: 0; height: 22px; padding: 0 6px;
  border: 1px solid #2f2f2f; border-radius: 5px; background: #1d1d1d;
  color: #e6e6e6; font-size: 11px;
}
input[type='text']::placeholder { color: #6b6b6b; }
input[type='text'].invalid { border-color: #b4483c; }
input[type='color'] {
  flex: none; width: 22px; height: 22px; padding: 0; border: 0;
  background: none; cursor: pointer;
}
input[type='color']::-webkit-color-swatch-wrapper { padding: 0; }
input[type='color']::-webkit-color-swatch {
  border: 0; border-radius: 5px; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}
input[type='range'] { flex: 1; min-width: 0; accent-color: #d4d4d4; }
.num { flex: none; width: 44px; color: #cfcfcf; font-size: 11px; text-align: right; }
.swatch {
  flex: none; width: 14px; height: 14px; border-radius: 3px;
  background:
    linear-gradient(var(--swatch), var(--swatch)),
    conic-gradient(#555 25%, #888 0 50%, #555 0 75%, #888 0) 0 0 / 8px 8px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}
.check {
  display: grid; grid-template-columns: 92px minmax(0, 1fr) auto;
  align-items: center; gap: 6px; min-height: 22px;
}
.ratios { display: flex; gap: 8px; font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; }
.ok { color: #5fd38d; }
.bad { color: #f2776a; }
.min { color: #707070; font-size: 10.5px; }
pre {
  max-height: 220px; margin: 0 0 8px; padding: 8px; overflow: auto;
  border-radius: 6px; background: #0d0d0d; color: #d0d0d0;
  font-size: 11px; line-height: 1.45; white-space: pre-wrap; user-select: text;
}
.actions { display: flex; align-items: center; gap: 8px; }
details { padding: 10px 12px; }
summary { color: #8a8a8a; font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer; }
.token {
  display: grid; grid-template-columns: 128px 14px minmax(0, 1fr);
  align-items: center; gap: 6px; min-height: 20px; font-size: 11px;
}
.token .value { overflow: hidden; color: #cfcfcf; text-overflow: ellipsis; white-space: nowrap; }
`;
