import { ONE_SECOND, FIVE_SECONDS, ONE_MINUTE } from './util_constants.js';
const path = require('path');

//GENERAL FUNCTIONS:
export const click_ = async (page, selector) => {
  try {
    await page.waitForSelector(selector)
    await page.click(selector)
    await page.waitForTimeout(ONE_SECOND)
  } catch (error) {
    throw new Error(`could not click on selector: ${selector}`)

  }
};

export const typeText = async (page, selector, text) => {
  try {
    await page.waitForSelector(selector);
    await page.type(selector, text)
    await page.waitForTimeout(ONE_SECOND)
  } catch (error) {
    throw new Error(`could not type into selector: ${selector}`)

  }
};

export const getCount = async (page, selector) => {
  try {
    await page.waitForSelector(selector)
    return await page.$$eval(selector, element => element.length)
  } catch (error) {
    throw new Error(`could not get count from selector: ${selector}`)

  }
}

export const wait4selector = async (page, selector, settings) => {
  let success = undefined;
  let options = settings;
  if (!("timeout" in settings)) {
    options = { timeout: 5000, ...settings };
  }
  try {
    await page.waitForSelector(selector, options);
    success = true
  } catch (error) {
    let behaviour = "to exist."
    if (options.visible || options.hidden) {
      behaviour = options.visible ? "to be visible." : "to disappear."
    }
    console.log(`ERROR: timeout waiting for selector   --->   ${selector}  ${behaviour}`)
  }
  expect(success).toBeDefined()
};

export const escapeXpathString = str => {
  const splitedQuotes = str.replace(/'/g, `', "'", '`);
  return `concat('${splitedQuotes}', '')`;
};

export const clickByText = async (page, text) => {
  const escapedText = escapeXpathString(text);
  const handlers = await page.$x(`//a[contains(text(), ${escapedText})]`);

  if (handlers.length > 0) {
    await handlers[0].click();
  } else {
    throw new Error(`Link not found: ${text}`);
  }
};


export function range(size, startAt = 0) {
  return [...Array(size).keys()].map(i => i + startAt);
}


export const fullpageSnapshot = async (page, snapshotOptions, snapshotIdentifier) => {
  await console.log('... taking snapshot ...')
  await page.waitForTimeout(ONE_SECOND*3)
  expect(await page.screenshot())
    .toMatchImageSnapshot({
      ...snapshotOptions,
      customSnapshotIdentifier: snapshotIdentifier
    });
  await page.waitForTimeout(ONE_SECOND*3)
}


export const canvasSnapshot = async (page, selector, snapshotOptions, snapshotIdentifier) => {
  await page.waitForTimeout(ONE_SECOND*3)
  const canvas = await page.waitForSelector(selector)
  const groups_image = await canvas.screenshot()
  await console.log('... taking canvas snapshot ...')
  expect(groups_image)
    .toMatchImageSnapshot({
      ...snapshotOptions,
      customSnapshotIdentifier: snapshotIdentifier
    });
  await page.waitForTimeout(ONE_SECOND*3)
}