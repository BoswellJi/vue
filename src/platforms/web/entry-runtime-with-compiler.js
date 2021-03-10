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

const mount = Vue.prototype.$mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && query(el)

  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  // resolve template/el and convert to render function
  if (!options.render) {
    let template = options.template
    if (template) {
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
      
    } else if (el) { 
      //非模板，获取节点以及子节点的html字符串
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

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 安装调用
  return mount.call(this, el, hydrating)
}

/**
 * 获取元素的外部html
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
    // 
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
