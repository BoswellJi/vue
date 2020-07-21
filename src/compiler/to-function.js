/* @flow */

import { noop, extend } from 'shared/util'
import { warn as baseWarn, tip } from 'core/util/debug'
import { generateCodeFrame } from './codeframe'

type CompiledFunctionResult = {
  render: Function;
  staticRenderFns: Array<Function>;
};

function createFunction (code, errors) {
  try {
    return new Function(code)
  } catch (err) {
    errors.push({ err, code })
    return noop
  }
}

/**
 * 创建编译到函数的函数
 * @param {*} compile 
 */
export function createCompileToFunctionFn (compile: Function): Function {
  // 缓存编译结果
  const cache = Object.create(null)

  /**
   * 将template 编译为 渲染函数 render
   */
  return function compileToFunctions (
    template: string,
    options?: CompilerOptions,
    vm?: Component
  ): CompiledFunctionResult {
    // 继承对象
    options = extend({}, options)
    // 检查选项参数中是否包含warn, 没有使用 baseWarn
    const warn = options.warn || baseWarn
    // 将warn属性，删除
    delete options.warn

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production') {
      // CSP: 内容安全策略
      // 将template 编译为 render function,需要依赖 new Function()
      // detect possible CSP restriction

      // 1. 放宽你的csp策略
      // 2. 预编译： 因为在运行时编译，会被注入其他代码进行污染
      try {
        new Function('return 1')
      } catch (e) {
        if (e.toString().match(/unsafe-eval|CSP/)) {
          warn(
            'It seems you are using the standalone build of Vue.js in an ' +
            'environment with Content Security Policy that prohibits unsafe-eval. ' +
            'The template compiler cannot work in this environment. Consider ' +
            'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
            'templates into render functions.'
          )
        }
      }
    }

    // check cache 检查缓存，防止重复编译
    // 生成缓存key
    const key = options.delimiters
      ? String(options.delimiters) + template
      : template
    if (cache[key]) {
      return cache[key]
    }

    // compile
    const compiled = compile(template, options)

    // check compilation errors/tips 检查编译（n）错误或者提示
    if (process.env.NODE_ENV !== 'production') {
      // errors tips都是数组类型
      if (compiled.errors && compiled.errors.length) {
        if (options.outputSourceRange) {
          compiled.errors.forEach(e => {
            warn(
              `Error compiling template:\n\n${e.msg}\n\n` +
              generateCodeFrame(template, e.start, e.end),
              vm
            )
          })
        } else {
          warn(
            `Error compiling template:\n\n${template}\n\n` +
            compiled.errors.map(e => `- ${e}`).join('\n') + '\n',
            vm
          )
        }
      }
      if (compiled.tips && compiled.tips.length) {
        if (options.outputSourceRange) {
          compiled.tips.forEach(e => tip(e.msg, vm))
        } else {
          compiled.tips.forEach(msg => tip(msg, vm))
        }
      }
    }

    // turn code into functions
    const res = {}
    const fnGenErrors = []
    // 最终的组件的render函数  参数： 字符串形实的函数体  错误信息
    res.render = createFunction(compiled.render, fnGenErrors)
    // staticRenderFns主要用于渲染优化
    res.staticRenderFns = compiled.staticRenderFns.map(code => {
      return createFunction(code, fnGenErrors)
    })

    // 检查函数生成错误，
    // check function generation errors.
    // 这个只应该发生在编译器自身有bug时
    // this should only happen if there is a bug in the compiler itself.
    // 大部分是为了 代码生成 开发使用
    // mostly for codegen development use
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production') {
      // 打印生成渲染函数过程中的错误
      if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
        warn(
          `Failed to generate render function:\n\n` +
          fnGenErrors.map(({ err, code }) => `${err.toString()} in\n\n${code}\n`).join('\n'),
          vm
        )
      }
    }

    return (cache[key] = res)
  }
}


/**
 * 1. 缓存编译结果
 * 2. 调用complie函数将模板字符串转换为函数字符串
 * 3. 调用createFunction函数将渲染函数字符串转换为真正的渲染函数
 * 4. 打印编译错误， 模板字符串=》渲染函数字符，渲染函数字符=》渲染函数
 */