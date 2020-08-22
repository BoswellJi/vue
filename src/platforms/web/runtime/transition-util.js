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

const transformRE = /\b(transform|all)(,|$)/

export function getTransitionInfo (el: Element, expectedType?: ?string): {
  type: ?string;
  propCount: number;
  timeout: number;
  hasTransform: boolean;
} {
  const styles: any = window.getComputedStyle(el)
  // JSDOM may return undefined for transition properties
  const transitionDelays: Array<string> = (styles[transitionProp + 'Delay'] || '').split(', ')
  const transitionDurations: Array<string> = (styles[transitionProp + 'Duration'] || '').split(', ')
  const transitionTimeout: number = getTimeout(transitionDelays, transitionDurations)
  const animationDelays: Array<string> = (styles[animationProp + 'Delay'] || '').split(', ')
  const animationDurations: Array<string> = (styles[animationProp + 'Duration'] || '').split(', ')
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

function getTimeout (delays: Array<string>, durations: Array<string>): number {
  /* istanbul ignore next */
  while (delays.length < durations.length) {
    delays = delays.concat(delays)
  }

  return Math.max.apply(null, durations.map((d, i) => {
    return toMs(d) + toMs(delays[i])
  }))
}

// Old versions of Chromium (below 61.0.3163.100) formats floating pointer numbers
// in a locale-dependent way, using a comma instead of a dot.
// If comma is not replaced with a dot, the input will be rounded down (i.e. acting
// as a floor function) causing unexpected behaviors
function toMs (s: string): number {
  return Number(s.slice(0, -1).replace(',', '.')) * 1000
}
