import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import chai from 'chai';
export {chai};

import mocha from 'mocha';

const global = Function('return this')(); // window or global, depending on environment
export const describe   = mocha.describe   || global.describe;
export const it         = mocha.it         || global.it;
export const beforeEach = mocha.beforeEach || global.beforeEach;
export const afterEach  = mocha.afterEach  || global.afterEach;
export const before     = mocha.before     || global.before;
export const after      = mocha.after      || global.after;

export const expect     = chai.expect;
