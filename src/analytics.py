"""Analytics module for Minder"""
from typing import Dict, List
import time

class UsageAnalytics:
    def __init__(self):
        self.events = []
    
    def track(self, event_type: str, data: Dict):
        self.events.append({"type": event_type, "data": data, "timestamp": time.time()})
    
    def get_stats(self) -> Dict:
        return {"total_events": len(self.events), "event_types": list(set(e["type"] for e in self.events))}
    
    def get_top_items(self, n: int = 10) -> List[Dict:
        return sorted(self.events, key=lambda x: x["timestamp"], reverse=True)[:n]
