# Pencil 导出资产清单

源文件：

- `designs/skip-song-reflex.pen`

导出目录：

- `designs/exports/`

## 画板导出

| 语义名 | Pencil 节点 | 文件 |
|---|---|---|
| 入口页 | `01 Entry` / `f8CyW` | `f8CyW.png` |
| 玩法提示页 | `02 Tutorial` / `Ev8QM` | `Ev8QM.png` |
| 游戏页 | `03 Game` / `ZdOca` | `ZdOca.png` |
| 结果页 | `04 Result` / `H2sxRM` | `H2sxRM.png` |
| 分享海报 | `05 Share Poster` / `yXObC` | `yXObC.png` |
| 资产板 | `06 Asset Board` / `e9t8q` | `e9t8q.png` |

## 前端运行时切图

| 语义名 | Pencil 节点 | 文件 |
|---|---|---|
| 入口主视觉 | `Hero Control Deck` / `pQPyF` | `pQPyF.png` |
| 游戏控台底板 | `Game Console` / `EtBJI` | `EtBJI.png` |
| 节奏轨道 | `Track Base` / `XyWbW` | `XyWbW.png` |
| 判定区光效 | `Perfect Zone` / `XVtuA` | `XVtuA.png` |
| 切歌按钮 | `Cut Button` / `TWG9B` | `TWG9B.png` |
| 抢副歌按钮 | `Grab Button` / `qZ7D8` | `qZ7D8.png` |
| 救场按钮 | `Rescue Button` / `j6wyE` | `j6wyE.png` |
| 结果页底板 | `Result Panel` / `R3VGhW` | `R3VGhW.png` |

## 规则

- 前端只能引用从 `designs/exports/` 同步到 `frontend/assets/pencil/` 的资产。
- 如需新增 UI 图，先更新 `.pen`，再重新导出并同步。
- 不允许绕过 Pencil 直接用脚本生成最终 UI 图。
