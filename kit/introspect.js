// ff-llm primitive: introspect — describe any live object, module, or path inside Firefox.
//
// Runs in Firefox's parent process, in the kit's own sandbox — an
// invisibleToDebugger system-principal sandbox no Debugger can enumerate, so the
// kit hooks the chrome globals without seeing itself. The server's
// ensure_privileged_kit tool loads every kit file into it and anchors the result
// at `Cu.getGlobalForObject(Services).__ffllm`, which roots it against GC and
// lets any chrome realm reach it; the reuse guard keeps one kit per process, so
// re-running the tool reloads the files in place — the whole edit-reload cycle.
//
// Every entry point that answers through the channel is async — await every
// `__ffllm` call, always. The exceptions are in-process helpers that must stay
// callable from inside a sync extractor: inspect and preview.
//
// await describe(target, opts) -> JSON string
//   target  a value, or a path string. "resource://…" (or any "://") is imported
//           as a module; a dotted path like "gBrowser.selectedTab" resolves first
//           against the kit realm (Services, __ffllm), then the most recent
//           browser window (gBrowser, window, document).
//           DevTools modules are not ESM — reach them through their loader:
//           importESModule("resource://devtools/shared/loader/Loader.sys.mjs")
//             .require("devtools/client/framework/devtools").gDevTools
//           (devtools-browser exports gDevToolsBrowser, the wrong module;
//           validated Nightly 155).
//   opts    { proto: true,   walk the prototype chain, not just own props
//             values: true,  preview data props and invoke getters
//             deep: false,   include Object.prototype boilerplate
//             qi: false,     QI-test against every Ci interface (~1200 probes)
//             root: obj,     for a string path, the object to resolve it from —
//                            overrides the kit-realm-then-window default
//             max: 200 }     member cap
//   A function target additionally carries `src`, its full source; sig() in
//   member listings stops at the signature.
//
// inspect(target, opts) -> the same result as a live object, not serialized, for
//   callers inside the process. A tap's extractor is an inspect call: it has the
//   live subject for the length of one notification and nothing after.
//
// await write(path, data) -> JSON string  for results too big to spend context on
(() => {
  const S = (globalThis.__ffllm ??= { installedAt: Date.now() });
  const Ci = globalThis.Ci || Components.interfaces;

  const CLASS = (v) => Object.prototype.toString.call(v).slice(8, -1);
  const kind = (v) => (v === null ? 'null' : typeof v === 'object' ? CLASS(v) : typeof v);

  // Real param names when the function is JS; "[native code]" marks the C++ edge.
  const sig = (fn) => {
    let src = '';
    try { src = Function.prototype.toString.call(fn); } catch (e) { }
    const brace = src.indexOf('{');
    const head = src.slice(0, brace > 0 ? brace + 1 : 200).replace(/\s+/g, ' ').trim();
    if (!head) return `${fn.name || '?'}/${fn.length}`;
    return head.length > 200 ? head.slice(0, 200) + '…' : head;
  };

  const preview = (v) => {
    const k = kind(v);
    switch (k) {
      case 'undefined': case 'null': return k;
      case 'number': case 'boolean': case 'bigint': return String(v);
      case 'symbol': return v.toString();
      case 'string': return v.length > 100 ? JSON.stringify(v.slice(0, 100)) + '…' : JSON.stringify(v);
      case 'function': return sig(v);
      case 'Array': return `Array(${v.length})`;
      case 'Map': case 'Set': return `${k}(${v.size})`;
    }
    try { return `[${k} ${v.constructor && v.constructor.name || ''}]`.replace(' ]', ']'); }
    catch (e) { return `[${k}]`; }
  };

  const inspect = (target, opts = {}) => {
    const o = { proto: true, values: true, deep: false, qi: false, max: 200, ...opts };
    let obj = target, path = null;

    if (typeof target === 'string') {
      path = target;
      if (target.includes('://')) {
        obj = ChromeUtils.importESModule(target);
      } else {
        const segs = target.split('.');
        // A string path is realm-relative, and the kit runs in its own sandbox —
        // nobody's namespace. Resolve the first segment against the kit realm
        // (where __ffllm and Services live), then the most recent browser window
        // (where gBrowser, window, document live). opts.root forces a start
        // object you already hold.
        const roots = o.root !== undefined
          ? [o.root]
          : [globalThis, Services.wm.getMostRecentWindow('navigator:browser')].filter((r) => r != null);
        const root = roots.find((r) => r[segs[0]] !== undefined) ?? roots[0];
        obj = root == null ? undefined : segs.reduce((x, k) => (x == null ? x : x[k]), root);
      }
    }

    const res = { path, kind: kind(obj), members: [], truncated: false };
    try { res.ctor = obj != null && obj.constructor && obj.constructor.name; } catch (e) { }
    if (obj == null || (typeof obj !== 'object' && typeof obj !== 'function')) {
      res.value = preview(obj);
      return res;
    }

    if (typeof obj === 'function') {
      let src = '';
      try { src = Function.prototype.toString.call(obj); } catch (e) { }
      if (src) res.src = src.length > 2000 ? src.slice(0, 2000) + '…' : src;
    }

    if (o.qi && typeof obj.QueryInterface === 'function') {
      res.interfaces = [];
      for (const name of Object.keys(Ci)) {
        try { obj.QueryInterface(Ci[name]); res.interfaces.push(name); } catch (e) { }
      }
    }

    const seen = new Set();
    let cur = obj, level = 0;
    while (cur != null && level < (o.proto ? 12 : 1) && !res.truncated) {
      // Object.prototype is noise the agent already knows; it never carries signal.
      if (!o.deep && cur === Object.prototype) break;
      let from = 'own';
      if (level > 0) {
        let n = '';
        try { n = (cur.constructor && cur.constructor.name) || CLASS(cur); } catch (e) { n = CLASS(cur); }
        from = `proto${level}:${n}`;
      }
      for (const key of Reflect.ownKeys(cur)) {
        const name = String(key);
        if (seen.has(name)) continue;
        seen.add(name);
        if (res.members.length >= o.max) { res.truncated = true; break; }
        const e = { name, from };
        let d;
        try { d = Object.getOwnPropertyDescriptor(cur, key); } catch (err) { e.kind = 'opaque'; res.members.push(e); continue; }
        if (d.get) {
          e.kind = 'getter';
          if (o.values) { try { e.value = preview(d.get.call(obj)); } catch (err) { e.value = 'throws: ' + err; } }
        } else if (d.set) {
          e.kind = 'setter';
        } else if (typeof d.value === 'function') {
          e.kind = 'method'; e.arity = d.value.length; e.sig = sig(d.value);
        } else {
          // type is recorded even when values is off, so "descend into this one"
          // stays answerable without previewing every property.
          e.kind = 'data'; e.type = kind(d.value);
          if (o.values) e.value = preview(d.value);
        }
        res.members.push(e);
      }
      try { cur = Object.getPrototypeOf(cur); } catch (err) { break; }
      level++;
    }
    return res;
  };

  // Kept separate from describe rather than a describe({out}) option: it composes
  // with drains and future primitives, and describe stays synchronous.
  const write = async (path, data) => {
    const s = typeof data === 'string' ? data : JSON.stringify(data);
    await IOUtils.writeUTF8(path, s);
    return JSON.stringify({ path, bytes: s.length });
  };

  S.inspect = inspect;
  S.describe = async (target, opts) => JSON.stringify(inspect(target, opts));
  S.preview = preview;
  S.write = write;
})();
