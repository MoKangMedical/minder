const fs = require('fs-extra');
const path = require('path');
const config = require('../../config/config');

/**
 * 念念数据客户端
 * 获取念念应用的数据
 */
class MinderClient {
  constructor() {
    this.dataPath = config.minder.dataPath;
  }
  
  /**
   * 获取今日数据
   * @returns {Promise<Object>} 今日数据
   */
  async getTodayData() {
    try {
      // 从 localStorage 导出文件读取数据
      // 需要在念念App中添加导出功能
      
      if (!fs.existsSync(this.dataPath)) {
        console.log('⚠️ 数据文件不存在，使用模拟数据');
        return this.getMockData();
      }
      
      const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
      
      // 筛选今日数据
      const today = new Date();
      const todayItems = data.items.filter(item => {
        const itemDate = new Date(item.time);
        return itemDate.toDateString() === today.toDateString();
      });
      
      return {
        items: todayItems,
        stats: {
          total: todayItems.length,
          completed: todayItems.filter(i => i.completed).length,
          pending: todayItems.filter(i => !i.completed).length,
          efficiency: todayItems.length > 0 
            ? Math.round((todayItems.filter(i => i.completed).length / todayItems.length) * 100)
            : 0
        },
        date: today.toISOString()
      };
      
    } catch (error) {
      console.error('❌ 获取数据失败:', error);
      return this.getMockData();
    }
  }
  
  /**
   * 获取本周数据
   */
  async getWeekData() {
    try {
      if (!fs.existsSync(this.dataPath)) {
        return this.getMockWeekData();
      }
      
      const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
      
      // 获取本周数据
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekItems = data.items.filter(item => {
        const itemDate = new Date(item.time);
        return itemDate >= weekStart;
      });
      
      return {
        items: weekItems,
        stats: this.calculateStats(weekItems),
        dateRange: {
          start: weekStart.toISOString(),
          end: now.toISOString()
        }
      };
      
    } catch (error) {
      console.error('❌ 获取周数据失败:', error);
      return this.getMockWeekData();
    }
  }
  
  /**
   * 计算统计数据
   */
  calculateStats(items) {
    const completed = items.filter(i => i.completed).length;
    return {
      total: items.length,
      completed,
      pending: items.length - completed,
      efficiency: items.length > 0 ? Math.round((completed / items.length) * 100) : 0
    };
  }
  
  /**
   * 模拟数据（测试用）
   */
  getMockData() {
    return {
      items: [
        {
          id: 1,
          title: '晨间冥想15分钟',
          description: '保持内心的平静',
          completed: true,
          time: Date.now(),
          type: 'todo'
        },
        {
          id: 2,
          title: '完成项目报告',
          description: '整理本周工作进度',
          completed: true,
          time: Date.now(),
          type: 'todo'
        },
        {
          id: 3,
          title: '阅读30分钟',
          description: '《原子习惯》',
          completed: false,
          time: Date.now() + 3600000,
          type: 'todo'
        },
        {
          id: 4,
          title: '晚餐准备',
          description: '尝试新菜谱',
          completed: false,
          time: Date.now() + 7200000,
          type: 'todo'
        }
      ],
      stats: {
        total: 4,
        completed: 2,
        pending: 2,
        efficiency: 50
      },
      date: new Date().toISOString()
    };
  }
  
  /**
   * 模拟周数据
   */
  getMockWeekData() {
    return {
      items: [
        { id: 1, title: '周一：制定周计划', completed: true, time: Date.now() - 86400000 * 6 },
        { id: 2, title: '周二：健身1小时', completed: true, time: Date.now() - 86400000 * 5 },
        { id: 3, title: '周三：完成设计稿', completed: true, time: Date.now() - 86400000 * 4 },
        { id: 4, title: '周四：团队会议', completed: true, time: Date.now() - 86400000 * 3 },
        { id: 5, title: '周五：项目汇报', completed: false, time: Date.now() - 86400000 * 2 },
        { id: 6, title: '周六：阅读学习', completed: false, time: Date.now() - 86400000 },
        { id: 7, title: '周日：家庭时光', completed: false, time: Date.now() }
      ],
      stats: {
        total: 7,
        completed: 4,
        pending: 3,
        efficiency: 57
      },
      dateRange: {
        start: new Date(Date.now() - 86400000 * 6).toISOString(),
        end: new Date().toISOString()
      }
    };
  }
}

module.exports = MinderClient;
