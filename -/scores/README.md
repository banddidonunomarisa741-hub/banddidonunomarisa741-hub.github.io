# 内置曲谱与来源目录

这里按原神七国保存机器可读曲谱及来源索引。**来源链接不等于已经包含音符。** 0.2.0 内置 6 份原神可演奏片段，配合 12 首经典练习曲，共 18 个默认可演奏曲目；这些片段不是七国目录里的完整原曲。

| 文件 | 实际可演奏范围 | 音乐参数 |
| --- | --- | --- |
| [蒙德/a-new-day-with-hope-page1.json](蒙德/a-new-day-with-hope-page1.json) | 《希望的新一天》，所提供图片第 1–28 小节，仅钢琴右手，111 次按键 | 1=C，3/4，102 BPM |
| [须弥/hustle-and-bustle-page1.json](须弥/hustle-and-bustle-page1.json) | 《熙攘的街市》，所提供图片第 1–44 小节，省略小字号倚音的主旋律简化版，147 次按键 | 1=F，4/4，115 BPM |
| [璃月/liyue-theme-practice.json](璃月/liyue-theme-practice.json) | 璃月主题·练习片段，八小节短编配 | 1=D，4/4，88 BPM |
| [稻妻/inazuma-theme-practice.json](稻妻/inazuma-theme-practice.json) | 稻妻主题·练习片段，八小节短编配 | 1=A，4/4，92 BPM |
| [枫丹/fontaine-theme-practice.json](枫丹/fontaine-theme-practice.json) | 枫丹主题·练习片段，八小节短编配 | 1=G，3/4，96 BPM |
| [纳塔/natlan-theme-practice.json](纳塔/natlan-theme-practice.json) | 纳塔主题·练习片段，八小节短编配 | 1=E，6/8，104 BPM |

这两份数据已经逐小节视觉转写、核对拍数和跨小节延音。它们不是 Audiveris 对这两张图自动识别成功的产物，也不包含图片外的续页。制谱署名旅行者小谱，作曲署名陈致逸。完整核对和简化说明见 [希望的新一天](../../docs/score-audits/希望的新一天.md)、[熙攘的街市](../../docs/score-audits/熙攘的街市.md)。

当上传文件内容的 SHA-256 与内置原图一致，网页会直接载入已校对结果，并明确说明本次没有重新 OCR。仅文件名相同不够；任意其他谱图不能走这条精确匹配路径。用户可以单独点击“用通用引擎重新识别”，查看引擎实际结果。音符识别和汉字标题识别是不同任务。

各国 `catalog.json` 中的外部来源条目用于查找原谱。除已内置的 6 份短片段外，其他原神曲目仍需用户提供或导入机器谱，不能只点击来源链接就宣称已有可演奏音符。至冬分类也包含挪德卡莱。

`识谱样例/original-study.json` 是项目原创的 8 小节验证曲，27 个事件中有 26 个发声音符、1 个休止。它用来演示和测试通用管线，不计入 18 个默认曲目，也不能用于推断真实复杂谱图的整体准确率。

JSON 使用 `version: 1`、标题、调号、速度、拍号、`notation` 和 `uncertainties`。小节由 `|` 或换行分开；`-:N` 保留跨小节延音。`uncertainties: []` 指声明的转写范围内没有待填音符，不代表完整原曲、全声部或逐符号无损复制。

原神音乐、谱图及其转写不纳入程序代码的 MIT 再许可；详见 [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)。用户曲谱收藏保存在浏览器本地，不应写入本目录作为开发测试数据或自动提交到仓库。

