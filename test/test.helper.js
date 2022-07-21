import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import chai from 'chai';
export {chai};

import mocha from 'mocha';
import {Logger, $LogMsg} from "../src/model/logger";

const testing = require('@angular/core/testing');
const browser = require('@angular/platform-browser-dynamic/testing');
testing.TestBed.initTestEnvironment(browser.BrowserDynamicTestingModule, browser.platformBrowserDynamicTesting());

export const describe   = mocha.describe   || global.describe;
export const it         = mocha.it         || global.it;
export const beforeEach = mocha.beforeEach || global.beforeEach;
export const afterEach  = mocha.afterEach  || global.afterEach;
export const before     = mocha.before     || global.before;
export const after      = mocha.after      || global.after;

export const expect     = chai.expect;

export function expectNoErrors(graphData){
    expect(graphData).to.have.property("logger");
    expect(graphData.logger).to.have.property("entries");
    expect(graphData.logger.entries).to.be.an('array').that.has.length.above(0);
    expect(graphData.logger).to.have.property("status");
    let logEvents = graphData.logger.entries;
    let info      = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.INFO);
    let errors    = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.ERROR);
    expect(info).to.have.length.above(0);
    expect(errors).to.have.length(0);
}

export function expectNoWarnings(graphData){
    expectNoErrors(graphData);
    let logEvents = graphData.logger.entries;
    let warnings = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.WARN);
    expect(warnings).to.have.length(0);
    expect (graphData.logger.status).to.be.equal(Logger.STATUS.OK);
}

export function expectAutoGenResources(graphData){
    expectNoErrors(graphData);
    expect (graphData.logger.status).to.be.equal(Logger.STATUS.WARNING);
    let logEvents = graphData.logger.entries;
    let warnings = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.WARN);
    expect(warnings).to.have.length(1);
    expect(warnings[0]).to.have.property("msg").that.equals($LogMsg.AUTO_GEN);
}

export function expectAutoGenExternals(graphData){
    expectNoErrors(graphData);
    expect (graphData.logger.status).to.be.equal(Logger.STATUS.WARNING);
    let logEvents = graphData.logger.entries;
    let warnings = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.WARN);
    expect(warnings).to.have.length(1);
    expect(warnings[0]).to.have.property("msg").that.equals($LogMsg.AUTO_GEN_EXTERNAL);
}

export function expectAutoGenResourcesAndExternals(graphData){
    expectNoErrors(graphData);
    expect (graphData.logger.status).to.be.equal(Logger.STATUS.WARNING);
    let logEvents = graphData.logger.entries;
    let warnings = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.WARN);
    expect(warnings).to.have.length(2);
    expect(warnings[0]).to.have.property("msg").that.equals($LogMsg.AUTO_GEN);
    expect(warnings[1]).to.have.property("msg").that.equals($LogMsg.AUTO_GEN_EXTERNAL);
}
