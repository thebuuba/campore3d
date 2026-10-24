"""Real browser/storage test. --require-3d also requires real WebGL (no mocks)."""
import argparse, json, os, shutil, subprocess, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--require-3d',action='store_true');parser.add_argument('--standalone',action='store_true');args=parser.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'test-results';out.mkdir(exist_ok=True)
port=5189;url=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/serve.mjs'],cwd=root,env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL)
try:
    for _ in range(80):
        try:
            with urllib.request.urlopen(url,timeout=1) as response:
                if response.status==200: break
        except OSError: time.sleep(.1)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.getenv('CHROME_BIN') or shutil.which('chromium') or p.chromium.executable_path,headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        page=browser.new_page(viewport={'width':1536,'height':1000});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        if args.standalone:
            assert not args.require_3d, 'Standalone mode cannot certify WebGL'
            page.evaluate("""() => {const data=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v))}})}""")
            page.set_content((root/'dist/legado-studio.html').read_text(),wait_until='domcontentloaded')
        else: page.goto(url,wait_until='networkidle')
        page.wait_for_selector('#plan2d svg',state='attached')
        if args.require_3d:
            page.wait_for_function("document.getElementById('engine-status').textContent==='Motor 3D listo'",timeout=30000)
            assert page.locator('#canvas3d canvas').count()==1
            details=page.evaluate("""() => {const c=document.querySelector('#canvas3d canvas');const gl=c.getContext('webgl2')||c.getContext('webgl');if(!gl)throw Error('No WebGL');const a=new Uint8Array(4);gl.readPixels(c.width/2,c.height/2,1,1,gl.RGBA,gl.UNSIGNED_BYTE,a);return {width:c.width,height:c.height,pixel:[...a],renderer:gl.getParameter(gl.RENDERER)}}""")
            assert details['width']>100 and details['height']>100 and details['pixel'][3]>0
            print('WEBGL:',json.dumps(details))
        else: page.locator('#view2d').click()
        page.locator('#scene-list button').filter(has_text='Varones 1').click()
        assert page.locator('#dome-fields').is_visible();assert page.locator('#dome-open').is_checked()
        page.locator('#focus-item').click()
        page.locator('#dome-open').uncheck();page.locator('#dome-guys').check();page.locator('#dome-accent').fill('#fa8811')
        page.locator('#item-form button[type=submit]').click()
        data=json.loads(page.evaluate("localStorage.getItem('legado-studio-v1')"));tent=data['items'][0]
        assert tent['structure']['doorOpen'] is False and tent['structure']['guyRopes'] is True
        page.locator('#undo').click();assert page.locator('#dome-open').is_checked()
        page.locator('#redo').click();assert not page.locator('#dome-open').is_checked()
        page.locator('#dome-open').check();page.locator('#item-form button[type=submit]').click()
        page.screenshot(path=str(out/('domo-3d.png' if args.require_3d else 'domo-plano.png')))
        page.locator('#scene-list button').filter(has_text='Entrada Legado').click();page.locator('#focus-item').click()
        assert page.locator('#portal-fields').is_visible()
        page.locator('#item-label').fill('LEGADO');page.locator('#portal-style').select_option('simple');page.locator('#item-form button[type=submit]').click()
        data=json.loads(page.evaluate("localStorage.getItem('legado-studio-v1')"));assert next(i for i in data['items'] if i['kind']=='gate')['structure']['style']=='simple'
        page.locator('#portal-style').select_option('portal');page.locator('#portal-banners').uncheck();page.locator('#item-form button[type=submit]').click()
        page.locator('#undo').click();assert page.locator('#portal-style').input_value()=='simple'
        page.locator('#redo').click();assert page.locator('#portal-style').input_value()=='portal'
        page.locator('#portal-banners').check();page.locator('#item-form button[type=submit]').click()
        page.locator('#focus-item').click()
        page.screenshot(path=str(out/('entrada-3d.png' if args.require_3d else 'entrada-plano.png')))
        with page.expect_download() as event: page.locator('#export').click()
        download=event.value;download.save_as(out/'roundtrip.json')
        exported=json.loads((out/'roundtrip.json').read_text());assert exported['schemaVersion']==3
        if not args.standalone: page.reload(wait_until='networkidle')
        page.wait_for_selector('#scene-list button');page.locator('#view2d').click()
        page.locator('#scene-list button').filter(has_text='Varones 1').click();assert page.locator('#dome-guys').is_checked()
        assert page.locator('#dome-accent').input_value()=='#fa8811'
        page.on('dialog',lambda dialog:dialog.accept())
        page.locator('#import').set_input_files(str(out/'roundtrip.json'))
        page.wait_for_timeout(100)
        restored=json.loads(page.evaluate("localStorage.getItem('legado-studio-v1')"));assert restored==exported
        page.locator('#scene-list button').filter(has_text='Cocina').click();assert page.locator('#canopy-fields').is_visible();assert not page.locator('#structure-fields').is_visible()
        page.locator('#item-name').fill('Cocina intacta');page.locator('#item-form button[type=submit]').click()
        assert next(i for i in json.loads(page.evaluate("localStorage.getItem('legado-studio-v1')"))['items'] if i['kind']=='kitchen')['name']=='Cocina intacta'
        page.set_viewport_size({'width':1280,'height':800});page.screenshot(path=str(out/'editor-1280.png'))
        if args.require_3d:
            # Independently build and render the two new models, checking real geometry.
            geometry=page.evaluate("""async()=>{const T=await import('three');const {createItem}=await import('./src/core.js');const {createDome,createTimberGate}=await import('./src/structures3d.js');let count=0,triangles=0;
              for(const model of [createDome(createItem('tentM')),createTimberGate(createItem('gate'))]){model.traverse(o=>{if(o.isMesh){count++;const a=o.geometry.attributes.position.array;if(!a.every(Number.isFinite))throw Error('Invalid geometry');triangles+=(o.geometry.index?.count||a.length/3)/3;}});const bounds=new T.Box3().setFromObject(model);if(bounds.isEmpty())throw Error('Empty model');}return {meshes:count,triangles};}""")
            print('GEOMETRY:',json.dumps(geometry));assert geometry['meshes']>40
        assert errors==[],errors
        print('PASS: dome/gate controls, undo/redo, JSON export/import, preserved kitchen, responsive layout; 0 uncaught page errors.')
        print('Storage mocked; native persistence NOT tested.' if args.standalone else 'Native localStorage reload verified.')
        print('3D: real WebGL verified.' if args.require_3d else '3D not tested in this local run (motor unavailable).')
        browser.close()
finally:
    server.terminate();server.wait(timeout=5)
