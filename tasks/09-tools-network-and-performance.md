Title: 09 – Tools: Síť a výkon (iterace)

Cíl

- Základní podpora sítě (výpis požadavků, detail požadavku). Výkonnostní trace jako iterace s omezeními.

Tools

- `list_network_requests` – výpis požadavků (filtry, stránkování – inspirováno `old/mcp_dev_tool_chrome/src/McpResponse.ts` paginací)
- `get_network_request` – detail podle URL (headers, body – v rozsahu, který RDP dovolí)
- `performance_start_trace` / `performance_stop_trace` – MVP: pokud implementace přes RDP není k dispozici, vrátit „not supported“ s hintem; alternativně jednoduché Navigation Timing metriky

Poznámky

- Firefox RDP používá odlišný formát pro trace než Chrome; „insights“ nejsou 1:1. Transparentně uvést do odpovědi a dokumentace.

Reference

- `old/mcp_dev_tool_chrome/src/tools/network.ts`
- `old/mcp_dev_tool_chrome/src/McpResponse.ts` (sekce Network requests, pagination, headers)
- `old/mcp_dev_tool_chrome/docs/tool-reference.md` – Network & Performance

Akceptační kritéria

- Síť: přinejmenším seznam URL + status + metoda, detail hlaviček u vybraného požadavku (pokud dostupné).
- Výkon: MVP bezpečně indikuje „not supported“ nebo vrátí jednoduché metriky (NavigationTiming) s jasným popisem.
