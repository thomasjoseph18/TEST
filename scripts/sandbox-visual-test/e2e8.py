import sys, time; sys.path.insert(0,'/tmp/bs')
from lib import *
def S(pg, e): return pg.evaluate(e)
def wait_until(pg, expr, timeout=40, step=400):
    t0=time.time()
    while time.time()-t0<timeout:
        if pg.evaluate(expr): return True
        pg.wait_for_timeout(step)
    return False
with sync_playwright() as p:
    b, pg, logs = open_page(p, 480, 270)
    pg.wait_for_timeout(2500)
    pg.get_by_role('button', name='Begin', exact=True).click(); pg.wait_for_timeout(1500)
    for _ in range(16): pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(120)
    pg.wait_for_timeout(1500)
    print('ended controls:', S(pg,"[...document.querySelectorAll('.bs-cine-controls button')].map(b=>b.innerText).join(',')"))
    print('last caption:', S(pg,"document.querySelector('.bs-caption-text')?.innerText"))
    pg.get_by_role('button', name='Begin training').click()
    print('command:', wait_until(pg,"document.querySelector('.bs-place h2')?.innerText.includes('Command')"), 'introSeen', S(pg,"window.__bsGame.saveRef.current.progress.introSeen"))
    S(pg,"window.__bsGame.act.updateSettings({lowPerformanceMode:true})")
    # replay from the Apollo exhibit panel
    pg.wait_for_timeout(2000)
    tp(pg, 0, -9.2, 3.1416-3.1416); pg.wait_for_timeout(1500)
    print('exhibit prompt:', S(pg,"document.querySelector('.bs-prompt')?.innerText.replace(/\\n/g,' ')"))
    pg.keyboard.press('KeyE'); pg.wait_for_timeout(700)
    pg.get_by_role('button', name='Replay the story').click(); pg.wait_for_timeout(1500)
    print('replay title card:', S(pg,"document.querySelector('.bs-title-card p')?.innerText"))
    pg.get_by_role('button', name='Skip intro').click()
    print('back to command:', wait_until(pg,"document.querySelector('.bs-place h2')?.innerText.includes('Command')"))
    print('LOGS:', '\n'.join(l for l in logs if 'Clock' not in l)[:500])
    b.close()
