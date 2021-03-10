/* @flow */

// vue模板解析器
import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// 创建编译器创建器 允许创建编译器使用 解析器/优化器/代码生成器 替换，例如：ssr 优化编译器，这里我们只导出一个默认的编译器作为默认部分
// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
/**
 * @param {} template 模板字符串
 * @param {} options 编译器的选项参数
 */
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 解析模板字符串生成ast
  const ast = parse(template.trim(), options)
  // 优化ast
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  // 生成代码
  const code = generate(ast, options)
  return {
    // 模板的抽象语法树
    ast,
    // 渲染函数，都是字符串形式的， 需要通过 new Function来创建 渲染函数
    render: code.render,
    // 静态渲染
    staticRenderFns: code.staticRenderFns
  }
})
