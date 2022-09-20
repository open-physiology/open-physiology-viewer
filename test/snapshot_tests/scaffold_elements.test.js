//IMPORTS:
import 'expect-puppeteer';
import { toMatchImageSnapshot } from 'jest-image-snapshot'
expect.extend({ toMatchImageSnapshot })
import { ONE_SECOND, FIVE_SECONDS, ONE_MINUTE, baseURL, scaffoldGroupName } from './util_constants'
import { wait4selector, click_, range, canvasSnapshot, fullpageSnapshot } from './helpers';
const path = require('path');
var scriptName = path.basename(__filename, '.js');



//SNAPSHOT
const SNAPSHOT_OPTIONS = {
    customSnapshotsDir: `./tests/snapshots/${scriptName}`,
    comparisonMethod: 'ssim',
    customDiffConfig: {
        ssim: 'fast', //where higher accuracy is desired at the expense of time or a higher quality diff image is needed for debugging
    },
    //     ssim: 'bezkrovny', //other option, optimized for speed at a small change in accuracy
    // },
    failureThresholdType: 'percent',
    failureThreshold: 0.020 //best one to allow some minor changes in display 
};

//SELECTORS: 
const BASE_PAGE_SELECTOR = '#mat-tab-content-0-1';
const MAIN_PANEL_SELECTOR = '#main-panel';
const SHOW_SETTING_SELECTOR = 'button[title = "Show settings"]';
const HIDE_SETTINGS_SELECTOR = 'button[title = "Hide settings"]';
const MERGE_MODEL_SELECTOR = '#mergeBtn > i';
const TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR = 'button[class = "mat-focus-indicator mat-raised-button mat-button-base"]';





//TESTS:
jest.setTimeout(ONE_MINUTE * 2);

describe('Scaffold Model Elements', () => {

    beforeAll(async () => {
        console.log('Starting tests ...')

        page.on('response', response => {
            const client_server_errors = range(200, 400)
            for (let i = 0; i < client_server_errors.length; i++) {
                expect(response.status()).not.toBe(client_server_errors[i])
            }
        })

        page.on('requestfailed', request => {
            console.log('REQUEST FAILED')
            throw new Error(`Request failed - method: ${request.method()}, url: ${request.url()}, errText: ${request.failure().errorText}`)
        });

        page.on("pageerror", err => {
            console.log('ERROR')
            throw new Error(`Page error: ${err.toString()}`);
        });

        await page.goto(baseURL);
        // Setting user agent helps to speed up an otherwise extremely slow Chromium
        //    - https://github.com/puppeteer/puppeteer/issues/1718#issuecomment-425618798
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');
    });



    it('Scaffold Model', async () => {
        await wait4selector(page, BASE_PAGE_SELECTOR, { timeout: ONE_MINUTE });
       
    });

})



