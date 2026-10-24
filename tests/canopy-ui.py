"""Exercise the standalone 2D inspector in restricted environments. Not a 3D test."""
import json, os, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=root/'test-results';out.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.getenv('CHROME_BIN') or shutil.which('chromium') or p.chromium.executable_path,headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1536,'height':960})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.evaluate("""() => {const data=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v))}})}""")
    page.set_content((root/'dist/legado-studio.html').read_text(),wait_until='domcontentloaded')
    page.wait_for_selector('#plan2d svg')
    page.locator('#scene-list button').filter(has_text='Cocina').click()
    assert page.locator('#canopy-fields').is_visible()
    assert page.locator('#wall-front').input_value()=='open'
    assert page.locator('#wall-left').input_value()=='window'
    page.locator('#wall-front').select_option('door')
    page.locator('#wall-right').select_option('open')
    page.locator('#canopy-rise').fill('1')
    page.locator('#canopy-ropes').uncheck()
    page.locator('#canopy-table').uncheck()
    page.locator('#item-form button[type=submit]').click()
    project=json.loads(page.evaluate("localStorage.getItem('legado-studio-v1')"))
    kitchen=next(i for i in project['items'] if i['kind']=='kitchen')
    assert kitchen['canopy']=={'roofRise':1,'walls':{'front':'door','back':'solid','left':'window','right':'open'},'guyRopes':False,'table':False}
    page.locator('#duplicate').click()
    project=json.loads(page.evaluate("localStorage.getItem('legado-studio-v1')"))
    assert [i for i in project['items'] if i['kind']=='kitchen'][1]['canopy']==kitchen['canopy']
    page.locator('#undo').click()
    page.locator('#scene-list button').filter(has_text='Cocina').click()
    page.locator('#undo').click()
    assert page.locator('#wall-front').input_value()=='open'
    page.locator('#redo').click()
    assert page.locator('#wall-front').input_value()=='door'
    page.locator('#focus-item').click()
    assert page.locator('#plan2d [data-wall="front"]').count()>=1
    assert page.locator('#plan2d path[stroke="#b2beb3"]').first.get_attribute('fill')=='none'
    page.screenshot(path=str(out/'cocina-inspector.png'),full_page=True)
    page.locator('#fit').click()
    page.screenshot(path=str(out/'campo-cocinas.png'),full_page=True)
    page.locator('#scene-list button').filter(has_text='Varones 1').click()
    assert not page.locator('#canopy-fields').is_visible()
    page.locator('#item-name').fill('Varones editado')
    page.locator('#item-form button[type=submit]').click()
    assert page.locator('#item-name').input_value()=='Varones editado'
    assert errors==[], errors
    print('PASS canopy UI: wall selectors, roof, rope/table toggles, persistence handler, duplicate, undo/redo, focus, plan walls, non-kitchen edits; 0 page errors.')
    print('3D rendering and actual browser persistence not tested here.')
    browser.close()
