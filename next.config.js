/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  transpilePackages: [
    "react-markdown",
    "remark-gfm",
    "remark-parse",
    "remark-rehype",
    "rehype-react",
    "unified",
    "bail",
    "is-plain-obj",
    "trough",
    "vfile",
    "vfile-message",
    "unist-util-visit",
    "unist-util-is",
    "hast-util-to-jsx-runtime",
    "hast-util-whitespace",
    "property-information",
    "space-separated-tokens",
    "comma-separated-tokens",
    "mdast-util-to-hast",
    "mdast-util-from-markdown",
    "mdast-util-gfm",
    "micromark",
    "micromark-util-combine-extensions",
    "micromark-extension-gfm",
    "decode-named-character-reference",
  ],
};

module.exports = nextConfig;
