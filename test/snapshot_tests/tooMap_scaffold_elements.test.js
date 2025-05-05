//IMPORTS:
import 'expect-puppeteer';
import { toMatchImageSnapshot } from 'jest-image-snapshot'
expect.extend({ toMatchImageSnapshot })
import {  TOO_MAP_MODEL_LINK,ONE_SECOND, FIVE_SECONDS, ONE_MINUTE,HALF_SECOND, baseURL, scaffoldGroupName } from './util_constants'
import { wait4selector, click_, range, canvasSnapshot, fullpageSnapshot } from './helpers';
const path = require('path');
var scriptName = path.basename(__filename, '.js');
import * as selectors from './selectors'
const axios = require('axios').default;
const fs = require('fs');


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
    failureThreshold: 0.040 //best one to allow some minor changes in display 
};


//TESTS:
jest.setTimeout(ONE_MINUTE * 2);

describe('Scaffold Model Elements', () => {

    beforeAll(async () => {
        console.log('Starting tests ...')

        page.on("pageerror", err => {
            console.log('ERROR')
            throw new Error(`Page error: ${err.toString()}`);
        });

        await page.goto(baseURL);
    });

    it('Fetching too-map.json file', async ()=>{
        
        await axios.get( TOO_MAP_MODEL_LINK, { responseType:"arraybuffer"}).then(response => {
            fs.writeFile('./test/snapshot_tests/assets/too-map.json', response.data, (err) => {
                if (err) throw err;
                    console.log('too-map.json file fetched');
                });
        });
    })

    it('Merge Too Map', async () => {
        await wait4selector(page, selectors.BASE_PAGE_SELECTOR, { timeout: ONE_MINUTE });
        await page.waitForTimeout(ONE_SECOND * 2)
        await page.waitForSelector('#loadBtn')

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click('#joinBtn') 
        ]);
        await fileChooser.accept([__dirname + '/assets/too-map.json']);
    });

    it('Scaffold Model', async () => {
        await wait4selector(page, selectors.BASE_PAGE_SELECTOR, { timeout: ONE_MINUTE });
        await page.waitForTimeout(ONE_SECOND * 2)
        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'Scaffold Model')
    });

})


describe('Scaffold Model: F Group', () => {
    
    it('F Anchors, Wires and Regions from Scaffold Model', async () => {
        console.log('Toggle F Anchors from Scaffold Model')

        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)

        const anchor = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[0].innerText
            }
        });
        expect(anchor).toContain(scaffoldGroupName[0])

        await page.waitForSelector(selectors.ERROR_PANEL_SELECTOR)
        await page.click(selectors.OK_ERROR_SELECTOR)
        
        await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('F anchors') &&  map[i].click()
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'F Anchors from Scaffold Model')
    })

    it('F Wires from Scaffold Model', async () => {
        console.log('Toggle F Wires from Scaffold Model')

        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        await page.click(selectors.UNTOGLE_ALL_GROUPS_SELECTOR)
        await page.waitForTimeout(2000)

        const wire = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[3].innerText
            }
        });
        expect(wire).toContain(scaffoldGroupName[3])

        await page.waitForSelector(selectors.ERROR_PANEL_SELECTOR)
        await page.click(selectors.OK_ERROR_SELECTOR)  

        await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('F wires') &&  map[i].click()
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'F Wires from Scaffold Model')
    })

    it('F  Regions from Scaffold Model', async () => {
        console.log('Toggle F Regions from Scaffold Model')

        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        await page.click(selectors.UNTOGLE_ALL_GROUPS_SELECTOR)
        await page.waitForTimeout(2000)

        const region = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[6].innerText
            }
        });
        expect(region).toContain(scaffoldGroupName[6])

        await page.waitForSelector(selectors.ERROR_PANEL_SELECTOR)
        await page.click(selectors.OK_ERROR_SELECTOR)
        
        await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('F regions') &&  map[i].click()
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'F Regions from Scaffold Model')
    })

    it('F  group elements from Scaffold Model', async () => {
        console.log('Toggle F Anchors, wires and regions from Scaffold Model')

        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        await page.click(selectors.UNTOGLE_ALL_GROUPS_SELECTOR)
        await page.waitForTimeout(2000)
        await page.waitForSelector(selectors.ERROR_PANEL_SELECTOR)
        await page.click(selectors.OK_ERROR_SELECTOR) 

        await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('F anchors') &&  map[i].click()
                map[i].innerText.includes('F wires') &&  map[i].click()
                map[i].innerText.includes('F regions') &&  map[i].click()
               
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'F group elements from Scaffold Model')
    })  
})


describe('Scaffold Model: D Group', () => {


    it('D Anchors, Wires and Regions from Scaffold Model', async () => {
        console.log('Toggle D Anchors from Scaffold Model')
        
        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        await page.click(selectors.UNTOGLE_ALL_GROUPS_SELECTOR)
        await page.waitForTimeout(2000)

        const anchor = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[1].innerText
            }
        });
        expect(anchor).toContain(scaffoldGroupName[1])

        await page.waitForSelector(selectors.ERROR_PANEL_SELECTOR)
        await page.click(selectors.OK_ERROR_SELECTOR)
        
        await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('D anchors') &&  map[i].click()
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'D Anchors from Scaffold Model')

    })

    it('D Wires from Scaffold Model', async () => {
        console.log('Toggle D Wires from Scaffold Model')

        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        await page.click(selectors.UNTOGLE_ALL_GROUPS_SELECTOR)
        await page.waitForTimeout(2000)

        const anchor = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[4].innerText
            }
        });
        expect(anchor).toContain(scaffoldGroupName[4])

        await page.waitForSelector(selectors.ERROR_PANEL_SELECTOR)
        await page.click(selectors.OK_ERROR_SELECTOR)
        
        await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('D wires') &&  map[i].click()
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'D Wires from Scaffold Model')
    })

    it('D  Regions from Scaffold Model', async () => {
        console.log('Toggle D Regions from Scaffold Model')

        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        await page.click(selectors.UNTOGLE_ALL_GROUPS_SELECTOR)
        await page.waitForTimeout(2000)

        const anchor = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[7].innerText
            }
        });
        expect(anchor).toContain(scaffoldGroupName[7])

        await page.waitForSelector(selectors.ERROR_PANEL_SELECTOR)
        await page.click(selectors.OK_ERROR_SELECTOR)
        
        await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('D regions') &&  map[i].click()
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'D Regions from Scaffold Model')
    })

    it('D  group elements from Scaffold Model', async () => {
        console.log('Toggle D Anchors, wires and regions from Scaffold Model')

        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        await page.click(selectors.UNTOGLE_ALL_GROUPS_SELECTOR)
        await page.waitForTimeout(2000)
        await page.waitForSelector(selectors.ERROR_PANEL_SELECTOR)
        await page.click(selectors.OK_ERROR_SELECTOR) 

        await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('D anchors') &&  map[i].click()
                map[i].innerText.includes('D wires') &&  map[i].click()
                map[i].innerText.includes('D regions') &&  map[i].click()
               
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'D group elements from Scaffold Model')
    })
})


describe('Scaffold Model: N Group', () => {

    it('N Anchors, Wires and Regions from Scaffold Model', async () => {
        console.log('Toggle N Anchors from Scaffold Model')
        
        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        await page.click(selectors.UNTOGLE_ALL_GROUPS_SELECTOR)
        await page.waitForTimeout(2000)

        const anchor = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[2].innerText
            }
        });
        expect(anchor).toContain(scaffoldGroupName[2])

        await page.waitForSelector(selectors.ERROR_PANEL_SELECTOR)
        await page.click(selectors.OK_ERROR_SELECTOR)
        
        await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('N anchors') &&  map[i].click()
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'N Anchors from Scaffold Model')

    })

    it('N Wires from Scaffold Model', async () => {
        console.log('Toggle N Wires from Scaffold Model')

        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        await page.click(selectors.UNTOGLE_ALL_GROUPS_SELECTOR)
        await page.waitForTimeout(2000)

        const anchor = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[5].innerText
            }
        });
        expect(anchor).toContain(scaffoldGroupName[5])

        await page.waitForSelector(selectors.ERROR_PANEL_SELECTOR)
        await page.click(selectors.OK_ERROR_SELECTOR)
        
        await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('N wires') &&  map[i].click()
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'N Wires from Scaffold Model')
    })

    it('N  Regions from Scaffold Model', async () => {
        console.log('Toggle N Regions from Scaffold Model')

        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        await page.click(selectors.UNTOGLE_ALL_GROUPS_SELECTOR)
        await page.waitForTimeout(2000)

        const anchor = await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                return map[8].innerText
            }
        });
        expect(anchor).toContain(scaffoldGroupName[8])

        await page.waitForSelector(selectors.ERROR_PANEL_SELECTOR)
        await page.click(selectors.OK_ERROR_SELECTOR)
        
        await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('N regions') &&  map[i].click()
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'N Regions from Scaffold Model')
    })

    it('N  group elements from Scaffold Model', async () => {
        console.log('Toggle N Anchors, wires and regions from Scaffold Model')

        await click_(page, selectors.SHOW_SETTING_SELECTOR)
        await click_(page, selectors.TOGGLE_ALL_GROUPS_CON_MODEL_SELECTOR)
        await page.waitForTimeout(2000)
        await page.click(selectors.UNTOGLE_ALL_GROUPS_SELECTOR)
        await page.waitForTimeout(2000)
        await page.waitForSelector(selectors.ERROR_PANEL_SELECTOR)
        await page.click(selectors.OK_ERROR_SELECTOR) 

        await page.evaluate(() => {
            let map = document.querySelectorAll('span.mat-slide-toggle-content');
            for (var i = 0; i < map.length; i++) {
                map[i].innerText.includes('N anchors') &&  map[i].click()
                map[i].innerText.includes('N wires') &&  map[i].click()
                map[i].innerText.includes('N regions') &&  map[i].click()
               
            }
        });
        await page.waitForTimeout(HALF_SECOND)
        await click_(page, selectors.HIDE_SETTINGS_SELECTOR)

        await canvasSnapshot(page, selectors.MAIN_PANEL_SELECTOR, SNAPSHOT_OPTIONS, 'N group elements from Scaffold Model')
    })
})



