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
| 4. K y DST (puntos calculados: nflverse trae 0 para kickers) | Hecho, puntaje Yahoo |
| 4b. ADP real de todas las posiciones 2022–2025 | Hecho: comparación ADP vs. ECR y rivales por ADP en la simulación |
| 4c. ADP como variable de los modelos (Lineal/RF/XGBoost + ADP) | Hecho: en QB compiten en la tabla principal; en las demás posiciones se evalúan aparte (`outputs/con_adp.csv`) porque falta el ADP 2026 |
| 5. VOR y tablero general | Hecho |
| 6. Simulación de draft 2022–2025 (+ 2026 parcial) | Hecho |
| 7. Revisar con la temporada 2026 completa | Después de la semana 18 |
| 8. Draft 2027 | Agosto 2027: `TEST=2027`, agregar 2026 a `BT` |

## Datos
- **Estadísticas, calendario y draft:** nflverse (2015–2026).
- **Mercado para todas las posiciones:** ranking de consenso de expertos de FantasyPros (ECR) del último corte antes de la semana 1
  (2020-09-03, 2021-09-03, 2022-09-02, 2023-09-01, 2024-08-30, 2025-08-29, 2026-09-04), tomado del histórico de DynastyProcess.
  Es un ranking de expertos, **no ADP**; sirve de base porque existe igual para todas las posiciones y años.
- **ADP real de todas las posiciones 2022–2025** (`adp_todas_2022_2025.csv`, Fantasy Football Calculator, generado con
  `datos_posiciones.py`) y **ADP de QB** de `adp_hist.csv` para 2020, 2021 y 2026.
  - Se compara ADP vs. ECR por posición (`outputs/mercado_adp_vs_ecr.csv`).
  - En la simulación de draft, los rivales eligen por ADP real general en 2022–2025 (en 2026 no hay ADP de todas las posiciones; se usa ECR).
  - En QB 2024 este archivo trae otro ADP que `adp_hist.csv` (el de antes era half-PPR); se usa el del archivo nuevo.

## Puntaje (Yahoo para K y DST, como `K_yahoo` y `DST_yahoo` de `datos_posiciones.py`)
- QB/RB/WR/TE: puntaje PPR de nflverse (4 por TD de pase, 1 por recepción, −2 por INT y fumble perdido).
- K: 3 pts FG 0–39 yardas, 4 por 40–49, 5 por 50+, 1 por PAT, sin penalidad por fallar.
- DST: 1 por sack; 2 por INT, fumble recuperado, safety y bloqueo (FG, punt y PAT); 6 por TD (defensivo, equipos especiales
  y fumbles recuperados y anotados por la defensa); puntos permitidos 0 → 10, 1–6 → 7, 7–13 → 4, 14–20 → 1, 21–27 → 0, 28–34 → −1, 35+ → −4.
- Supuesto pendiente de confirmar: banca de 6 en la simulación de draft.

Se cambian en `k_pts`, `dst_pts` y `LIGA` dentro de `proyecciones.py`.

## Método (igual que QB)
- Objetivo: PPG en los partidos jugados. Cada temporada se predice entrenando solo con temporadas anteriores.
- Candidatos por posición: PPG del año anterior, solo ECR, lineal, Random Forest, XGBoost, esas tres + ECR, solo ADP y esas tres + ADP.
  Los modelos con ADP solo compiten donde hay ADP de la temporada a proyectar (hoy: QB).
- Se usa el de menor MAE en el backtest 2022–2025.
- Puntos de temporada = PPG proyectado × juegos esperados (promedio histórico según el tramo del ranking).
- VOR = puntos − puntos del mejor jugador que queda fuera de los titulares de 12 equipos (FLEX incluido).
- Simulación: los otros 11 eligen por ADP general (ECR general en 2026); todos llenan titulares primero y dejan K/DST para el final.
  Se mide con los puntos reales de la mejor alineación de cada equipo en la temporada.

## Próximas mejoras, en orden
1. ADP de todas las posiciones de 2026 (y 2020–2021 si se consigue) para comparar ADP vs. ECR con más años.
2. Medir la simulación con alineaciones **semana a semana** (hoy usa totales de temporada; `jugadores_semanal.csv` ya trae lo necesario).
3. Juegos esperados por jugador (lesiones previas, edad) en lugar del promedio por tramo.
4. Líneas de victorias por equipo antes de la temporada (sigue pendiente; no la he probado).
5. Asistente de draft en vivo: con tu turno, sugerir el mejor VOR que probablemente no llegue a tu siguiente pick.
