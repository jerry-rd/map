<template>
  <div class="map-content-body">
    <div class="map-yandex" id="yandexMap"></div>
    <LoadProgress :loading="loading" :loadingPercent="loadingPercent" />
  </div>
</template>
<script>
  import { MapManager, YANDEX_MAP_CONFIG } from '@/untils/mapManager'
  import LoadProgress from './LoadProgress.vue'
  export default {
    name: 'yandexMap',
    props: {
      markerList: { type: Array, default: () => [] },
      mapStyleType: { type: String, default: '' },
    },
    components: { LoadProgress },
    data() {
      return {
        loading: true,
        loadingPercent: 0,
        zoom: 10,
        map: null,
        mapInitFlag: false,
        namespace: null,
        mapType: 'yandexMap',
      }
    },
    methods: {
      async initMap() {
        let processTimer = setInterval(() => {
          if (this.loadingPercent > 94) return
          this.loadingPercent += 5
        }, 8)
        await MapManager.loadMap(this.mapType, this.$store.state.yandexKey)
        const namespace = MapManager.getNamespace(this.mapType)
        this.namespace = namespace.core
        this.map = new this.namespace.Map('yandexMap', { ...YANDEX_MAP_CONFIG }, { suppressMapOpenBlock: true, minZoom: 2 })
        this.map.copyrights._onMapDestroy() // 清除版权信息
        this.map.layers.events.once('tileloadchange', e => {
          this.loading = false
          clearInterval(processTimer)
          processTimer = null
          this.getInitViewPort()
        })
      },
      factoryYandexData(item) {
        return { ...item, clusterCaption: `${item.projectName}` }
      },
      getInitViewPort() {
        const namespace = this.namespace
        const balloonLayout = namespace.templateLayoutFactory.createClass(
          `<div class="popover $[properties.projectStatus]-bgc project-Height">
            <span><i class="ivu-icon ivu-icon-ios-close closeWindowInfo"></i></span>
            <div class="popover-inner">$[[options.contentLayout]]</div>
          <div>`,
          {
            build: function () {
              this.constructor.superclass.build.call(this)
              this._el = this.getParentElement().querySelector('.popover')
              this.applyElementOffset()
              this.onCloseClick = e => {
                e.preventDefault()
                this.events.fire('userclose')
              }
              this._el.querySelector('.closeWindowInfo').addEventListener('click', this.onCloseClick)
            },
            clear: function () {
              this._el.querySelector('.closeWindowInfo').removeEventListener('click', this.onCloseClick)
              this.constructor.superclass.clear.call(this)
            },
            applyElementOffset: function () {
              const w = this._el.offsetWidth
              const h = this._el.offsetHeight
              this._el.style.left = `${-w / 2}px`
              this._el.style.top = `${-h - 40}px`
            },
            onSublayoutSizeChange: function () {
              balloonLayout.superclass.onSublayoutSizeChange.apply(this, arguments)
              this.applyElementOffset()
              this.events.fire('shapechange')
            },
            getShape: function () {
              var position = this._el.style
              const left = parseFloat(position.left)
              const top = parseFloat(position.top)
              return new namespace.shape.Rectangle(
                new namespace.geometry.pixel.Rectangle([
                  [left, top],
                  [left + this._el.offsetWidth, top + this._el.offsetHeight + 40],
                ])
              )
            },
          }
        )
        const balloonContentLayout = this.namespace.templateLayoutFactory.createClass(`<div class="info-title $[properties.projectStatus]-titleColor">${window.$t('projectInfo')} </div>
                <div class="info-body $[properties.projectStatus]-titleColor">
                  <div class="mart-10"><span>${window.$t('projectName')}： </span><span class="info-text-content"> $[properties.projectName] </span></div>
                <div class="mart-10"><span>${window.$t('numberOfDevices')}： </span><span class="info-text-content">$[properties.totalMac] </span></div>
                <div class="mart-10"><span>${window.$t('electricityMonth')}： </span><span class="info-text-content">$[properties.curMonthPower]kW·h </span></div>
                 $[properties.totalAlarmNoProcessToday === 0 || properties.totalAlarmNoProcessToday ? <div class="mart-10"><span>${window.$t('numberOfUnprocessedAlarms')}： </span><span class="info-text-content">$[properties.totalAlarmNoProcessToday]</span></div> : '']
                 <div style="text-align:center" class="mart-10">
          <button class="button-$[properties.projectStatus] checkDetails-button">
          <a href="javascript:;" class="$[properties.projectStatus]-titleColor" onclick="openPrjAction('$[properties.projectName]','$[properties.projectCode]')">${window.$t('viewDetails')}</a></button></div>
          </div>`)
        const customBalloonContentLayout = namespace.templateLayoutFactory.createClass(
          `<div class="popover proList-bgc"> 
            <span><i class="ivu-icon ivu-icon-ios-close closeWindowInfo"></i></span>
            <div style="display:flex;" class="proList-content">
              <div style="flex-shrink:0;width:40%;overflow-y:auto;"> 
                  <div class="left-btns" style="padding:20px 10px 10px 10px;">
                    {% for key, geoObject in properties.geoObjects %}
                      <button data-index="{{key}}" class="project-Button-baidu-info pd-Button">{{geoObject.properties.projectName}}</button>
                    {% endfor %}
                  </div>
              </div>  
              <div class="online-device-titleColor pd-rightContent">
                {% for geoObject in properties.geoObjects %} 
                  <div class="default-div">
                    <div class="text-center"><span style="font-size:18px;margin-right:20px;">${window.$t('projectInfo')}</span></div>
                    <div class="margin-top-10"><span> ${window.$t('projectName')}： </span> <span class="info-text-content">{{geoObject.properties.projectName}}</span></div>
                    <div class="margin-top-10"><span>${window.$t('numberOfDevices')}：</span> <span class="info-text-content">{{geoObject.properties.totalMac}}</span></div>
                    <div class="margin-top-10"><span> ${window.$t('electricityMonth')}： </span> <span class="info-text-content">{{geoObject.properties.curMonthPower}}kW·h</span></div>
                    <div class="margin-top-10 text-center">
                      <button class="online-button checkDetails-button">
                        <a href="javascript:;" class="normal-titleColor" onclick="openPrjAction({{geoObject.properties.projectName}},{{geoObject,properties.projectCode}})">查看详情</a>
                      </button>
                    </div>
                  </div>
                {% endfor %}
              </div> 
           </div>
      </div>`,
          {
            build() {
              this.constructor.superclass.build.call(this)
              this._el = this.getParentElement().querySelector('.popover')
              this.applyElementOffset()
              this.onCloseClick = e => {
                e.preventDefault()
                this.events.fire('userclose')
              }
              const _changeItemByIndex = index => {
                this._el
                  .querySelector('.left-btns')
                  .querySelectorAll('.pd-Button')
                  .forEach((btn, idx) => {
                    btn.classList.toggle('active', idx === index)
                  })
                this._el.querySelectorAll('.default-div').forEach((div, idx) => {
                  div.style.display = idx === index ? 'block' : 'none'
                })
              }
              this.changeItem = e => {
                e.preventDefault()
                const index = +e.target.dataset.index
                _changeItemByIndex(index)
              }
              _changeItemByIndex(0)
              this._el.querySelector('.closeWindowInfo').addEventListener('click', this.onCloseClick)
              this._el.querySelector('.left-btns').addEventListener('click', this.changeItem)
            },
            clear: function () {
              this._el.querySelector('.closeWindowInfo').removeEventListener('click', this.onCloseClick)
              this._el.querySelector('.left-btns').removeEventListener('click', this.changeItem)
              this.constructor.superclass.clear.call(this)
            },
            applyElementOffset: function () {
              const w = this._el.offsetWidth
              const h = this._el.offsetHeight
              this._el.style.left = `${-w / 2}px`
              this._el.style.top = `${-h - 40}px`
            },
            onSublayoutSizeChange: function () {
              balloonLayout.superclass.onSublayoutSizeChange.apply(this, arguments)
              this.applyElementOffset()
              this.events.fire('shapechange')
            },
            getShape: function () {
              var position = this._el.style
              const left = parseFloat(position.left)
              const top = parseFloat(position.top)
              return new namespace.shape.Rectangle(
                new namespace.geometry.pixel.Rectangle([
                  [left, top],
                  [left + this._el.offsetWidth, top + this._el.offsetHeight + 40],
                ])
              )
            },
          }
        )
        const clusterer = new this.namespace.Clusterer({
          preset: 'islands#invertedBlueClusterIcons',
          groupByCoordinates: false,
          clusterDisableClickZoom: false,
          clusterHideIconOnBalloonOpen: false,
          geoObjectHideIconOnBalloonOpen: false,
          showInAlphabeticalOrder: true,
          clusterBalloonLayout: customBalloonContentLayout,
        })
        const markerList = this.markerList.map(item => {
          return new this.namespace.Placemark(item.position, this.factoryYandexData(item), {
            ...item.options,
            balloonShadow: false,
            balloonLayout,
            balloonContentLayout,
            balloonPanelMaxMapArea: 0,
          })
        })
        clusterer.add(markerList)
        this.map.geoObjects.add(clusterer)
        this.map.setBounds(clusterer.getBounds(), { checkZoomRange: true, useMapMargin: true })
      },
    },
    watch: {
      mapStyleType: {
        handler(newValue) {
          if (newValue === 'satellite') {
            this.map.setType('yandex#hybrid')
          } else if (newValue === '2d') {
            this.map.setType('yandex#map')
          }
        },
        deep: true,
      },
      markerList: {
        handler(value) {
          if (this.map) {
            this.getInitViewPort()
          }
        },
        deep: true,
        immediate: true,
      },
    },
    beforeDestroy() {
      this.map && this.map.destroy()
      this.map = null
    },
    mounted() {
      this.initMap()
    },
  }
</script>
<style lang="less" scoped>
  .map-content-body {
    width: 100%;
    height: 100%;
    position: relative;
    .map-yandex {
      width: 100%;
      height: 100%;
      /deep/ .project-Height {
        width: 400px;
        height: auto;
        padding-top: 30px;
        padding-right: 30px;
        padding-bottom: 20px;
        position: absolute;
      }
      /deep/ .closeWindowInfo {
        position: absolute;
        right: 30px;
        color: #999;
        top: 20px;
        font-size: 28px;
      }
      /deep/.info-title {
        text-align: center;
      }
      /deep/ .normal-titleColor {
        color: #00ffea;
      }
      /deep/ .warn-titleColor {
        color: #ffd300;
      }
      /deep/ .alarm-titleColor {
        color: #ff0092;
      }
      /deep/ .mart-10 {
        margin-top: 7px;
        margin-left: 30px;
        text-align: left;
      }
      /deep/ .info-text-content {
        color: #999;
      }
      /deep/ .proList-bgc {
        background: url('~@/assets/images/projectListBgc.png');
        background-size: 100% 100%;
        padding: 30px;
        width: 470px;
        position: absolute;
      }
      /deep/.proList-content {
        height: 250px;
      }
      /deep/ .alarm-bgc {
        background: url('~@/assets/images/alarm-bgc-red.png');
        background-size: 100% 100%;
      }
      /deep/ .warn-bgc {
        background: url('~@/assets/images/warn-bgc-yellow.png');
        background-size: 100% 100%;
      }
      /deep/ .normal-bgc {
        background: url('~@/assets/images/proModalBgc.png');
        background-size: 100% 100%;
      }
      /deep/.checkDetails-button {
        width: 88px;
        height: 28px;
        border-radius: 4px;
        border: 1px solid #00ffea;
      }
      /deep/ .button-normal {
        border: 1px solid #00ffea;
        background: linear-gradient(180deg, rgba(0, 255, 234, 0) 0%, rgba(0, 255, 234, 0.2) 100%);
      }
      /deep/ .button-warn {
        border: 1px solid #ffd300;
        background: linear-gradient(180deg, rgba(255, 211, 0, 0) 0%, rgba(255, 211, 0, 0.2) 100%);
      }
      /deep/ .button-alarm {
        border: 1px solid #ff0092;
        background: linear-gradient(180deg, rgba(255, 0, 146, 0) 0%, rgba(255, 0, 146, 0.2) 100%);
      }
      /deep/ .default-div {
        display: none;
        &.active {
          display: block;
          z-index: 2;
        }
      }
      /deep/ .project-Button-baidu-info {
        background: #06101b;
        border: 1px solid #194447;
        color: #037c79;
        z-index: 1;
      }
      /deep/ .pd-Button {
        border-radius: 3px;
        margin-top: 10px;
        padding: 2px 5px;
        width: 100%;
        &.active {
          background: #194447;
          border: 1px solid #2d7973;
          color: #01f2df;
          z-index: 2;
        }
      }
      /deep/ .pd-rightContent {
        padding: 0 10px 0 10px;
        margin: 25px 10px 20px 0;
        border-left: 1px solid #31343d;
        color: #01f2df;
        .margin-top-10 {
          margin-top: 10px;
        }
        .text-center {
          text-align: center;
        }
        .online-button {
          background: linear-gradient(180deg, rgba(0, 255, 234, 0) 0%, rgba(0, 255, 234, 0.2) 100%);
          border: 1px solid #00ffea;
          color: #00ffea;
        }
      }
    }
  }
</style>
