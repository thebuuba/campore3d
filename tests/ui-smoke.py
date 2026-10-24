import json, re, shutil, os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=root/'test-results';out.mkdir(exist_ok=True)
html=(root/'dist/legado-studio.html').read_text()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROME_BIN') or shutil.which('chromium') or p.chromium.executable_path,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1536,'height':960},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    # The sandbox browser rejects every navigation. Exercise the actual inline
    # build with set_content; storage is substituted only within this test page.
    page.evaluate('''() => {
      const data = new Map();
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),clear:()=>data.clear()
      }});
      window.testBlobs=[]; const create=URL.createObjectURL.bind(URL);
      URL.createObjectURL=b=>{window.testBlobs.push(b);return create(b)};
      HTMLAnchorElement.prototype.click=function(){window.lastDownload=this.download;};
    }''')
    page.set_content(html,wait_until='domcontentloaded')
    page.wait_for_selector('#plan2d svg')
    page.wait_for_timeout(500)
    print('engine:',page.locator('#engine-status').inner_text())
    page.screenshot(path=str(out/'preview.png'),full_page=True)
    print('initial count',page.locator('#object-count').inner_text())
    assert page.locator('#object-count').inner_text()=='18'
    page.locator('#select-gate').click()
    assert page.locator('#item-form').is_visible()
    page.locator('#item-w').fill('6.5');page.locator('#item-label').fill('RAYO DE LUZ')
    page.locator('#item-form button[type=submit]').click()
    assert page.locator('#item-w').input_value()=='6.5'
    page.locator('#duplicate').click();assert page.locator('#object-count').inner_text()=='19'
    page.locator('#undo').click();assert page.locator('#object-count').inner_text()=='18'
    page.locator('#redo').click();assert page.locator('#object-count').inner_text()=='19'
    page.locator('#undo').click();page.locator('#secondary-exit').check()
    assert page.locator('#object-count').inner_text()=='19'
    page.locator('#terrain-w').fill('50');page.locator('#resize').click()
    assert '50 × 60' in page.locator('#area-label').inner_text()
    page.locator('[data-kind="bin"]').click();assert page.locator('#object-count').inner_text()=='20'
    page.locator('#item-x').fill('4.5');page.locator('#item-form button[type=submit]').click()
    assert page.locator('#item-x').input_value()=='4.5'
    page.locator('#save').click()
    stored=page.evaluate("localStorage.getItem('legado-studio-v1')")
    assert len(json.loads(stored)['items'])==20
    page.locator('#export').click()
    data=json.loads(page.evaluate('window.testBlobs.at(-1).text()'))
    assert len(data['items'])==20
    (out/'project.json').write_text(json.dumps(data,indent=2))
    page.locator('[data-inspector="materials"]').click()
    assert page.locator('#inventory').inner_text()
    page.locator('#export-materials').click()
    csv=page.evaluate('window.testBlobs.at(-1).text()');assert 'Madera geométrica' in csv
    (out/'inventory.csv').write_text(csv)
    page.locator('#warnings-btn').click();assert page.locator('#warnings-dialog').is_visible()
    page.locator('#close-dialog').click()
    page.evaluate('localStorage.clear()')
    page.set_content(html,wait_until='domcontentloaded');page.wait_for_selector('#plan2d svg')
    # Pointer drag exercises SVG hit testing and project updates.
    item=page.locator('#plan2d [data-id]').first
    box=item.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
    page.mouse.down();page.mouse.move(box['x']+box['width']/2+20,box['y']+box['height']/2+15,steps=5);page.mouse.up()
    assert page.locator('#item-form').is_visible()
    assert not page.locator('#undo').is_disabled()
    # Put the useful visual state back at the example, selecting the gate.
    page.locator('#undo').click();page.locator('#select-gate').click() if page.locator('#select-gate').is_visible() else page.locator('#scene-list button').filter(has_text='Entrada Legado').click()
    page.screenshot(path=str(out/'inspector-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(100)
    page.screenshot(path=str(out/'mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    print('page errors:',errors);assert errors==[]
    print('PASS inline UI: initial load, property edit, duplicate, undo/redo, exit, resize, add, save handler, JSON and CSV payloads, dialog, SVG dragging, responsive layout.')
    print('NOT verified: external 3D loading, native localStorage persistence across real page navigation, browser download delivery, PNG export.')
    browser.close()
