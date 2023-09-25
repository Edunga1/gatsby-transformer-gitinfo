const fs = require(`fs`);
const os = require(`os`);
const path = require(`path`);
const git = require("simple-git");
const { onCreateNode } = require(`../gatsby-node`);

let createNodeField;
let actions;
let node;
let createNodeSpec;
let dummyRepoPath;
let dummyOtherRepoPath;

beforeEach(() => {
  createNodeField = jest.fn();
  actions = { createNodeField };

  node = {
    absolutePath: `/some/path/file.mdx`,
    dir: `/some/path`,
    id: `whatever`,
    parent: null,
    children: [],
    internal: {
      type: "File",
    },
  };

  createNodeSpec = {
    node,
    actions,
  };
});

const initGitRepo = async (path, username, useremail, remote) => {
  const gitRepo = git(path);

  await gitRepo.init();
  await gitRepo.addConfig("user.name", username);
  await gitRepo.addConfig("user.email", useremail);
  await gitRepo.addRemote("origin", remote);

  return gitRepo;
};

describe(`Processing nodes not matching initial filtering`, () => {
  it(`should not add any field when internal type is not 'File'`, async () => {
    node.internal.type = "Other";
    await onCreateNode(createNodeSpec);
    expect(createNodeField).not.toHaveBeenCalled();
  });

  it(`should not add any field when full path is not in include`, async () => {
    await onCreateNode(createNodeSpec, {
      include: /notmatching/,
    });
    expect(createNodeField).not.toHaveBeenCalled();
  });

  it(`should not add any field when full path is in ignore`, async () => {
    await onCreateNode(createNodeSpec, {
      ignore: /some\/path\/file/,
    });
    expect(createNodeField).not.toHaveBeenCalled();
  });

  it(`should not add any field when full path is in include and in ignore`, async () => {
    await onCreateNode(createNodeSpec, {
      include: /mdx/,
      ignore: /some\/path\/file/,
    });
    expect(createNodeField).not.toHaveBeenCalled();
  });
});

describe(`Processing File nodes matching filter regex`, () => {
  beforeEach(async () => {
    dummyRepoPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "gatsby-transform-gitinfo-")
    );

    const gitRepo = await initGitRepo(
      dummyRepoPath,
      "Some One",
      "some@one.com",
      "https://some.git.repo"
    );

    fs.writeFileSync(`${dummyRepoPath}/README.md`, "Hello");
    await gitRepo.add("README.md");
    await gitRepo.commit("Add README", "README.md", {
      "--date": '"Mon 20 Aug 2018 20:19:19 UTC"',
    });

    fs.writeFileSync(`${dummyRepoPath}/unversionned`, "World");

    dummyOtherRepoPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "gatsby-transform-gitinfo-otherrepo-")
    );

    const gitOtherRepo = await initGitRepo(
      dummyOtherRepoPath,
      "Some One Else",
      "someone@else.com",
      "https://some.other.git.repo"
    );

    fs.writeFileSync(`${dummyOtherRepoPath}/CONTENT.md`, "Hello");
    await gitOtherRepo.add("CONTENT.md");
    await gitOtherRepo.commit("Add CONTENT", "CONTENT.md", {
      "--date": '"Mon 20 Aug 2018 21:19:19 UTC"',
    });

    fs.symlinkSync(dummyOtherRepoPath, `${dummyRepoPath}/symlink`);
    fs.symlinkSync(`${dummyOtherRepoPath}/CONTENT.md`, `${dummyRepoPath}/CONTENT_LINKED.md`);
  });

  it("should add log and remote git info to commited File node", async () => {
    node.absolutePath = `${dummyRepoPath}/README.md`;
    node.dir = dummyRepoPath;
    await onCreateNode(createNodeSpec, {
      include: /md/,
      dir: dummyRepoPath,
    });
    expect(createNodeField).toHaveBeenCalledTimes(3);
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestAuthorName`,
      value: `Some One`,
    });
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestAuthorEmail`,
      value: `some@one.com`,
    });
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestDate`,
      value: `2018-08-20T20:19:19+00:00`,
    });
  });

  it("should add log and remote git info to file from symlink folder", async () => {
    node.absolutePath = `${dummyRepoPath}/symlink/CONTENT.md`;
    await onCreateNode(createNodeSpec, {
      include: /md/,
    });
    expect(createNodeField).toHaveBeenCalledTimes(3);
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestAuthorName`,
      value: `Some One Else`,
    });
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestAuthorEmail`,
      value: `someone@else.com`,
    });
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestDate`,
      value: `2018-08-20T21:19:19+00:00`,
    });
  });

  it("should add log and remote git info to file from symlink file", async () => {
    node.absolutePath = `${dummyRepoPath}/CONTENT_LINKED.md`;
    await onCreateNode(createNodeSpec, {
      include: /md/,
    });
    expect(createNodeField).toHaveBeenCalledTimes(3);
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestAuthorName`,
      value: `Some One Else`,
    });
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestAuthorEmail`,
      value: `someone@else.com`,
    });
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestDate`,
      value: `2018-08-20T21:19:19+00:00`,
    });
  });

  it("should not add log or remote git info to unversionned File node", async () => {
    node.absolutePath = `${dummyRepoPath}/unversionned`;
    node.dir = dummyRepoPath;
    await onCreateNode(createNodeSpec, {
      include: /unversionned/,
      dir: dummyRepoPath,
    });
    expect(createNodeField).not.toHaveBeenCalled();
  });
});

describe(`Return the commit with the matching regex`, () => {
  beforeEach(async () => {
    dummyRepoPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "gatsby-transform-gitinfo-")
    );

    const gitRepo = await initGitRepo(
      dummyRepoPath,
      "Some One",
      "some@one.com",
      "https://some.git.repo"
    );

    fs.writeFileSync(`${dummyRepoPath}/README.md`, "Hello");
    await gitRepo.add("README.md");
    await gitRepo.commit(["Add README", "Changing README, with @magictag in body"], "README.md", {
      "--date": '"Mon 5 Aug 2005 05:05:05 UTC"',
    });

    fs.writeFileSync(`${dummyRepoPath}/README.md`, "update1");
    await gitRepo.commit("pickme: update README", "README.md", {
      "--date": '"Mon 10 Aug 2010 10:10:10 UTC"',
    });

    fs.writeFileSync(`${dummyRepoPath}/README.md`, "update2");
    await gitRepo.commit("content: changing README", "README.md", {
      "--date": '"Mon 15 Aug 2015 15:15:15 UTC"',
    });

    fs.writeFileSync(`${dummyRepoPath}/README.md`, "update3");
    await gitRepo.commit("skip: Changing README", "README.md", {
      "--date": '"Mon 20 Aug 2020 20:20:20 UTC"',
    });
  });

  it("should add the latest commit without 'skip:' in its message log", async () => {
    node.absolutePath = `${dummyRepoPath}/README.md`;
    node.dir = dummyRepoPath;
    await onCreateNode(createNodeSpec, {
      include: /md/,
      dir: dummyRepoPath,
      matching: {
        regex: "^skip:",
        invert: true,
      }
    });
    expect(createNodeField).toHaveBeenCalledTimes(3);
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestAuthorName`,
      value: `Some One`,
    });
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestAuthorEmail`,
      value: `some@one.com`,
    });
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestDate`,
      value: `2015-08-15T15:15:15+00:00`,
    });
  });

  it("should add the latest commit with 'pickme:' in its message log", async () => {
    node.absolutePath = `${dummyRepoPath}/README.md`;
    node.dir = dummyRepoPath;
    await onCreateNode(createNodeSpec, {
      include: /md/,
      dir: dummyRepoPath,
      matching: {
        regex: "^pickme:",
      }
    });
    expect(createNodeField).toHaveBeenCalledTimes(3);
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestAuthorName`,
      value: `Some One`,
    });
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestAuthorEmail`,
      value: `some@one.com`,
    });
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestDate`,
      value: `2010-08-10T10:10:10+00:00`,
    });
  });

  it("should add the latest commit with @magictag in the message log body", async () => {
    node.absolutePath = `${dummyRepoPath}/README.md`;
    node.dir = dummyRepoPath;
    await onCreateNode(createNodeSpec, {
      include: /md/,
      dir: dummyRepoPath,
      matching: {
        regex: "@magictag",
      },
    });
    expect(createNodeField).toHaveBeenCalledTimes(3);
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestAuthorName`,
      value: `Some One`,
    });
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestAuthorEmail`,
      value: `some@one.com`,
    });
    expect(createNodeField).toHaveBeenCalledWith({
      node,
      name: `gitLogLatestDate`,
      value: `2005-08-05T05:05:05+00:00`,
    });
  });
});
