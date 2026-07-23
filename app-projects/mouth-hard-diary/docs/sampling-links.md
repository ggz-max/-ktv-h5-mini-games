# 真实采样投放链接包

生成命令：

```bash
npm run sampling:links
```

现场投放卡片：

```text
docs/sampling-cards/index.html
docs/sampling-cards/screenshots/
```

正式采样前先运行：

```bash
npm run sampling:prepare -- --yes
npm run verify:launch
```

如果 `verify:launch` 未通过，只能用于内部链路演练，不能当作真实转化结论。

## 总览

版本：`2026-06-26-real-sampling-v1`

Base URL：`https://mouth-hard-diary.tbox.ktvsky.com/`

| 场景 | variant | source | campaign | channel | 目标/天 | 链接 |
|---|---|---|---|---|---:|---|
| KTV 包厢二维码 | report | ktv | after_song | room_qr | 15 | https://mouth-hard-diary.tbox.ktvsky.com/?variant=report&source=ktv&campaign=after_song&channel=room_qr&storeId=store_001&roomId=room_009 |
| KTV 包厢二维码 | persona | ktv | after_song | room_qr | 15 | https://mouth-hard-diary.tbox.ktvsky.com/?variant=persona&source=ktv&campaign=after_song&channel=room_qr&storeId=store_001&roomId=room_009 |
| KTV 包厢二维码 | translator | ktv | after_song | room_qr | 15 | https://mouth-hard-diary.tbox.ktvsky.com/?variant=translator&source=ktv&campaign=after_song&channel=room_qr&storeId=store_001&roomId=room_009 |
| 种子微信群 | report | social | seed_group | wechat | 15 | https://mouth-hard-diary.tbox.ktvsky.com/?variant=report&source=social&campaign=seed_group&channel=wechat |
| 种子微信群 | persona | social | seed_group | wechat | 15 | https://mouth-hard-diary.tbox.ktvsky.com/?variant=persona&source=social&campaign=seed_group&channel=wechat |
| 种子微信群 | translator | social | seed_group | wechat | 15 | https://mouth-hard-diary.tbox.ktvsky.com/?variant=translator&source=social&campaign=seed_group&channel=wechat |
| 海报回流 | translator | shareback | poster | friend_chat | 10 | https://mouth-hard-diary.tbox.ktvsky.com/?variant=translator&source=shareback&campaign=poster&channel=friend_chat |
| 海报回流 | report | shareback | poster | friend_chat | 10 | https://mouth-hard-diary.tbox.ktvsky.com/?variant=report&source=shareback&campaign=poster&channel=friend_chat |

## 分场景链接

## KTV 包厢二维码

包厢内扫码入口，验证 KTV 场景是否比普通社群更强。

每日目标：15 个有效打开。

- report / 发疯报告: https://mouth-hard-diary.tbox.ktvsky.com/?variant=report&source=ktv&campaign=after_song&channel=room_qr&storeId=store_001&roomId=room_009
- persona / 嘴硬人格: https://mouth-hard-diary.tbox.ktvsky.com/?variant=persona&source=ktv&campaign=after_song&channel=room_qr&storeId=store_001&roomId=room_009
- translator / 破事翻译器: https://mouth-hard-diary.tbox.ktvsky.com/?variant=translator&source=ktv&campaign=after_song&channel=room_qr&storeId=store_001&roomId=room_009

## 种子微信群

朋友或社群冷启动入口，验证非 KTV 场景的自然吸引力。

每日目标：15 个有效打开。

- report / 发疯报告: https://mouth-hard-diary.tbox.ktvsky.com/?variant=report&source=social&campaign=seed_group&channel=wechat
- persona / 嘴硬人格: https://mouth-hard-diary.tbox.ktvsky.com/?variant=persona&source=social&campaign=seed_group&channel=wechat
- translator / 破事翻译器: https://mouth-hard-diary.tbox.ktvsky.com/?variant=translator&source=social&campaign=seed_group&channel=wechat

## 海报回流

保存图或群聊转发后的回流入口，验证传播型心智。

每日目标：10 个有效打开。

- translator / 破事翻译器: https://mouth-hard-diary.tbox.ktvsky.com/?variant=translator&source=shareback&campaign=poster&channel=friend_chat
- report / 发疯报告: https://mouth-hard-diary.tbox.ktvsky.com/?variant=report&source=shareback&campaign=poster&channel=friend_chat

## 使用规则

- 每个二维码、群发链接或投放卡片只使用本文档中的一个 URL，不要手改参数。
- 每天复盘时先看后台的“入口实验表现”和“来源表现”。
- KTV、社群、海报回流要分开判断，不要混在一个总转化率里。
- 如果需要更换门店、房间、渠道或每日目标，只改 `experiments/sampling-links.json` 后重新生成。
- 现场卡片是采样执行材料；最终二维码海报和视觉资产仍要进入 Pencil `.pen`，经确认后从 Pencil 导出。
