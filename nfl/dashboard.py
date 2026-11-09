"""Genera outputs/dashboard.html a partir de lo que escribe proyecciones.py.

Uso:  python proyecciones.py  &&  python dashboard.py
El HTML es un solo archivo, sin dependencias externas: se abre con doble clic.
"""
import json, os, re
import pandas as pd

O = 'outputs'
TEST = int(re.search(r'TEST, BT.*?= (\d{4})', open('proyecciones.py', encoding='utf-8').read()).group(1))
POSS, MIN_G_TEST = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'], 3
TOP = {'QB': 12, 'RB': 24, 'WR': 24, 'TE': 12, 'K': 12, 'DST': 12}
NOMBRES = {'Ingenuo': 'PPG año anterior', 'SoloECR': 'Solo ECR (mercado)', 'SoloADP': 'Solo ADP', 'Lineal': 'Regresión lineal', 'RF': 'Random Forest',
           'XGB': 'XGBoost', 'Lineal+ECR': 'Lineal + ECR', 'RF+ECR': 'Random Forest + ECR', 'XGB+ECR': 'XGBoost + ECR'}
recs = lambda df: json.loads(df.to_json(orient='records'))
leer = lambda f: pd.read_csv(f) if os.path.exists(f) else pd.DataFrame()

pos_data = {}
for p in POSS:
    d = f'{O}/{p}'
    bt, pr, cmp_, det = leer(f'{d}/backtest.csv'), leer(f'{d}/prediccion_{TEST}.csv'), leer(f'{d}/comparacion_{TEST}.csv'), leer(f'{d}/backtest_detalle.csv')
    M = list(bt.Modelo)
    el = leer(f'{O}/elegidos.csv')  # la elección exacta del script (backtest.csv está redondeado)
    best = el.set_index('pos').elegido[p] if len(el) else bt[bt.Modelo != 'Ingenuo'].sort_values('MAE').Modelo.iloc[0]
    ev = pd.concat([det, pr[pr.Real_rk.notna()].rename(columns={'PPG_real': 'y'}).assign(season=TEST)], ignore_index=True)
    heat = [{'season': int(s), 'n': len(x), **{m: float((x[m] - x.y).abs().mean()) for m in M}} for s, x in ev.groupby('season')]
    pos_data[p] = {'best': best, 'modelos': M, 'top': TOP[p], 'n_bt': int(bt.N.iloc[0]), 'bt_seasons': sorted(int(s) for s in det.season.unique()),
                   'backtest': recs(bt), 'comparacion': recs(cmp_), 'pred': recs(pr), 'heat': heat}

semana = None
if os.path.exists(f'nflverse/sw{TEST}.csv'):
    w = pd.read_csv(f'nflverse/sw{TEST}.csv', usecols=['season_type', 'week'], low_memory=False).query("season_type=='REG'")
    semana = int(w.week.max()) if len(w) else None
sim = leer(f'{O}/simulacion_draft.csv')
data = {'test': TEST, 'minG': MIN_G_TEST, 'semana': semana, 'nombres': NOMBRES, 'poss': POSS, 'pos': pos_data,
        'tablero': recs(leer(f'{O}/tablero_{TEST}.csv')), 'reemplazo': recs(leer(f'{O}/reemplazo.csv').query('season == @TEST')),
        'sim': recs(sim.groupby(['estrategia', 'season'], as_index=False).agg(dif=('dif', 'mean'), lugar=('lugar', 'mean'))) if len(sim) else [],
        'rivales': {int(k): v for k, v in sim.groupby('season').rivales.first().items()} if 'rivales' in sim else {},
        'mercado': recs(leer(f'{O}/mercado_adp_vs_ecr.csv')),
        'sim_sd': float(sim[~sim.estrategia.str.contains('control')].dif.std()) if len(sim) else None}
html = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dashboard_template.html'), encoding='utf-8').read()
os.makedirs(O, exist_ok=True)
open(f'{O}/dashboard.html', 'w', encoding='utf-8').write(html.replace('__DATA__', json.dumps(data, ensure_ascii=False)))
print(f'Listo: {O}/dashboard.html')
