import { onCreateNode } from './src/gatsby-node'
import path from 'path'

onCreateNode(
  {
    node: {
      absolutePath: process.argv.at(2) && path.resolve(process.argv[2]) || path.resolve('README.md'),
      internal: {
        type: "File",
      },
    },
    actions: {
      createNodeField: (node) => {
        console.log('Node:', node.name)
        console.log(formatValue(node.value))
      },
    },
  },
  {
    dir: ".",
  },
)

function formatValue(value) {
  if (typeof value !== 'object') {
    return value.toString()
  }
  return JSON.stringify(value, null, '\t')
}
