# Bioinformatics Toolbox

## 简介
Bioinformatics Toolbox 是一个集成了多种生物信息学数据可视化工具的在线平台。该工具箱提供了直观的用户界面，支持多种常用的生物信息学数据可视化需求。

## 功能模块
- **蛋白质结构可视化**: 支持 PDB 和 CIF 格式的蛋白质结构在线可视化
- **AlphaFold3 分析**: AlphaFold3 预测结果的可视化与质量评估
- **进化树可视化**: 支持 Newick 格式的进化树在线可视化与分析
- **韦恩图可视化**: 支持多个数据集的韦恩图在线绘制与分析
- **热图可视化**: 支持表达矩阵的热图绘制与聚类分析
- **饼图可视化**: 支持数据集的饼图绘制与分析
- **SNP 密度图可视化**: 支持基因组 SNP 分布密度的可视化分析
- **火山图可视化**: 支持差异表达基因的火山图绘制与分析

## 技术特点
- 纯前端实现，无需服务器部署
- 基于现代 Web 技术栈开发
- 数据本地处理，保证安全性

## 使用说明
1. 访问在线工具箱：https://yuanj.top/bioinformatics_toolbox/
2. 选择所需的可视化工具
3. 按照工具提示上传或输入数据
4. 调整可视化参数
5. 导出结果图像

## 本地部署
```bash
# 克隆项目
git clone https://github.com/imjiaoyuan/bioinformatics_toolbox.git

# 使用任意 Web 服务器部署
# 例如使用 Python 的 http.server
cd bioinformatics_toolbox
python -m http.server 8000
```

## 所用模块
- 3Dmol.js - 蛋白质结构可视化
- D3.js - 进化树与 SNP 密度图绘制
- Plotly.js - 热图与火山图绘制
- venn.js - 韦恩图绘制
- jQuery - DOM 操作与事件处理

## 开源协议
MIT License

## 联系方式
- Email: imjiaoyuan@gmail.com
- Blog: https://yuanj.top