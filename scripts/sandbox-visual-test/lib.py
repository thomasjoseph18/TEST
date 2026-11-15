from playwright.sync_api import sync_playwright
ARGS=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--enable-webgl"]
def open_page(p, w=960, h=540, hash='#debug'):
    b = p.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={'width':w,'height':h})
    pg.set_default_timeout(150000)
    logs=[]
    pg.on('console', lambda m: logs.append(f"{m.type}: {m.text}") if m.type in ('error',) else None)
    pg.on('pageerror', lambda e: logs.append(f"PAGEERROR: {e}"))
    pg.goto('http://localhost:8765/index.html'+hash)
    return b, pg, logs
def tp(pg, x, z, yaw=0):
    pg.evaluate(f"(()=>{{const p=window.__bsPlayer.current; p.x={x}; p.z={z}; p.yaw={yaw}; p.pitch=0; p.vx=0;p.vz=0;}})()")
def freeze(pg):
    pg.evaluate("window.__bsThree.get().setFrameloop('never')")
def snap(pg, path, frames=1, hide_hud=False):
    pg.evaluate("(()=>{const t=window.__bsThree.get(); for(let i=0;i<%d;i++) t.advance(performance.now()/1000+i*0.05, true); t.gl.getContext().finish();})()" % frames)
    if hide_hud: pg.evaluate("document.querySelector('.bs-layer').style.display='none'")
    pg.wait_for_timeout(1500)
    pg.screenshot(path=path)
    if hide_hud: pg.evaluate("document.querySelector('.bs-layer').style.display=''")
def go_surface(pg, dest='moon'):
    pg.get_by_role('button', name='Skip intro').click(); pg.wait_for_timeout(3000)
    pg.evaluate("window.__bsGame.act.updateSettings({lowPerformanceMode:true})")
    pg.evaluate("window.__bsGame.dispatch({type:'OPEN_NAVIGATION'})"); pg.wait_for_timeout(500)
    if dest=='mars':
        pg.evaluate("window.__bsGame.dispatch({type:'SELECT_DESTINATION', destination:'mars', unlocks:{moonTrainingComplete:true}})"); pg.wait_for_timeout(500)
    pg.evaluate("window.__bsGame.dispatch({type:'ENTER_HABITAT'})"); pg.wait_for_timeout(2500)
    pg.evaluate("window.__bsGame.dispatch({type:'ENTER_SURFACE'})"); pg.wait_for_timeout(6000)
    freeze(pg)

import base64
def grab(pg, path):
    d = pg.evaluate("""(()=>{const t=window.__bsThree.get(); const gl=t.gl; const ctx=gl.getContext();
      gl.render(t.scene,t.camera);
      const w=gl.domElement.width,h=gl.domElement.height; const px=new Uint8Array(w*h*4);
      ctx.readPixels(0,0,w,h,ctx.RGBA,ctx.UNSIGNED_BYTE,px);
      const c=document.createElement('canvas'); c.width=w;c.height=h; const c2=c.getContext('2d'); const img=c2.createImageData(w,h);
      for(let y=0;y<h;y++){ img.data.set(px.subarray((h-1-y)*w*4,(h-y)*w*4), y*w*4); }
      c2.putImageData(img,0,0); return c.toDataURL('image/png');})()""")
    open(path,'wb').write(base64.b64decode(d.split(',')[1]))
def step(pg, n=1):
    pg.evaluate("(()=>{const t=window.__bsThree.get(); for(let i=0;i<%d;i++) t.advance(performance.now()/1000, true);})()" % n)
