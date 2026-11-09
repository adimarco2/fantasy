# Plan: todas las posiciones y el equipo completo

**Liga:** 12 equipos, Full PPR, snake. Titulares: 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX (RB/WR/TE), 1 K, 1 DST.

**Uso:** `python proyecciones.py` y luego `python dashboard.py`. Genera `outputs/dashboard.html`.
(`qb_2026.py` sigue funcionando igual, solo para QB con tu ADP.)

## Estado (9/11/2026, temporada 2026 hasta la semana 9)

| Paso | Estado |
|---|---|
| 1. Un solo script para todas las posiciones (`proyecciones.py`) | Hecho |
| 2. RB y WR | Hecho |
| 3. TE | Hecho |
| 4. K y DST (puntos calculados: nflverse trae 0 para kickers) | Hecho, con puntaje **supuesto** (ver abajo) |
| 5. VOR y tablero general | Hecho |
| 6. Simulación de draft 2022–2025 (+ 2026 parcial) | Hecho |
| 7. Revisar con la temporada 2026 completa | Después de la semana 18 |
| 8. Draft 2027 | Agosto 2027: `TEST=2027`, agregar 2026 a `BT` |

## Datos
- **Estadísticas, calendario y draft:** nflverse (2015–2026).
- **Mercado para todas las posiciones:** ranking de consenso de expertos de FantasyPros (ECR) del último corte antes de la semana 1
  (2020-09-03, 2021-09-03, 2022-09-02, 2023-09-01, 2024-08-30, 2025-08-29, 2026-09-04), tomado del histórico de DynastyProcess.
  Es un ranking de expertos, **no ADP**; sirve de base porque existe igual para todas las posiciones y años.
- **Tu ADP de QB** (`adp_hist.csv`) se usa como modelo adicional en QB.

## Supuestos que debes confirmar con tu liga
- QB/RB/WR/TE: puntaje PPR de nflverse (4 por TD de pase, 1 por recepción, −2 por INT y fumble perdido).
- K: 3 pts FG < 40 yardas, 4 por 40–49, 5 por 50+, 1 por PAT, −1 por FG o PAT fallado.
- DST: 1 por sack; 2 por INT, fumble recuperado, safety y bloqueo; 6 por TD; puntos permitidos 0 → 10, 1–6 → 7, 7–13 → 4, 14–20 → 1, 21–27 → 0, 28–34 → −1, 35+ → −4.
- Banca de 6 en la simulación de draft.

Se cambian en `k_pts`, `dst_pts` y `LIGA` dentro de `proyecciones.py`.

## Método (igual que QB)
- Objetivo: PPG en los partidos jugados. Cada temporada se predice entrenando solo con temporadas anteriores.
- Candidatos por posición: PPG del año anterior, solo ECR, lineal, Random Forest, XGBoost y esas tres + ECR.
- Se usa el de menor MAE en el backtest 2022–2025.
- Puntos de temporada = PPG proyectado × juegos esperados (promedio histórico según el tramo del ranking).
- VOR = puntos − puntos del mejor jugador que queda fuera de los titulares de 12 equipos (FLEX incluido).
- Simulación: los otros 11 eligen por ECR general; todos llenan titulares primero y dejan K/DST para el final.
  Se mide con los puntos reales de la mejor alineación de cada equipo en la temporada.

## Próximas mejoras, en orden
1. Medir la simulación con alineaciones **semana a semana** (hoy usa totales de temporada).
2. Juegos esperados por jugador (lesiones previas, edad) en lugar del promedio por tramo.
3. Líneas de victorias por equipo antes de la temporada (sigue pendiente; no la he probado).
4. Asistente de draft en vivo: con tu turno, sugerir el mejor VOR que probablemente no llegue a tu siguiente pick.
