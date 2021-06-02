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
  // 老vnode的指令存在 或者 新vnode的指令是否存在
  if (oldVnode.data.directives || vnode.data.directives) {
    _update(oldVnode, vnode)
  }
}

/**
 *
 * @param {*} oldVnode 老vnode
 * @param {*} vnode 当前vnode
 */
function _update (oldVnode, vnode) {
  // 获取一个空vnode，老vnode为空vnode,说明第一次创建
  const isCreate = oldVnode === emptyNode
  // 新vnode为空vnode,说明组件被销毁
  const isDestroy = vnode === emptyNode
  // 老的vnode指令
  const oldDirs = normalizeDirectives(oldVnode.data.directives, oldVnode.context)
  // 当前vnode的指令
  const newDirs = normalizeDirectives(vnode.data.directives, vnode.context)

  // 指令插入
  const dirsWithInsert = []
  const dirsWithPostpatch = []

  // 指令对象key, 老vnode的指令，保存指令
  let key, oldDir, dir
  // 遍历vnode的新指令
  for (key in newDirs) {
    // 老vnode的指令
    oldDir = oldDirs[key]
    // vnode的指令
    dir = newDirs[key]
    // 老指令不存在
    if (!oldDir) {
      // new directive, bind（第一次绑定
      callHook(dir, 'bind', vnode, oldVnode)
      // 当前指令有inserted钩子函数
      if (dir.def && dir.def.inserted) {
        // 添加到列表
        dirsWithInsert.push(dir)
      }
    } else {
      // existing directive, update （更新绑定
      dir.oldValue = oldDir.value
      dir.oldArg = oldDir.arg
      // 调用vnode的指令更新，方法
      callHook(dir, 'update', vnode, oldVnode)
      // 当前指令有componentUpdated钩子函数
      if (dir.def && dir.def.componentUpdated) {
        dirsWithPostpatch.push(dir)
      }
    }
  }

  // 第一次加入的指令
  if (dirsWithInsert.length) {
    // 调用指令的inserted钩子函数
    const callInsert = () => {
      for (let i = 0; i < dirsWithInsert.length; i++) {
        callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode)
      }
    }
    // 第一次创建组件
    if (isCreate) {
      //
      mergeVNodeHook(vnode, 'insert', callInsert)
    } else {
      // 更新组件，开始调用
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

  // 非第一次创建组件
  if (!isCreate) {
    for (key in oldDirs) {
      if (!newDirs[key]) {
        // no longer present, unbind
        callHook(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy)
      }
    }
  }
}

// 创建一个空的修饰符对象
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


/**
 *
 * @param {*} dir 指令
 * @param {*} hook 钩子函数
 * @param {*} vnode
 * @param {*} oldVnode 老vnode
 * @param {*} isDestroy 是否被销毁
 */
function callHook (dir, hook, vnode, oldVnode, isDestroy) {
  // 指令中定义的钩子函数
  const fn = dir.def && dir.def[hook]
  if (fn) {
    try {
      // 调用钩子函数，这些事传参
      fn(vnode.elm, dir, vnode, oldVnode, isDestroy)
    } catch (e) {
      handleError(e, vnode.context, `directive ${dir.name} ${hook} hook`)
    }
  }
}
