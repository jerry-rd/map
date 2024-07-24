import { clampLng, clampLat } from '@utils/common'
import { factoryData, factoryGoogleData } from '../visualScreenFunc'

const getProjectStatus = data => {
  if (data.totalAlarmNoProcessToday > 0) {
    return 'alarm'
  } else if (data.totalWarnToday > 0) {
    return 'warn'
  } else {
    return 'normal'
  }
}

export const useMapComponentMap = {
  BAIDU_OFFLINE: 'BaiduMap_offline',
  BAIDU: 'BaiduMap_onlineMapGL',
  GOOGLE: 'GoogleMap_online',
  YANDEX: 'YandexMap_online',
}

const factoryYandexMarkOption = item => {
  return {
    iconLayout: 'default#imageWithContent',
    iconImageHref: `/static/img/deviceStatusVisualScreen/${getProjectStatus(item)}-Pro@2x.png`,
    iconImageSize: item.isProject ? [60, 60] : [35, 40],
    iconImageOffset: item.isProject ? [-30, -60] : [-17.5, -40],
  }
}

export const projectsHandleForMapActionMap = {
  BAIDU_OFFLINE: list => {
    return list.map(v => ({
      ...v,
      isProject: true,
      projectStatus: getProjectStatus(v),
      degree: [clampLng(v.longitude), clampLat(v.latitude)],
      noProcessAlarm: v.totalAlarmNoProcessThisMonth,
    }))
  },
  BAIDU: list => {
    if (!list.length) return
    return (
      list
        .map(v => ({
          ...v,
          isProject: true,
          projectStatus: getProjectStatus(v),
          degree: [clampLng(v.longitude), clampLat(v.latitude)],
          noProcessAlarm: v.number,
        }))
        .map(item => {
          return { geometry: { type: 'Point', coordinates: [clampLng(item.longitude), clampLat(item.latitude)] }, properties: factoryData(item) }
        }) || []
    )
  },
  GOOGLE: list => {
    if (!list.length) return
    return (
      list
        .map(v => ({ ...v, isProject: true, projectStatus: getProjectStatus(v), degree: [clampLng(v.longitude), clampLat(v.latitude)], noProcessAlarm: v.number }))
        .map(item => {
          return { position: { lat: clampLat(item.latitude), lng: clampLng(item.longitude) }, properties: factoryGoogleData(item) }
        }) || []
    )
  },
  YANDEX: list => {
    if (!list.length) return
    return (
      list.map(v => ({
        ...v,
        projectStatus: getProjectStatus(v),
        degree: [clampLng(v.longitude), clampLat(v.latitude)],
        noProcessAlarm: v.number,
        position: [clampLat(v.latitude), clampLng(v.longitude)],
        options: factoryYandexMarkOption(v),
      })) || []
    )
  },
}
