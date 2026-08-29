function stringValue(value) {
  return typeof value === "string" ? value : "";
}

function numberValue(value) {
  var parsed = Number(value);
  return isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function firstHeader(headers, name) {
  if (!headers || typeof headers !== "object") return "";
  var wanted = String(name || "").toLowerCase();
  var keys = Object.keys(headers);
  for (var index = 0; index < keys.length; index++) {
    if (keys[index].toLowerCase() !== wanted) continue;
    var value = headers[keys[index]];
    return Array.isArray(value) ? stringValue(value[0]) : stringValue(value);
  }
  return "";
}

function hostname(rawHost) {
  return String(rawHost || "").split(":")[0].toLowerCase();
}

function isTwimgMediaObservation(observation) {
  var host = hostname((observation.request || {}).host);
  if (host !== "video.twimg.com" && host !== "pbs.twimg.com") return false;
  var path = String((observation.request || {}).path || "").toLowerCase();
  return path.indexOf(".mp4") >= 0 || path.indexOf(".m3u8") >= 0 || path.indexOf(".m4s") >= 0;
}

function parsePayload(body) {
  var source = String(body || "").trim();
  if (!source) return null;
  if (source.indexOf("for (;;);") === 0) source = source.slice(9).trim();
  if (source.indexOf(")]}'") === 0) {
    var newline = source.indexOf("\n");
    source = newline >= 0 ? source.slice(newline + 1) : source.slice(4);
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    return null;
  }
}

function tweetId(tweet) {
  var legacy = tweet && tweet.legacy || {};
  var value = stringValue(tweet && tweet.rest_id) || stringValue(legacy.id_str) || stringValue(tweet && tweet.id_str);
  return /^[0-9]{1,24}$/.test(value) ? value : "";
}

function tweetMedia(tweet) {
  var legacy = tweet && tweet.legacy || {};
  var sources = [
    legacy.extended_entities && legacy.extended_entities.media,
    legacy.entities && legacy.entities.media,
    tweet && tweet.extended_entities && tweet.extended_entities.media
  ];
  var result = [];
  var seen = Object.create(null);
  for (var sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
    var media = sources[sourceIndex];
    if (!Array.isArray(media)) continue;
    for (var mediaIndex = 0; mediaIndex < media.length; mediaIndex++) {
      var item = media[mediaIndex];
      if (!item || typeof item !== "object") continue;
      var id = stringValue(item.id_str) || stringValue(item.media_key) || "index:" + mediaIndex;
      if (seen[id]) continue;
      seen[id] = true;
      result.push(item);
    }
  }
  return result;
}

function collectTweets(payload) {
  var result = [];
  var seen = Object.create(null);
  var visited = 0;

  function visit(value, depth) {
    if (!value || typeof value !== "object" || depth > 20 || visited++ >= 60000 || result.length >= 250) return;

    if (!Array.isArray(value)) {
      var id = tweetId(value);
      if (id && tweetMedia(value).length && !seen[id]) {
        seen[id] = true;
        result.push(value);
      }
    }

    if (Array.isArray(value)) {
      for (var arrayIndex = 0; arrayIndex < value.length && arrayIndex < 500; arrayIndex++) {
        visit(value[arrayIndex], depth + 1);
      }
      return;
    }

    var keys = Object.keys(value);
    for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
      var child = value[keys[keyIndex]];
      if (child && typeof child === "object") visit(child, depth + 1);
    }
  }

  visit(payload, 0);
  return result;
}

function userResult(tweet) {
  var result = tweet && tweet.core && tweet.core.user_results && tweet.core.user_results.result;
  if (result && result.result && typeof result.result === "object") result = result.result;
  return result && typeof result === "object" ? result : {};
}

function authorInfo(tweet) {
  var user = userResult(tweet);
  var core = user.core || {};
  var legacy = user.legacy || {};
  return {
    name: stringValue(core.name) || stringValue(legacy.name),
    screenName: stringValue(core.screen_name) || stringValue(legacy.screen_name)
  };
}

function decodeText(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function tweetText(tweet) {
  var note = tweet && tweet.note_tweet && tweet.note_tweet.note_tweet_results && tweet.note_tweet.note_tweet_results.result;
  var article = tweet && tweet.article && tweet.article.article_results && tweet.article.article_results.result;
  var legacy = tweet && tweet.legacy || {};
  var text = stringValue(note && note.text) || stringValue(article && article.title) ||
    stringValue(legacy.full_text) || stringValue(legacy.text);
  return decodeText(text).replace(/\s*https:\/\/t\.co\/[A-Za-z0-9]+\s*$/i, "").trim();
}

function statusPageURL(tweetID, screenName) {
  if (/^[A-Za-z0-9_]{1,32}$/.test(screenName)) {
    return "https://x.com/" + screenName + "/status/" + tweetID;
  }
  return "https://x.com/i/web/status/" + tweetID;
}

function safeTwimgURL(value) {
  var url = stringValue(value);
  return /^https:\/\/(?:video|pbs)\.twimg\.com\//i.test(url) && url.length <= 16384 ? url : "";
}

function resolutionFromURL(rawURL) {
  var path = String(rawURL || "").split("?")[0];
  var expression = /\/(\d{2,5})x(\d{2,5})(?:\/|$)/g;
  var match;
  var resolution = {width: 0, height: 0};
  while ((match = expression.exec(path))) {
    resolution.width = numberValue(match[1]);
    resolution.height = numberValue(match[2]);
  }
  return resolution;
}

function mediaIdentifier(media, index) {
  var value = stringValue(media.id_str) || stringValue(media.media_key);
  if (/^[A-Za-z0-9_-]{1,64}$/.test(value)) return value;
  return String(index + 1);
}

function trackIdentifier(resolution, bitrate, index) {
  var parts = ["video"];
  if (resolution.height) parts.push(String(resolution.height) + "p");
  if (bitrate) parts.push(String(Math.round(bitrate / 1000)) + "k");
  if (parts.length === 1) parts.push(String(index + 1));
  return parts.join("-");
}

function variantTracks(media, headers) {
  var videoInfo = media && media.video_info || {};
  var variants = Array.isArray(videoInfo.variants) ? videoInfo.variants : [];
  var tracks = [];
  var seenURLs = Object.create(null);

  for (var index = 0; index < variants.length && tracks.length < 20; index++) {
    var variant = variants[index] || {};
    var contentType = stringValue(variant.content_type || variant.contentType).toLowerCase();
    var rawURL = safeTwimgURL(variant.url);
    if (!rawURL || contentType !== "video/mp4" || seenURLs[rawURL]) continue;
    seenURLs[rawURL] = true;

    var bitrate = numberValue(variant.bitrate || variant.bit_rate);
    var resolution = resolutionFromURL(rawURL);
    if (!resolution.width && variants.length === 1) {
      var original = media.original_info || {};
      resolution.width = numberValue(original.width);
      resolution.height = numberValue(original.height);
    }
    var quality = resolution.height ? String(resolution.height) + "p" :
      (bitrate ? String(Math.round(bitrate / 1000)) + " kbps" : "MP4");
    tracks.push({
      id: trackIdentifier(resolution, bitrate, index),
      role: "video",
      executor: "http-file",
      url: rawURL,
      mime: "video/mp4",
      extension: ".mp4",
      quality: quality,
      width: resolution.width,
      height: resolution.height,
      bitrate: bitrate,
      headers: headers
    });
  }

  tracks.sort(function (left, right) {
    var bitrateDifference = numberValue(left.bitrate) - numberValue(right.bitrate);
    if (bitrateDifference) return bitrateDifference;
    return numberValue(left.width) * numberValue(left.height) - numberValue(right.width) * numberValue(right.height);
  });
  return tracks;
}

function bestTrack(tracks) {
  return tracks.length ? tracks[tracks.length - 1] : null;
}

function requestHeaders(pageURL, request) {
  var headers = {Referer: pageURL};
  var userAgent = firstHeader((request || {}).headers, "User-Agent");
  if (userAgent && userAgent.length <= 4096 && !/[\r\n]/.test(userAgent)) headers["User-Agent"] = userAgent;
  return headers;
}

function resourcesFromTweet(tweet, observation) {
  var id = tweetId(tweet);
  var mediaItems = tweetMedia(tweet);
  var author = authorInfo(tweet);
  var pageURL = statusPageURL(id, author.screenName);
  var headers = requestHeaders(pageURL, observation.request || {});
  var baseTitle = tweetText(tweet) || "X 视频 " + id;
  var resources = [];
  var skipped = 0;

  for (var index = 0; index < mediaItems.length; index++) {
    var media = mediaItems[index];
    var videoInfo = media.video_info;
    if (!videoInfo || !Array.isArray(videoInfo.variants)) continue;
    var tracks = variantTracks(media, headers);
    if (!tracks.length) {
      skipped++;
      continue;
    }

    var mediaID = mediaIdentifier(media, index);
    var primary = bestTrack(tracks);
    var title = baseTitle.slice(0, 500);
    if (mediaItems.length > 1) title += " - " + String(index + 1).padStart(2, "0");
    var traits = [];
    if (tracks.length > 1) traits.push("multiTrack");
    if (stringValue(media.type) === "animated_gif") traits.push("com.putyy.x:animatedGif");

    resources.push({
      groupKey: "x:" + id + ":media:" + mediaID,
      kind: "media.video",
      primaryType: "video",
      traits: traits,
      title: title,
      coverUrl: safeTwimgURL(media.media_url_https || media.media_url),
      tracks: tracks,
      requiredTracks: ["video"],
      capabilities: ["download", "preview", "open", "copy"],
      preview: {
        renderer: "video",
        mode: "range-proxy",
        mime: "video/mp4",
        trackId: primary.id
      },
      metadata: {
        platform: "x",
        "x.tweetId": id,
        "x.mediaId": mediaID,
        "x.mediaType": stringValue(media.type),
        author: author.name,
        screenName: author.screenName,
        durationMillis: numberValue(videoInfo.duration_millis || videoInfo.durationMillis)
      },
      source: {pageUrl: pageURL, domain: "x.com"}
    });
  }
  return {resources: resources, skipped: skipped};
}

function resourcesFromPayload(payload, observation) {
  var tweets = collectTweets(payload);
  var resources = [];
  var seenGroups = Object.create(null);
  var skipped = 0;
  for (var index = 0; index < tweets.length; index++) {
    var extracted = resourcesFromTweet(tweets[index], observation);
    skipped += extracted.skipped;
    for (var resourceIndex = 0; resourceIndex < extracted.resources.length; resourceIndex++) {
      var resource = extracted.resources[resourceIndex];
      if (seenGroups[resource.groupKey]) continue;
      seenGroups[resource.groupKey] = true;
      resources.push(resource);
    }
  }
  return {resources: resources, skipped: skipped};
}

function onObservation(observation) {
  var response = observation.response || {};
  if (isTwimgMediaObservation(observation)) {
    return {decision: "continue", handled: response.statusCode === 200 || response.statusCode === 206};
  }
  if (response.statusCode !== 200 || !response.body || response.truncated) return {decision: "continue"};

  var payload = parsePayload(response.body);
  if (!payload) return {decision: "continue"};
  var extracted = resourcesFromPayload(payload, observation);
  var diagnostics = extracted.skipped
    ? ["发现 X 视频，但其中 " + extracted.skipped + " 个媒体项没有可直接下载的 MP4 变体；已忽略 HLS 播放清单。"]
    : [];
  return {
    decision: "continue",
    handled: extracted.resources.length > 0,
    resources: extracted.resources,
    diagnostics: diagnostics
  };
}

function trackScore(track) {
  return numberValue(track.bitrate) || numberValue(track.width) * numberValue(track.height);
}

function selectedTrack(resource, options) {
  var tracks = (resource.tracks || []).filter(function (track) {
    return track && track.role === "video" && track.url;
  });
  if (!tracks.length) return null;

  var selectedIDs = options.selectedTrackIds || options.selectedTrackIDs || [];
  if (Array.isArray(selectedIDs)) {
    for (var selectedIndex = 0; selectedIndex < selectedIDs.length; selectedIndex++) {
      for (var trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
        if (tracks[trackIndex].id === selectedIDs[selectedIndex]) return tracks[trackIndex];
      }
    }
  }

  tracks.sort(function (left, right) { return trackScore(left) - trackScore(right); });
  var settings = options.settings || {};
  return settings.quality === "lowest" ? tracks[0] : tracks[tracks.length - 1];
}

function createDownloadPlan(input) {
  var resource = input.resource || {};
  var options = input.options || {};
  var track = selectedTrack(resource, options);
  if (!track) return null;
  return {
    inputs: [{
      id: track.id,
      executor: "http-file",
      url: track.url,
      headers: track.headers || {},
      extension: ".mp4",
      processors: track.processors || []
    }],
    output: {input: track.id, extension: ".mp4"}
  };
}

function refreshResource() {
  return {
    status: "recaptureRequired",
    message: "请在浏览器中重新打开对应的 X 推文，以重新捕获可用媒体地址。"
  };
}
