# gatsby-transformer-gitinfo

This is forked from [CollierCZ/gatsby-transformer-gitinfo](https://github.com/CollierCZ/gatsby-transformer-gitinfo)

Add some Git information on `File` fields:
date, author, email and hash.

This fork was created to add information for files that are added via symlink,
such as to combine files from other Git repositories.
The plugin resolves the symlink to the original file
and base the information on the Git repository at the original location.

You can also set the plugin to return commits that [matches a given regex](#matching-objectoptional).

## Install

`npm install --save https://github.com/Edunga1/gatsby-transformer-gitinfo.git`

**Note:** You also need to have `gatsby-source-filesystem` installed
and configured so it points to your files.

## How to use

In your `gatsby-config.js`, add:

```javascript
module.exports = {
  plugins: [
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `./src/data/`,
      },
    },
    `gatsby-transformer-gitinfo`,
  ],
}
```

Where the _source folder_ `./src/data/` is a git versioned directory.

The plugin will add a `gitLogs` field to `File` nodes.
this field is an array of objects, each object representing a commit that touched the file.

If the file is not versionned, these fields will be empty.

They are exposed in your graphql schema which you can query:

```graphql
query {
  allFile {
    edges {
      node {
        fields {
          gitLogs {
            authorName
            authorEmail
            date
            hash
          }
        }
      }
    }
  }
}
```

Now you have a `File` node to work with:

```json
{
  "data": {
    "allFile": {
      "edges": [
        {
          "node": {
            "fields": {
              "gitLogs": [
                {
                  "authorName": "John Doe",
                  "authorEmail": "john.doe@github.com",
                  "date": "2020-10-14T12:58:39.000Z",
                  "hash": "c3b6898b288b3d8844ec9e4d1c72dc049b5aeea2"
                }
              ]
            }
          }
        }
      ]
    }
  }
}
```

## Configuration options

### `include` [regex][optional]

This plugin will try to match the absolute path of the file with the `include` regex.
If it *does not* match, the file will be skipped.

```javascript
module.exports = {
  plugins: [
    {
      resolve: `gatsby-transformer-gitinfo`,
      options: {
        include: /\.md$/i, // Only .md files
      },
    },
  ],
}
```

### `ignore` [regex][optional]

This plugin will try to match the absolute path of the file with the `ignore` regex.
If it *does* match, the file will be skipped.

```javascript
module.exports = {
  plugins: [
    {
      resolve: `gatsby-transformer-gitinfo`,
      options: {
        ignore: /\.jpeg$/i, // All files except .jpeg
      },
    },
  ],
}
```

### `match` [object][optional]

Return the commits where a given regex matches the title or body of the commit log.
If no commit matches, the file is skipped.

The object has two keys:

* `regex`: [string][required] the [POSIX basic regular expression](https://en.wikibooks.org/wiki/Regular_Expressions/POSIX_Basic_Regular_Expressions) to match
* `invert`: [bool][optional] whether to invert the match (return the commits that does *not* match the regex) (default: `false`)

```javascript
module.exports = {
  plugins: [
    {
      resolve: `gatsby-transformer-gitinfo`,
      options: {
        // Return the commits with a commit message
        // that does NOT start with "skip-this:".
        match: {
          regex: "^skip-this:",
          invert: true,
        }
      },
    },
  ],
}
```

### **`dir`** [string][optional]

The root of the git repository.
Will use the current directory if not provided.

Note that including this option will override resolution of symlinks.
All files will be checked against the given git repository.

## Example

**Note:** the execution order is first `ìnclude`, then `ignore`.

```javascript
module.exports = {
  plugins: [
    {
      resolve: `gatsby-transformer-gitinfo`,
      options: {
        include: /\.md$/i,
        ignore: /README/i,  // Will match all .md files, except README.md
      },
    },
  ],
}
```

### **`limit`** [number][optional]

Limit the number of commits to search. default is `10`
