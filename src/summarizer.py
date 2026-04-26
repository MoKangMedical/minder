"""自动摘要 — 文本摘要生成"""

from typing import Dict, List, Optional
import re


class Summarizer:
    """文本自动摘要生成器"""

    STOP_WORDS = {"的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一",
                  "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有",
                  "看", "好", "自己", "这", "他", "她", "它", "们", "那", "被", "从", "把"}

    def __init__(self):
        self._summaries: List[dict] = []

    def extractive_summary(self, text: str, num_sentences: int = 3) -> str:
        sentences = self._split_sentences(text)
        if not sentences:
            return ""
        scores = self._score_sentences(sentences, text)
        ranked = sorted(range(len(sentences)), key=lambda i: scores[i], reverse=True)
        selected = sorted(ranked[:num_sentences])
        return "。".join(sentences[i] for i in selected) + "。"

    def _split_sentences(self, text: str) -> List[str]:
        sentences = re.split(r'[。！？\n]+', text)
        return [s.strip() for s in sentences if len(s.strip()) > 5]

    def _score_sentences(self, sentences: List[str], full_text: str) -> List[float]:
        word_freq = self._word_frequency(full_text)
        scores = []
        for sent in sentences:
            words = self._tokenize(sent)
            if not words:
                scores.append(0.0)
                continue
            score = sum(word_freq.get(w, 0) for w in words) / len(words)
            scores.append(score)
        return scores

    def _word_frequency(self, text: str) -> Dict[str, float]:
        words = self._tokenize(text)
        freq = {}
        for w in words:
            freq[w] = freq.get(w, 0) + 1
        max_freq = max(freq.values()) if freq else 1
        return {w: f / max_freq for w, f in freq.items()}

    def _tokenize(self, text: str) -> List[str]:
        words = re.findall(r'[\u4e00-\u9fff]+|[a-zA-Z]+', text)
        return [w for w in words if w not in self.STOP_WORDS and len(w) > 1]

    def keyword_extraction(self, text: str, top_n: int = 10) -> List[dict]:
        freq = self._word_frequency(text)
        sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        return [{"word": w, "score": round(s, 4)} for w, s in sorted_words[:top_n]]

    def title_suggestion(self, text: str) -> str:
        keywords = self.keyword_extraction(text, 3)
        if keywords:
            return "".join(kw["word"] for kw in keywords[:3])
        sentences = self._split_sentences(text)
        return sentences[0][:20] if sentences else "无标题"

    def summary_with_keywords(self, text: str, num_sentences: int = 3) -> dict:
        summary = self.extractive_summary(text, num_sentences)
        keywords = self.keyword_extraction(text, 5)
        return {
            "summary": summary,
            "keywords": keywords,
            "original_length": len(text),
            "summary_length": len(summary),
            "compression_ratio": round(len(summary) / len(text), 4) if text else 0,
        }

    def bullet_points(self, text: str, max_points: int = 5) -> List[str]:
        sentences = self._split_sentences(text)
        scores = self._score_sentences(sentences, text)
        ranked = sorted(range(len(sentences)), key=lambda i: scores[i], reverse=True)
        return [f"• {sentences[i]}" for i in ranked[:max_points]]

    def save_summary(self, doc_id: str, original: str, summary: str):
        self._summaries.append({
            "doc_id": doc_id, "original_length": len(original),
            "summary_length": len(summary), "summary": summary,
        })

    def get_summaries(self) -> List[dict]:
        return list(self._summaries)

    def abstractive_placeholder(self, text: str) -> str:
        """简易抽象式摘要（基于提取式改写）"""
        extractive = self.extractive_summary(text, 2)
        keywords = self.keyword_extraction(text, 3)
        kw_str = "、".join(kw["word"] for kw in keywords)
        return f"本文主要涉及{kw_str}。{extractive}"

    def readability_score(self, text: str) -> dict:
        sentences = self._split_sentences(text)
        words = self._tokenize(text)
        avg_sentence_len = len(words) / len(sentences) if sentences else 0
        return {
            "sentences": len(sentences), "words": len(words),
            "avg_sentence_length": round(avg_sentence_len, 1),
            "readability": "易读" if avg_sentence_len < 15 else "中等" if avg_sentence_len < 25 else "较难",
        }
