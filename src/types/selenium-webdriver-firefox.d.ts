// Type shim to map ESM runtime import `selenium-webdriver/firefox.js`
// to the published type declarations `selenium-webdriver/firefox`.
// Keeps runtime import stable while satisfying TypeScript.

declare module 'selenium-webdriver/firefox.js' {
  export * from 'selenium-webdriver/firefox';
  import firefox = require('selenium-webdriver/firefox');
  export default firefox;
}
