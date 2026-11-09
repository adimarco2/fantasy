"""Genera outputs/dashboard.html a partir de lo que escribe qb_2026.py.

Uso:  python qb_2026.py  &&  python dashboard.py [TEST]
El HTML es un solo archivo, sin dependencias externas: se abre con doble clic.
"""
import json, os, re, sys
import pandas as pd

TEST = int(sys.argv[1]) if len(sys.argv) > 1 else int(re.search(r'TEST, BT.*?= (\d{4})', open('qb_2026.py').read()).group(1))
MIN_G_TEST, TOP = 3, 12
O = 'outputs'
NOMBRES = {'Ingenuo': 'PPG año anterior', 'SoloADP': 'Solo ADP', 'Lineal': 'Regresión lineal', 'RF': 'Random Forest',
           'XGB': 'XGBoost', 'Lineal+ADP': 'Lineal + ADP', 'RF+ADP': 'Random Forest + ADP', 'XGB+ADP': 'XGBoost + ADP'}
recs = lambda df: json.loads(df.to_json(orient='records'))

bt = pd.read_csv(f'{O}/backtest.csv')
pr = pd.read_csv(f'{O}/prediccion_{TEST}.csv')
cmp_ = pd.read_csv(f'{O}/comparacion_{TEST}.csv') if os.path.exists(f'{O}/comparacion_{TEST}.csv') else pd.DataFrame()
det = pd.read_csv(f'{O}/backtest_detalle.csv') if os.path.exists(f'{O}/backtest_detalle.csv') else pd.DataFrame()
M = [m for m in bt.Modelo if m in pr.columns]
best = bt[bt.Modelo != 'Ingenuo'].sort_values('MAE').Modelo.iloc[0]  # misma regla que qb_2026.py

# MAE por temporada y modelo (backtest + temporada de prueba con >= MIN_G_TEST juegos)
ev = pd.concat([det, pr[pr.Real_rk.notna()].rename(columns={'PPG_real': 'y'}).assign(season=TEST)], ignore_index=True)
heat = [{'season': int(s), 'n': len(x), **{m: float((x[m] - x.y).abs().mean()) for m in M}} for s, x in ev.groupby('season')]

semana = None
f = f'nflverse/sw{TEST}.csv'
if os.path.exists(f):
    w = pd.read_csv(f, usecols=['season_type', 'week'], low_memory=False).query("season_type=='REG'")
    semana = int(w.week.max()) if len(w) else None

data = {'test': TEST, 'top': TOP, 'minG': MIN_G_TEST, 'best': best, 'nombres': NOMBRES, 'modelos': M, 'semana': semana,
        'bt_seasons': sorted(int(s) for s in det.season.unique()) if len(det) else [], 'n_bt': int(bt.N.iloc[0]),
        'backtest': recs(bt), 'comparacion': recs(cmp_) if len(cmp_) else [], 'pred': recs(pr), 'heat': heat}
html = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dashboard_template.html'), encoding='utf-8').read()
os.makedirs(O, exist_ok=True)
open(f'{O}/dashboard.html', 'w', encoding='utf-8').write(html.replace('__DATA__', json.dumps(data, ensure_ascii=False)))
print(f'Listo: {O}/dashboard.html')
