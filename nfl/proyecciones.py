"""Proyecciones para todas las posiciones, valor sobre reemplazo (VOR) y simulación de draft.

Liga: 12 equipos, Full PPR, snake, titulares 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX (RB/WR/TE), 1 K, 1 DST.
Uso:  python proyecciones.py  &&  python dashboard.py
Mismo método que qb_2026.py: cada temporada se predice entrenando solo con temporadas anteriores e
información disponible antes de la semana 1. La base "de mercado" de cada posición es el ranking de
consenso de expertos de FantasyPros (ECR) del último corte antes de la semana 1 (archivo histórico de
DynastyProcess). Para QB también se usa adp_hist.csv si existe.
"""
import os, re, time, urllib.request as u, numpy as np, pandas as pd
from scipy.stats import spearmanr
from sklearn.ensemble import RandomForestRegressor as RF
from sklearn.impute import SimpleImputer as SI
from sklearn.linear_model import LinearRegression as LR
from sklearn.pipeline import make_pipeline as mp
from sklearn.preprocessing import StandardScaler as SS
from xgboost import XGBRegressor as XGB

TEST, BT, MIN_G, MIN_G_TEST, FIRST = 2026, [2022, 2023, 2024, 2025], 5, 3, 2016  # Para 2027: TEST=2027 y agrega 2026 a BT
LIGA = {'equipos': 12, 'QB': 1, 'RB': 2, 'WR': 2, 'TE': 1, 'FLEX': 1, 'K': 1, 'DST': 1, 'banca': 6}
FLEX, POSS = ['RB', 'WR', 'TE'], ['QB', 'RB', 'WR', 'TE', 'K', 'DST']
MAXPOS = {'QB': 2, 'RB': 7, 'WR': 7, 'TE': 2, 'K': 1, 'DST': 1}   # tope por posición en la simulación de draft
CAP = {'QB': 32, 'RB': 60, 'WR': 72, 'TE': 32, 'K': 24, 'DST': 32}  # universo evaluado: top N del ECR de la posición
PAGE = {'QB': 'qb', 'RB': 'ppr-rb', 'WR': 'ppr-wr', 'TE': 'ppr-te', 'K': 'k', 'DST': 'dst', 'ALL': 'ppr'}
TM = {'JAC': 'JAX', 'LAR': 'LA', 'OAK': 'LV', 'STL': 'LA', 'SD': 'LAC', 'WSH': 'WAS'}


# Puntaje. QB/RB/WR/TE: fantasy_points_ppr de nflverse (4 por TD de pase, 1 por recepción).
# K y DST: SUPUESTOS de puntaje común; cámbialos si tu liga usa otros.
def k_pts(x):
    f = lambda c: x[c].fillna(0)
    return 3 * (f('fg_made_0_19') + f('fg_made_20_29') + f('fg_made_30_39')) + 4 * f('fg_made_40_49') + 5 * (f('fg_made_50_59') + f('fg_made_60_')) \
        + f('pat_made') - f('fg_missed') - f('pat_missed')
def dst_pts(x):
    f = lambda c: x[c].fillna(0)
    pa = np.select([x.PA == 0, x.PA <= 6, x.PA <= 13, x.PA <= 20, x.PA <= 27, x.PA <= 34], [10, 7, 4, 1, 0, -1], -4)
    return f('def_sacks') + 2 * (f('def_interceptions') + f('fumble_recovery_opp') + f('def_safeties') + f('def_fg_blocks') + f('def_punt_blocks')) + 6 * x.TD + pa


B = 'https://github.com/nflverse/nflverse-data/releases/download/'
YRS = range(2015, TEST + 1)
SRC = {'games': 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv', 'draft': B + 'draft_picks/draft_picks.csv',
       'ecr': 'https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_fpecr.parquet',
       **{f'sw{y}': B + f'stats_player/stats_player_week_{y}.csv' for y in YRS}, **{f'st{y}': B + f'stats_team/stats_team_week_{y}.csv' for y in YRS}}
for x in ('nflverse', 'outputs'): os.makedirs(x, exist_ok=True)
def get(k):
    f = f'nflverse/{k}.' + ('parquet' if k == 'ecr' else 'csv')
    fresh = k in ('games', 'ecr', f'sw{TEST}', f'st{TEST}', f'sw{TEST - 1}', f'st{TEST - 1}')
    try:
        if not os.path.exists(f) or (fresh and time.time() - os.path.getmtime(f) > 6 * 3600): u.urlretrieve(SRC[k], f)
    except Exception: print('No disponible:', k)
    if not os.path.exists(f): return pd.DataFrame()
    return pd.read_parquet(f) if f.endswith('parquet') else pd.read_csv(f, low_memory=False)
norm = lambda s: ' '.join(re.sub(r'\b(jr|sr|ii|iii|iv|v)\b', '', re.sub(r'[^a-z ]', '', str(s).lower())).split())

# ---------- 1. Partido a partido, todas las posiciones ----------
g = get('games').query("game_type=='REG'").copy()
for c in ('home_team', 'away_team'): g[c] = g[c].replace(TM)
gl = pd.concat([g[['season', 'week', 'home_team', 'away_team', 'home_score', 'away_score']].set_axis(['season', 'week', 'team', 'opp', 'PF', 'PA'], axis=1),
                g[['season', 'week', 'away_team', 'home_team', 'away_score', 'home_score']].set_axis(['season', 'week', 'team', 'opp', 'PF', 'PA'], axis=1)])
KO = pd.to_datetime(g[g.week == 1].groupby('season').gameday.min())

raw = pd.concat(get(f'sw{y}') for y in YRS).query("season_type=='REG' and position in ['QB','RB','WR','TE','K']").copy()
raw = raw.assign(pos=raw.position, team=raw.team.replace(TM), opp=raw.opponent_team.replace(TM), P=raw.player_display_name.map(norm), name=raw.player_display_name)
raw['fg_att_40p'] = sum(raw[f'fg_{m}_{r}'].fillna(0) for m in ('made', 'missed') for r in ('40_49', '50_59', '60_'))
raw['PTS'] = np.where(raw.pos == 'K', k_pts(raw), raw.fantasy_points_ppr)

st = pd.concat(get(f'st{y}') for y in YRS).query("season_type=='REG'").copy()
st['team'] = st.team.replace(TM)
dst = gl.dropna(subset=['PA']).merge(st, 'left', ['season', 'week', 'team'])
dst = dst.assign(TD=dst.def_tds.fillna(0) + dst.special_teams_tds.fillna(0), pos='DST', P=dst.team, name=dst.team)
dst['PTS'] = dst_pts(dst)
GM = pd.concat([raw, dst], ignore_index=True)

# ---------- 2. Temporadas por jugador y posición ----------
AGG = {'QB': {'Att': 'attempts', 'PaYd': 'passing_yards', 'PaTD': 'passing_tds', 'INT': 'passing_interceptions', 'Car': 'carries', 'RuYd': 'rushing_yards', 'RuTD': 'rushing_tds', 'CPOE': 'passing_cpoe'},
       'RB': {'Car': 'carries', 'RuYd': 'rushing_yards', 'RuTD': 'rushing_tds', 'Tgt': 'targets', 'Rec': 'receptions', 'ReYd': 'receiving_yards', 'ReTD': 'receiving_tds', 'TS': 'target_share'},
       'WR': {'Tgt': 'targets', 'Rec': 'receptions', 'ReYd': 'receiving_yards', 'ReTD': 'receiving_tds', 'TS': 'target_share', 'AYS': 'air_yards_share', 'WOPR': 'wopr', 'Car': 'carries'},
       'TE': {'Tgt': 'targets', 'Rec': 'receptions', 'ReYd': 'receiving_yards', 'ReTD': 'receiving_tds', 'TS': 'target_share', 'AYS': 'air_yards_share', 'WOPR': 'wopr'},
       'K': {'FGA': 'fg_att', 'FGM': 'fg_made', 'PATA': 'pat_att'},
       'DST': {'Sk': 'def_sacks', 'INT': 'def_interceptions', 'FR': 'fumble_recovery_opp', 'TD': 'TD', 'PA': 'PA'}}
RATIO = {'QB': [('EPA', 'passing_epa', ['attempts', 'sacks_suffered']), ('aDOT', 'passing_air_yards', ['attempts']), ('SkR', 'sacks_suffered', ['attempts', 'sacks_suffered'])],
         'RB': [('YPC', 'rushing_yards', ['carries']), ('rEPA', 'rushing_epa', ['carries'])],
         'WR': [('aDOT', 'receiving_air_yards', ['targets']), ('YPT', 'receiving_yards', ['targets']), ('rEPA', 'receiving_epa', ['targets'])],
         'K': [('FGpct', 'fg_made', ['fg_att']), ('Long', 'fg_att_40p', ['fg_att'])], 'DST': []}
RATIO['TE'] = RATIO['WR']
# "Juego jugado" por posición (para QB es el mismo filtro de qb_2026.py)
PLAYED = {'QB': lambda x: x.attempts >= 15, 'RB': lambda x: x.carries.fillna(0) + x.targets.fillna(0) >= 5, 'WR': lambda x: x.targets >= 3,
          'TE': lambda x: x.targets >= 2, 'K': lambda x: x.fg_att.fillna(0) + x.pat_att.fillna(0) >= 1, 'DST': lambda x: x.PTS.notna()}

def temporadas(gm, pos):
    x = gm[PLAYED[pos](gm)].sort_values(['P', 'season', 'week'])
    agg = {'T0': ('team', 'first'), 'TL': ('team', 'last'), 'G': ('week', 'size'), 'PPG': ('PTS', 'mean'), **{k: (c, 'mean') for k, c in AGG[pos].items()}}
    for _, num, den in RATIO[pos]:
        for c in [num, *den]: agg['_' + c] = (c, 'sum')
    a = x.groupby(['P', 'season']).agg(**agg).reset_index()
    for n, num, den in RATIO[pos]: a[n] = (a['_' + num] / sum(a['_' + c] for c in den)).replace([np.inf, -np.inf], np.nan)
    a['PG'] = a.PPG * a.G
    a['PPG2y'] = a.groupby('P').PG.transform(lambda s: s.rolling(2, min_periods=1).sum()) / a.groupby('P').G.transform(lambda s: s.rolling(2, min_periods=1).sum())
    return a, ['G', 'PPG', 'PPG2y', *AGG[pos], *[r[0] for r in RATIO[pos]]]

# ---------- 3. Mercado: ECR de FantasyPros antes de la semana 1 (y ADP de QB si existe) ----------
e = get('ecr')
e = e[e.fp_page.str.contains('cheatsheets', na=False)].assign(scrape_date=lambda x: pd.to_datetime(x.scrape_date))
e['page'] = e.fp_page.str.extract(r'(?:/nfl/rankings/)?([a-z-]+)-cheatsheets')[0]
cortes = []
for s, ko in KO.items():
    x = e[(e.scrape_date < ko) & (e.scrape_date >= ko - pd.Timedelta(days=60))]
    if len(x): cortes.append(x[x.scrape_date == x.scrape_date.max()].assign(season=s))
E = pd.concat(cortes)
E = E.assign(team=E.team.replace(TM), P=np.where(E.pos == 'DST', E.team.replace(TM), E.player.map(norm)))
ovr = E[E.page == PAGE['ALL']].assign(pos=lambda x: x.pos.str.replace(r'\d', '', regex=True)).drop_duplicates(['season', 'pos', 'P'])[['season', 'pos', 'P', 'ecr']].rename(columns={'ecr': 'ECR_ovr'})
FECHAS = {int(s): str(x.scrape_date.max().date()) for s, x in E.groupby('season')}
ADP = pd.read_csv('adp_hist.csv').rename(columns={'Season': 'season'}).assign(P=lambda d: d.Player.map(norm)) if os.path.exists('adp_hist.csv') else None
if ADP is not None: ADP['ADP_rk'] = ADP.groupby('season').ADP.rank()

dr = get('draft').assign(P=lambda d: d.pfr_player_name.map(norm)).sort_values('season').drop_duplicates(['P', 'position'], keep='last')
dr = dr[['P', 'position', 'season', 'pick', 'age']].set_axis(['P', 'pos', 'DY', 'Pick', 'AgeD'], axis=1)
TP = gl.groupby(['season', 'team'], as_index=False).PF.mean().assign(season=lambda d: d.season + 1).rename(columns={'team': 'Team', 'PF': 'TmPts'})

def base(pos):
    gm = GM[GM.pos == pos]
    a, ST = temporadas(gm, pos)
    al = gm.groupby(['season', 'opp', 'week']).PTS.sum().groupby(['season', 'opp']).mean().rename('al').reset_index().assign(season=lambda d: d.season + 1)
    sos = gl[['season', 'team', 'opp']].merge(al, 'left').groupby(['season', 'team'], as_index=False).al.mean().set_axis(['season', 'Team', 'SOS'], axis=1)
    tot = gm.groupby(['P', 'season']).agg(Ptot=('PTS', 'sum'), name=('name', 'last')).reset_index()
    m = E[E.page == PAGE[pos]].drop_duplicates(['season', 'P'])[['season', 'P', 'player', 'team', 'ecr']].rename(columns={'player': 'Player', 'team': 'ET', 'ecr': 'ECR'})
    m['ECR_rk'] = m.groupby('season').ECR.rank(method='first')
    m = m.merge(ovr[ovr.pos == pos].drop(columns='pos'), 'left', ['season', 'P'])
    if pos == 'QB' and ADP is not None:
        m = m.merge(ADP[['season', 'P', 'Player', 'ADP', 'ADP_rk']].rename(columns={'Player': 'PA_'}), 'outer', ['season', 'P'])
        m['Player'] = m.Player.fillna(m.PA_)
    d = a[['P', 'season', 'T0', 'G', 'PPG']].rename(columns={'G': 'Gt', 'PPG': 'y'}).merge(m, 'outer', ['P', 'season']).merge(tot, 'left', ['P', 'season']).sort_values(['season', 'P'])
    d = pd.merge_asof(d, a[['P', 'season', 'TL', *ST]].rename(columns={'season': 'prev'}).sort_values('prev'), by='P', left_on='season', right_on='prev', allow_exact_matches=False)
    d = d.merge(dr[dr.pos == pos].drop(columns='pos'), 'left', 'P')
    d = d.assign(Team=d.ET.fillna(d.T0), Pick=d.Pick.fillna(260), Age=d.AgeD + d.season - d.DY, Rookie=(d.season == d.DY).astype(int), Gap=d.season - d.prev,
                 ECR_log=np.log(d.ECR_rk), Player=d.Player.fillna(d.name).fillna(d.P))
    d = d.merge(sos, 'left', ['season', 'Team']).merge(TP, 'left', ['season', 'Team']).assign(NewTeam=lambda x: (x.Team != x.TL).astype(int))
    extra = {'DST': ['Gap', 'SOS', 'TmPts'], 'K': ['Gap', 'SOS', 'TmPts', 'NewTeam']}.get(pos, ['Pick', 'Age', 'Rookie', 'Gap', 'SOS', 'TmPts', 'NewTeam'])
    d['univ'] = d.ECR_rk <= CAP[pos]
    d['eval'] = d.univ
    if pos == 'QB' and ADP is not None:  # QB se evalúa sobre la lista de ADP, como en qb_2026.py
        d['univ'] = d.univ | d.ADP_rk.notna(); d['eval'] = d.ADP_rk.notna()
    return d, ST + extra

# ---------- 4. Modelos y evaluación (igual que qb_2026.py) ----------
rf = lambda: RF(400, min_samples_leaf=5, max_features=.33, n_jobs=-1, random_state=0)
xg = lambda: XGB(n_estimators=250, learning_rate=.03, max_depth=2, subsample=.8, colsample_bytree=.6, min_child_weight=5, reg_lambda=10, random_state=0)
MK = ['ECR_rk', 'ECR_log']
def spec(pos, S):
    s = {'SoloECR': (LR, MK)}
    if pos == 'QB' and ADP is not None: s['SoloADP'] = (LR, ['ADP_rk'])
    return {**s, 'Lineal': (LR, S), 'RF': (rf, S), 'XGB': (xg, S), 'Lineal+ECR': (LR, S + MK), 'RF+ECR': (rf, S + MK), 'XGB+ECR': (xg, S + MK)}
def run(d, SP, y):
    tr, te = d[(d.season < y) & (d.season >= FIRST) & (d.Gt >= MIN_G)], d[(d.season == y) & d.univ].copy()
    te['Ingenuo'] = te.PPG.fillna(tr.y.mean())
    for n, (m, f) in SP.items():
        mkt = [c for c in f if c in ('ECR_rk', 'ECR_log', 'ADP_rk')]
        t = tr.dropna(subset=mkt) if mkt else tr
        te[n] = mp(SI(), SS(), m()).fit(t[f], t.y).predict(te[f])
    # Juegos esperados: promedio histórico (temporadas < y) de juegos jugados según el tramo del ECR, escalado a 17
    h = d[(d.season < y) & (d.season >= 2020) & d.univ].assign(fr=lambda x: x.Gt.fillna(0) / np.where(x.season <= 2020, 16, 17))
    tier = lambda r: pd.cut(r, [0, 6, 12, 24, 36, 999], labels=False)
    eg = h.groupby(tier(h.ECR_rk.fillna(999))).fr.mean() * 17
    te['EG'] = tier(te.ECR_rk.fillna(999)).map(eg).fillna(h.fr.mean() * 17)
    return te
def ev(o, n, top):
    G = o.groupby('season'); e = o[n] - o.y
    hit = lambda x: x.nlargest(top, n).index.isin(x.nlargest(top, 'y').index).mean()
    return {'Modelo': n, 'N': len(o), 'MAE': e.abs().mean(), 'RMSE': (e ** 2).mean() ** .5, 'R2': 1 - (e ** 2).sum() / ((o.y - o.y.mean()) ** 2).sum(),
            'Spearman': np.mean([spearmanr(x.y, x[n])[0] for _, x in G]), 'Acierto_Top': G.apply(hit, include_groups=False).mean(),
            'PPG_real_Top': G.apply(lambda x: x.nlargest(top, n).y.mean(), include_groups=False).mean()}

TABLAS, RES = {}, []
for pos in POSS:
    d, S = base(pos); SP = spec(pos, S); N = ['Ingenuo', *SP]; top = LIGA['equipos'] * LIGA[pos]
    runs = {y: run(d, SP, y) for y in BT + [TEST]}
    bt = pd.concat(runs[y] for y in BT); btv = bt[(bt.Gt >= MIN_G) & bt['eval']]
    rb = pd.DataFrame(ev(btv, n, top) for n in N); best = rb[rb.Modelo != 'Ingenuo'].sort_values('MAE').Modelo.iloc[0]
    p = runs[TEST]; v = p[(p.Gt >= MIN_G_TEST) & p['eval']]
    rt = pd.DataFrame(ev(v, n, top) for n in N) if len(v) > top else pd.DataFrame()
    od = f'outputs/{pos}'; os.makedirs(od, exist_ok=True)
    rb.round(3).to_csv(f'{od}/backtest.csv', index=False)
    btv[['season', 'Player', 'y', 'Gt', *N]].to_csv(f'{od}/backtest_detalle.csv', index=False)
    if len(rt): rt.round(3).to_csv(f'{od}/comparacion_{TEST}.csv', index=False)
    p = p.assign(Proy=p[best], Proy_rk=p[best].rank(ascending=False, method='first').astype(int))
    p['Valor_vs_ECR'] = p.ECR_rk.rank(method='first') - p.Proy_rk
    p['Real_rk'] = v.y.rank(ascending=False)
    cols = ['Proy_rk', 'Player', 'Team', 'ECR', 'ECR_rk', *(['ADP', 'ADP_rk'] if 'SoloADP' in SP else []), 'Valor_vs_ECR', 'Proy', *N, 'EG', 'y', 'Gt', 'Real_rk', 'Ptot']
    p.sort_values('Proy_rk')[cols].rename(columns={'y': 'PPG_real', 'Gt': 'G_real', 'Ptot': 'Pts_real'}).round(2).to_csv(f'{od}/prediccion_{TEST}.csv', index=False)
    print(f'\n===== {pos}  (backtest {BT[0]}-{BT[-1]}, Top {top}) elegido: {best}\n', rb.round(3).to_string(index=False))
    if len(rt): print(f'--- {TEST} (>= {MIN_G_TEST} juegos)\n', rt.round(3).to_string(index=False))
    RES.append({'pos': pos, 'elegido': best})
    for y, t in runs.items():
        TABLAS.setdefault(y, []).append(t.assign(pos=pos, Proy=t[best], Merc=t.SoloECR)[['pos', 'P', 'Player', 'Team', 'ECR_rk', 'ECR_ovr', 'Proy', 'Merc', 'EG', 'y', 'Gt', 'Ptot']])
pd.DataFrame(RES).to_csv('outputs/elegidos.csv', index=False)

# ---------- 5. Valor sobre reemplazo (VOR) ----------
def vor(b, col):
    T = LIGA['equipos']; used = set()
    for p in POSS: used |= set(b[b.pos == p].nlargest(T * LIGA[p], col).index)
    used |= set(b[b.pos.isin(FLEX) & ~b.index.isin(used)].nlargest(T * LIGA['FLEX'], col).index)
    repl = {p: b[(b.pos == p) & ~b.index.isin(used)][col].max() for p in POSS}
    return b[col] - b.pos.map(repl), repl
TAB, REPL = {}, []
for y, ts in TABLAS.items():
    b = pd.concat(ts, ignore_index=True)
    b = b.assign(Pts=b.Proy * b.EG, PtsM=b.Merc * b.EG, Real=b.Ptot.fillna(0))
    b['VOR'], r1 = vor(b, 'Pts'); b['VOR_M'], r2 = vor(b, 'PtsM')
    REPL += [{'season': y, 'pos': p, 'repl_modelo': r1[p], 'repl_mercado': r2[p]} for p in POSS]
    TAB[y] = b
tb = TAB[TEST].sort_values('VOR', ascending=False).assign(Rank_VOR=lambda x: np.arange(1, len(x) + 1))
tb[['Rank_VOR', 'pos', 'Player', 'Team', 'ECR_ovr', 'ECR_rk', 'Proy', 'EG', 'Pts', 'VOR', 'VOR_M', 'y', 'Gt', 'Real']].round(2).to_csv(f'outputs/tablero_{TEST}.csv', index=False)
pd.DataFrame(REPL).round(2).to_csv('outputs/reemplazo.csv', index=False)

# ---------- 6. Simulación de draft snake ----------
# Los otros 11 equipos eligen por ECR general (lo más parecido al ADP que hay para todas las posiciones).
# Todos llenan primero sus titulares. Tú eliges según la estrategia; con 'ECR (control)' haces lo mismo que los
# otros, así que su diferencia debe salir 0 (sirve para verificar la simulación). Se mide con los puntos reales de la temporada de tu mejor alineación.
REQ = {p: LIGA[p] for p in POSS}
def permitidas(c, quedan):
    need = {p: max(0, REQ[p] - c[p]) for p in POSS}
    extra = sum(max(0, c[p] - REQ[p]) for p in FLEX); nf = max(0, LIGA['FLEX'] - extra)
    if quedan <= sum(need.values()) + nf:
        ok = {p for p in POSS if need[p] > 0}
        return ok | (set(FLEX) if nf else set())
    return {p for p in POSS if c[p] < MAXPOS[p]}
def abiertas(c):  # posiciones con un puesto de titular libre (incluye FLEX)
    extra = sum(max(0, c[p] - REQ[p]) for p in FLEX)
    ab = {p for p in POSS if c[p] < REQ[p]}
    return ab | (set(FLEX) if extra < LIGA['FLEX'] else set())
def alineacion(rows):
    r = sorted(rows, key=lambda x: -x[1]); tot = 0; usados = set()
    for p in POSS:
        xs = [i for i, x in enumerate(r) if x[0] == p][:REQ[p]]; usados |= set(xs); tot += sum(r[i][1] for i in xs)
    fl = [i for i, x in enumerate(r) if x[0] in FLEX and i not in usados][:LIGA['FLEX']]
    return tot + sum(r[i][1] for i in fl)
def draft(b, mi, score_mio, kdst_final=False):
    T, R = LIGA['equipos'], sum(REQ.values()) + LIGA['FLEX'] + LIGA['banca']
    pos, real = b.pos.to_numpy(), b.Real.to_numpy()
    otros = -b.ECR_ovr.fillna(900 + b.ECR_rk.fillna(99)).to_numpy(); mio = score_mio
    libre = np.ones(len(b), bool); ros = [[] for _ in range(T)]; cnt = [dict.fromkeys(POSS, 0) for _ in range(T)]
    for r in range(R):
        for t in (range(T) if r % 2 == 0 else range(T - 1, -1, -1)):
            ok = permitidas(cnt[t], R - r); sc = mio if t == mi else otros
            # Todos llenan primero sus titulares. Los otros dejan K/DST para las 2 últimas rondas; tú solo si kdst_final.
            ab = abiertas(cnt[t]) & ok
            if (t != mi or kdst_final) and R - r > 2: ab -= {'K', 'DST'}
            if ab: ok = ab
            m = libre & np.isin(pos, list(ok))
            if not m.any(): m = libre & np.isin(pos, [p for p in POSS if cnt[t][p] < MAXPOS[p]])
            if not m.any(): m = libre
            i = int(np.flatnonzero(m)[np.argmax(sc[m])])
            libre[i] = False; ros[t].append((pos[i], real[i])); cnt[t][pos[i]] += 1
    return [alineacion(x) for x in ros]
EST = {'ECR general (control)': (None, True), 'VOR modelo': ('VOR', False), 'VOR mercado': ('VOR_M', False),
       'VOR modelo, K/DST al final': ('VOR', True), 'VOR mercado, K/DST al final': ('VOR_M', True)}
sim = []
for y, b in TAB.items():
    b = b.reset_index(drop=True)
    for nom, (col, kd) in EST.items():
        sc = b[col].fillna(-999).to_numpy() if col else -b.ECR_ovr.fillna(900 + b.ECR_rk.fillna(99)).to_numpy()
        for mi in range(LIGA['equipos']):
            pts = draft(b, mi, sc, kd); otros = [x for j, x in enumerate(pts) if j != mi]
            sim.append({'season': y, 'estrategia': nom, 'turno': mi + 1, 'mis_pts': pts[mi], 'prom_otros': np.mean(otros),
                        'dif': pts[mi] - np.mean(otros), 'lugar': 1 + sum(x > pts[mi] for x in otros)})
sim = pd.DataFrame(sim).round(2); sim.to_csv('outputs/simulacion_draft.csv', index=False)
print('\nSIMULACIÓN DE DRAFT: puntos reales de tu alineación menos el promedio de los otros 11 (promedio de los 12 turnos)')
print(sim.pivot_table(index='estrategia', columns='season', values='dif').round(1).to_string())
print('\nCortes del ECR usados:', FECHAS)
