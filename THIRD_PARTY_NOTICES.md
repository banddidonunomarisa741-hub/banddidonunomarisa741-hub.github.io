# Third-party notices / 第三方来源与许可

本项目自 2026-09-11 转入私有开发，后续新原创贡献适用根目录的 [许可说明](LICENSE)。此前已按 MIT 发布的程序代码和文档保留原有许可，原文见 [历史 MIT 声明](notices/PROJECT-LEGACY-MIT.txt)。第三方组件保留上游许可；音乐作品、谱图及其转写不因存放在本仓库而成为 MIT 音乐。以下版本按 2026-09-06 工作目录中的实际依赖及来源清单核对。

## 用户提供的原神谱页与转写

用户直接提供了《熙攘的街市》（奥摩斯港 BGM）数字简谱图片，以及《希望的新一天》（蒙德 BGM）五线谱总谱图片。本项目据可见图片制作了七键主旋律简化转写：

- `public/scores/须弥/hustle-and-bustle-page1.json`：可见第 1–44 小节，省略小字号倚音。
- `public/scores/蒙德/a-new-day-with-hope-page1.json`：可见第 1–28 小节，仅钢琴右手声部。

署名：作曲 **陈致逸 / HOYO-MiX**；图片制谱 **旅行者小谱**。原图分别署名“作曲：陈致逸”“制谱：旅行者小谱”。原曲、编曲及谱页所涉及的权利归相应权利人。原神及相关名称属于其各自权利人；本项目不代表米哈游或 HOYO-MiX，也没有获得其认可或背书。

这些用户提供的受保护音乐材料及其转写**不纳入本项目程序代码的 MIT 再许可**。本项目未取得授予第三方自由再分发、重新许可或商业使用这些曲谱的授权，不作此类承诺。本次只处理所提供页面，没有补写或宣称拥有完整原曲。其他用户导入的曲谱同样不自动成为本项目许可的内容。

`lib/piano/genshin.ts` 和七国来源索引中的曲名与原谱链接用于查找来源，不表示目标网页或曲谱适用 MIT。外部曲库是否开源、可下载与其音乐是否获准纳入其他产品，需分别判断。核查记录见 [原神机器曲谱与分发核查](docs/research/原神机器曲谱与分发核查-2026-09-06.md)。

## mda Piano 音源

`public/audio/eop/*.wav` 是从用户本机已安装的 mda Piano 插件导出的单音采样。mda 的原作者为 **Paul Kellett（maxim digital audio）**。这些采样不是本项目或 EveryonePiano 原创的钢琴录音。

- 原始开源项目：[mda VST plug-ins / SourceForge](https://sourceforge.net/p/mda-vst/code/HEAD/tree/)。
- 核对来源：[Elk Audio 的 mda-vst2 README](https://github.com/elk-audio/mda-vst2/blob/master/README.md)、[波形数据](https://github.com/elk-audio/mda-vst2/blob/master/plugins/mdaPianoData.h)。上游 README 说明 mda 代码来自原始 SourceForge 项目、适用 MIT。
- 本仓库保留的上游 MIT 原文：[public/licenses/mda-MIT.txt](public/licenses/mda-MIT.txt)。该文本保留 `Copyright (c) 2008 Paul Kellett` 和 `Copyright (c) 2019 Elk Audio OS`。
- 已核对本机 DLL 内连续 586,348 个 int16 波形数值与开源数据一致。开源数组另有一个末尾重复样本；没有声称整个 DLL 可重现构建或每个字节都适用 MIT。具体哈希、偏移和范围见核查报告。
- 采样导出参数与文件哈希见 `public/audio/eop/manifest.json`。网页播放对导出采样进行包络和延音控制，不是实时运行 VST。

本项目不提交 EveryonePiano 安装包、mdaPiano DLL 本体或 VST SDK。EveryonePiano 程序及其其他资源不受本项目 MIT 许可证覆盖。

## 本地识谱组件

| 组件 | 实际版本 / 用途 | 上游许可与来源 |
| --- | --- | --- |
| Audiveris | 5.11.0，本地五线谱 OMR 独立进程 | [AGPL-3.0](https://github.com/Audiveris/audiveris/blob/5.11.0/LICENSE)，[对应源码](https://github.com/Audiveris/audiveris/tree/5.11.0)。本项目代码许可证不覆盖该引擎。 |
| Tesseract OCR 数据 | `eng.traineddata`，本机 Audiveris 所需英语数据 | [Apache-2.0](tools/omr/tessdata/LICENSE)，[tesseract-ocr/tessdata](https://github.com/tesseract-ocr/tessdata)。具体文件哈希见 `tools/omr/manifest.json`。 |
| Tesseract 中文标题数据 | `tessdata_fast` 的 `chi_sim.traineddata`，识别曲名汉字 | [Apache-2.0](https://github.com/tesseract-ocr/tessdata_fast/blob/main/LICENSE)，[实际上游数据](https://github.com/tesseract-ocr/tessdata_fast/blob/main/chi_sim.traineddata)。使用 fast 数据，不是 best 数据；标题识别不等于音符识别。 |
| Tesseract.js | 7.0.0，本地中文标题 OCR | [Apache-2.0](https://github.com/naptha/tesseract.js/blob/master/LICENSE.md)。它不意味着当前网页具备通用数字简谱识别能力。 |
| Verovio | 6.3.0，开发阶段渲染原创验证谱 | [LGPL-3.0-or-later](https://github.com/rism-digital/verovio)，由 Laurent Pugin 等开发。本项目未将该渲染器重新许可为 MIT。 |

Audiveris 的安装包、随附 Java、模型及本机运行缓存是独立的第三方运行环境，不作为本项目原创程序代码提交。本源码仓库不以自己的 MIT 许可证替代它们。部署来源和版本见 `tools/omr/manifest.json`。

### 便携包的对应源码与 Java 运行时

便携包使用 **Eclipse Temurin 25.0.3+9 Windows x64 JRE**。它在隔离目录 `tools/omr/runtime/portable-java/` 准备，实际运行 `bin/java.exe -version` 已确认版本。打包时将该目录完整映射为 Audiveris 使用的 Java 运行时，保留其中 `legal/`、`NOTICE` 和 `release`。本机原先安装的 Zulu 运行时继续保留在开发目录，不是这份便携包采用的 Java。

以下对应源码已实际下载，不是只有外部链接的占位说明。分发便携包时一并附带 `tools/omr/sources/`：

- `audiveris-5.11.0-source.zip`：从 Audiveris 官方 5.11.0 tag 下载的源码及 Gradle 构建文件，35,918,436 字节；SHA-256 `5f63cd1bdc7f48a9afadfa616ab9f2d4c923b7d7dbff46712e2b3ef65e896616`。本机 `audiveris.jar` 的版本清单也为 5.11.0；完整 AGPL 文本另存于 `public/licenses/audiveris-5.11.0-AGPL.txt`。
- `maven/`：实际随附的 55 个 Maven 坐标的对应 `-sources.jar` 和 POM 全部下载成功，包括 iText 5.5.13.2（AGPL）、BSAF 1.9.2、JFreeChart 1.5.6、Proxymusic 4.0.3 等组件。逐文件官方来源和 SHA-256 见 `maven/manifest.json`；JAR 中已有的许可及 notices 另存于 `public/licenses/audiveris-libraries/`，原 JAR 中的文本也应保留。
- `OpenJDK25U-jdk-sources_25.0.3_9.tar.gz`：Temurin 对应该发行版的完整 JDK 源码，120,368,207 字节；SHA-256 `d49a4e25d27680bde7ec49e16815b29051f52cf64c913dc3b1e61d20fdd27458`，已与同一官方发布的 `.sha256.txt` 核对。
- `temurin-build-a612825ee82a.zip`：按 JRE `release` 中记录的构建源码提交 `a612825ee82a20ac872d60958c349854c1f29a8e` 保存的 Adoptium 构建脚本；JDK 源码归档内也已检查存在 HotSpot、java.base、configure、make/autoconf 和 LICENSE。
- `temurin-25.0.3+9-manifest.json`：记录 JRE、源码的精确 [Adoptium 官方发行地址](https://github.com/adoptium/temurin25-binaries/releases/tag/jdk-25.0.3%2B9)、文件大小和哈希；`audiveris-5.11.0-source-manifest.json` 记录引擎源码核查。

Temurin / OpenJDK 使用 GPLv2，并对标有例外的文件提供 Classpath Exception；各模块的第三方许可在运行时 `legal/` 内。此例外不把 JVM 本身变成 MIT，也不取消分发其二进制时相应的源码义务。本便携包通过随附精确源码及原许可文本处理这些组件，不依赖本项目新作出的长期代索源码承诺。

旧 Zulu 25.34 CRaC 的精确公开源码归档未在本次核查中找到。其对应官方许可文档保存在 `notices/zulu25.34-april-2026-licenses.pdf`，其中含 Azul 的源码提供说明。这份文档用于说明开发环境的核查记录，不能被当作已取得旧 Zulu 完整对应源码的证据；因此便携包选择了上述已能取得对应源码的 Temurin。

### 便携包排除 JAI Core

上游 Audiveris 的依赖表包含 `javax.media:jai-core:1.1.3`，其 [构建文件](https://github.com/Audiveris/audiveris/blob/5.11.0/app/build.gradle) 明确标记为非自由组件。官方再分发条款保存在 `public/licenses/audiveris-libraries/LICENSE-jai.txt` 和 `DISTRIBUTIONREADME-jai.txt`，不能将它描述成 MIT 或 AGPL 库。

本便携包排除 `jai-core-1.1.3.jar` 及其 classpath 行。精确 5.11.0 源码检查没有发现对其 Java API 的调用；原程序相关图像处理已改写。包内保留的 JAI 许可文字仅用于记录排除原因，不表示该非自由二进制继续随包分发。本机开发目录中的上游原发行包未在这次许可整理中改动。

## 便携发行包中的 Node.js

已实际运行 `node -v` 确认本机版本为 **v24.19.0**。若便携包包含这个 Node.js 可执行文件，应同时携带 [notices/node-LICENSE.txt](notices/node-LICENSE.txt)。该文件逐字保存自 [Node.js v24.19.0 官方 LICENSE](https://github.com/nodejs/node/blob/v24.19.0/LICENSE)，包括 Node.js 自身许可及其所列全部第三方依赖声明，不只保留开头的 MIT 段落。

打包时须同时保留本文件、根目录 LICENSE、`public/licenses/`、`vendor/shadcn-tailwind-4.13.0.LICENSE.md`，以及随附各第三方运行时和依赖原有的 LICENSE / NOTICE。发布包中的依赖与其许可证应一致；更换 Node.js 版本后也应随之更换对应官方许可文件。

## 网页、音频与格式处理依赖

| 组件 | 核对版本 | 许可及来源 |
| --- | --- | --- |
| SpessaSynth / `spessasynth_lib` | 4.3.3 | Apache-2.0；作者 spessasus；[上游](https://github.com/spessasus/spessasynth_lib)，[本地完整许可证](public/licenses/spessasynth.txt)。用于自定义 SoundFont 等音源播放。 |
| shadcn 样式与组件 | vendored 样式 4.13.0；`@shadcn/react` 0.3.0 | MIT；Copyright (c) 2023 shadcn；[本地完整许可证](vendor/shadcn-tailwind-4.13.0.LICENSE.md)，[上游](https://github.com/shadcn-ui/ui)。 |
| React / React DOM | 19.2.6 | [MIT](https://github.com/facebook/react/blob/main/LICENSE)，Meta Platforms, Inc. and affiliates。 |
| Vite | 8.0.13 | [MIT](https://github.com/vitejs/vite/blob/main/LICENSE)，Evan You 与 Vite 贡献者。 |
| fast-xml-parser | 5.11.1 | [MIT](https://github.com/NaturalIntelligence/fast-xml-parser/blob/master/LICENSE)，Amit Gupta；用于 MusicXML 解析。 |
| fflate | 0.8.2 | [MIT](https://github.com/101arrowz/fflate/blob/master/LICENSE)，Arjun Barrett；用于 MXL 解压。 |
| Lucide React | 1.31.0 | [ISC，部分源自 Feather 的图标为 MIT](https://github.com/lucide-icons/lucide/blob/main/LICENSE)；Lucide Icons and Contributors；Feather 部分 Copyright (c) 2013-present Cole Bemis。以安装包内 LICENSE 的具体图标清单为准。 |
| sharp | 0.34.5 | [Apache-2.0](https://github.com/lovell/sharp/blob/main/LICENSE)，Lovell Fuller；其原生依赖仍保留各自许可。 |

已依据实际 Vite 构建的模块图核对前端二进制包含的包，并补计 Tailwind CSS 与 tw-animate-css 样式来源。**58 份完整许可证**存放在 `public/licenses/frontend/`，逐包版本、文本文件名和 SHA-256 见 [frontend-manifest.json](public/licenses/frontend-manifest.json)，清单无缺失项。该目录涵盖 React、React DOM、scheduler、Lucide（包括 Feather 声明）、Radix UI、Floating UI、滚动与焦点辅助库、XML 解析依赖和 SpessaSynth 的实际依赖。两个 npm 包未附带文本的情况，已从各自上游仓库取得完整 MIT 文本，并在清单内注明许可证原文来源。

shadcn 许可另有便于随网页分发的副本 `public/licenses/shadcn-MIT.txt`。上述表格不是将所有传递依赖统一改为同一种许可证；完整版本仍以 `package-lock.json` 为准。发行包须保留全部 `public/licenses/`，以及安装包和本地服务依赖内原有的 LICENSE / NOTICE。

## 原创验证资料

`tools/omr/fixtures/original-study.*` 及相应识谱验证样例由本项目为测试而制作；它们不能被当作外部复杂总谱的准确率证明。经典曲目的基础旋律和第三方练习指导来源应分别标明，程序代码开源不表示本项目取得了所有可能版本的现代编曲、录音或出版谱的权利。
