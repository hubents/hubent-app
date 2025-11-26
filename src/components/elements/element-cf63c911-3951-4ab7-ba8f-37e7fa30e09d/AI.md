---
name: ww-video-youtube
description: A customizable YouTube video player component with autoplay, mute, loop, and control options, providing methods for video playback control and event triggering.
keywords: youtube integration, video playback control, autoplay feature, muted video, video loop, video controls, youtube player api, video state events, video start time, property binding
---

#### ww-video-youtube

***Purpose:*** 
Renders a YouTube video player with configuration options and playback control methods.

***Features:***
- YouTube Player API integration
- Playback methods: playVideo(), pauseVideo(), seekTo(time)

***Properties:***
- url: string - YouTube video URL. Default: "https://www.youtube.com/watch?v=r8z4Omw-D2s"
- videoStartTime: number - Video start time in seconds. Default: 0
- autoplay: boolean - Enable autoplay. Default: false
- muted: boolean - Mute video. Default: false
- loop: boolean - Enable video loop. Default: false
- controls: boolean - Show video controls. Default: true

***Events:***
- play: Triggered when video starts playing. Value is current time in seconds. Payload: {value: number}
- pause: Triggered when video is paused. Value is current time in seconds. Payload: {value: number}
- end: Triggered when video ends. Value is current time in seconds. Payload: {value: number}

***Exposed Variables:***
- Is Playing: boolean - Indicates if video is currently playing. (Path: variables['current_element_uid-Is Playing'])
- Current time: number - Current video playback time in seconds. (Path: variables['current_element_uid-Current time'])

***Exposed Element Actions:*** //OPTIONAL
- playVideo: (no args) Play video
- pauseVideo: (no args) Pause video
- seekTo: (arg1 (time in seconds): number) Go to time

***Notes:*** Do not set height to 0 : a combination of width to 100% & aspectRatio to 16/9 will ensure the video is displayed correctly.
