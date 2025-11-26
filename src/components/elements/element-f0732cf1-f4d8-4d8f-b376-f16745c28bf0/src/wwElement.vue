<template>
  <div class="animated-tabs" :style="containerStyle">
    <div class="tabs-container" ref="tabsContainer" :style="tabsContainerStyle">
      <div
        v-for="(tab, index) in tabs"
        :key="index"
        class="tab"
        :class="{ 'active': activeTabIndex === index }"
        :style="[
          tabStyle,
          { fontFamily: content.fontFamily }
        ]"
        @click="onTabClick(index)"
      >
        {{ tab.label }}
      </div>
      <div class="tab-indicator" :style="indicatorStyle" ref="tabIndicator"></div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, nextTick } from 'vue';

export default {
  props: {
    content: { type: Object, required: true },
    uid: { type: String, required: true },
    wwEditorState: { type: Object, required: true }
  },
  emits: ['trigger-event'],
  setup(props, { emit }) {
    const content = props.content;

    const containerStyle = computed(() => ({
      '--border-radius': content.borderRadius || '8px',
      '--padding': content.padding || '4px',
      '--font-size': content.fontSize || '14px',
      '--active-text-color': content.activeTextColor || '#ffffff',
      '--inactive-text-color': content.inactiveTextColor || '#333333',
      '--indicator-color': content.indicatorColor || '#4a90e2',
      '--tab-height': content.tabHeight || '40px',
      '--animation-duration': content.animationDuration || '0.3s',
      fontFamily: content.fontFamily || 'Inter,-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif'
    }));

    const tabsContainerStyle = computed(() => ({
      backgroundColor: content.tabsContainerBackground || content.backgroundColor || '#f5f5f5',
      borderRadius: content.borderRadius || '8px'
    }));

    const tabStyle = computed(() => ({
      height: content.tabHeight || '40px',
      padding: `0 ${content.tabPadding || '16px'}`,
      flex: content.fullWidthTabs ? 1 : 'unset'
    }));

    const indicatorStyle = computed(() => ({
      backgroundColor: content.indicatorColor || '#4a90e2',
      boxShadow: content.activeTabShadow || 'none',
      transition: `transform ${content.animationDuration} ease, width ${content.animationDuration} ease`
    }));

    const tabsContainer = ref(null);
    const tabIndicator = ref(null);
    const activeTabIndex = ref(content.defaultActiveTab || 0);

    const { value: selectedTabIndex, setValue: setSelectedTabIndex } =
      wwLib.wwVariable.useComponentVariable({ uid: props.uid, name: 'selectedTabIndex', type: 'number', defaultValue: activeTabIndex.value });

    const { value: selectedTab, setValue: setSelectedTab } =
      wwLib.wwVariable.useComponentVariable({ uid: props.uid, name: 'selectedTab', type: 'object', defaultValue: computed(() => content.tabs?.[activeTabIndex.value] || null) });

    const tabs = computed(() => content.tabs || []);

    const isEditing = computed(() => props.wwEditorState?.isEditing);

    const updateIndicatorPosition = () => {
      if (!tabsContainer.value || !tabIndicator.value) return;
      const activeEl = tabsContainer.value.children[activeTabIndex.value];
      if (!activeEl) return;
      const tabRect = activeEl.getBoundingClientRect();
      const containerRect = tabsContainer.value.getBoundingClientRect();
      const left = tabRect.left - containerRect.left;
      const width = tabRect.width;
      tabIndicator.value.style.transform = `translateX(${left}px)`;
      tabIndicator.value.style.width = `${width}px`;
    };

    const onTabClick = (index) => {
      if (isEditing.value) return;
      if (index !== activeTabIndex.value) {
        activeTabIndex.value = index;
        setSelectedTabIndex(index);
        setSelectedTab(content.tabs[index] || null);
        emit('trigger-event', {
          name: 'change',
          event: { index, tab: content.tabs[index] }
        });
        emit('trigger-event', {
          name: 'workflow',
          event: { workflowId: '1dbc3ffc-3376-4ba4-882b-7b764d0c7a10', index, tab: content.tabs[index] }
        });
      }
    };

    const setActiveTab = (index) => {
      if (index < 0 || index >= tabs.value.length) return false;
      activeTabIndex.value = index;
      setSelectedTabIndex(index);
      setSelectedTab(content.tabs[index]);
      nextTick(updateIndicatorPosition);
      return true;
    };

    watch(activeTabIndex, () => nextTick(updateIndicatorPosition));
    watch(() => content.defaultActiveTab, (nv) => nv != null && setActiveTab(nv));
    watch(() => content.tabs, () => {
      if (activeTabIndex.value >= tabs.value.length) setActiveTab(0);
      nextTick(updateIndicatorPosition);
    }, { deep: true });

    onMounted(() => {
      nextTick(updateIndicatorPosition);
      const onResize = () => updateIndicatorPosition();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    });

    return {
      content,
      tabsContainer,
      tabIndicator,
      activeTabIndex,
      tabs,
      containerStyle,
      tabsContainerStyle,
      tabStyle,
      indicatorStyle,
      onTabClick,
      setActiveTab
    };
  }
};
</script>

<style scoped lang="scss">
.animated-tabs {
  width: 100%;
  box-sizing: border-box;

  .tabs-container {
    position: relative;
    display: flex;
    align-items: center;
    padding: var(--padding);
    border-radius: var(--border-radius);
    height: var(--tab-height);
    box-sizing: border-box;
  }

  .tab {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 2;
    white-space: nowrap;
    font-size: var(--font-size);
    font-weight: 500;
    letter-spacing: -0.02rem;
    color: var(--inactive-text-color);
    transition: color var(--animation-duration) ease;
    user-select: none;
    &.active {
      color: var(--active-text-color);
    }
  }

  .tab-indicator {
    position: absolute;
    height: calc(100% - 2 * var(--padding));
    border-radius: calc(var(--border-radius) - var(--padding));
    z-index: 1;
    left: var(--padding);
    top: var(--padding);
    pointer-events: none;
  }
}
</style>