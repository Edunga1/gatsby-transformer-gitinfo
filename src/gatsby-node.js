import { realpathSync } from "fs"
import { dirname } from "path"
import { realpathSync as _realpathSync } from "fs"
import git from "simple-git"

/**
  * @typedef {import("gatsby").GatsbyNode} GatsbyNode
  * @typedef {import("gatsby").Node} Node
  * @typedef {import("simple-git").SimpleGit} SimpleGit
  */

/**
  * @param {SimpleGit} gitRepo
  * @param {Node} node
  * @param {number} retry
  * @param {{ regex?: string; invert?: boolean }} match
  */
async function getLogWithRetry(
  gitRepo,
  node,
  retry = 2,
  match = {},
) {
  const filePath = realpathSync.native(node.absolutePath)

  const logOptions = {
    file: filePath,
    n: 1,
    format: {
      date: `%aI`,
      authorName: `%an`,
      authorEmail: "%ae",
      message: "%B",
    },
  }

  if (match?.regex) {
    logOptions[`--grep`] = match.regex
  }
  if (match?.invert) {
    logOptions[`--invert-grep`] = match.invert
  }

  const log = await gitRepo.log(logOptions)
  if (!log.latest && retry > 0) {
    return getLogWithRetry(gitRepo, node, retry - 1, match)
  }

  return log
}

/** @type {GatsbyNode["onCreateNode"]} */
export const onCreateNode = async (
  { node, actions },
  pluginOptions
) => {
  const { createNodeField } = actions

  if (node.internal.type !== `File`) {
    return
  }

  if (pluginOptions.include && !pluginOptions.include.test(node.absolutePath)) {
    return
  }

  if (pluginOptions.ignore && pluginOptions.ignore.test(node.absolutePath)) {
    return
  }

  const gitRepo = git(
    pluginOptions.dir ||
    dirname(
      _realpathSync.native(node.absolutePath, (error, resolvedPath) => {
        if (error) {
          console.log(error)
          return
        }
        return resolvedPath
      })
    )
  )
  const log = await getLogWithRetry(gitRepo, node, 2, pluginOptions.match)

  if (!log.latest) {
    return
  }

  createNodeField({
    node,
    name: `gitLogLatestAuthorName`,
    value: log.latest.authorName,
  })
  createNodeField({
    node,
    name: `gitLogLatestAuthorEmail`,
    value: log.latest.authorEmail,
  })
  createNodeField({
    node,
    name: `gitLogLatestDate`,
    value: log.latest.date,
  })
}
