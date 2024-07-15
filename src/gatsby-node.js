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
    createNodeField(createNode(node))
    return
  }

  if (pluginOptions.include && !pluginOptions.include.test(node.absolutePath)) {
    createNodeField(createNode(node))
    return
  }

  if (pluginOptions.ignore && pluginOptions.ignore.test(node.absolutePath)) {
    createNodeField(createNode(node))
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

  createNodeField(createNode(node, mapLogs(log.all, pluginOptions.limit || 10)))
}

/**
  * @param {import("simple-git").LogResult["all"]} log
  * @param {number} limit -1 for all
  * @returns {Array<{ authorName: string; authorEmail: string; date: string; hash: string }>}
  * */
function mapLogs(log, limit) {
  const sliced = limit < 0 ? log : log.slice(0, limit)
  return sliced.map((log) => ({
    authorName: log.author_name,
    authorEmail: log.author_email,
    date: log.date,
    hash: log.hash,
  }))
}

function createNode(node, value = []) {
  return {
    node,
    name: "gitLogs",
    value,
  }
}
