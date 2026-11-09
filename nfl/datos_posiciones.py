import os, re, urllib.request as u, numpy as np, pandas as pd

Y, B, FIN = range(2015, 2027), 'https://github.com/nflverse/nflverse-data/releases/download/', 'datos/'
for d in ('nflverse', 'datos'): os.makedirs(d, exist_ok=True)
def get(url):
    f = 'nflverse/' + url.split('/')[-1]
    if not os.path.exists(f) or '2026' in f or 'games' in f: u.urlretrieve(url, f)
    return pd.read_csv(f, low_memory=False)
many = lambda p: pd.concat(get(B + p.format(y)) for y in Y).copy()
norm = lambda s: ' '.join(re.sub(r'\b(jr|sr|ii|iii|iv)\b', '', re.sub(r'[^a-z ]', '', str(s).lower())).split())
K_ = ['season', 'week', 'team']

# 1. Datos base (solo temporada regular)
p, s, t = many('stats_player/stats_player_week_{}.csv').query("season_type=='REG'"), many('snap_counts/snap_counts_{}.csv').query("game_type=='REG'"), many('stats_team/stats_team_week_{}.csv').query("season_type=='REG'")
pl, g = get(B + 'players/players.csv'), get('https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv').query("game_type=='REG' and season>=2015 and result==result")
s = s.drop_duplicates(['season', 'week', 'pfr_player_id']).merge(pl[['gsis_id', 'pfr_id']].dropna(), left_on='pfr_player_id', right_on='pfr_id').rename(columns={'gsis_id': 'player_id'})
L = pd.concat([g[['season', 'week', x, y, z]].set_axis([*K_, 'PF', 'PA'], axis=1) for x, y, z in (('home_team', 'home_score', 'away_score'), ('away_team', 'away_score', 'home_score'))]).replace({'team': {'STL': 'LA', 'SD': 'LAC', 'OAK': 'LV'}})

# 2. QB, RB, WR, TE semanal con snaps y puntos PPR de nflverse
C = ['season', 'week', 'player_id', 'player_display_name', 'position', 'team', 'opponent_team', 'attempts', 'passing_yards', 'passing_tds', 'passing_interceptions', 'carries', 'rushing_yards', 'rushing_tds', 'targets', 'receptions', 'receiving_yards', 'receiving_tds', 'receiving_air_yards', 'target_share', 'air_yards_share', 'wopr', 'fantasy_points_ppr']
J = p[p.position.isin(['QB', 'RB', 'WR', 'TE']) | (p.player_id == '00-0040718')][C].assign(position=lambda x: x.position.where(x.player_id != '00-0040718', 'WR')).merge(s[['season', 'week', 'player_id', 'offense_snaps', 'offense_pct']], 'left', ['season', 'week', 'player_id'])
J.round(4).to_csv(FIN + 'jugadores_semanal.csv', index=False)

# 3. K: Yahoo FG 0-39=3, 40-49=4, 50+=5 | NFL.com FG 0-49=3, 50+=5 | PAT=1, sin penalidad por falla
k = p[p.fg_att.fillna(0) + p.pat_att.fillna(0) > 0].fillna({c: 0 for c in p if c.startswith(('fg_made_', 'pat_made'))}).copy()
k = k.assign(FG_0_39=k.fg_made_0_19 + k.fg_made_20_29 + k.fg_made_30_39, FG_40_49=k.fg_made_40_49, FG_50m=k.fg_made_50_59 + k.fg_made_60_)
k = k.assign(K_yahoo=3 * k.FG_0_39 + 4 * k.FG_40_49 + 5 * k.FG_50m + k.pat_made, K_nfl=3 * (k.FG_0_39 + k.FG_40_49) + 5 * k.FG_50m + k.pat_made)
k[['season', 'week', 'player_id', 'player_display_name', 'position', 'team', 'opponent_team', 'fg_att', 'fg_made', 'FG_0_39', 'FG_40_49', 'FG_50m', 'pat_att', 'pat_made', 'K_yahoo', 'K_nfl']].to_csv(FIN + 'k_semanal.csv', index=False)

# 4. DST: TD = defensivos + equipos especiales + balones recuperados y anotados por jugadores no ofensivos
OFF = ['QB', 'RB', 'FB', 'WR', 'TE', 'T', 'OT', 'G', 'OG', 'C', 'OL', 'K', 'P']
fr = p[~p.position.isin(OFF)].groupby(K_).fumble_recovery_tds.sum().rename('FR_TD').reset_index()
d = t.merge(L, 'inner', K_).merge(fr, 'left', K_).assign(FR_TD=lambda x: x.FR_TD.fillna(0))
d = d.assign(TD=d.def_tds + d.special_teams_tds + d.FR_TD, BLK=d.def_fg_blocks + d.def_punt_blocks + d.def_pat_blocks, TIER=pd.cut(d.PA, [-1, 0, 6, 13, 20, 27, 34, 999], labels=[10, 7, 4, 1, 0, -1, -4]).astype(int))
d['DST_nfl'] = d.def_sacks + 2 * d.def_interceptions + 2 * d.fumble_recovery_opp + 2 * d.def_safeties + 6 * d.TD + d.TIER; d['DST_yahoo'] = d.DST_nfl + 2 * d.BLK
d[[*K_, 'opponent_team', 'PF', 'PA', 'def_sacks', 'def_interceptions', 'fumble_recovery_opp', 'def_safeties', 'def_tds', 'special_teams_tds', 'FR_TD', 'TD', 'BLK', 'TIER', 'DST_yahoo', 'DST_nfl']].to_csv(FIN + 'dst_semanal.csv', index=False)

# 5. Tabla por temporada: puntos, juegos y juegos del equipo, para juegos esperados y valor sobre reemplazo
tg = L.groupby(['season', 'team']).size().rename('G_equipo').reset_index(); gs = s[s.offense_snaps > 0].groupby(['season', 'player_id']).size().rename('G_snap').reset_index()
a1 = J.groupby(['season', 'player_id'], as_index=False).agg(Player=('player_display_name', 'first'), Pos=('position', 'first'), team=('team', 'last'), PTS=('fantasy_points_ppr', 'sum'), G_filas=('week', 'size')).merge(gs, 'left').assign(G=lambda x: x[['G_snap', 'G_filas']].max(axis=1)).drop(columns=['G_snap', 'G_filas'])
a2 = k.groupby(['season', 'player_id'], as_index=False).agg(Player=('player_display_name', 'first'), team=('team', 'last'), PTS=('K_yahoo', 'sum'), G=('week', 'size')).assign(Pos='K')
a3 = d.groupby(['season', 'team'], as_index=False).agg(PTS=('DST_yahoo', 'sum'), G=('week', 'size')).assign(Pos='DST', Player=lambda x: x.team + ' DST', player_id=lambda x: x.team)
T = pd.concat([a1, a2, a3]).merge(tg, 'left', ['season', 'team']).assign(PPG=lambda x: x.PTS / x.G).sort_values(['season', 'Pos', 'PTS'], ascending=[True, True, False])
T.round(2).to_csv(FIN + 'temporadas.csv', index=False)

# 6. ADP con ids de nflverse
CT = {'Arizona': 'ARI', 'Atlanta': 'ATL', 'Baltimore': 'BAL', 'Buffalo': 'BUF', 'Carolina': 'CAR', 'Chicago': 'CHI', 'Cincinnati': 'CIN', 'Cleveland': 'CLE', 'Dallas': 'DAL', 'Denver': 'DEN', 'Detroit': 'DET', 'Green Bay': 'GB', 'Houston': 'HOU', 'Indianapolis': 'IND', 'Jacksonville': 'JAX', 'Kansas City': 'KC', 'LA Chargers': 'LAC', 'LA Rams': 'LA', 'Las Vegas': 'LV', 'Miami': 'MIA', 'Minnesota': 'MIN', 'New England': 'NE', 'New Orleans': 'NO', 'NY Giants': 'NYG', 'NY Jets': 'NYJ', 'Philadelphia': 'PHI', 'Pittsburgh': 'PIT', 'San Francisco': 'SF', 'Seattle': 'SEA', 'Tampa Bay': 'TB', 'Tennessee': 'TEN', 'Washington': 'WAS'}
AL, HUNTER = {'Hollywood Brown': 'Marquise Brown', 'Joshua Palmer': 'Josh Palmer', 'Michael Badgley': 'Mike Badgley'}, '00-0040718'  # nflverse lista a Hunter como CB
a = pd.read_csv(FIN + 'adp_ffc_raw.csv').assign(Pos=lambda x: x.Pos.replace({'PK': 'K', 'DEF': 'DST'})); a['Rank_ADP'] = a.groupby('Season').ADP.rank(method='first').astype(int); a['Rank_Pos'] = a.groupby(['Season', 'Pos']).ADP.rank(method='first').astype(int)
a['N'] = a.Player.replace(AL).map(norm); x = pl.assign(N=pl.display_name.map(norm)).sort_values('last_season').rename(columns={'gsis_id': 'player_id', 'position': 'Pos'}).drop_duplicates(['N', 'Pos'], keep='last')[['N', 'Pos', 'player_id']]
a = a.merge(x, 'left', ['N', 'Pos']); dst = a.Pos == 'DST'; a.loc[dst, 'player_id'] = a.loc[dst, 'Player'].str.replace(' Defense', '').map(CT)
a.loc[a.Player == 'Travis Hunter', 'player_id'] = HUNTER; a.drop(columns='N').to_csv(FIN + 'adp_todas_2022_2025.csv', index=False)
print('Filas:', {n: len(v) for n, v in (('jugadores', J), ('K', k), ('DST', d), ('temporadas', T), ('ADP', a))}, '| ADP sin id:', a[a.player_id.isna()][['Season', 'Player', 'Pos']].values.tolist())
