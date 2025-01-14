const crypto = require("crypto");
const path = require(`path`);
const slugify = require("@sindresorhus/slugify");
const fs = require("fs");

exports.sourceNodes = ({ actions: { createTypes }, schema }) => {
  createTypes(
    schema.buildObjectType({
      name: `MdxBlogPost`,
      fields: {
        id: { type: `ID!` },
        title: {
          type: "String!"
        },
        excerpt: {
          type: "String!",
          resolve: async (source, args, context, info) => {
            const type = info.schema.getType(`Mdx`);
            const mdxNode = context.nodeModel.getNodeById({
              id: source.parent
            });
            const resolver = type.getFields()["excerpt"].resolve;
            const excerpt = await resolver(
              mdxNode,
              { pruneLength: 140 },
              context,
              {
                fieldName: "excerpt"
              }
            );
            return excerpt;
          }
        },
        body: {
          type: "String!",
          resolve(source, args, context, info) {
            const type = info.schema.getType(`Mdx`);
            const mdxNode = context.nodeModel.getNodeById({
              id: source.parent
            });
            const resolver = type.getFields()["body"].resolve;
            return resolver(mdxNode, {}, context, {
              fieldName: "body"
            });
          }
        },
        url: {
          type: "String!"
        },
        tags: { type: `[String]!` },
        date: {
          type: "Date!"
        },
        egghead: {
          type: "String"
        },
        isNewsletter: {
          type: "Boolean!"
        },
        webmentionMatchURL: { type: "String!" }
      },
      interfaces: [`Node`]
    })
  );
};

exports.createPages = ({ graphql, actions }) => {
  const { createPage } = actions;
  return new Promise((resolve, reject) => {
    resolve(
      graphql(
        `
          {
            site {
              siteMetadata {
                title
                social {
                  name
                  url
                }
              }
            }
            tags: allBlogPost(sort: { fields: [date, title], order: DESC }) {
              byTag: group(field: tags) {
                tag: fieldValue
                edges {
                  node {
                    id
                    excerpt
                    slug
                    title
                    date(formatString: "MMMM DD, YYYY")
                  }
                }
              }
            }
          }
        `
      ).then(result => {
        if (result.errors) {
          console.log(result.errors);
          reject(result.errors);
        }
        const {
          site: { siteMetadata }
        } = result.data;
        const { title: siteTitle, social: socialLinks } = siteMetadata;

        result.data.tags.byTag
          .filter(({ tag }) => tag !== "")
          .forEach(({ tag, edges: posts }) => {
            createPage({
              path: `/tags/${tag}`,
              component: require.resolve(`./src/templates/tag-page`),
              context: {
                siteTitle,
                socialLinks,
                tag
              }
            });
          });
      })
    );
  });
};

exports.onCreateWebpackConfig = ({
  stage,
  rules,
  loaders,
  plugins,
  actions
}) => {
  actions.setWebpackConfig({
    module: {
      rules: [
        {
          test: /\.js$/,
          include: /@sens8/,
          use: [loaders.js()]
        }
      ]
    }
  });
};

exports.onCreateNode = ({ node, actions, getNode, createNodeId }) => {
  const { createNodeField, createNode, createParentChildLink } = actions;

  if (node.internal.type === `Mdx`) {
    const { frontmatter } = node;
    const parent = getNode(node.parent);

    const url =
      frontmatter.url ||
      `/post/${frontmatter.slug ||
        slugify(frontmatter.title) ||
        slugify(parent.name)}`;

    if (parent.internal.type === "File") {
      const ext = path.extname(parent.absolutePath);
      const featuredImage = parent.absolutePath.replace(ext, ".png");
      if (fs.existsSync(featuredImage)) {
        createNodeField({
          name: `featuredImage`,
          node,
          value: featuredImage
        });
      }

      createNodeField({
        name: `sourceInstanceName`,
        node,
        value: parent.sourceInstanceName
      });
    }

    // create MdxBlogPost

    if (parent.sourceInstanceName === "posts") {
      const fieldData = {
        title: node.frontmatter.title,
        url: url,
        date: node.frontmatter.date,
        tags: node.frontmatter.tags || [],
        egghead: node.frontmatter.egghead,
        isNewsletter: !!node.frontmatter.isNewsletter,
        webmentionMatchURL: `https://www.christopherbiscardi.com${url}/`
      };

      createNode({
        ...fieldData,
        // Required fields.
        id: createNodeId(`${node.id} >>> MdxBlogPost`),
        parent: node.id,
        children: [],
        internal: {
          type: `MdxBlogPost`,
          contentDigest: crypto
            .createHash(`md5`)
            .update(JSON.stringify(fieldData))
            .digest(`hex`),
          content: JSON.stringify(fieldData),
          description: `Satisfies the BlogPost interface for Mdx`
        }
      });
      createParentChildLink({ parent: parent, child: node });
    }
  }
};

exports.onCreatePage = ({ page, actions, getNode }) => {
  const { createPage, deletePage } = actions;

  // change /posts to point to right urls
  // console.log("-", page.path);
  if (page.path === "/post") {
    page.context.posts = page.context.posts.map(({ node }) => {
      const nodeFromGatsby = getNode(node.id);
      if (!nodeFromGatsby || nodeFromGatsby.internal.type !== "BlogPost") {
        return;
      }
      const parent = getNode(nodeFromGatsby.parent);
      if (!parent || parent.internal.type !== "Mdx") {
        return;
      }
      if (parent.frontmatter.slug && parent.frontmatter.slug.startsWith("/")) {
        node.slug = parent.frontmatter.slug;
      }
      return { node };
    });
  }

  // use old slugs so links don't break
  const node = getNode(page.context.id);
  if (!node || node.internal.type !== "BlogPost") {
    return;
  }
  const parent = getNode(node.parent);
  if (!parent || parent.internal.type !== "Mdx") {
    return;
  }

  if (parent.frontmatter.slug && parent.frontmatter.slug.startsWith("/")) {
    const oldPage = Object.assign({}, page);
    // use legacy urls if slugs are absolute paths
    page.path = parent.frontmatter.slug;
    if (page.path !== oldPage.path) {
      // Replace new page with old page
      deletePage(oldPage);
      createPage(page);
    }
  }
};
