
import { formatGetParams } from './index'
import { getDefaultLegendOptions, initWFSUrl } from './geoserverFun'
import Constant from './constant'


const checkLayer = (layer) => {
  const result = {
    success: false,
    name: null,
    url: null
  }
  if (!layer) {
    console.error('Invalid layer')
    return result
  }
  const source = layer.getSource()
  if (!source) {
    console.error('source not found')
    return result
  }
  const url = source.getUrl()
  if (!url) {
    console.error('url not found')
    return result
  }
  result.url = url
  const name = layer.get('layerName')
  if (!name) {
    console.error('name not found')
    return result
  }
  result.success = true
  result.name = name
  return result
}
/**
 * 获取图层默认图例，及全部图例
 */
export const getLayerStyleSymbols = async (layer) => {
  return new Promise((resolve, reject) => {
    const { success, url, name } = checkLayer(layer)
    if (!success) {
      reject('check  layer failed ')
      return
    }
    layer.set(Constant.showSymbols, false)

    const params = Object.assign({}, getDefaultLegendOptions(), { layer: name })
    const service = `${url}${formatGetParams(params, true, false)}`
    fetch(service).then((response) => response.blob()).then(data => {
      return new Promise((resolve, reject) => {
        let reader = new FileReader()
        reader.readAsText(data, 'GBK')
        reader.onloadend = () => {
          resolve(reader.result)
        }
      })

    }).then(json => {
      const typeName = layer.get(Constant.layerKey)
      const jsonObject = JSON.parse(json)
      //TODO: 只获取第一个图例
      const legendArray = jsonObject.Legend;
      if (!legendArray || legendArray.length <= 0) {
        resolve(null)
        return
      }
      const legend = legendArray[0]
      const rules = legend.rules
      if (!rules || rules.length <= 0) {
        resolve(null)
        return
      }
      const symbols = []

      let filterProperty = undefined
      for (const rule of rules) {
        if (filterProperty === undefined) {
          let filter = rule.filter
          if (filter) {
            //FIXME:
            filterProperty = filter.split(' ')[0].replace(/\[/, '')
          }
        }
        //这里过滤Text
        const symbolizer = rule.symbolizers.filter(symbol => {
          return Object.keys(symbol).every(key => Constant.symbolTypes.indexOf(key.toLowerCase()) !== -1)
        })[0]
        if (!symbolizer) {
          continue
        }
        const iconParams = Object.assign({}, getDefaultLegendOptions(false), { layer: name, rule: rule.title })
        const iconUrl = `${url}${formatGetParams(iconParams, true, false)}`
        const obj = {
          symbolName: rule.name,
          symbolUrl: symbolizer.url ? symbolizer.url : iconUrl,
        }
        symbols.push(obj)
      }
      layer.set(Constant.showSymbols, true)
      filterProperty && layer.set(Constant.symbolFilter, filterProperty)

      if (!filterProperty) {
        resolve({
          type: typeName,
          symbols: symbols,
          currentSymbolNames: symbols.map(symbol => symbol.symbolName)
        })
        return
      }
      //获取图层自身图例
      //FIXME:
      const serverUrl = initWFSUrl({
        serverUrl: url,
        typeName: typeName,
        propertyName: [filterProperty],
      });
      fetch(serverUrl)
        .then((response) => response.json())
        .then((json) => {
          if (json.exceptions) {
            console.error(json.exceptions);
            return;
          }
          const propsValue = json.features.map(
            (feature) => feature.properties[filterProperty]
          );
          resolve({
            type: typeName,
            symbols: symbols,
            currentSymbolNames: propsValue
          })
        })
        .catch((error) => {
          console.error(error);
          reject(error);
        });
    })
  })

}
