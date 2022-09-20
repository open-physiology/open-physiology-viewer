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
        await page.waitForTimeout(ONE_SECOND * 2)
        await canvasSnapshot(page, MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'Scaffold Model')
    });

    it('Groups from Scaffold Model', async () => {
        console.log('Toggle Groups from Scaffold Model')

        await click_(page, SHOW_SETTING_SELECTOR)

        const ScaffoldGroups = await page.evaluate(() => document.querySelectorAll("span.mat-slide-toggle-content").length)
        expect(ScaffoldGroups).toBe(9)

        await fullpageSnapshot(page, SNAPSHOT_OPTIONS, 'Groups from Scaffold Model')

        await click_(page, HIDE_SETTINGS_SELECTOR)

    })

})

describe('Scaffold Model: F Group', () => {

    
    it('F Anchors, Wires and Regions from Scaffold Model', async () => {
        console.log('Toggle F Anchors from Scaffold Model')

        await click_(page, SHOW_SETTING_SELECTOR)
        await click_(page, TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)

        const anchor = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[0].innerText
            }
        });
        expect(anchor).toBe(scaffoldGroupName[0])


        await page.waitForSelector('.cdk-overlay-pane')
        await page.click('div[class = "mat-simple-snackbar-action ng-star-inserted"]')
        
    
        await page.evaluate(() => {
            let map = document.querySelectorAll('div.mat-slide-toggle-bar');
            for (var i = 0; i < map.length; i++) {
                map[0].click();
            }
        });

        await click_(page, HIDE_SETTINGS_SELECTOR)


        await canvasSnapshot(page, MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'F Anchors from Scaffold Model')

    })

    it('F Wires from Scaffold Model', async () => {
        console.log('Toggle F Wires from Scaffold Model')


        await click_(page, SHOW_SETTING_SELECTOR)

        await click_(page, TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        //Untoggling all groups
        await page.click('button[class = "mat-focus-indicator mat-raised-button mat-button-base cdk-focused cdk-mouse-focused"]')
        await page.waitForTimeout(2000)

        const wire = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[3].innerText
            }
        });
        expect(wire).toBe(scaffoldGroupName[3])

        await page.waitForSelector('.cdk-overlay-pane')
        await page.click('div[class = "mat-simple-snackbar-action ng-star-inserted"]')
        

        await page.evaluate(() => {
            let map = document.querySelectorAll('div.mat-slide-toggle-bar');
            for (var i = 0; i < map.length; i++) {
                map[3].click();
            }
        });

        await click_(page, HIDE_SETTINGS_SELECTOR)


        await canvasSnapshot(page, MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'F Wires from Scaffold Model')
    })

    it('F  Regions from Scaffold Model', async () => {
        console.log('Toggle F Regions from Scaffold Model')


        await click_(page, SHOW_SETTING_SELECTOR)

        await click_(page, TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        //Untoggling all groups
        await page.click('button[class = "mat-focus-indicator mat-raised-button mat-button-base cdk-focused cdk-mouse-focused"]')
        await page.waitForTimeout(2000)


        const region = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[6].innerText
            }
        });
        expect(region).toBe(scaffoldGroupName[6])

        await page.waitForSelector('.cdk-overlay-pane')
        await page.click('div[class = "mat-simple-snackbar-action ng-star-inserted"]')
        

        await page.evaluate(() => {
            let map = document.querySelectorAll('div.mat-slide-toggle-bar');
            for (var i = 0; i < map.length; i++) {
                map[6].click();
            }
        });

        await click_(page, HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'F Regions from Scaffold Model')
    })

    it('F  group elements from Scaffold Model', async () => {
        console.log('Toggle F Anchors, wires and regions from Scaffold Model')

        await click_(page, SHOW_SETTING_SELECTOR)

        await click_(page, TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        //Untoggling all groups
        await page.click('button[class = "mat-focus-indicator mat-raised-button mat-button-base cdk-focused cdk-mouse-focused"]')
        await page.waitForTimeout(2000)
        
        await page.waitForSelector('.cdk-overlay-pane')
        await page.click('div[class = "mat-simple-snackbar-action ng-star-inserted"]')
        

        await page.evaluate(() => {
            let map = document.querySelectorAll('div.mat-slide-toggle-bar');
            for (var i = 0; i < map.length; i++) {
                map[0].click();
                map[3].click();
                map[6].click();
            }
        });

        await click_(page, HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'F group elements from Scaffold Model')
    })
   
})


describe('Scaffold Model: D Group', () => {


    it('D Anchors, Wires and Regions from Scaffold Model', async () => {
        console.log('Toggle D Anchors from Scaffold Model')
        
        await page.reload()

        await click_(page, SHOW_SETTING_SELECTOR)

        await click_(page, TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)

        const anchor = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[1].innerText
            }
        });
        expect(anchor).toBe(scaffoldGroupName[1])


        await page.waitForSelector('.cdk-overlay-pane')
        await page.click('div[class = "mat-simple-snackbar-action ng-star-inserted"]')
        
    
        await page.evaluate(() => {
            let map = document.querySelectorAll('div.mat-slide-toggle-bar');
            for (var i = 0; i < map.length; i++) {
                map[1].click();
            }
        });

        await click_(page, HIDE_SETTINGS_SELECTOR)


        await canvasSnapshot(page, MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'D Anchors from Scaffold Model')

    })

    it('D Wires from Scaffold Model', async () => {
        console.log('Toggle D Wires from Scaffold Model')


        await click_(page, SHOW_SETTING_SELECTOR)

        await click_(page, TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        //Untoggling all groups
        await page.click('button[class = "mat-focus-indicator mat-raised-button mat-button-base cdk-focused cdk-mouse-focused"]')
        await page.waitForTimeout(2000)

        const wire = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[4].innerText
            }
        });
        expect(wire).toBe(scaffoldGroupName[4])

        await page.waitForSelector('.cdk-overlay-pane')
        await page.click('div[class = "mat-simple-snackbar-action ng-star-inserted"]')
        

        await page.evaluate(() => {
            let map = document.querySelectorAll('div.mat-slide-toggle-bar');
            for (var i = 0; i < map.length; i++) {
                map[4].click();
            }
        });

        await click_(page, HIDE_SETTINGS_SELECTOR)


        await canvasSnapshot(page, MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'D Wires from Scaffold Model')
    })

    it('D  Regions from Scaffold Model', async () => {
        console.log('Toggle D Regions from Scaffold Model')


        await click_(page, SHOW_SETTING_SELECTOR)

        await click_(page, TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        //Untoggling all groups
        await page.click('button[class = "mat-focus-indicator mat-raised-button mat-button-base cdk-focused cdk-mouse-focused"]')
        await page.waitForTimeout(2000)


        const region = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[7].innerText
            }
        });
        expect(region).toBe(scaffoldGroupName[7])

        await page.waitForSelector('.cdk-overlay-pane')
        await page.click('div[class = "mat-simple-snackbar-action ng-star-inserted"]')
        

        await page.evaluate(() => {
            let map = document.querySelectorAll('div.mat-slide-toggle-bar');
            for (var i = 0; i < map.length; i++) {
                map[7].click();
            }
        });

        await click_(page, HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'D Regions from Scaffold Model')
    })

    it('D  group elements from Scaffold Model', async () => {
        console.log('Toggle D Anchors, wires and regions from Scaffold Model')

        await click_(page, SHOW_SETTING_SELECTOR)

        await click_(page, TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        //Untoggling all groups
        await page.click('button[class = "mat-focus-indicator mat-raised-button mat-button-base cdk-focused cdk-mouse-focused"]')
        await page.waitForTimeout(2000)
        
        await page.waitForSelector('.cdk-overlay-pane')
        await page.click('div[class = "mat-simple-snackbar-action ng-star-inserted"]')
        

        await page.evaluate(() => {
            let map = document.querySelectorAll('div.mat-slide-toggle-bar');
            for (var i = 0; i < map.length; i++) {
                map[1].click();
                map[4].click();
                map[7].click();
            }
        });

        await click_(page, HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'D group elements from Scaffold Model')
    })
   
})




