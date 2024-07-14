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
        console.log(`${node.name}\t${node.value}`)
      },
    },
  },
  {
    dir: ".",
  },
)
