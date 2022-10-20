//IMPORTS:

import 'expect-puppeteer';
import { toMatchImageSnapshot } from 'jest-image-snapshot'
expect.extend({ toMatchImageSnapshot })
import { ONE_SECOND, FIVE_SECONDS, ONE_MINUTE,HALF_SECOND, baseURL, KeastSpinalModelGroups } from './util_constants'
import { wait4selector, click_, range, canvasSnapshot, fullpageSnapshot } from './helpers';
const path = require('path');
var scriptName = path.basename(__filename, '.js');
import * as selectors from './selectors'


//SNAPSHOT
const SNAPSHOT_OPTIONS = {
    customSnapshotsDir: `./test/snapshot_tests/snapshots/${scriptName}`,
    comparisonMethod: 'ssim',
    customDiffConfig: {
        ssim: 'fast', //where higher accuracy is desired at the expense of time or a higher quality diff image is needed for debugging
    },
    //     ssim: 'bezkrovny', //other option, optimized for speed at a small change in accuracy
    // },
    failureThresholdType: 'percent',
    failureThreshold: 0.020 //best one to allow some minor changes in display 
};


//TESTS:
jest.setTimeout(ONE_MINUTE * 2);

describe('Access Open Physiology Viewer', () => {

    beforeAll(async () => {
        console.log(`Starting ${scriptName} ...`)
    });

    it('Main Page: Open Physiology Viewer', async () => {

        await page.goto(baseURL);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');

        page.on('response', response => {
            const client_server_errors = range(200, 400)
            for (let i = 0; i < client_server_errors.length; i++) {
                expect(response.status()).not.toBe(client_server_errors[i])
            }
        })

        await wait4selector(page, selectors.BASE_PAGE_SELECTOR, { timeout: ONE_MINUTE });

        const model_name = await page.evaluate(() => {
            let map = document.querySelectorAll('.w3-bar-item');
            for (var i = 0; i < map.length; i++) {
                return map[3].innerHTML;
            }
        });

        expect(model_name).toBe(' Model: TOO-map-linked reference connectivity model ')

    });
})

describe('Load TOO Map', () => {
    it('Load TOO Map', async () => {
        console.log('Load TOO Map')

        await page.waitForSelector('#loadBtn')

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click('#joinBtn') 
        ]);
        await fileChooser.accept([__dirname + '/assets/too-map.json']);

        await page.waitForTimeout(2000);

        const model_name = await page.evaluate(() => {
            let map = document.querySelectorAll('.w3-bar-item');
            for (var i = 0; i < map.length; i++) {
                return map[3].innerHTML;
            }
        });

        expect(model_name).toBe(' Model: TOO map ') 

    })

    it('TOO Map Validation', async () => {
        console.log('TOO Map Validation')

        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'TOO Map')

    })
})

describe('Merge Keast Spinal Model', () => {

    it('Merge Keast Spinal Model', async () => {
        console.log('Merging Keast Spinal Model')

        await page.waitForSelector('#mergeBtn')

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click('#mergeBtn'),
        ]);
        await fileChooser.accept([__dirname + '/assets/keastSpinalTest.json']);

        await page.waitForTimeout(2000);

    })

    it('Keast Spinal Model Validation', async () => {
        console.log('Keast Spinal Model Validation')

        const model_name = await page.evaluate(() => {
            let map = document.querySelectorAll('.w3-bar-item');
            for (var i = 0; i < map.length; i++) {
                return map[3].innerHTML;
            }
        });

        expect(model_name).toBe(' Model: Keast Spinal Test ')

    })
})

describe('Keast Spinal Model Snapshot Tests', () => {

    it('Keast Spinal Model Group: All groups', async () => {

        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)
        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'Keast Spinal model')
        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)

    })

    it('Keast Spinal Model Group: Sympathetic chain', async () => {
        console.log('Keast Spinal Model group: Sympathetic chain')

        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await click_(page,selectors.UNTOGGLE_ALL_SELECTOR)

        const group = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[0].innerText
            }
        });
        expect(group).toContain(KeastSpinalModelGroups[0])

        await page.waitForTimeout(1000);

        await page.evaluate(() => {
            let map = document.querySelectorAll('.mat-slide-toggle-label');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('Sympathetic chain') && map[i].click();
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)
        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'Keast Spinal model group: Sympathetic chain')

    })

    it('Keast Spinal Model Group: Axon', async () => {
        console.log('Keast Spinal Model group: Axon')

        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await click_(page,selectors.UNTOGGLE_ALL_SELECTOR)

        const group = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[1].innerText
            }
        });
        expect(group).toContain(KeastSpinalModelGroups[1])

        await page.waitForTimeout(1000);

        await page.evaluate(() => {
            let map = document.querySelectorAll('.mat-slide-toggle-label');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('Axon') && map[i].click();
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)
        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'Keast Spinal model group: Axon')

    })

    it('Keast Spinal Model Group: Dendrite', async () => {
        console.log('Keast Spinal Model group: Dendrite')

        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await click_(page,selectors.UNTOGGLE_ALL_SELECTOR)

        const group = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[2].innerText
            }
        });
        expect(group).toContain(KeastSpinalModelGroups[2])

        await page.waitForTimeout(1000);

        await page.evaluate(() => {
            let map = document.querySelectorAll('.mat-slide-toggle-label');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('Dendrite') && map[i].click();
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)
        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'Keast Spinal model group: Dendrite')

    })
})




