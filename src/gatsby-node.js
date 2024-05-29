import { realpathSync } from "fs"
import { dirname } from "path"
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
  const optional = {}

  if (match?.regex) {
    optional["--grep"] = match.regex
  }

  if (match?.invert) {
    optional["--invert-grep"] = match.invert
  }

  const logOptions = {
    ...optional,
    [filePath]: null,
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

  if (node.internal.type !== "File") {
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
      realpathSync.native(node.absolutePath, (error, resolvedPath) => {
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
    name: "gitLogLatestAuthorName",
    value: log.latest.author_name,
  })
  createNodeField({
    node,
    name: "gitLogLatestAuthorEmail",
    value: log.latest.author_email,
  })
  createNodeField({
    node,
    name: "gitLogLatestDate",
    value: log.latest.date,
  })
  createNodeField({
    node,
    name: "gitLogLatestHash",
    value: log.latest.hash,
  })
}
