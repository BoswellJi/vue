/* @flow */

// 单文件解析
export { parseComponent } from 'sfc/parser'
// 获取编译函数
export { compile, compileToFunctions } from './compiler/index'
export { ssrCompile, ssrCompileToFunctions } from './server/compiler'
export { generateCodeFrame } from 'compiler/codeframe'
