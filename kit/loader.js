// ff-llm loader: how the kit enters Firefox — creates the sandbox and evaluates the kit sources.
//
// Not a primitive: this whole file is the functionDeclaration of the BiDi
// script.callFunction that ensure_privileged_kit sends, with the other kit
// files' sources as its JSON argument. It ships beside them so the code that
// creates the sandbox is as readable as the code that runs inside it.
//
// Evaluates every kit source, shipped in as JSON, into one invisibleToDebugger
// system-principal sandbox anchored on the shared system global so it outlives
// the window that loaded it. The reuse branch evaluates into the existing
// sandbox, keeping one kit per process; each file is an IIFE, so re-evaluating
// replaces its exports in place and leaves live hooks and buffers alone.
// The sources arrive over the wire and have no url, so filename restrictions are
// off: the alternative is claiming a resource:// uri that resolves nowhere, or
// omitting the name and attributing every kit stack frame to browser.xhtml.
(json) => {
  const files = JSON.parse(json);
  const anchor = Cu.getGlobalForObject(Services);
  const reused = !!anchor.__ffllm;
  const sb = reused
    ? Cu.getGlobalForObject(anchor.__ffllm.hook)
    : Cu.Sandbox(Cc['@mozilla.org/systemprincipal;1'].createInstance(Ci.nsIPrincipal), {
        invisibleToDebugger: true, freshCompartment: true, sandboxName: 'ffllm-kit',
        wantGlobalProperties: ['ChromeUtils', 'IOUtils', 'TextDecoder'] });
  if (!reused) {
    const T = ChromeUtils.importESModule('resource://gre/modules/Timer.sys.mjs');
    sb.setTimeout = T.setTimeout; sb.clearTimeout = T.clearTimeout;
  }
  for (const f of files)
    Cu.evalInSandbox(f.source, sb, null, 'ffllm/' + f.name, 1, false);
  // Retained so the parent can re-ship the kit into child processes without
  // the sources ever crossing the agent channel again.
  sb.__ffllm._sources = files;
  anchor.__ffllm = sb.__ffllm;
  return JSON.stringify({ reused, loaded: files.map(f => f.name),
                          api: Object.keys(sb.__ffllm) });
}
