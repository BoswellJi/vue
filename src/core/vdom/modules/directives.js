/* @flow */

import { emptyNode } from 'core/vdom/patch'
import { resolveAsset, handleError } from 'core/util/index'
import { mergeVNodeHook } from 'core/vdom/helpers/index'

export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives (vnode: VNodeWithData) {
    updateDirectives(vnode, emptyNode)
  }
}

function updateDirectives (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  if (oldVnode.data.directives || vnode.data.directives) {
    _update(oldVnode, vnode)
  }
}

function _update (oldVnode, vnode) {
  const isCreate = oldVnode === emptyNode
  const isDestroy = vnode === emptyNode
  const oldDirs = normalizeDirectives(oldVnode.data.directives, oldVnode.context)
  const newDirs = normalizeDirectives(vnode.data.directives, vnode.context)

  const dirsWithInsert = []
  const dirsWithPostpatch = []

  let key, oldDir, dir
  for (key in newDirs) {
    oldDir = oldDirs[key]
    dir = newDirs[key]
    if (!oldDir) {
      callHook(dir, 'bind', vnode, oldVnode)
      if (dir.def && dir.def.inserted) {
        dirsWithInsert.push(dir)
      }
    } else {
      // existing directive, update
      dir.oldValue = oldDir.value
      dir.oldArg = oldDir.arg
      callHook(dir, 'update', vnode, oldVnode)
      if (dir.def && dir.def.componentUpdated) {
        dirsWithPostpatch.push(dir)
      }
    }
  }

  if (dirsWithInsert.length) {
    const callInsert = () => {
      for (let i = 0; i < dirsWithInsert.length; i++) {
        callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode)
      }
    }
    if (isCreate) {
      mergeVNodeHook(vnode, 'insert', callInsert)
    } else {
      callInsert()
    }
  }

  if (dirsWithPostpatch.length) {
    mergeVNodeHook(vnode, 'postpatch', () => {
      for (let i = 0; i < dirsWithPostpatch.length; i++) {
        callHook(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode)
      }
    })
  }

  if (!isCreate) {
    for (key in oldDirs) {
      if (!newDirs[key]) {
        // no longer present, unbind
        callHook(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy)
      }
    }
  }
}

const emptyModifiers = Object.create(null)

/**
 *
 * @param {*} dirs vnode上的指令
 * @param {*} vm 组件实例
 */
function normalizeDirectives (
  dirs: ?Array<VNodeDirective>,
  vm: Component
): { [key: string]: VNodeDirective } {
  // 创建一个对象
  const res = Object.create(null)
  // 没有指令的话，直接返回
  if (!dirs) {
    // $flow-disable-line
    return res
  }
  let i, dir
  // 遍历指令
  for (i = 0; i < dirs.length; i++) {
    // 保存指令
    dir = dirs[i]
    // 指令没有修饰符
    if (!dir.modifiers) {
      // $flow-disable-line
      // 添加空修饰符
      dir.modifiers = emptyModifiers
    }
    // 添加指令到空对象中
    res[getRawDirName(dir)] = dir
    // 指令定义， 组件选项，选项属性directives， 指令名称，将指令定义方法进行返回
    dir.def = resolveAsset(vm.$options, 'directives', dir.name, true)
  }
  // $flow-disable-line
  /**
   * {
   *   modifiers:
   *   name:
   *   def:
   * }
   */
  return res
}

/**
 * 获取指令的名称
 * @param {*} dir vnode指令
 */
function getRawDirName (dir: VNodeDirective): string {
  // 获取指令名称 或者 返回指令名称.修饰符
  return dir.rawName || `${dir.name}.${Object.keys(dir.modifiers || {}).join('.')}`
}

function callHook (dir, hook, vnode, oldVnode, isDestroy) {
  // 指令中定义的钩子函数
  const fn = dir.def && dir.def[hook]
  if (fn) {
    try {
      fn(vnode.elm, dir, vnode, oldVnode, isDestroy)
    } catch (e) {
      handleError(e, vnode.context, `directive ${dir.name} ${hook} hook`)
    }
  }
}
