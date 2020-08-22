/* @flow */

const range = 2

/**
 * 生成代码帧
 * @param {*} source 源代码
 * @param {*} start 开始位置
 * @param {*} end 结束位置
 */
export function generateCodeFrame (
  source: string,
  start: number = 0,
  end: number = source.length
): string {
  // \r?\n  回车符?换行符 ,进行切割为数组
  const lines = source.split(/\r?\n/)
  let count = 0
  const res = []
  // 遍历数组
  for (let i = 0; i < lines.length; i++) {
    // 总共有多少个字符 + 1（换行符）
    count += lines[i].length + 1
    // 总数大于开始
    if (count >= start) {
      // 
      for (let j = i - range; j <= i + range || end > count; j++) {
        if (j < 0 || j >= lines.length) continue
        res.push(`${j + 1}${repeat(` `, 3 - String(j + 1).length)}|  ${lines[j]}`)
        const lineLength = lines[j].length
        if (j === i) {
          // push underline
          const pad = start - (count - lineLength) + 1
          const length = end > count ? lineLength - pad : end - start
          res.push(`   |  ` + repeat(` `, pad) + repeat(`^`, length))
        } else if (j > i) {
          if (end > count) {
            const length = Math.min(end - count, lineLength)
            res.push(`   |  ` + repeat(`^`, length))
          }
          count += lineLength + 1
        }
      }
      break
    }
  }
  return res.join('\n')
}

function repeat (str, n) {
  let result = ''
  if (n > 0) {
    while (true) { // eslint-disable-line
      if (n & 1) result += str
      n >>>= 1
      if (n <= 0) break
      str += str
    }
  }
  return result
}
