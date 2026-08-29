# resd-plugin-x

`res-downloader` 的 X 视频资源插件，用于从 X（兼容旧 `twitter.com` 域名）的网页接口中识别视频和动态 GIF。

## 功能

- 支持首页、关注时间线、用户主页、列表和搜索结果等滚动列表。
- 支持 `/用户名/status/推文ID` 推文详情页。
- 识别普通视频、以 MP4 分发的动态 GIF，以及单条推文中的多个视频。
- 支持引用推文和转推中的视频资源。
- 保留同一视频的多个 MP4 码率，并按设置选择默认下载画质。
- 支持预览、下载、打开和复制资源地址。
- 接管 X 的 MP4、HLS 和 M4S 分片响应，避免通用探测器重复显示资源或把 DASH 分片误认为完整视频。

插件只处理接口中明确提供的 MP4 地址，不下载 HLS，也不处理直播、Space、DRM、订阅专享及地区或年龄受限视频。私密内容以浏览器当前账号的访问权限为准，插件不会保存 Cookie 或 Authorization。

## 安装

发布后可在 `res-downloader` 的“插件管理”页面安装。也可以下载对应版本的源码 ZIP，通过“从压缩包安装”导入。

插件会申请读取 `x.com`、`twitter.com` 及相关媒体域名响应的权限，安装时请核对权限提示。

## 设置

- `下载画质`：选择推文提供的最高或最低码率 MP4 版本。

## 开发与校验

在 `res-downloader` 项目根目录执行：

```bash
go run main.go plugin lint ./plugins/resd-plugin-x
go run main.go plugin replay ./plugins/resd-plugin-x ./plugins/resd-plugin-x/fixtures/timeline.json
go run main.go plugin replay ./plugins/resd-plugin-x ./plugins/resd-plugin-x/fixtures/tweet-detail.json
go run main.go plugin replay ./plugins/resd-plugin-x ./plugins/resd-plugin-x/fixtures/m4s-fragment.json
go run main.go plugin pack ./plugins/resd-plugin-x
```

Fixture 只包含脱敏后的虚构数据和示例地址。
