"""
Minder — 网页采集模块

支持从网页、PDF、RSS等来源采集内容，提取正文并结构化。
"""

import re
import json
import hashlib
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field, asdict
from urllib.parse import urlparse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    requests = None
    BeautifulSoup = None


@dataclass
class CrawledContent:
    """采集到的内容结构"""
    url: str
    title: str = ""
    content: str = ""
    author: str = ""
    published_at: str = ""
    word_count: int = 0
    tags: list = field(default_factory=list)
    summary: str = ""
    content_hash: str = ""
    crawled_at: str = ""
    source_type: str = "web"  # web / pdf / rss
    metadata: dict = field(default_factory=dict)

    def to_dict(self):
        return asdict(self)


class WebCrawler:
    """网页内容采集器"""

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (compatible; Minder/1.0; +https://github.com/MoKangMedical/minder)"
    }

    def __init__(self, timeout: int = 15):
        self.timeout = timeout
        self._seen_hashes = set()

    def crawl(self, url: str, extract_mode: str = "full") -> Optional[CrawledContent]:
        """
        采集网页内容

        Args:
            url: 目标URL
            extract_mode: 提取模式 — full(全文) / summary(摘要) / metadata(仅元数据)

        Returns:
            CrawledContent 对象，失败返回 None
        """
        if requests is None or BeautifulSoup is None:
            print("[WARN] requests/bs4 not installed. Install with: pip install requests beautifulsoup4")
            return self._fallback_crawl(url)

        try:
            resp = requests.get(url, headers=self.HEADERS, timeout=self.timeout)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding or "utf-8"

            soup = BeautifulSoup(resp.text, "html.parser")

            title = self._extract_title(soup)
            content = self._extract_content(soup, extract_mode) if extract_mode != "metadata" else ""
            author = self._extract_author(soup)
            published = self._extract_published(soup)
            word_count = len(content) if content else 0
            content_hash = hashlib.md5(content.encode("utf-8")).hexdigest() if content else ""

            # 去重检测
            if content_hash in self._seen_hashes:
                print(f"[INFO] Duplicate content detected: {url}")

            result = CrawledContent(
                url=url,
                title=title,
                content=content,
                author=author,
                published_at=published,
                word_count=word_count,
                content_hash=content_hash,
                crawled_at=datetime.now().isoformat(),
                source_type="web",
                metadata={"status_code": resp.status_code, "final_url": resp.url}
            )

            if content_hash:
                self._seen_hashes.add(content_hash)

            return result

        except Exception as e:
            print(f"[ERROR] Failed to crawl {url}: {e}")
            return None

    def crawl_batch(self, urls: list[str]) -> list[CrawledContent]:
        """批量采集多个URL"""
        results = []
        for url in urls:
            result = self.crawl(url)
            if result:
                results.append(result)
        return results

    def _extract_title(self, soup) -> str:
        """提取页面标题"""
        # 优先 og:title
        og = soup.find("meta", property="og:title")
        if og and og.get("content"):
            return og["content"].strip()

        # h1 标签
        h1 = soup.find("h1")
        if h1:
            return h1.get_text(strip=True)

        # title 标签
        if soup.title:
            return soup.title.get_text(strip=True)

        return "Untitled"

    def _extract_content(self, soup, mode: str) -> str:
        """提取正文内容"""
        # 移除无关标签
        for tag in soup.find_all(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        # 尝试 article 标签
        article = soup.find("article")
        if article:
            text = article.get_text(separator="\n", strip=True)
        else:
            # 尝试 main 标签
            main = soup.find("main")
            if main:
                text = main.get_text(separator="\n", strip=True)
            else:
                # 回退到 body
                body = soup.find("body")
                text = body.get_text(separator="\n", strip=True) if body else ""

        # 清理多余空行
        text = re.sub(r"\n{3,}", "\n\n", text)

        if mode == "summary" and len(text) > 500:
            text = text[:500] + "..."

        return text

    def _extract_author(self, soup) -> str:
        """提取作者信息"""
        for selector in [
            {"name": "author"},
            {"property": "article:author"},
            {"name": "sailthru.author"},
        ]:
            meta = soup.find("meta", selector)
            if meta and meta.get("content"):
                return meta["content"].strip()

        # 尝试 class 包含 author 的元素
        author_el = soup.find(class_=re.compile(r"author|byline", re.I))
        if author_el:
            return author_el.get_text(strip=True)

        return ""

    def _extract_published(self, soup) -> str:
        """提取发布时间"""
        for selector in [
            {"property": "article:published_time"},
            {"name": "pubdate"},
            {"name": "publish_date"},
        ]:
            meta = soup.find("meta", selector)
            if meta and meta.get("content"):
                return meta["content"].strip()

        # time 标签
        time_el = soup.find("time")
        if time_el and time_el.get("datetime"):
            return time_el["datetime"]

        return ""

    def _fallback_crawl(self, url: str) -> Optional[CrawledContent]:
        """无依赖时的回退采集（仅记录URL）"""
        return CrawledContent(
            url=url,
            title=urlparse(url).path.split("/")[-1] or "Untitled",
            crawled_at=datetime.now().isoformat(),
            source_type="web",
            metadata={"fallback": True}
        )


class PDFCrawler:
    """PDF文档采集器"""

    def crawl(self, file_path: str) -> Optional[CrawledContent]:
        """
        采集PDF内容

        Args:
            file_path: PDF文件路径

        Returns:
            CrawledContent 对象
        """
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()

            title = file_path.split("/")[-1].replace(".pdf", "")

            return CrawledContent(
                url=f"file://{file_path}",
                title=title,
                content=text,
                word_count=len(text),
                content_hash=hashlib.md5(text.encode()).hexdigest(),
                crawled_at=datetime.now().isoformat(),
                source_type="pdf",
            )
        except ImportError:
            print("[WARN] PyMuPDF not installed. Install with: pip install PyMuPDF")
            return None
        except Exception as e:
            print(f"[ERROR] Failed to parse PDF {file_path}: {e}")
            return None


# 使用示例
if __name__ == "__main__":
    crawler = WebCrawler()
    result = crawler.crawl("https://example.com")
    if result:
        print(f"标题: {result.title}")
        print(f"字数: {result.word_count}")
        print(f"内容预览: {result.content[:200]}")
