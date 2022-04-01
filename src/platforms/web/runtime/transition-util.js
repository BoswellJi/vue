/* @flow */

import { inBrowser, isIE9 } from 'core/util/index'
import { addClass, removeClass } from './class-util'
import { remove, extend, cached } from 'shared/util'

/**
 * 为了生成css class
 */
export function resolveTransition (def?: string | Object): ?Object {
  if (!def) {
    return
  }
  /* istanbul ignore else */
  if (typeof def === 'object') {
    const res = {}
    if (def.css !== false) {
      extend(res, autoCssTransition(def.name || 'v'))
    }
    extend(res, def)
    return res
  } else if (typeof def === 'string') {
    return autoCssTransition(def)
  }
}

const autoCssTransition: (name: string) => Object = cached(name => {
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
 */
export function addTransitionClass (el: any, cls: string) {
  const transitionClasses = el._transitionClasses || (el._transitionClasses = [])
  if (transitionClasses.indexOf(cls) < 0) {
    transitionClasses.push(cls)
    addClass(el, cls)
  }
}

/**
 * 移除样式class
 */
export function removeTransitionClass (el: any, cls: string) {
  if (el._transitionClasses) {
    remove(el._transitionClasses, cls)
  }
  removeClass(el, cls)
}

/**
 * 过渡结束
 */
export function whenTransitionEnds (
  el: Element,
  expectedType: ?string,
  cb: Function
) {
  const { type, timeout, propCount } = getTransitionInfo(el, expectedType)
  if (!type) return cb()
  const event: string = type === TRANSITION ? transitionEndEvent : animationEndEvent
  let ended = 0
  const end = () => {
    el.removeEventListener(event, onEnd)
    cb()
  }
  const onEnd = e => {
    if (e.target === el) {
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
  el.addEventListener(event, onEnd)
}

// \b:边界 transform | all , | $:匹配输入的结束
// transform,  transform
const transformRE = /\b(transform|all)(,|$)/

/**
 * 获取过渡信息
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
  const hasTransform: boolean =
    type === TRANSITION &&
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
  return Number(s.slice(0, -1).replace(',', '.')) * 1000
}
