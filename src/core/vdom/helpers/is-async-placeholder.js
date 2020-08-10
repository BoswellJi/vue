/* @flow */

export function isAsyncPlaceholder (node: VNode): boolean {
  // 注释 && 异步工厂标识
  return node.isComment && node.asyncFactory
}
