<template>
  <li class="legend-item-container" :style="styleForText()">
    <template v-if="useCustom">
      <div class="custom-legend" v-html="symbol.customLegend"></div>
    </template>
    <template v-else-if="!useText">
      <div class="legend-check-box">
        <el-checkbox v-if="showCheckBox" v-model="symbol.isChecked" @change="switchShow"></el-checkbox>
      </div>
      <div class="legend-item">
        <template v-if="useImage">
          <img :src="symbol.url" alt class="legend_item-icoImg" />
        </template>
        <template v-else-if="useBackgroundColor">
          <div class="legend_item-icon" :style="styleForBackground()"></div>
        </template>
        <template v-else-if="useLine">
          <div class="legend_item-line">
            <div :style="styleForLine()"></div>
          </div>
        </template>
      </div>
    </template>

    <el-tooltip effect="dark" :content="symbol.label" placement="right">
      <span class="label">{{ symbol.label }}</span>
    </el-tooltip>
  </li>
</template>

<script>
export default {
  name: "SymbolItem",
  emits: ["state-changed"],
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      symbol: this.data,
    };
  },
  computed: {
    useImage: function () {
      return this.symbol.type == 1 || !!this.symbol.url;
    },
    useBackgroundColor: function () {
      return this.useSquare || this.useCircle
    },
    useSquare: function () {
      return this.symbol.type == 2
    },
    useCircle: function () {
      return this.symbol.type == 3
    },
    useLine: function () {
      return this.symbol.type == 5 || this.useDashLine
    },
    useDashLine: function () {
      return this.symbol.type == 8
    },
    useText: function () {
      return this.symbol.type == 6
    },
    useCustom: function () {
      return this.symbol.type == 7
    },
    showCheckBox: function () {
      if (this.useText || this.useCustom) {
        return false
      }
      return this.symbol.showCheckBox;
    },
  },
  methods: {
    switchShow(value) {
      this.$emit("state-changed", value, this.symbol);
    },

    styleForBackground: function () {
      const style = {
        "background-color": this.symbol.color || "white",
        height: this.symbol.height || "16px",
        width: this.symbol.width || "16px"
      };
      if (this.useCircle) {
        style["border-color"] = this.symbol.strokeColor || "white;";
        style["border-width"] = this.symbol.strokeWidth || "1px";
        style["border-style"] = this.symbol.strokeStyle || "solid";
        style["border-radius"] = this.symbol.strokeRadius || "10px";
      }
      return style;
    },
    styleForLine: function () {
      if (this.useDashLine) {
        return this.getDashLineStyle();
      }
      return {
        height: this.symbol.height || "9px",
        width: this.symbol.width || "20px",
        backgroundColor: this.symbol.color
      }
    },
    styleForText() {
      if (this.useText || this.useCustom) {
        return {
          "justify-content": "center",
        };
      }
      return {
        "justify-content": "flex-start",
      };
    },
    getDashLineStyle() {
      const color = this.symbol.color || "white"
      const height = this.symbol.height || "2px"
      const width = this.symbol.width || "20px"
      
      const bg = `linear-gradient(to left,transparent 0%, transparent 50%,${color} 50%,${color} 100%)`;
      return {
        background: bg,
        "background-size": "5px 1px",
        "background-repeat": "repeat-x",
        height: height,
        width:width
      };
    },
  },
  watch: {
    data: function (value) {
      this.symbol = value;
    },
  },
};
</script>

<style lang="scss" scoped>
.legend-item-container {
  padding: 0 5px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  display: flex;
  align-items: center;
  max-width: 20vw;
  min-height: 2em;
  min-width: 18vh;

.legend-check-box{
  width: 20px !important;
  height: 20px !important;
}
  .legend-item {
    margin: 0 5px 0 10px;
    display: flex;
    align-items: center;

    .legend_item-icoImg {
      width: 2vh;
      // height: 2vh;
      background-size: 100% 100%;
      display: inline-block;
      vertical-align: middle;
    }

    .legend_item-line,
    .legend_item-icon {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
  }

  .custom-legend {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .label {
    color: #fff;
    font-size: 1.4vh;
    margin-left: 0.7vh;
    vertical-align: middle;
    white-space: nowrap;
    /*强制单行显示*/
    text-overflow: ellipsis;
    /*超出部分省略号表示*/
    overflow: hidden;
  }
}
</style>