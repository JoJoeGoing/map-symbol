
const Constant = {
  layerKey: 'layer_uuid', //图层唯一ID 默认取 layer.ol_uid
  showSymbols: 'show_symbols',//是否为图例图层，
  symbolFilter: 'symbol_filter',//现在没有使用，为测试，暂时没有删除
  symbols: 'symbols_array',//针对矢量数据设置图例样式，
  symbolTypes: ['point', 'polygon', 'line', 'raster'],//解析geoserver图例
  updateBySymbols: 'update-by-symbols',//图例更新后发送的自定义事件类型
  customLegend: 'legendName',//自定义图例名
  defaultLegend: 'layerName',//默认图例属性，会在olManagerService中进行设置，
  showCheckBox: 'showCheckBox',//图层是否可以进行部分区域显示

  //用于缓冲单图例图层的显影控制操作
  singleSymbolCache: 'current_operation_symbol',//处理矢量图层多样式

  symbolEncode: 'GBK'//图例编码，写死了
}
export default Constant

