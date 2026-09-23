# resd-plugin-x

[中文](README.md) | [English](README-EN.md)

`res-downloader` 的 X 视频插件，兼容旧 `twitter.com` 域名。

## 功能

- 支持首页、关注、用户主页、列表、搜索结果和推文详情页。
- 识别普通视频、动态 GIF、单条推文中的多个视频，以及引用和转推中的视频。
- 支持选择下载画质、预览、下载、打开和复制。

## 安装

发布后可在 `res-downloader` 的“插件管理”页面安装。也可以下载对应版本的源码 ZIP，通过“从压缩包安装”导入。

## 设置

- **下载画质**：选择推文提供的最高或最低码率 MP4 版本。

## 注意事项

- 仅下载 MP4；动态 GIF 也以 MP4 保存，不支持 HLS、直播和 Space。
- 不支持 DRM、订阅专享及地区或年龄受限视频；私密内容以浏览器当前账号的访问权限为准。

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
