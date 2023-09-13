import ImageWMS from 'ol/source/ImageWMS'
import ImageLayer from 'ol/layer/Image'
import { WMSCapabilities } from 'ol/format'
import { getTypeNameFromUrl } from './index';
import { formatGetParams } from './index'
import Constant from './constant';

export function getDefaultWFSParams(version = '1.0.0') {
  return {

    service: 'WFS',
    request: null,
    version: version,
    outputformat: 'application/json',
    typename: null,
    exceptions: 'application/json',
    startIndex: null,
    maxFeatures: null,
    cql_filter: null,
    bbox: null,
    propertyName: null,
    sortBy: null
  };
}

export function getDefaultLegendOptions(json = true, version = '1.3.0') {
  return {
    request: 'GetLegendGraphic',
    version: version,
    format: json ? 'application/json' : 'image/png',
    exceptions: 'application/json',
    layer: null,
    rule: null,
    style: null,
    width: 20,
    height: 20,
    transparent: true,
    legend_options: 'forceLabels:off',
    hideEmptyRules: true,

  }
}

export function initWFSUrl({ serverUrl, typeName, filter, propertyName, version }) {

  if (!serverUrl || !typeName) {
    console.log('no server url or no layer type name')
    return null
  }

  let params = getDefaultWFSParams(version);
  params.request = 'GetFeature';
  if (filter) {
    params.cql_filter = filter;
  }
  params.typename = typeName;

  if (propertyName && Array.isArray(propertyName)) {
    params.propertyName = propertyName.length <= 0 ? '("")' : propertyName.join(',')
  }
  const url = serverUrl + formatGetParams(params, true, true);
  return url
}

export const createSingleImageLayer = async ({ layerName, url, projection, minScale, maxScale, isAutoLoad, defaultTransparency }) => {

  return new Promise((resolve, reject) => {
    if (!url) {
      reject('service url is required')
      return
    }
    fetch(`${url}?REQUEST=GetCapabilities`).then(res => res.text()).then(data => {
      const parser = new WMSCapabilities()
      const capabilities = parser.read(data)
      const layers = capabilities.Capability.Layer.Layer
      if (layers && layers.length > 0) {
        const mLayer = layers[0]
        const typeName = getTypeNameFromUrl(url)
        const visible = isAutoLoad === 'Y' ? true : false
        let opacity = Number.parseInt(defaultTransparency)
        if (isNaN(opacity)) {
          opacity = 100
        }
        opacity /= 100

        const layer = new ImageLayer({
          label: layerName,
          layerName: mLayer.Name,
          extent: mLayer.EX_GeographicBoundingBox,
          source: new ImageWMS({
            ratio: 1,
            url: url,
            params: {
              'FORMAT': 'image/png',
              'VERSION': '1.1.1',
              'LAYERS': typeName,
              'exceptions': 'application/vnd.ogc.se_inimage'
            },
            projection: projection,
            serverType: 'geoserver',
            transition: 0,
            crossOrigin: 'anonymous'
          }),
          minZoom: minScale,
          maxZoom: maxScale,
          visible: visible,
          opacity: opacity
        })
        layer.set(Constant.layerKey, typeName)
        resolve(layer)
      }
    })

  }).catch(function (err) { console.error(err) });

}