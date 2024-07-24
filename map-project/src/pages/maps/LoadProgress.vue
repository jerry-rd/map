<template>
  <div v-show="loading" class="loading-div">
    <Progress class="loading-Progress" :stroke-width="10" status="active" :percent="loadingPercent" hide-info />
  </div>
</template>

<script>
  export default {
    props: {
      loading: { type: Boolean, default: false },
      loadingPercent: { type: Number, default: 0 },
    },
  }
</script>

<style scoped lang="less">
  .loading-div {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: #080b17 !important;
    z-index: 19;
    display: flex;
    justify-content: center;
    align-items: center;
    .loading-Progress {
      width: 25%;
      /deep/.ivu-progress-inner,
      /deep/ .ivu-progress-success-bg,
      /deep/ .ivu-progress-bg {
        border-radius: 10px;
      }
    }
  }
</style>
