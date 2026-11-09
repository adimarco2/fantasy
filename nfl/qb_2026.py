import os, re, urllib.request as u, numpy as np, pandas as pd
from scipy.stats import spearmanr
from sklearn.ensemble import RandomForestRegressor as RF
from sklearn.impute import SimpleImputer as SI
from sklearn.linear_model import LinearRegression as LR
from sklearn.pipeline import make_pipeline as mp
from sklearn.preprocessing import StandardScaler as SS
from xgboost import XGBRegressor as XGB

TEST, BT, MIN_G, MIN_G_TEST, MIN_ATT, TOP = 2026, [2022, 2023, 2024, 2025], 5, 3, 15, 12  # Para 2027: TEST=2027, BT agrega 2026 y adp_hist.csv trae Season=2027 con Team
B = 'https://github.com/nflverse/nflverse-data/releases/download/'
SRC = {'games': 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv', 'draft': B + 'draft_picks/draft_picks.csv', **{f'sw{y}': B + f'stats_player/stats_player_week_{y}.csv' for y in range(2015, TEST + 1)}}
for x in ('nflverse', 'outputs'): os.makedirs(x, exist_ok=True)
def get(k):
    f = f'nflverse/{k}.csv'
    try:
        if not os.path.exists(f) or k in ('games', f'sw{TEST}', f'sw{TEST - 1}'): u.urlretrieve(SRC[k], f)
    except Exception: print('No disponible:', k)
    return pd.read_csv(f, low_memory=False) if os.path.exists(f) else pd.DataFrame()
norm = lambda s: ' '.join(re.sub(r'\b(jr|sr|ii|iii|iv)\b', '', re.sub(r'[^a-z ]', '', s.lower())).split())

# 1. Temporadas por QB (solo juegos con >= MIN_ATT intentos). Puntaje estandar de nflverse: 4 por TD de pase
raw = pd.concat(get(k) for k in SRC if k.startswith('sw')).query("season_type=='REG' and position=='QB'").copy()
sw = raw[raw.attempts >= MIN_ATT].assign(P=lambda d: d.player_display_name.map(norm)).sort_values(['P', 'season', 'week'])
a = sw.groupby(['P', 'season']).agg(T0=('team', 'first'), TL=('team', 'last'), G=('week', 'size'), PPG=('fantasy_points', 'mean'), Att=('attempts', 'mean'), PaYd=('passing_yards', 'mean'), PaTD=('passing_tds', 'mean'), INT=('passing_interceptions', 'mean'), Car=('carries', 'mean'), RuYd=('rushing_yards', 'mean'), RuTD=('rushing_tds', 'mean'), CPOE=('passing_cpoe', 'mean'), A=('attempts', 'sum'), S=('sacks_suffered', 'sum'), E=('passing_epa', 'sum'), Air=('passing_air_yards', 'sum')).reset_index()
a = a.assign(EPA=a.E / (a.A + a.S), aDOT=a.Air / a.A, SkR=a.S / (a.A + a.S), PG=a.PPG * a.G)
a['PPG2y'] = a.groupby('P').PG.transform(lambda s: s.rolling(2, min_periods=1).sum()) / a.groupby('P').G.transform(lambda s: s.rolling(2, min_periods=1).sum())
ST = ['G', 'PPG', 'PPG2y', 'Att', 'PaYd', 'PaTD', 'INT', 'Car', 'RuYd', 'RuTD', 'CPOE', 'EPA', 'aDOT', 'SkR']

# 2. SOS sin fuga: puntos que cada rival permitio a QBs la temporada ANTERIOR, promediados sobre el calendario
g = get('games').query("game_type=='REG'")
al = raw.groupby(['season', 'opponent_team', 'week']).fantasy_points.sum().groupby(['season', 'opponent_team']).mean().rename('al').reset_index().assign(season=lambda d: d.season + 1).rename(columns={'opponent_team': 'opp'})
s = pd.concat([g[['season', 'home_team', 'away_team']].set_axis(['season', 'Team', 'opp'], axis=1), g[['season', 'away_team', 'home_team']].set_axis(['season', 'Team', 'opp'], axis=1)]).merge(al, 'left').groupby(['season', 'Team'], as_index=False).al.mean().rename(columns={'al': 'SOS'})

# 3. Base: objetivo en t, ADP previo a t, ultima temporada jugada antes de t (merge_asof), draft y equipo
adp = pd.read_csv('adp_hist.csv').rename(columns={'Season': 'season', 'Team': 'AT'}).assign(P=lambda d: d.Player.map(norm)); adp['ADP_rk'] = adp.groupby('season').ADP.rank()
dr = get('draft').query("position=='QB'").assign(P=lambda d: d.pfr_player_name.map(norm)).sort_values('season').drop_duplicates('P', keep='last')[['P', 'season', 'pick', 'age']].set_axis(['P', 'DY', 'Pick', 'AgeD'], axis=1)
d = a[['P', 'season', 'T0', 'G', 'PPG']].rename(columns={'G': 'Gt', 'PPG': 'y'}).merge(adp[['P', 'season', 'Player', 'ADP', 'AT', 'ADP_rk']], 'outer', ['P', 'season']).sort_values(['season', 'P'])
d = pd.merge_asof(d, a[['P', 'season', 'TL', *ST]].rename(columns={'season': 'prev'}).sort_values('prev'), by='P', left_on='season', right_on='prev', allow_exact_matches=False).merge(dr, 'left', 'P')
d = d.assign(Team=d.AT.fillna(d.T0), Pick=d.Pick.fillna(260), Age=d.AgeD + d.season - d.DY, Rookie=(d.season == d.DY).astype(int), Gap=d.season - d.prev).merge(s, 'left', ['season', 'Team']).assign(NewTeam=lambda x: (x.Team != x.TL).astype(int), Player=lambda x: x.Player.fillna(x.P))
S = ST + ['Pick', 'Age', 'Rookie', 'Gap', 'SOS', 'NewTeam']

# 4. Modelos: cada temporada se predice entrenando solo con temporadas anteriores; informacion disponible antes de semana 1
rf = lambda: RF(500, min_samples_leaf=5, max_features=.33, n_jobs=-1, random_state=0)
xg = lambda: XGB(n_estimators=250, learning_rate=.03, max_depth=2, subsample=.8, colsample_bytree=.6, min_child_weight=5, reg_lambda=10, random_state=0)
SPEC = {'SoloADP': (LR, ['ADP_rk']), 'Lineal': (LR, S), 'RF': (rf, S), 'XGB': (xg, S), 'Lineal+ADP': (LR, S + ['ADP_rk']), 'RF+ADP': (rf, S + ['ADP_rk']), 'XGB+ADP': (xg, S + ['ADP_rk'])}
def run(y):
    tr, te = d[(d.season < y) & (d.season >= 2016) & (d.Gt >= MIN_G)], d[(d.season == y) & d.ADP_rk.notna()].copy()
    te['Ingenuo'] = te.PPG.fillna(tr.y.mean())
    for n, (m, f) in SPEC.items():
        t = tr[tr.ADP_rk.notna()] if 'ADP_rk' in f else tr
        te[n] = mp(SI(), SS(), m()).fit(t[f], t.y).predict(te[f])
    return te
def ev(o, n):
    top = lambda x: x.nlargest(TOP, n).y.mean(); hit = lambda x: x.nlargest(TOP, n).index.isin(x.nlargest(TOP, 'y').index).mean(); e = o[n] - o.y; G = o.groupby('season')
    return {'Modelo': n, 'N': len(o), 'MAE': e.abs().mean(), 'RMSE': (e ** 2).mean() ** .5, 'R2': 1 - (e ** 2).sum() / ((o.y - o.y.mean()) ** 2).sum(), 'Spearman': np.mean([spearmanr(x.y, x[n])[0] for _, x in G]), f'Acierto_Top{TOP}': G.apply(hit, include_groups=False).mean(), f'PPG_real_Top{TOP}': G.apply(top, include_groups=False).mean()}
N = ['Ingenuo', *SPEC]
bt = pd.concat(run(y) for y in BT); bt = bt[bt.Gt >= MIN_G]
rb = pd.DataFrame(ev(bt, n) for n in N).round(3); best = rb[rb.Modelo != 'Ingenuo'].sort_values('MAE').Modelo.iloc[0]
rb.to_csv('outputs/backtest.csv', index=False); bt[['season', 'Player', 'y', 'Gt', 'ADP_rk', *N]].to_csv('outputs/backtest_detalle.csv', index=False); print(f'BACKTEST {BT[0]}-{BT[-1]}\n', rb.to_string(index=False), '\nMejor en backtest:', best)

# 5. Prediccion TEST vs realidad y draft board
p = run(TEST).assign(Proy=lambda x: x[best]); p['Proy_rk'] = p.Proy.rank(ascending=False).astype(int); p['Valor_vs_ADP'] = p.ADP_rk - p.Proy_rk
v = p[p.Gt >= MIN_G_TEST]; p['Real_rk'] = v.y.rank(ascending=False)
out = p.sort_values('Proy_rk')[['Proy_rk', 'Player', 'Team', 'ADP', 'ADP_rk', 'Valor_vs_ADP', 'Proy', *N, 'y', 'Gt', 'Real_rk']].rename(columns={'y': 'PPG_real', 'Gt': 'G_real'}).round(2)
out.to_csv(f'outputs/prediccion_{TEST}.csv', index=False); print(out[['Proy_rk', 'Player', 'Team', 'ADP_rk', 'Valor_vs_ADP', 'Proy', 'PPG_real', 'G_real', 'Real_rk']].to_string(index=False))
if len(v): rt = pd.DataFrame(ev(v, n) for n in N).round(3); rt.to_csv(f'outputs/comparacion_{TEST}.csv', index=False); print(f'\nREALIDAD {TEST} (QBs con >= {MIN_G_TEST} juegos)\n', rt.to_string(index=False))
