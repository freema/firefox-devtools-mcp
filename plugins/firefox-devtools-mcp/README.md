# Firefox DevTools MCP — community packaging

Maintained by Tomas Grasl (freema). This plugin packages Mozilla Firefox DevTools MCP 0.10.6 for Claude Code and Cowork. The underlying server is maintained in [mozilla/firefox-devtools-mcp](https://github.com/mozilla/firefox-devtools-mcp). This community package is not an official Mozilla listing. Original licenses and attribution remain unchanged.

Requires Node.js 20.19 or newer and a local Firefox installation. It launches the pinned npm package with an automation profile and the developer tool preset. It provides navigation, page interaction, screenshots, console and network inspection, and debugging. Its local MCP server does not run on claude.ai.

## Privacy policy

This policy covers the community packaging maintained by Tomas Grasl. The packaging maintainer operates no backend receiving browser content from this plugin.

The MCP server runs on your computer. Requested tools can read pages, forms, console messages, network activity and screenshots, including personal data present there. Results go to your MCP client, such as Claude, which processes them under its own policies. Browser actions can send data to websites you navigate to or submit forms to.

Profiles, downloads, saved screenshots and exported tool output can persist locally until you remove them. This packaging enforces no fixed retention period. You control those files and profiles. Use a dedicated automation profile.

Launching the package contacts npm; dependencies may obtain browser-driver components. Browser traffic goes to the destinations you use. This packaging adds no analytics or collection endpoint. See [upstream security documentation](https://github.com/mozilla/firefox-devtools-mcp/blob/main/SECURITY.md) for server behavior and security considerations.

For packaging questions or privacy requests, [open an issue](https://github.com/freema/firefox-devtools-mcp/issues). Never put private browser content, credentials or personal data in a public issue.

[Privacy](https://github.com/freema/firefox-devtools-mcp/blob/main/plugins/firefox-devtools-mcp/README.md#privacy-policy)
