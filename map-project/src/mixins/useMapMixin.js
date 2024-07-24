import { MapManager, GOOGLE_MAP_CONFIG, useMapTypeConfig, YANDEX_MAP_CONFIG } from '@/untils/mapManager'
import { geocodingAnalysis } from '@/api/common/index'
export default {
  data() {
    return {
      mapElementId: 'MapContainers',
      useMap: '',
      map: null,
    }
  },
  methods: {
    async loadMapLib() {
      this.useMap = sessionStorage.getItem('useMap')
      const mapType = useMapTypeConfig[this.useMap] || 'onlineMapGL'
      const ak = MapManager.getAk(mapType)
      await MapManager.loadMap(mapType, ak)
      const namespace = MapManager.getNamespace(mapType)
      this.namespace = namespace.core
    },
    async setGoogleMarker(position) {
      if (this.marker && this.marker.map) {
        this.marker.map = null
      }
      const { AdvancedMarkerElement } = await this.namespace.importLibrary('marker')
      this.marker = new AdvancedMarkerElement({ position, map: this.map, gmpDraggable: true, title: 'address-project' })
      this.marker.addListener('dragend', event => {
        const position = this.marker.position
        this.setGoogleLocation(position)
      })
    },
    async googleMapInit(center) {
      const { Map } = await this.namespace.importLibrary('maps')
      this.map = new Map(document.getElementById(this.mapElementId), { ...GOOGLE_MAP_CONFIG, center })
      this.setGoogleMarker(center)
      this.map.addListener('click', e => {
        this.setGoogleMarker(e.latLng)
        this.setGoogleLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() })
      })
    },
    async setGoogleLocation(position) {
      this.SetCoordinates(position)
      const location = new this.namespace.LatLng(position.lat, position.lng)
      const geocoder = new this.namespace.Geocoder()
      const response = await geocoder.geocode({ location })
      const address = response.results[0]
      if (address.address_components.length) {
        const county = address.address_components.find(({ types }) => types.includes('country'))
        const province = address.address_components.find(({ types }) => types.includes('administrative_area_level_1'))
        const city = address.address_components.find(({ types }) => types.includes('locality') || types.includes('administrative_area_level_2'))
        const areaValue = address.address_components.find(({ types }) => types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('administrative_area_level_3'))
        const replaceStr = `${(county && county.long_name) || ''}${(province && province.long_name) || ''}${(city && city.long_name) || ''}${(areaValue && areaValue.long_name) || ''}`
        const addressObj = { province: (province && province.long_name) || '', city: (city && city.long_name) || this.provinceValue || '', district: (areaValue && areaValue.long_name) || '', street: address.formatted_address.replace(replaceStr, '') }
        this.SetAddress(addressObj)
      }
    },
    async setYandexMarker(position) {
      this.map.geoObjects.removeAll()
      const marker = new this.namespace.Placemark(position)
      this.map.geoObjects.add(marker)
    },
    async setYandexLocation([lat, lng]) {
      this.SetCoordinates({ lat, lng })
      const myGeocoder = this.namespace.geocode([lat, lng], { kind: 'street', results: 1 })
      myGeocoder.then(res => {
        const addressInfo = res.geoObjects.get(0)
        if (addressInfo) {
          const addList = addressInfo.getAdministrativeAreas()
          const addressObj = { province: addList[0], city: addList[1] || addList[0], district: addList[2] || addList[1] || addList[0], street: addressInfo.getThoroughfare() }
          this.SetAddress(addressObj)
        }
      })
    },
    async yandexMapInit(center) {
      this.map = new this.namespace.Map(this.mapElementId, { ...YANDEX_MAP_CONFIG, center, zoom: 16 }, { suppressMapOpenBlock: true, minZoom: 2 })
      this.map.copyrights._onMapDestroy()
      this.setYandexMarker(center)
      this.map.events.add('click', e => {
        const position = e.get('coords')
        this.setYandexMarker(position)
        this.setYandexLocation(position)
      })
    },
    setBaiduMarker(lng, lat) {
      if (!this.map) return
      this.SetCoordinates({ lat, lng })
      this.map.clearOverlays()
      const point = new this.namespace.Point(lng, lat)
      const marker = new this.namespace.Marker(point)
      this.map.addOverlay(marker)
      return marker
    },
    async geocodingAnalysis(lng, lat) {
      const res = await geocodingAnalysis({ location: `${lat},${lng}` })
      if (res.success) {
        let addComp = { ...res.data.addressComponent, pointName: res.data.pois.length && res.data.pois[0].name }
        this.getBaiduLocation(addComp)
      } else {
        this.$Message.error(res.message)
      }
    },
    getBaiduLocation(val) {
      if (!val) {
        this.$Message.error(this.$t('againgetLocation'))
      } else {
        const addressObj = { province: val.province, city: val.city, district: val.district || val.town, street: val.pointName || val.street }
        this.SetAddress(addressObj)
      }
    },
    baiduMapInit(lng, lat) {
      this.map = new this.namespace.Map(this.mapElementId)
      if (this.useMap === 'BAIDU') {
        if (this.$store.state.baiduStyleId) this.map.setMapStyleV2({ styleId: this.$store.state.baiduStyleId })
      } else {
        this.map.setMaxZoom(this.$store.state.personalBaiduOfflineMapLevel || 10)
      }
      this.map.addEventListener('click', e => {
        const point = e.latlng || e.point
        this.setBaiduMarker(point.lng, point.lat)
        this.geocodingAnalysis(point.lng, point.lat)
      })
      const point = new this.namespace.Point(lng, lat)
      this.map.centerAndZoom(point, 8)
      this.setBaiduMarker(lng, lat)
      this.map.enableScrollWheelZoom(true)
      this.map.setDisplayOptions && this.map.setDisplayOptions({ indoor: false })
    },
    moveToPointAndMarker(lat, lng) {
      if (this.useMap === 'GOOGLE') {
        this.setGoogleMarker({ lat, lng })
        this.map.panTo({ lat, lng })
      } else if (this.useMap === 'YANDEX') {
        this.setYandexMarker([lat, lng])
        this.map.panTo([lat, lng])
      } else {
        this.setBaiduMarker(lng, lat)
        this.map.panTo(new this.namespace.Point(lng, lat))
      }
    },
    googleMapSearch(keyword) {
      const geocoder = new this.namespace.Geocoder()
      geocoder.geocode({ address: keyword }, (results, status) => {
        if (status === 'OK') {
          const { geometry } = results[0]
          this.map.panTo(geometry.location)
          this.setGoogleMarker(geometry.location)
          this.setGoogleLocation(geometry.location)
        } else {
          this.$Message.error({ content: this.$t('positionNoresult') })
        }
      })
    },
    baiduMapSearch(keyword) {
      const myGeo = new this.namespace.Geocoder()
      myGeo.getPoint(
        keyword,
        point => {
          if (point) {
            this.map.panTo(point)
            this.setBaiduMarker(point.lng, point.lat)
            this.geocodingAnalysis(point.lng, point.lat)
          } else {
            this.$Message.error({ content: this.$t('positionNoresult') })
          }
        },
        this.checkMapValue
      )
    },
    yandexMapSearch(keyword) {
      const myGeocoder = this.namespace.geocode(keyword, { kind: 'street', results: 1 })
      myGeocoder.then(res => {
        const addressInfo = res.geoObjects.get(0)
        if (addressInfo) {
          const coords = addressInfo.geometry.getCoordinates()
          this.map.panTo(coords)
          this.setYandexMarker(coords)
          this.setYandexLocation(coords)
        } else {
          this.$Message.error({ content: this.$t('positionNoresult') })
        }
      })
    },
    SetCoordinates() {},
    SetAddress() {},
  },
  beforeDestroy() {
    this.map && this.map.destroy && this.map.destroy()
    this.map = null
  },
}
