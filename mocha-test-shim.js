global.XMLHttpRequest = require('xhr2');
require('@babel/polyfill');
require('reflect-metadata');
require('zone.js/dist/zone');
require('zone.js/dist/long-stack-trace-zone');
require('zone.js/dist/proxy');
require('zone.js/dist/sync-test');
require('zone.js/dist/async-test');
require('zone.js/dist/fake-async-test');

const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { document } = (new JSDOM(``, {
  url: "http://localhost"
})).window;
const window = document.defaultView;
window.console = global.console;

global.document = document;
global.window = document.defaultView;
global.HTMLElement = window.HTMLElement;
global.navigator = window.navigator;
global.Node = window.Node;
global.self = global.window;
global.crypto = window.crypto;
