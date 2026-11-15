import sys; sys.path.insert(0,'/tmp/bs')
from lib import *
with sync_playwright() as p:
    b, pg, logs = open_page(p, 960, 540)
    pg.wait_for_timeout(2500)
    go_surface(pg, 'moon')
    tp(pg, 20, 50, 0.38); step(pg); grab(pg,'/tmp/bs/g1.png')
    tp(pg, 70, 232, 3.14+0.3); step(pg); grab(pg,'/tmp/bs/g2.png')
    tp(pg, -140, -150, 3.14+0.45); step(pg); grab(pg,'/tmp/bs/g3.png')   # toward PSR
    print('\n'.join(logs[:10]))
    b.close()
