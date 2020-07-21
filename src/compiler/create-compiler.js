/* @flow */

import { extend } from 'shared/util'
import { detectErrors } from './error-detector'
import { createCompileToFunctionFn } from './to-function'


/**
 * 
 * @param {*} baseCompile 基础编译器
 */
export function createCompilerCreator (baseCompile: Function): Function {
  /**
   * 创建编译器
   * @param {} 编译器配置
   */
  return function createCompiler (baseOptions: CompilerOptions) {
    /**
     * 编译函数
     * @param {*} template 字符串模板
     * @param {*} options 选项参数
     */
    function compile (
      template: string,
      options?: CompilerOptions
    ): CompiledResult {
      // 最终的编译器选项参数，创建了以baseOptions为原型的 finalOptions常量对象
      const finalOptions = Object.create(baseOptions)
      const errors = []
      const tips = []

      // 提示，或者时 错误
      let warn = (msg, range, tip) => {
        (tip ? tips : errors).push(msg)
      }

      // 用户定制选项参数，于默认参数进行合并
      // baseOptins 是编译器的默认选项参数， options是提供的定制能力的扩展选项
      if (options) {
        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          // $flow-disable-line
          const leadingSpaceLength = template.match(/^\s*/)[0].length

          warn = (msg, range, tip) => {
            const data: WarningMessage = { msg }
            if (range) {
              // 开始，结束
              if (range.start != null) {
                data.start = range.start + leadingSpaceLength
              }
              if (range.end != null) {
                data.end = range.end + leadingSpaceLength
              }
            }
            (tip ? tips : errors).push(data)
          }
        }
        // merge custom modules
        if (options.modules) {
          finalOptions.modules =
            (baseOptions.modules || []).concat(options.modules)
        }
        // merge custom directives
        if (options.directives) {
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          )
        }
        // copy other options
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key]
          }
        }
      }

      finalOptions.warn = warn

      // 调用baseCompile函数进行对字符串模板的编译
      const compiled = baseCompile(template.trim(), finalOptions)
      if (process.env.NODE_ENV !== 'production') {
        // 通过抽象语法树检查模板中存在的错误表达式
        detectErrors(compiled.ast, warn)
      }
      // 将收集到的错误提示添加到compiled对象的errors，tips属性上
      compiled.errors = errors
      compiled.tips = tips
      return compiled
    }

    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}

/**
 * 基于高级语法到低级语法的编译系统：
 * 将高级，先进，甚至是私有语法，编译为当前浏览器规范内容；最终的产物都是基于平台实现的功能代码；
 * 
 * 基于操作系统的编译系统(原生代码):
 * 将用户代码，编译为二进制，直接使用，cpu的指令集
 * 
 * 1. 生成最终编译器选项参数 finalOptions
 * 2. 对错误的收集
 * 3. 调用baseCompile编译模板字符串
 */