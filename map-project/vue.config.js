const Setting = {
  // 是否使用 Mock 的数据，默认 开发环境为 true，生产环境为 false
  isMock: false,
  // 部署应用包时的基本 URL
  publicPath: env === "development" || cur === "test" || cur === "dev" || cur === "local" ? "/" : _url,
  // 生产环境构建文件的目录名
  outputDir: cur === "local" ? "estate_v5" : "dist",
  // 放置生成的静态资源 (js、css、img、fonts) 的 (相对于 outputDir 的) 目录。
  assetsDir: "static",
  // 开发环境每次保存时 lint 代码，会将 lint 错误输出为编译警告
  // true || false || error
  lintOnSave: env !== "prod",
  // iView Loader 的选项
  // 详见 https://www.iviewui.com/docs/guide/iview-loader
  iviewLoaderOptions: {
    prefix: false,
  },
}

const CompressionPlugin = require("compression-webpack-plugin")
// const FileManagerPlugin = require('filemanager-webpack-plugin')
const { CleanWebpackPlugin } = require("clean-webpack-plugin")
// 拼接路径
const resolve = (dir) => require("path").join(__dirname, dir)
process.env.VUE_APP_BUILD_TIME = require("dayjs")().format("YYYY-M-D HH:mm:ss")

// 生产环境
const isDev = process.env.VUE_APP_CURRENTMODE === "dev"
// CDN外链，会插入到index.html中
let externals = { vue: "Vue", vuex: "Vuex", "vue-router": "VueRouter", axios: "axios" }
let cdn = { css: [], js: [] }
module.exports = {
  publicPath: Setting.publicPath,
  lintOnSave: Setting.lintOnSave,
  outputDir: Setting.outputDir,
  assetsDir: Setting.assetsDir,
  runtimeCompiler: true,
  productionSourceMap: false,
  devServer: {
    proxy: {
      ".*\\.as$": {
        target: "http://192.168.5.21:8080", // 开发测试测试环境
        changeOrigin: true,
      },
    },
  },
  css: {
    loaderOptions: {
      less: {},
    },
  },
  // || process.env.VUE_APP_CURRENTMODE === 'local'
  configureWebpack: (config) => {
    // 排除打包的某些选项
    if (process.env.VUE_APP_CURRENTMODE === "prod" || process.env.VUE_APP_CURRENTMODE === "test") {
      config.externals = externals
    }
  },
  // 默认设置: https://github.com/vuejs/vue-cli/tree/dev/packages/@vue/cli-service/lib/config/base.js
  chainWebpack: (config) => {
    if (process.env.VUE_APP_CURRENTMODE === "prod" || process.env.VUE_APP_CURRENTMODE === "test" || process.env.VUE_APP_CURRENTMODE === "local") {
      config.plugin("compressionPlugin").use(
        new CompressionPlugin({
          algorithm: "gzip", // 使用gzip压缩
          test: /\.js$|\.html$|\.css/, // 匹配文件名
          filename: "[path].gz[query]", // 压缩后的文件名(保持原文件名，后缀加.gz)
          minRatio: 0.8, // 压缩率小于1才会压缩
          threshold: 10240, // 对超过10k的数据压缩
          deleteOriginalAssets: false, // 删除源文件
        })
      )
      if (!isLocal) {
        config.plugin("html").tap((arg) => {
          arg[0].cdn = cdn
          return arg
        })
      }
    }
    config.plugin("cleanWebpackPlugin").use(new CleanWebpackPlugin())
    config.plugins.delete("prefetch").delete("preload")
    config.resolve.symlinks(true)
    config
      // 开发环境
      .when(process.env.NODE_ENV === "development", (config) => config.devtool("cheap-source-map"))
      // 非开发环境
      .when(process.env.NODE_ENV !== "development", (config) => {})
    // 不编译 iView Pro

    config.module
      .rule("js")
      .test(/\.jsx?$/)
      .exclude.add(resolve("src/libs/iview-pro"))
      .end()
    // 使用 iView Loader
    config.module
      .rule("vue")
      .test(/\.vue$/)
      .use("iview-loader")
      .loader("iview-loader")
      .tap(() => {
        return Setting.iviewLoaderOptions
      })
      .end()
    // markdown
    config.module.rule("md").test(/\.md$/).use("text-loader").loader("text-loader").end()
    // i18n
    config.module
      .rule("i18n")
      .resourceQuery(/blockType=i18n/)
      .use("i18n")
      .loader("@kazupon/vue-i18n-loader")
      .end()
    // image exclude
    const imagesRule = config.module.rule("images")
    imagesRule
      .test(/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/)
      .exclude.add(resolve("src/assets/svg"))
      .end()
    // 重新设置 alias
    config.resolve.alias.set("@api", resolve("src/api")).set("echarts5", resolve("node_modules/echarts5"))
    // node
    config.node.set("__dirname", true).set("__filename", true)
  },
}
