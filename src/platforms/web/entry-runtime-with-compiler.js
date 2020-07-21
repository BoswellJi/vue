/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'


const idToTemplate = cached(id => {
  // 根据id查找dom节点
  const el = query(id)
  // 返回节点中的全部内容
  return el && el.innerHTML
})

// 装饰器模式，动态改写$mount方法
const mount = Vue.prototype.$mount
/* 安装组件 */
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 获取dom节点
  el = el && query(el)

  /* istanbul ignore if */
  // 不能安装Vue组件到body,html
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  // 组件配置对象
  const options = this.$options
  // resolve template/el and convert to render function
  // 没有render函数，将回吧el,template中的模板进行编译为render函数
  if (!options.render) {
    let template = options.template
    if (template) {
      // 模板字符串
      if (typeof template === 'string') {
        // 选择器，
        if (template.charAt(0) === '#') {
          // 获取模板
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
        // dom节点，获取模板html
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
      
    } else if (el) { //非模板，获取节点中的html结构
      template = getOuterHTML(el)
    }
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      /**
       * 将 template 编译到 render 函数
       */
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        // 为了兼容浏览器
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,

        // 这两个只会在完整版的Vue中会有
        delimiters: options.delimiters, //配置
        comments: options.comments //属性
      }, this)
      // 编译之后的render函数 staticRenderFns函数
      options.render = render
      options.staticRenderFns = staticRenderFns

      console.log(render);

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  // dom节点有内容
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    // 创建容器节点
    const container = document.createElement('div')
    // 将el克隆到容器
    container.appendChild(el.cloneNode(true))

    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
