import { debounce, getTypeNameFromUrl, formatGetParams } from "./index.js";
import Constant from "./constant";
import { getDefaultLegendOptions, initWFSUrl } from "./geoserverFun";

import { unByKey } from "ol/Observable";

const defined = (target) => {
  return target !== undefined && target !== null
}
const defaultValue = (target, value) => {
  return defined(target) ? target : value
}
const checkLayer = (layer) => {
  const result = {
    success: false,
    name: null,
    url: null,
  };
  if (!layer) {
    console.error("Invalid layer");
    return result;
  }
  const source = layer.getSource();
  if (!source) {
    console.error("source not found");
    return result;
  }
  const url = source.getUrl();
  if (!url) {
    console.error("url not found");
    return result;
  }
  result.url = url;
  const name = layer.get(Constant.customLegend) ? layer.get(Constant.customLegend) : layer.get(Constant.defaultLegend);
  if (!name) {
    console.error("name not found");
    return result;
  }
  result.success = true;
  result.name = name;
  return result;
};

class SymbolManager extends EventTarget {
  constructor(showWholeSymbol = false) {
    super()
    this._geoMap = undefined;

    this._addAndRemoveListenerKey = undefined;

    this._debounceUpdate = undefined;

    this._layerCollection = undefined;

    this._layerStateCache = undefined;

    this._showWholeSymbol = showWholeSymbol;

    this._symbolMapCache = undefined;

    this._updateListeners = new Set();
    this.currentSymbols = []
    this.totalSymbols = []
    this._symbolsLayers = []

  }
  get showWholeSymbol() {
    return this._showWholeSymbol;
  }
  set showWholeSymbol(value) {
    if (this._showWholeSymbol != value) {
      this._showWholeSymbol = value;
      this._debounceUpdate()
    }
  }


  _check() {
    if (!this._geoMap) {
      console.error("map is undefined")
      return false
    }
    if (!this._layerCollection) {
      console.error("layerCollection is undefined")
      return false
    }
    if (!this._debounceUpdate) {
      console.error("update fun is undefined")
      return false
    }
    if (!this._layerStateCache) {
      console.error("layerStateCache is undefined")
      return false
    }
    if (!this._addAndRemoveListenerKey) {
      console.error("not found key for add or remove operation")
      return false
    }
    return true

  }

  init(map) {
    this._geoMap = map;
    this._layerStateCache = new Map();
    this._symbolMapCache = new Map();
    this._layerCollection = map.getLayers();
    this._debounceUpdate = debounce(this.update.bind(this), 200, false);

    for (const layer of this._layerCollection.getArray()) {
      this._handlerAddLayer(layer);
    }

    this._addAndRemoveListenerKey = this._layerCollection.on(["add", "remove"], (event) => {
      const type = event.type;
      const layer = event.element;
      type === "add" ? this._handlerAddLayer(layer) : this._handlerRemoveLayer(layer);
    });
  }

  addUpdateListener(listener) {
    this.addEventListener(Constant.updateBySymbols, listener);
    this._updateListeners.add(listener);
  }

  un(listener) {
    if (this._updateListeners.has(listener)) {
      this.removeEventListener(Constant.updateBySymbols, listener)
      this._updateListeners.delete(listener)
    }
  }

  update() {
    if (!this._check()) {
      return []
    }
    this._symbolMapCache.clear()
    for (const [key, value] of this._layerStateCache) {
      const layer = this.getLayerByType(key);
      if (!layer) {
        continue;
      }
      const visible = value.currentVisible;
      const symbols = value.symbols
      if (!visible || !symbols || symbols.length <= 0) {
        continue
      }
      for (const symbol of symbols) {
        if (this._symbolMapCache.has(symbol.id)) {
          const last = this._symbolMapCache.get(symbol.id)
          last.disabled = last.disabled && symbol.disabled
          last.isChecked = last.isChecked || symbol.isChecked
          continue
        }
        const obj = Object.assign({}, symbol)
        this._symbolMapCache.set(obj.id, obj)
      }
    }

    this.totalSymbols = [...this._symbolMapCache.values()]

    this.currentSymbols = this.totalSymbols.filter(symbol => {
      if (!symbol.showCheckBox) {
        return true
      }
      return !symbol.disabled || this._showWholeSymbol
    })

    this.dispatchEvent(new CustomEvent(Constant.updateBySymbols))

  }

  checkSymbol(isChecked, symbolId) {
    if (!this._check()) {
      return false
    }
    if (isChecked === undefined) {
      console.warn("symbol check state is undefined")
      return false
    }

    for (const [type, layerState] of this._layerStateCache) {
      const symbols = layerState.symbols
      if (!symbols || symbols.length <= 0) {
        console.warn("symbols is empty", layerState)
        continue
      }
      let needUpdate = defined(symbolId) ? false : true
      if (defined(symbolId)) {
        const symbol = symbols.find(symbol => symbol.id === symbolId)
        if (symbol) {
          needUpdate = true
          symbol.isChecked = isChecked
        }
      } else {
        for (const symbolItem of symbols) {
          symbolItem.isChecked = isChecked
        }
      }

      if (needUpdate) {
        const layer = this.getLayerByType(type);
        if (layer) {
          const canChange = layer.get(Constant.showCheckBox)
          if (canChange) {
            this._updateLayer(layer, layerState, isChecked, symbolId)
          }
        }
      }

    }
    this._debounceUpdate()
    return true
  }

  _updateLayer(layer, layerState, isChecked, symbolId) {
    if (!layer || !layerState) {
      console.warn("layer is empty or layerState is empty")
      return false
    }
    const filterProperty = layer.get(Constant.symbolFilter);
    //矢量图层，单图例图层
    if (!filterProperty) {
      layer.set(Constant.updateBySymbols, true)
      const symbols = layer.get(Constant.symbols)
      //单图例图层
      if (!symbols || symbols.length === 1) {
        layer.setVisible(isChecked);
        return
      }
      if (!defined(symbolId)) {
        const p = {}
        for (const symbol of symbols) {
          p[symbol.filter] = isChecked
        }
        layer.set(Constant.singleSymbolCache, p)
        layer.changed()
        layer.setVisible(isChecked);
        return
      }
      const currentSymbol = symbols.filter(v => v.id === symbolId)[0]
      if(currentSymbol === undefined) {
        console.error('出现未知错误，无法找到对应的图例对象') 
        return
      }

      const stateCache = layer.get(Constant.singleSymbolCache)
      stateCache[currentSymbol.filter] = isChecked
      layer.changed()
      layer.setVisible(true)
      return
    }
    const paramData = layerState.symbols
      .filter((value) => value.isChecked && !value.disabled)
      .map((value) => {
        return `'${value.filter}'`;
      });
    const total = layerState.symbols.map(v => {
      return `'${v.filter}'`
    })
    const params = paramData.length <= 0
      ? `${filterProperty} not in (${total.join(',')})`
      : `${filterProperty} in (${paramData.join(",")})`;

    //FIXME: 不确定是否都是wms 图层
    layer.getSource().updateParams({
      CQL_FILTER: params,
    });
  }

  async getLayerStyleSymbols(layer) {
    const { success, url, name } = checkLayer(layer);
    return new Promise((resolve, reject) => {
      if (!success) {
        reject("check  layer failed ");
        return;
      }
      layer.set(Constant.showSymbols, false);

      const params = Object.assign({}, getDefaultLegendOptions(), {
        layer: name,
      });
      const service = `${url}${formatGetParams(params, true, false)}`;
      fetch(service)
        .then((response) => response.blob())
        .then((data) => {
          return new Promise((resolve) => {
            let reader = new FileReader();
            reader.readAsText(data, Constant.symbolEncode);
            reader.onloadend = () => {
              resolve(reader.result);
            };
          });
        })
        .then((json) => {
          const jsonObject = JSON.parse(json);
          //TODO: 只获取第一个图例
          const legendArray = jsonObject.Legend;
          if (!legendArray || legendArray.length <= 0) {
            resolve(null);
            return;
          }
          const legend = legendArray[0];
          const rules = legend.rules;
          if (!rules || rules.length <= 0) {
            resolve(null);
            return;
          }
          let symbols = [];

          let filterProperty = undefined;
          for (const rule of rules) {
            let filter = rule.filter;
            let filterValue = undefined
            if (filter) {
              //FIXME: 简单解析filter，可能会出现问题
              const regex = /\[(.*?)\s*=\s*'([^']+)'\]/
              const match = filter.match(regex);
              if (match) {
                filterProperty = match[1]
                filterValue = match[2]
              }
            }
            //这里过滤Text
            const symbolizer = rule.symbolizers.filter((symbol) => {
              return Object.keys(symbol).every(
                (key) => Constant.symbolTypes.indexOf(key.toLowerCase()) !== -1
              );
            })[0];
            if (!symbolizer) {
              continue;
            }
            if (symbolizer['Raster']) {
              const element = obj['Raster'];
              const colorMap = element.colormap
              if (!colorMap) {
                continue
              }
              if (!colorMap.entries || !Array.isArray(colorMap.entries) || colorMap.entries.length === 0) {
                continue
              }
              symbols = symbols.concat(symbols, colorMap.entries)
              continue;
            }
            const iconParams = Object.assign({}, getDefaultLegendOptions(false), { layer: name, rule: rule.name });
            const pointUrl = symbolizer['Point'] ? symbolizer['Point'].url : null;

            const iconUrl = `${url}${formatGetParams(iconParams, true, false)}`;
            const id = defined(filterProperty) ? defaultValue(filterValue, '') : rule.name
            const label = defaultValue(rule.title, rule.name)
            const obj = {
              name: label,
              url: pointUrl ? pointUrl : iconUrl,
              id: id
            };
            symbols.push(obj);
          }
          if (symbols.length <= 0) {
            console.warn("has no symbols")
            return;
          }
          layer.set(Constant.showSymbols, true);
          filterProperty && layer.set(Constant.symbolFilter, filterProperty);

          if (!filterProperty) {
            const resetSymbols = [symbols[0]]
            const value = defaultValue(symbols[0].id, symbols[0].name)
            resolve({
              type: name,
              symbols: resetSymbols,
              currentSymbolNames: value,
            });
            return;
          }
          const params = layer.getSource().getParams()
          if (!params) {
            console.warn('图层配置错误')
            return undefined
          }
          let cql_filter = undefined
          for (const key in params) {
            if (Object.prototype.hasOwnProperty.call(params, key) && key.toLowerCase() === 'cql_filter') {
              cql_filter = params[key]
              break;
            }
          }
          //获取图层自身图例
          const serverUrl = initWFSUrl({
            serverUrl: url,
            typeName: name,
            filter: cql_filter,
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
                type: name,
                symbols: symbols,
                currentSymbolNames: propsValue,
              });
            })
            .catch((error) => {
              console.error(error);
              reject(error);
            });
        });
    });
  }

  _initLayer(layer) {
    if (!layer.get(Constant.showSymbols)) {
      console.warn("该图层不是图例图层");
      return false;
    }
    const symbols = layer.get(Constant.symbols)

    //图层默认图例，也是图层
    let typeName = layer.get(Constant.customLegend);
    if (!typeName && !symbols) {
      const source = layer.getSource();
      const url = source.getUrl();
      if (!url) {
        console.warn("无法获取该图层服务地址");
        return false;
      }
      typeName = getTypeNameFromUrl(url);
      if (typeName === null) {
        console.warn("无法获取该图层唯一类别");
        return false;
      }
      layer.set(Constant.customLegend, typeName);
    }
    if (layer.get(Constant.showCheckBox) === undefined) {
      layer.set(Constant.showCheckBox, true);
    }
    if (layer.get(Constant.singleSymbolCache) === undefined) {
      layer.set(Constant.singleSymbolCache, {});
    }
    return true;
  }

  addLayer(layer) {
    this._handlerAddLayer(layer)
  }

  _handlerAddLayer(layer) {
    if (!this._initLayer(layer)) {
      return
    }
    if (layer.get(Constant.layerKey) === undefined) {
      layer.set(Constant.layerKey, layer.ol_uid);
    }
    const layerId = layer.get(Constant.layerKey);
    if (layerId === undefined) {
      return
    }
    if (this._layerStateCache.has(layerId)) {
      console.warn("该图层已存在", layerId);
      return;
    }
    const layerState = {};
    this._symbolsLayers.push(layer);
    this._layerStateCache.set(layerId, layerState);
    layerState.currentVisible = layer.getVisible();

    layerState.visibleListener = layer.on("change:visible", (event) => {
      const layer = event.target;
      const layerId = layer.get(Constant.layerKey);
      if (!layerId) {
        return;
      }
      const isUpdateBySymbol = layer.get(Constant.updateBySymbols);
      if (isUpdateBySymbol) {
        layer.set(Constant.updateBySymbols, false)
        this._debounceUpdate();
        return
      }
      const state = this._layerStateCache.get(layerId);
      state.currentVisible = layer.getVisible();

      this._debounceUpdate();
    });

    const symbols = layer.get(Constant.symbols);

    if (symbols) {
      const currentSymbolNames = symbols.map((symbol) => {
        const value = defaultValue(symbol.id, symbol.name)
        return value
      });
      layerState.symbols = this._handlerLayerSymbol(
        layer,
        symbols,
        currentSymbolNames
      );
      this._debounceUpdate();
      return;
    }
    this.getLayerStyleSymbols(layer).then((data) => {
      if (!data) {
        console.warn("请求图层图例失败：", layer);
        return;
      }
      const { symbols, currentSymbolNames } = data;

      layerState.symbols = this._handlerLayerSymbol(
        layer,
        symbols,
        currentSymbolNames
      );
      this._debounceUpdate();
    });
  }

  _handlerLayerSymbol(layer, symbols, currentSymbolNames) {
    const formatSymbols = [];

    if (!symbols || symbols.length <= 0) {
      console.warn("该图层没有图例属性");
      return formatSymbols;
    }
    const layerId = layer.get(Constant.layerKey)
    for (const value of symbols) {
      const name = value.name ? value.name : value.label;
      const filter = defaultValue(value.id, name);
      const noCheck = currentSymbolNames.indexOf(filter) <= -1;
      const obj = Object.assign({}, value)
      obj.isChecked = layer.getVisible()
      obj.disabled = noCheck
      obj.id = `${layerId}_${filter}`
      obj.type = value.type
      obj.filter = filter
      obj.label = name
      //FIXME
      obj.showCheckBox = layer.get(Constant.showCheckBox)
      formatSymbols.push(obj);
    }
    return formatSymbols;
  }

  _handlerRemoveLayer(layer) {
    if (!layer) {
      return;
    }
    const key = layer.get(Constant.layerKey);
    if (key === undefined) {
      return
    }
    if (!this._layerStateCache.has(key)) {
      return;
    }
    let state = this._layerStateCache.get(key);

    if (state.visibleListener) {
      unByKey(state.visibleListener);
    }
    if (state.currentVisible) {
      layer.setVisible(state.currentVisible);
    }
    this._layerStateCache.delete(key);
    this._symbolsLayers = this._symbolsLayers.filter(layer => {
      return !(layer.get(Constant.layerKey) === key);
    })
    state = null;

    this._debounceUpdate();
  }

  getLayerByType(type) {
    return this._symbolsLayers.filter((layer) => {
      return (
        layer.get(Constant.showSymbols) &&
        layer.get(Constant.layerKey) === type
      );
    })[0];
  }

  destroyed() {
    if (this._addAndRemoveListenerKey) {
      unByKey(this._addAndRemoveListenerKey);
    }
    if (this._layerStateCache) {
      for (const [type, value] of this._layerStateCache) {
        const layer = this.getLayerByType(type);
        if (!layer) {
          console.warn("Layer not found ", type, value);
          continue;
        }
        if (value.visibleListener) {
          unByKey(value.visibleListener);
        }
        if (value.currentVisible) {
          layer.setVisible(value.currentVisible);
        }
      }
      this._layerStateCache.clear();

    }
    this.currentSymbols = []
    this.totalSymbols = []
    this._updateListeners.forEach(listener => this.removeEventListener(Constant.updateBySymbols, listener))
    this._updateListeners.clear()
    this._updateListeners = null

    this._symbolMapCache && this._symbolMapCache.clear()

    this._geoMap = null;
    this._layerStateCache = null;
    this._symbolMapCache = null
    this._layerCollection = null;
    this._addAndRemoveListenerKey = null;
    this._debounceUpdate = null;
    this._symbolsLayers = []
  }
}

export default SymbolManager;
