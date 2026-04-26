"""
Minder — Streamlit 原型

基于 Streamlit 的知识管理平台交互原型，展示核心功能。
"""

import json
import os
import sys
from datetime import datetime

# 添加项目根目录到 path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import streamlit as st
except ImportError:
    print("请安装 Streamlit: pip install streamlit")
    sys.exit(1)

from src.crawler import WebCrawler
from src.organizer import KnowledgeOrganizer
from src.search import SemanticSearch


# ── 页面配置 ──────────────────────────────────────────

st.set_page_config(
    page_title="Minder — AI知识管理",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── 初始化 Session State ──────────────────────────────

if "knowledge_base" not in st.session_state:
    st.session_state.knowledge_base = []
if "search_engine" not in st.session_state:
    st.session_state.search_engine = SemanticSearch()
if "organizer" not in st.session_state:
    st.session_state.organizer = KnowledgeOrganizer()
if "crawler" not in st.session_state:
    st.session_state.crawler = WebCrawler()

# ── 侧边栏 ───────────────────────────────────────────

with st.sidebar:
    st.image("https://img.icons8.com/fluency/96/brain.png", width=64)
    st.title("🧠 Minder")
    st.caption("AI驱动的个人知识管理平台")

    st.divider()

    page = st.radio(
        "导航",
        ["🏠 首页", "📥 采集", "📝 记录", "🔍 搜索", "🕸️ 知识图谱", "📊 统计"],
        label_visibility="collapsed",
    )

    st.divider()

    # 知识库统计
    kb_count = len(st.session_state.knowledge_base)
    st.metric("📚 知识条目", kb_count)

    if st.button("🗑️ 清空知识库", type="secondary"):
        st.session_state.knowledge_base = []
        st.session_state.search_engine = SemanticSearch()
        st.rerun()

# ── 首页 ─────────────────────────────────────────────

if page == "🏠 首页":
    st.title("🧠 Minder — AI知识管理平台")
    st.subheader("让你的知识不再碎片化，AI帮你整理、连接、应用")

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("📥 采集", "多源", "网页/PDF/笔记")
    col2.metric("🏷️ 整理", "智能", "自动标签分类")
    col3.metric("🔍 检索", "语义", "自然语言搜索")
    col4.metric("🕸️ 图谱", "关联", "知识网络")

    st.divider()

    st.markdown("""
    ### 快速开始

    1. **📥 采集** — 粘贴网页URL，自动提取内容
    2. **📝 记录** — 直接输入想法、笔记、问题
    3. **🔍 搜索** — 用自然语言搜索你的知识库
    4. **🕸️ 图谱** — 查看知识之间的关联网络

    ### 核心特色

    - 🤖 **AI驱动** — 自动分类、打标签、生成摘要
    - 🔗 **知识连接** — 自动发现知识间的关联
    - 💡 **语义搜索** — 不只是关键词匹配，理解你的意图
    - 📊 **可视化** — 知识图谱、学习统计、成长曲线
    """)

# ── 采集页面 ─────────────────────────────────────────

elif page == "📥 采集":
    st.title("📥 多源采集")

    tab1, tab2 = st.tabs(["🌐 网页采集", "📄 文本导入"])

    with tab1:
        url = st.text_input("输入网页URL", placeholder="https://example.com/article")
        extract_mode = st.selectbox("提取模式", ["full", "summary", "metadata"])

        if st.button("🔍 开始采集", type="primary", disabled=not url):
            with st.spinner("正在采集..."):
                result = st.session_state.crawler.crawl(url, extract_mode)

            if result:
                st.success(f"✅ 采集成功！标题: {result.title}")
                st.text_area("采集内容", result.content[:2000], height=200)

                # 自动整理
                organized = st.session_state.organizer.process(result.content, result.title)
                st.info(f"🏷️ 自动分类: {organized.item_type} | 标签: {', '.join(organized.tags)} | 摘要: {organized.summary[:100]}")

                if st.button("💾 保存到知识库"):
                    doc = {
                        "id": f"kb_{len(st.session_state.knowledge_base)}",
                        "title": result.title,
                        "content": result.content,
                        "type": organized.item_type,
                        "tags": organized.tags,
                        "source_url": url,
                        "added_at": datetime.now().isoformat(),
                    }
                    st.session_state.knowledge_base.append(doc)
                    st.session_state.search_engine.add_document(
                        doc_id=doc["id"],
                        title=doc["title"],
                        content=doc["content"],
                        item_type=doc["type"],
                        tags=doc["tags"],
                    )
                    st.success("✅ 已保存！")
            else:
                st.error("❌ 采集失败，请检查URL")

    with tab2:
        text_title = st.text_input("标题", placeholder="给这条知识取个名字")
        text_content = st.text_area("内容", height=200, placeholder="输入你的笔记、想法、问题...")
        text_type = st.selectbox("类型", ["note", "idea", "question", "inspiration", "project"])
        text_tags = st.text_input("标签（逗号分隔）", placeholder="AI, 学习, 笔记")

        if st.button("💾 保存", type="primary", disabled=not text_content):
            organized = st.session_state.organizer.process(text_content, text_title)
            tags = [t.strip() for t in text_tags.split(",") if t.strip()] + organized.tags
            tags = list(set(tags))

            doc = {
                "id": f"kb_{len(st.session_state.knowledge_base)}",
                "title": text_title or organized.title,
                "content": text_content,
                "type": text_type,
                "tags": tags,
                "added_at": datetime.now().isoformat(),
            }
            st.session_state.knowledge_base.append(doc)
            st.session_state.search_engine.add_document(
                doc_id=doc["id"],
                title=doc["title"],
                content=doc["content"],
                item_type=doc["type"],
                tags=doc["tags"],
            )
            st.success(f"✅ 已保存！类型: {organized.item_type} | 标签: {', '.join(tags)}")

# ── 记录页面 ─────────────────────────────────────────

elif page == "📝 记录":
    st.title("📝 快速记录")

    quick_type = st.selectbox("类型", ["💡 想法", "❓ 问题", "📝 笔记", "✨ 灵感", "🎯 项目"])
    type_map = {"💡 想法": "idea", "❓ 问题": "question", "📝 笔记": "note", "✨ 灵感": "inspiration", "🎯 项目": "project"}
    quick_content = st.text_area("写下你的想法...", height=150, placeholder="随时记录，AI帮你整理")

    if st.button("⚡ 快速保存", type="primary", disabled=not quick_content):
        doc = {
            "id": f"kb_{len(st.session_state.knowledge_base)}",
            "title": quick_content[:50],
            "content": quick_content,
            "type": type_map[quick_type],
            "tags": [],
            "added_at": datetime.now().isoformat(),
        }
        st.session_state.knowledge_base.append(doc)
        st.session_state.search_engine.add_document(
            doc_id=doc["id"], title=doc["title"], content=doc["content"],
            item_type=doc["type"],
        )
        st.success("✅ 已记录！")

    # 显示最近记录
    st.divider()
    st.subheader("📋 最近记录")
    for item in reversed(st.session_state.knowledge_base[-10:]):
        with st.expander(f"{item['title'][:60]} — {item['type']}"):
            st.write(item["content"][:500])
            st.caption(f"标签: {', '.join(item.get('tags', []))} | 添加时间: {item.get('added_at', '')}")

# ── 搜索页面 ─────────────────────────────────────────

elif page == "🔍 搜索":
    st.title("🔍 智能搜索")

    col1, col2 = st.columns([3, 1])
    with col1:
        query = st.text_input("搜索你的知识库", placeholder="用自然语言描述你想找的内容...")
    with col2:
        search_type = st.selectbox("类型", ["全部", "article", "note", "idea", "question"])

    if st.button("🔍 搜索", type="primary", disabled=not query):
        filters = None
        if search_type != "全部":
            filters = {"type": search_type}

        results = st.session_state.search_engine.query(query, limit=10, filters=filters)

        if results:
            st.success(f"找到 {len(results)} 条相关知识")
            for r in results:
                with st.container():
                    st.markdown(f"**{r.title}** (相关度: {r.score:.2f})")
                    st.caption(f"类型: {r.item_type} | 标签: {', '.join(r.tags)}")
                    st.write(r.snippet or r.content[:200])
                    st.divider()
        else:
            st.info("🔍 没有找到相关内容，试试其他关键词？")

    # 关联推荐
    if st.session_state.knowledge_base:
        st.divider()
        st.subheader("🔗 关联推荐")
        selected = st.selectbox(
            "选择一条知识查看关联",
            [item["title"] for item in st.session_state.knowledge_base],
        )
        if st.button("查找关联"):
            idx = [item["title"] for item in st.session_state.knowledge_base].index(selected)
            doc_id = st.session_state.knowledge_base[idx]["id"]
            related = st.session_state.search_engine.find_related(doc_id)
            if related:
                for r in related:
                    st.write(f"- **{r.title}** (相关度: {r.score:.2f})")
            else:
                st.info("暂无关联知识")

# ── 知识图谱页面 ─────────────────────────────────────

elif page == "🕸️ 知识图谱":
    st.title("🕸️ 知识图谱")

    if not st.session_state.knowledge_base:
        st.info("📭 知识库为空，先去采集或记录一些内容吧！")
    else:
        st.subheader("图谱概览")

        # 简单的图谱可视化（用Streamlit原生组件）
        import pandas as pd

        # 节点数据
        nodes_data = []
        for item in st.session_state.knowledge_base:
            nodes_data.append({
                "id": item["id"],
                "label": item["title"][:30],
                "type": item["type"],
                "tags": ", ".join(item.get("tags", [])),
            })

        df_nodes = pd.DataFrame(nodes_data)
        st.dataframe(df_nodes, use_container_width=True)

        # 类型分布
        st.subheader("📊 类型分布")
        type_counts = df_nodes["type"].value_counts()
        st.bar_chart(type_counts)

        # 标签词云（简化版）
        st.subheader("🏷️ 标签统计")
        all_tags = []
        for item in st.session_state.knowledge_base:
            all_tags.extend(item.get("tags", []))
        if all_tags:
            tag_counts = pd.Series(all_tags).value_counts()
            st.bar_chart(tag_counts)
        else:
            st.info("暂无标签")

# ── 统计页面 ─────────────────────────────────────────

elif page == "📊 统计":
    st.title("📊 知识库统计")

    kb = st.session_state.knowledge_base
    if not kb:
        st.info("📭 知识库为空")
    else:
        col1, col2, col3 = st.columns(3)
        col1.metric("总条目", len(kb))
        col2.metric("总字数", sum(len(i.get("content", "")) for i in kb))
        col3.metric("标签数", len(set(t for i in kb for t in i.get("tags", []))))

        st.divider()

        # 每日添加趋势
        st.subheader("📅 添加趋势")
        dates = [i.get("added_at", "")[:10] for i in kb]
        if dates:
            import pandas as pd
            date_counts = pd.Series(dates).value_counts().sort_index()
            st.line_chart(date_counts)

        # 类型分布
        st.subheader("📁 类型分布")
        types = [i.get("type", "unknown") for i in kb]
        type_counts = pd.Series(types).value_counts()
        st.bar_chart(type_counts)

# ── 页脚 ─────────────────────────────────────────────

st.divider()
st.caption("🧠 Minder — AI驱动的个人知识管理平台 | [GitHub](https://github.com/MoKangMedical/minder)")
