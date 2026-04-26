"""Configuration for Minder"""
import os

class Config:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///minder.db")
    API_KEY = os.getenv("API_KEY", "")
    MAX_ITEMS = int(os.getenv("MAX_ITEMS", "10000"))
    SEARCH_INDEX_PATH = os.getenv("SEARCH_INDEX_PATH", "./search_index")
    EXPORT_PATH = os.getenv("EXPORT_PATH", "./exports")
