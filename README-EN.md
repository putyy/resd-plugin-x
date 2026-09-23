# resd-plugin-x

[中文](README.md) | [English](README-EN.md)

An X video plugin for `res-downloader`, also supporting the legacy `twitter.com` domain.

## Features

- Supports Home, Following, profiles, lists, search results, and post detail pages.
- Detects regular videos, animated GIFs, multiple videos in a post, and videos in quotes and reposts.
- Supports download quality selection, previews, downloads, opening, and copying resources.

## Installation

Once published, the plugin can be installed from Plugin Management in `res-downloader`. You can also download the source ZIP for the desired version and import it using the option to install from an archive.

## Settings

- **Download quality**: Select the highest- or lowest-bitrate MP4 variant provided by the post.

## Notes

- Downloads MP4 only; animated GIFs are also saved as MP4. HLS, live streams, and Spaces are not supported.
- DRM-protected, subscriber-only, region-restricted, and age-restricted videos are not supported. Access to private content depends on the account signed in to your browser.

## Development and Validation

Run these commands from the `res-downloader` project root:

```bash
go run main.go plugin lint ./plugins/resd-plugin-x
go run main.go plugin replay ./plugins/resd-plugin-x ./plugins/resd-plugin-x/fixtures/timeline.json
go run main.go plugin replay ./plugins/resd-plugin-x ./plugins/resd-plugin-x/fixtures/tweet-detail.json
go run main.go plugin replay ./plugins/resd-plugin-x ./plugins/resd-plugin-x/fixtures/m4s-fragment.json
go run main.go plugin pack ./plugins/resd-plugin-x
```

Fixtures contain only sanitized, fictional data and example URLs.
