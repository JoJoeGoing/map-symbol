import Constant from "./constant";

export const getTypeNameFromUrl = (url) => {
  if (!url) {
    return null
  }
  const temp = url.split("/");
  if (temp.length < 3) {
    return null;
  }
  const length = temp.length;

  return `${temp[length - 3]}:${temp[length - 2]}`;
}

export const getTypeNameFromLayer = (layer) => {
  // if (!(layer instanceof TileLayer)) {
  //     return null;
  // }
  // const source = layer.getSource();
  // if (!(source instanceof ImageWMS)) {
  //     return null;
  // }
  const source = layer.getSource();
  const url = source.getUrl();
  return getTypeNameFromUrl(url)
}

export function debounce(func, wait, immediate) {
  let timeout;
  return function () {
    const context = this;
    const args = [...arguments];
    if (timeout) clearTimeout(timeout);
    if (immediate) {
      const callNow = !timeout;
      timeout = setTimeout(() => {
        timeout = null;
      }, wait)
      if (callNow) func.apply(context, args)
    }
    else {
      timeout = setTimeout(() => {
        func.apply(context, args)
      }, wait);
    }
  }
}
/**
 * 格式化get请求参数
 * @method
 * @param {object} params 参数对象
 * @param {boolean} [needMark=true] 格式化后的参数是否以?开头。true 代表以?开头
 * @param {boolean} [noCache = false] 是否强制不缓存。false表示使用缓存
 */
export const formatGetParams = (params, needMark = true, noCache = false) => {
  let request = needMark ? '?' : '';
  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      if (params[key]) {
        request += key + '=' + params[key] + '&';
      }
    }
  }
  if (noCache) {
    request += 10000 * Math.random();
    return request;
  }
  return request.slice(0, -1);
};
// copy from cesium create guid
export const createGuid = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    var v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * 将矢量图层添加到图例管理器
 * @param {ol/layer/VectorLayer} layer 
 * @param {Array<createSymbol>} symbols create symbol Fun
 * @param {string} filterProperty 
 * @param {boolean=true} showSymbols 
 */
export const addToSymbolManager = (layer, { symbols, filterProperty, showSymbols = true }) => {
  const id = layer.ol_uid || createGuid()
  layer.set(Constant.showSymbols, showSymbols)
  layer.set(Constant.layerKey, id)
  layer.set(Constant.symbolFilter, filterProperty);
  layer.set(Constant.symbols, symbols)
}

