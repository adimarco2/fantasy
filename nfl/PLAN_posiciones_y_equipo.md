# Plan: de QB a todas las posiciones y al equipo completo

Objetivo: repetir lo hecho con QB (predecir PPG con información previa a la semana 1 y compararlo honestamente contra el ADP) para RB, WR, TE, K y DST, y después usar esas proyecciones para armar el equipo completo en el draft.

La regla que se mantiene en todas las fases: **el ADP entra como un modelo más**, y solo se usa un modelo propio si le gana al ADP en el backtest *y* en la temporada en curso. Con QB, en 2026, no le ganó.

---

## 0. Lo que ya está verificado y lo que falta

**Verificado (descargado el 9/11/2026 desde nflverse, misma fuente que `qb_2026.py`):**

| Dato | Archivo de nflverse | Qué aporta |
|---|---|---|
| Estadísticas semanales por jugador 2015–2026 | `stats_player/stats_player_week_{año}.csv` | Carreras, yardas, TDs, `targets`, `receptions`, `target_share`, `air_yards_share`, `wopr`, `receiving_air_yards`, EPA, FG por distancia (`fg_made_0_19` … `fg_made_60_`), `pat_made`, `fantasy_points` y `fantasy_points_ppr` |
| Estadísticas semanales por equipo 2015–2026 | `stats_team/stats_team_week_{año}.csv` | `def_sacks`, `def_interceptions`, `fumble_recovery_opp`, `def_tds`, `def_safeties`, `special_teams_tds` (para DST) |
| Snaps 2015–2026 | `snap_counts/snap_counts_{año}.csv` | % de snaps ofensivos (rol real del RB/TE) |
| Depth charts y lesiones (2025 comprobado) | `depth_charts/…`, `injuries/…` | Titular previo a la semana 1, historial de lesiones |
| Calendario y marcadores | `nfldata/games.csv` | SOS y puntos permitidos (DST) |

**Dos hechos de los datos que cambian el trabajo:**
- En nflverse, `fantasy_points` de los **kickers es 0** (comprobado en 2026: kicker con 2 FG y 1 PAT tiene 0.0). Hay que calcular K a mano.
- `fantasy_points` es formato estándar (sin puntos por recepción). Para RB/WR/TE hay que usar `fantasy_points_ppr`, o la fórmula de tu liga, si es PPR o half-PPR.

**Lo que falta y no puedo descargar desde este entorno** (Fantasy Football Calculator y DIRECTV responden 403):
1. `adp_hist.csv` con **todas las posiciones** (QB, RB, WR, TE, K, DST), 2020–2026, columnas `Player, Season, Pos, ADP, Team`. Hoy solo existe la versión QB, y no me llegó en este chat.
2. **Reglas de tu liga:** número de equipos, roster (por ejemplo 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 K, 1 DST, 6 banca), y puntaje (PPR, half o estándar; 4 o 6 por TD de pase).
3. Opcional: líneas de victorias de cada equipo antes de temporada, 2020–2026 (sigue sin probar).

---

## 1. Refactor: un solo script para todas las posiciones (antes de agregar nada)

`qb_2026.py` está escrito para QB. En vez de copiarlo cinco veces:

- `proyecciones.py` con un diccionario `POS = {'QB': {...}, 'RB': {...}, ...}` que define por posición: filtro de "juego jugado", features, objetivo y columna de puntos.
- Mismas funciones `run()` y `ev()`, mismo backtest 2022–2025, mismo `TEST`.
- Salidas: `outputs/{pos}/backtest.csv`, `prediccion_{TEST}.csv`, `comparacion_{TEST}.csv`, más `outputs/todas_{TEST}.csv` con todas juntas.
- **Prueba de que el refactor no rompió nada:** la salida de QB debe ser idéntica a la de `qb_2026.py`.

## 2. Features por posición

| Pos. | "Juego jugado" (equivale a ≥ 15 intentos en QB) | Features principales (temporada anterior) | Puntos |
|---|---|---|---|
| **RB** | ≥ 30% de snaps o ≥ 5 toques | carreras/juego, targets/juego, % snaps, yardas/carrera, TDs, EPA de carrera, edad (el declive en RB llega antes), pick del draft, equipo nuevo | PPR |
| **WR** | ≥ 2 targets o ≥ 30% de snaps | `target_share`, `air_yards_share`, `wopr`, targets/juego, yardas/ruta si se consigue, TDs, aDOT, cambio de QB en su equipo | PPR |
| **TE** | ≥ 2 targets o ≥ 40% de snaps | `target_share`, targets/juego, % snaps, TDs; el TE tarda más en producir, así que edad y años en la liga | PPR |
| **K** | ≥ 1 intento de FG o PAT | FG/juego por distancia, % de acierto, PAT/juego, puntos del equipo/juego, estadio techado | Calculado: 3 por FG < 40, 4 por 40–49, 5 por 50+, 1 por PAT (o tu regla) |
| **DST** | todos los partidos | sacks, INT, fumbles recuperados, TDs defensivos, puntos permitidos (de `games.csv`), SOS ofensivo del calendario | Calculado con la tabla de tu liga |

Notas:
- Igual que con QB, todas las features vienen de temporadas **anteriores** y el ADP es previo a la semana 1. Repetir la prueba de fuga: borrar las estadísticas de `TEST` y comprobar que las predicciones no cambian.
- WR/RB **novatos** no tienen temporada anterior; para ellos solo hay pick del draft, edad y ADP. Lo esperable es que el ADP domine ahí.
- K y DST son las posiciones con más ruido año a año; el plan es medir antes de invertir tiempo. Si ningún modelo le gana al ADP, se usa el ADP y listo.

## 3. Dashboard por posición

`dashboard.py` ya lee lo que escribe el script. Cambios:
- Un selector de posición arriba, con las mismas secciones (KPIs, MAE por modelo, proyección vs. real, MAE por temporada, diferencias vs. ADP, draft board).
- Una pestaña **"Todas"** con el draft board combinado y el valor sobre reemplazo (paso 4).

## 4. Del PPG por posición al equipo completo

El PPG no sirve para comparar un QB con un RB: un QB de 18 PPG y un RB de 15 PPG no valen lo mismo, porque lo que importa es cuánto mejoran sobre lo que conseguirías gratis.

1. **Puntos de temporada esperados** = PPG proyectado × juegos esperados. Los juegos esperados se estiman con el historial por posición y edad (backtest: juegos reales vs. predichos). Hoy el modelo de QB predice PPG *cuando juega*, sin lesiones.
2. **Valor sobre reemplazo (VOR):** puntos esperados − puntos del jugador de reemplazo de su posición. El reemplazo es el jugador número (equipos × titulares de la posición + FLEX repartido). Ejemplo para 12 equipos, 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX: QB12, ~RB30, ~WR30, TE12 (el FLEX reparte 12 lugares extra entre RB/WR/TE según quién tenga más puntos).
3. **Draft board global:** ordenar por VOR y compararlo con el ADP global. La columna útil es *"cuándo se va a ir"* (ADP) vs. *"cuánto vale"* (VOR).
4. **Asistente de draft (opcional):** con tu posición en el draft, sugerir en cada pick al jugador con más VOR que probablemente no llegue a tu siguiente turno según el ADP, respetando los cupos del roster.
5. **Backtest del equipo completo:** simular drafts 2022–2025 donde los demás eligen por ADP y tú por VOR (o por ADP, como control), y comparar los puntos reales de los titulares. Es la única prueba que responde "¿esto me ayuda a ganar?" y no solo "¿predice mejor?".

## 5. Orden de trabajo y criterio para seguir

| Paso | Necesita | Termina cuando |
|---|---|---|
| 1. Refactor | nada nuevo | QB sale idéntico |
| 2. RB y WR | ADP de RB/WR, reglas de puntaje | backtest + 2026 vs. ADP en el dashboard |
| 3. TE | ADP de TE | ídem |
| 4. K y DST | ADP de K/DST, tabla de puntos de tu liga | ídem; si no gana al ADP, se usa ADP |
| 5. VOR y board global | reglas del roster | board combinado en el dashboard |
| 6. Simulación de draft 2022–2025 | todo lo anterior | puntos reales: VOR vs. solo ADP |

Al final de cada paso se decide con los números: si en una posición el modelo no supera al ADP (en MAE y en Spearman, en backtest y en la temporada en curso), esa posición usa el ADP.
