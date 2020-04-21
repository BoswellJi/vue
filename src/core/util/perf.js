import { inBrowser } from './env'

export let mark
export let measure

// 开发环境中
if (process.env.NODE_ENV !== 'production') {
  // 是否在浏览器中，window对象中是否存在performance属性
  const perf = inBrowser && window.performance
  /* istanbul ignore if */
  // 存在performance属性，performance属性存在mark属性
  if (
    perf &&
    perf.mark &&
    perf.measure &&
    perf.clearMarks &&
    perf.clearMeasures
  ) {
    // 创建一个命名的时间戳
    mark = tag => perf.mark(tag)
    // 测量
    measure = (name, startTag, endTag) => {
      // 在两个命名的mark之间进行测试
      perf.measure(name, startTag, endTag)
      // 清除mark
      perf.clearMarks(startTag)
      perf.clearMarks(endTag)
      // perf.clearMeasures(name)
    }
  }
}
