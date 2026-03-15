# 资产管理域 - Yibu (一部/扫描) 约束

## 扫描完整性

代码扫描必须完整：
- 必须扫描所有代码文件（不能限制文件数量）
- 包括所有编程语言（.ts, .js, .py, .go, etc）
- 递归扫描所有目录（包括嵌套目录）
- 记录扫描统计（文件数、总行数、扫描耗时）

## 资产识别

准确识别 5 种资产：

- Service/API：class/interface 以 Service/API/Controller/Handler 命名，有方法定义
- DataModel：class/interface 以 Model/Entity/Data/Schema 命名，有属性定义
- UIComponent：class 以 Component 命名，有 render/template 方法或装饰器
- Provider：class/function 以 Provider/Factory 命名或有 @Injectable 装饰器
- Utility：class/function 以 Util/Helper/Tool 命名，无副作用，可复用

## 识别精度

资产识别必须精准：
- 避免误识别（不应把普通 class 识别为 Service）
- 区分易混淆的类型（Provider vs Utility）
- 标记可疑案例（让用户确认）
- 准确率 >= 95%

## 输出格式

扫描结果必须标准化输出：
- 格式：JSON 或 YAML
- 包含：资产列表、统计数据、识别参数
- 字段齐全：name, type, path, lineNumber, description
