/* @flow */

import { inBrowser, isIE9 } from 'core/util/index'
import { addClass, removeClass } from './class-util'
import { remove, extend, cached } from 'shared/util'

/**
 * 解析过渡
 * @param {*} def 组件上定义的属性 
 */
export function resolveTransition (def?: string | Object): ?Object {
  if (!def) {
    return
  }
  /* istanbul ignore else */
  if (typeof def === 'object') {
    const res = {}
    // 定义css样式
    if (def.css !== false) {
      // 设置过渡样式
      extend(res, autoCssTransition(def.name || 'v'))
    }
    // 合并组件的属性props
    extend(res, def)
    return res
  } else if (typeof def === 'string') {
    return autoCssTransition(def)
  }
}

// 自动样式过渡 
const autoCssTransition: (name: string) => Object = cached(name => {
  // 对应过程中的对应样式
  return {
    enterClass: `${name}-enter`,
    enterToClass: `${name}-enter-to`,
    enterActiveClass: `${name}-enter-active`,
    leaveClass: `${name}-leave`,
    leaveToClass: `${name}-leave-to`,
    leaveActiveClass: `${name}-leave-active`
  }
})

// 非ie9浏览器
export const hasTransition = inBrowser && !isIE9
const TRANSITION = 'transition'
const ANIMATION = 'animation'

// 过渡属性/事件嗅探
// Transition property/event sniffing
export let transitionProp = 'transition'
export let transitionEndEvent = 'transitionend'
export let animationProp = 'animation'
export let animationEndEvent = 'animationend'

if (hasTransition) {
  /* istanbul ignore if */
  if (window.ontransitionend === undefined &&
    window.onwebkittransitionend !== undefined
  ) {
    transitionProp = 'WebkitTransition'
    transitionEndEvent = 'webkitTransitionEnd'
  }
  if (window.onanimationend === undefined &&
    window.onwebkitanimationend !== undefined
  ) {
    animationProp = 'WebkitAnimation'
    animationEndEvent = 'webkitAnimationEnd'
  }
}

// 绑定到窗口来使在ie严格模式下的热加载工作是必要到
// binding to window is necessary to make hot reload work in IE in strict mode
const raf = inBrowser
  ? window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : setTimeout
  : /* istanbul ignore next */ fn => fn()

export function nextFrame (fn: Function) {
  raf(() => {
    raf(fn)
  })
}

/**
 * 给dom元素添加过渡样式
 * @param {*} el dom对象
 * @param {*} cls 样式class
 */
export function addTransitionClass (el: any, cls: string) {
  // 获取dom过渡样式class 
  const transitionClasses = el._transitionClasses || (el._transitionClasses = [])
  // 没有过渡类
  if (transitionClasses.indexOf(cls) < 0) {
    // 添加进来，添加到 _transitionClasses 数组属性中
    transitionClasses.push(cls)
    // 添加到dom上
    addClass(el, cls)
  }
}

/**
 * 移除样式class
 * @param {*} el dom 
 * @param {*} cls 样式class
 */
export function removeTransitionClass (el: any, cls: string) {
  // 存在样式类
  if (el._transitionClasses) {
    // 从中删除成员
    remove(el._transitionClasses, cls)
  }
  // 删除样式class
  removeClass(el, cls)
}

/**
 * 过渡结束
 * @param {*} el 
 * @param {*} expectedType 
 * @param {*} cb 
 */
export function whenTransitionEnds (
  el: Element,
  expectedType: ?string,
  cb: Function
) {
  // 获取过渡信息
  const { type, timeout, propCount } = getTransitionInfo(el, expectedType)
  // 没有类型，直接回调
  if (!type) return cb()
  // 根据动画类型，选择事件
  const event: string = type === TRANSITION ? transitionEndEvent : animationEndEvent
  let ended = 0
  // 
  const end = () => {
    el.removeEventListener(event, onEnd)
    cb()
  }
  const onEnd = e => {
    if (e.target === el) {
      // 
      if (++ended >= propCount) {
        end()
      }
    }
  }
  setTimeout(() => {
    
    if (ended < propCount) {
      end()
    }
  }, timeout + 1)
  // 给dom绑定事件
  el.addEventListener(event, onEnd)
}

// \b:边界 transform | all , | $:匹配输入的结束
// transform,  transform
const transformRE = /\b(transform|all)(,|$)/

/**
 * 获取过渡信息 
 * @param {*} el dom元素 
 * @param {*} expectedType 期待类型
 */
export function getTransitionInfo (el: Element, expectedType?: ?string): {
  type: ?string; // 属性类型
  propCount: number; // 动画中的属性数量
  timeout: number; // 最大动画时长
  hasTransform: boolean; // 是否存在transform
} {
  // 获取元素的计算属性
  const styles: any = window.getComputedStyle(el)
  // 对于transition属性jsdom可能返回undefined
  // JSDOM may return undefined for transition properties
  // 过渡延迟，主要是获取这种样式： transition: 1s transform,2s height,3s font-size;
  const transitionDelays: Array<string> = (styles[transitionProp + 'Delay'] || '').split(', ')
  // 过渡时长，
  const transitionDurations: Array<string> = (styles[transitionProp + 'Duration'] || '').split(', ')
  // 过渡最大时长
  const transitionTimeout: number = getTimeout(transitionDelays, transitionDurations)
  // 动画延迟
  const animationDelays: Array<string> = (styles[animationProp + 'Delay'] || '').split(', ')
  // 动画时长
  const animationDurations: Array<string> = (styles[animationProp + 'Duration'] || '').split(', ')
  // 动画最大时长
  const animationTimeout: number = getTimeout(animationDelays, animationDurations)

  let type: ?string
  let timeout = 0
  let propCount = 0
  /* istanbul ignore if */
  if (expectedType === TRANSITION) {
    if (transitionTimeout > 0) {
      type = TRANSITION
      timeout = transitionTimeout
      propCount = transitionDurations.length
    }
  } else if (expectedType === ANIMATION) {
    if (animationTimeout > 0) {
      type = ANIMATION
      timeout = animationTimeout
      propCount = animationDurations.length
    }
  } else {
    timeout = Math.max(transitionTimeout, animationTimeout)
    type = timeout > 0
      ? transitionTimeout > animationTimeout
        ? TRANSITION
        : ANIMATION
      : null
    propCount = type
      ? type === TRANSITION
        ? transitionDurations.length
        : animationDurations.length
      : 0
  }
  // 是否是transform属性过渡
  const hasTransform: boolean =
    type === TRANSITION &&
    // 过渡的属性（例：transform
    transformRE.test(styles[transitionProp + 'Property'])
  return {
    type,
    timeout,
    propCount,
    hasTransform
  }
}

/**
 * 获取时间最长的，因为这保证了过渡动画都可以执行
 * @param {*} delays 延迟时间数组
 * @param {*} durations 过渡持续时间数组
 */
function getTimeout (delays: Array<string>, durations: Array<string>): number {
  /* istanbul ignore next */
  // 延迟时长和过渡时长需要
  while (delays.length < durations.length) {
    delays = delays.concat(delays)
  }

  // 获取最大的：延迟时长和过渡时长之和
  return Math.max.apply(null, durations.map((d, i) => {
    return toMs(d) + toMs(delays[i])
  }))
}

// Old versions of Chromium (below 61.0.3163.100) formats floating pointer numbers(浮点数字指针)
// in a locale-dependent way, using a comma instead of a dot.
// If comma（逗号[n]） is not replaced with a dot, the input will be rounded down (i.e. acting
// as a floor function) causing unexpected behaviors
function toMs (s: string): number {
  // 去掉最后一个数字，使用 . 替换 ，
  return Number(s.slice(0, -1).replace(',', '.')) * 1000
}
