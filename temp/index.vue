<template>
  <div v-if="showSymbol" class="legend-container" :style="getSymbolStyle">
    <div class="legend-header">
      <el-checkbox v-show="showCheckAll" :checked="true" @change="handleCheckAllChange" />
      <div class="legend-header-title" @click="changeSymbolState">{{ title }}</div>
      <div class="legend-header-heightBtn" @mousedown="dragEagle" title="拖动高低"></div>
    </div>

    <ul class="legend-content" ref="legendContentDom" :style="getHeightStyle">
      <symbol-item v-for="symbol in symbols" :key="symbol.id" class="legend-item" :data="symbol"
        @state-changed="itemClick"></symbol-item>
    </ul>
  </div>
</template>
<script>
import SymbolItem from "./components/SymbolItem";
import SymbolManager from "../src/utils/SymbolManager";
export default {
  components: { SymbolItem },
  name: "LayerSymbol",
  props: {
    showWholeSymbol: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      showWholeSymbolState: this.showWholeSymbol,
      showSymbol: false,
      style: '',
      showCheckAll: true,
      symbols: []
    };
  },
  mounted() {
    this.symbolManager = new SymbolManager();
    this.symbolManager.addUpdateListener((event) => {

      this.symbols = event.target.currentSymbols;
      if (event.target.totalSymbols.length <= 0) {
        this.showSymbol = false
        return
      }
      if (!this.showSymbol) {
        this.showSymbol = true
      }
    });
  },
  computed: {
    getSymbolStyle() {
      return this.style;
    },
    show: function () {
      return this.symbols.length > 0;
    },
    getHeightStyle() {
      if (this.symbols.length <= 5) {
        return "height:auto";
      }
      return "height:20vh";
    },
    title() {
      return this.showWholeSymbolState ? "全部图例" : "动态图例";
    },
  },
  methods: {

    initManager(map) {
      this.symbolManager.init(map);
    },

    changeSymbolState() {
      this.showWholeSymbolState = !this.showWholeSymbolState;
      this.symbolManager.showWholeSymbol = this.showWholeSymbolState;
    },

    itemClick(isChecked, symbol) {
      const id = symbol.id;
      this.symbolManager.checkSymbol(isChecked, id);
    },

    handleCheckAllChange(value) {
      this.symbolManager.checkSymbol(value);
    },
    dragEagle(e) {
      let targetDiv = this.$refs.legendContentDom;
      let targetDivHeight = targetDiv.offsetHeight;
      let startX = e.clientX;
      let startY = e.clientY;

      document.onmousemove = function (e) {
        e.preventDefault();
        //得到鼠标拖动的宽高距离：取绝对值
        const distY = Math.abs(e.clientY - startY);
        //往上方拖动：
        if (e.clientY < startY) {
          targetDiv.style.height = targetDivHeight + distY + "px";
        }
        //往下方拖动：
        if (e.clientX < startX && e.clientY > startY) {
          targetDiv.style.height = targetDivHeight - distY + "px";
        }
      };
      document.onmouseup = function () {
        document.onmousemove = null;
      };
    },
  },
  beforeDestroy() {
    this.symbolManager.destroyed();
    this.symbolManager = null;
  },
};
</script>

<style lang="scss" scoped>
.legend-container {
  position: absolute;
  background: #021c39b3;
  border-radius: 0.5vh;
  padding: 0.8vh 0.5vw;
  min-width: 7.5vw;
  z-index: 99;
  bottom: 20px;
  right: 20vw;
  transition: 1s;

  .legend-header {
    text-align: center;
    white-space: nowrap;
    background-image: linear-gradient(90deg,
        #035da600 0%,
        #095aa585 47%,
        #0155a600 100%);

    font-size: 0.63vw;
    color: #ffffff;
    position: relative;
    display: flex;
    justify-content: flex-start;
    margin-bottom: 5px;
    padding: 0 5px;
    min-width: 18vh;

    .legend-header-title {
      text-align: center;
      font-family: PingFangSC-Medium;
      font-size: 14px;
      color: white;
      margin-left: 20px;
      cursor: pointer;
    }

    .legend-header-heightBtn {
      position: absolute;
      top: 0px;
      right: 0px;
      width: 20px;
      height: 20px;
      z-index: 9;
      cursor: n-resize;
      background: url("./assets/sx.png") no-repeat;
      background-position: 50%;
    }
  }

  .legend-content {
    overflow: auto;
    height: 0;
    list-style: none;
    margin-bottom: 0;
    li:not(:last-child) {
      margin-bottom: 5px;
    }

  }
}
</style>