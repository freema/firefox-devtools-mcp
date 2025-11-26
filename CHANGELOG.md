# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2025-11-26

### Added
- Token limit safeguards to prevent context overflow in AI assistant responses
- Firefox connection health check with user-friendly error messages for AI assistants
- Navigate to localhost development server support

### Fixed
- CI workflow: build step now runs before tests to ensure snapshot bundle is available
- Firefox DevTools connection error handling with improved diagnostics
- Snapshot bundle path resolution for npx execution

### Changed
- Improved error messages to be more helpful for AI assistants

## [0.3.0] - 2025-11-25

### Added
- Integration tests for console, form, network, and snapshot workflows
- Comprehensive test coverage for core functionality

### Fixed
- Main module detection for npx compatibility
- MCP connection timeout issues

## [0.2.5] - 2025-11-24

### Fixed
- Moved geckodriver to dependencies to fix connection timeout when running via npx

## [0.2.3] - 2025-11-24

### Fixed
- Normalize module path check for cross-platform compatibility
- Added missing selenium-webdriver dependency

## [0.2.0] - 2025-11-23

### Added
- Initial public release
- Firefox DevTools automation via WebDriver BiDi
- MCP server implementation with tools for:
  - Page navigation and snapshot
  - Console message capture
  - Network request monitoring
  - Screenshot capture
  - Form interaction (click, fill, hover)
  - Tab management
  - Script execution
- UID-based element referencing system
- Headless mode support

[0.4.0]: https://github.com/freema/firefox-devtools-mcp/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/freema/firefox-devtools-mcp/compare/v0.2.5...v0.3.0
[0.2.5]: https://github.com/freema/firefox-devtools-mcp/compare/v0.2.3...v0.2.5
[0.2.3]: https://github.com/freema/firefox-devtools-mcp/compare/v0.2.0...v0.2.3
[0.2.0]: https://github.com/freema/firefox-devtools-mcp/releases/tag/v0.2.0
