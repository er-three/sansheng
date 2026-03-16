# 资产管理域约束

## 资产完整性

提取的 5 份资产必须完整，缺一不可：
- Service/API 接口定义
- DataModel/数据结构定义
- UIComponent/前端组件
- Provider/依赖提供者
- Utility/工具函数库

任何一个缺失，该资产视为无效。

## 版本控制

所有资产必须版本化：
- 每个资产都必须有 version 字段
- 版本遵循 Semantic Versioning (major.minor.patch)
- 版本历史必须完整保存
- 不允许无版本的资产

## 一致性验证

资产间必须通过一致性验证：
- Service 的接口字段在 DataModel 中都有定义
- UIComponent 的 Props 在 Service 返回类型中有对应
- 无孤立的 Utility 或 Provider（必须被其他资产使用）
- 名称遵循统一命名规范

## 提取精度

资产提取精度不低于 95%：
- 无重复提取（同一资产不能出现 2 次）
- 无遗漏（关键资产必须被提取）
- 类型识别准确率 >= 95%
- 边界资产必须清晰标记
