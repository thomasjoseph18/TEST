import sys, json, time; sys.path.insert(0,'/tmp/bs')
from lib import *
def S(pg, expr): return pg.evaluate(expr)
def wait_until(pg, expr, timeout=60, step=400):
    t0=time.time()
    while time.time()-t0<timeout:
        if pg.evaluate(expr): return True
        pg.wait_for_timeout(step)
    return False
SAVE="window.__bsGame.saveRef.current"
with sync_playwright() as p:
    b, pg, logs = open_page(p, 480, 270)
    pg.wait_for_timeout(2500)
    pg.get_by_role('button', name='Skip intro').click(); pg.wait_for_timeout(3000)
    S(pg,"window.__bsGame.act.updateSettings({lowPerformanceMode:true})")
    S(pg,"window.__bsGame.dispatch({type:'OPEN_NAVIGATION'})"); pg.wait_for_timeout(400)
    S(pg,"window.__bsGame.dispatch({type:'ENTER_HABITAT'})"); pg.wait_for_timeout(2500)
    S(pg,"window.__bsGame.dispatch({type:'ENTER_SURFACE'})")
    wait_until(pg,"document.querySelector('.bs-place h2')?.innerText.includes('Shackleton')",40); pg.wait_for_timeout(3000)
    # --- rover
    tp(pg, 11, 13.5, 0); pg.wait_for_timeout(1200)
    print('A rover prompt:', S(pg,"document.querySelector('.bs-prompt')?.innerText"))
    pg.keyboard.press('KeyE'); pg.wait_for_timeout(1200)
    print('B driving dash visible:', S(pg,"!!document.querySelector('.bs-roverdash')"))
    pg.keyboard.down('KeyW'); pg.wait_for_timeout(7000)
    spd=S(pg,"document.querySelector('.bs-roverdash big')?.innerText"); print('C speed km/h while holding W:', spd)
    pg.keyboard.up('KeyW'); pg.keyboard.down('Space'); pg.wait_for_timeout(5000); pg.keyboard.up('Space')
    print('D speed after brake:', S(pg,"document.querySelector('.bs-roverdash big')?.innerText"))
    print('E battery after driving:', S(pg, SAVE+".field.moon.rover.battery"))
    pg.keyboard.press('KeyE'); pg.wait_for_timeout(1500)
    print('F exited rover (dash gone):', S(pg,"!document.querySelector('.bs-roverdash')"))
    # --- site task: Apollo memorial
    tp(pg, 38, 43.2, 3.1416); pg.wait_for_timeout(1500)
    print('G prompt:', S(pg,"document.querySelector('.bs-prompt')?.innerText"))
    pg.keyboard.down('KeyE')
    ok = wait_until(pg,"document.querySelector('[role=dialog]')?.getAttribute('aria-label')==='Apollo 11 Heritage Memorial (Tranquility Base Replica)' || !!document.querySelector('[role=dialog]')", 60, 500)
    pg.keyboard.up('KeyE')
    print('H site dialog:', S(pg,"document.querySelector('[role=dialog]')?.getAttribute('aria-label')"))
    pg.get_by_role('button', name='1969').click(); pg.wait_for_timeout(600)
    print('I xp/quiz:', S(pg,"JSON.stringify({xp:"+SAVE+".game.xp, q:"+SAVE+".game.quizCorrect, sites:"+SAVE+".completedSites})"))
    pg.get_by_role('button', name='Continue exploring').click(); pg.wait_for_timeout(500)
    # --- sol cycle via the real bunk logic
    S(pg,"window.__bsGame.api.sleep()"); pg.wait_for_timeout(800)
    print('J sol panel:', S(pg,"document.querySelector('[role=dialog]')?.getAttribute('aria-label')"), S(pg, SAVE+".simulations.moon.currentSol"))
    pg.get_by_role('button', name='Start the day').click(); pg.wait_for_timeout(400)
    print('K field after sol:', S(pg,"JSON.stringify(("+SAVE+").field.moon, (k,v)=>typeof v==='number'?Math.round(v*10)/10:v)")[:260])
    # run the rest of the mission on autopilot until it ends
    for i in range(8):
        S(pg,"window.__bsGame.act.fastForward(5)"); pg.wait_for_timeout(500)
        lbl=S(pg,"document.querySelector('[role=dialog]')?.getAttribute('aria-label')")
        btn = 'Open the debrief' if S(pg,"[...document.querySelectorAll('button')].some(b=>b.innerText==='Open the debrief')") else 'Start the day'
        if S(pg,"[...document.querySelectorAll('button')].some(b=>b.innerText==='"+btn+"')"):
            pg.get_by_role('button', name=btn).click(); pg.wait_for_timeout(600)
        if btn=='Open the debrief': break
    ok = wait_until(pg,"!!document.querySelector('[aria-label=\"Mission debrief\"]')", 30)
    print('L debrief shown:', ok, S(pg,"document.querySelector('[aria-label=\"Mission debrief\"] h2')?.innerText"))
    print('M sol/status:', S(pg, SAVE+".simulations.moon.currentSol"), S(pg, SAVE+".simulations.moon.missionStatus"), 'moonTrainingComplete', S(pg, SAVE+".progress.moonTrainingComplete"))
    print('LOGS:', '\n'.join(l for l in logs if 'Clock' not in l)[:1500])
    b.close()
