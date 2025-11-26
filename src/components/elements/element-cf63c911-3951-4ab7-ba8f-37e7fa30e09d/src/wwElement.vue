<template>
    <div class="ww-video-youtube" :class="{ editing: isEditing }">
        <div ref="videoPlayer"></div>
    </div>
</template>

<script>
import YouTubePlayer from 'youtube-player';

export default {
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
    },
    emits: ['update:sidepanel-content', 'trigger-event'],
    setup(props) {
        const player = null;
        const { variableValue: isPlayingVariableValue, setValue: setIsPlayingValue } =
            wwLib.wwVariable.useComponentVariable({
                uid: props.uid,
                name: 'Is Playing',
                type: 'boolean',
                defaultValue: false,
                readonly: true,
            });
        const { variableValue: currentTimeVariableValue, setValue: setCurrentTimeValue } =
            wwLib.wwVariable.useComponentVariable({
                uid: props.uid,
                name: 'Current time',
                type: 'number',
                defaultValue: 0,
                readonly: true,
            });

        return { player, isPlayingVariableValue, setIsPlayingValue, currentTimeVariableValue, setCurrentTimeValue };
    },
    data() {
        return {
            timeUpdater: null,
        };
    },
    computed: {
        isEditing() {
            // eslint-disable-next-line no-unreachable
            return false;
        },
        videoId() {
            if (!this.content.url || typeof this.content.url !== 'string') return '';

            if (this.content.url.indexOf('youtube.com') !== -1) {
                return this.content.url.split('v=')[1].split('?')[0];
            } else if (this.content.url.indexOf('youtu.be') !== -1) {
                return this.content.url.split('be/')[1].split('?')[0];
            }

            return '';
        },
    },
    watch: {
        isEditing() {
            this.initPlayer();
        },
        'content.url'() {
            this.initPlayer();
        },
        'content.controls'() {
            this.initPlayer();
        },
        'content.muted'(value) {
            if (this.player) {
                if (value) {
                    this.player.mute();
                } else {
                    this.player.unMute();
                }
            }
        },
        'content.autoplay'(value) {
            if (!this.content.muted) this.$emit('update:content', { muted: true });
            if (this.player && value && !this.isEditing) {
                this.player.loadVideoById({ videoId: this.videoId, startSeconds: this.content.videoStartTime });
            }
        },
    },
    methods: {
        async initPlayer() {
            // Prevent adding the player with http: protocol and having mixed content issues
            if (window.__WW_IS_PRERENDER__) return;
            if (this.timeUpdater) clearInterval(this.timeUpdater);
            if (!this.videoId) return;
            if (this.player) await this.player.destroy();

            const el = this.$refs.videoPlayer;

            this.player = await YouTubePlayer(el, {
                videoId: this.videoId,
                playerVars: {
                    controls: this.content.controls ? 1 : 0,
                },
            });

            this.player.on('ready', async () => {
                if (this.content.muted) this.player.mute();


                if (this.isEditing) return;
                if (this.content.autoplay) {
                    this.player.loadVideoById({ videoId: this.videoId, startSeconds: this.content.videoStartTime });
                } else {
                    this.player.cueVideoById({ videoId: this.videoId, startSeconds: this.content.videoStartTime });
                }

                this.timeUpdater = setInterval(await this.updateCurrentTime, 250);

                this.player.on('stateChange', async event => {
                    switch (event.data) {
                        // https://developers.google.com/youtube/iframe_api_reference#Events
                        case 1:
                            this.setIsPlayingValue(true);
                            this.$emit('trigger-event', {
                                name: 'play',
                                event: { value: await this.player.getCurrentTime() },
                            });
                            break;
                        case 2:
                            this.setIsPlayingValue(false);
                            this.$emit('trigger-event', {
                                name: 'pause',
                                event: { value: await this.player.getCurrentTime() },
                            });
                            break;
                        case 0:
                            this.setIsPlayingValue(false);
                            this.$emit('trigger-event', {
                                name: 'end',
                                event: { value: await this.player.getCurrentTime() },
                            });

                            if (this.content.loop) await this.player.seekTo(0);
                            break;
                        default:
                            break;
                    }
                });
            });
        },
        async updateCurrentTime() {
            const currentTime = await this.player.getCurrentTime();
            this.setCurrentTimeValue(Math.ceil(currentTime * 10) / 10);
        },
        playVideo() {
            if (!this.player) return;
            this.player.playVideo();
        },
        pauseVideo() {
            if (!this.player) return;
            this.player.pauseVideo();
        },
        seekTo(time) {
            if (!this.player) return;
            this.player.seekTo(time);
        },
    },
    beforeUnmount() {
        clearInterval(this.timeUpdater);
    },
    async mounted() {
        await this.initPlayer();
    },
};
</script>

<style lang="scss">
.ww-video-youtube {
    position: relative;
    overflow: hidden;
    aspect-ratio: 16 / 9;

    &.editing::after {
        content: '';
        position: absolute;
        inset: 0;
    }

    iframe {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100%;
    }
}
</style>
