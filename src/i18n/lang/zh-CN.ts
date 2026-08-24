import type { UIStrings } from "../types";

export default {
  nav: {
    home: "首页",
    posts: "文章",
    archives: "归档",
    search: "搜索",
  },
  post: {
    publishedAt: "发表于",
    updatedAt: "更新于",
    backToTop: "返回顶部",
    goBack: "返回",
    editPage: "编辑页面",
    previousPost: "上一篇",
    nextPost: "下一篇",
  },
  pagination: {
    prev: "上一页",
    next: "下一页",
    page: "第 {{page}} 页",
  },
  home: {
    featured: "精选文章",
    recentPosts: "最近文章",
    allPosts: "全部文章",
  },
  footer: {
    copyright: "版权所有",
    allRightsReserved: "保留所有权利",
  },
  pages: {
    postsTitle: "文章",
    archivesTitle: "归档",
    searchTitle: "搜索",
    searchDesc: "搜索文章……",
  },
  a11y: {
    skipToContent: "跳转到正文",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    toggleTheme: "切换主题",
    searchPlaceholder: "搜索文章……",
    noResults: "没有找到结果",
    goToPreviousPage: "转到上一页",
    goToNextPage: "转到下一页",
  },
  notFound: {
    title: "404 未找到",
    message: "页面不存在",
    goHome: "返回首页",
  },
} satisfies UIStrings;
