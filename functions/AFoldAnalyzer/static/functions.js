let viewer;
let isSpinning = false;
let renderTimeout;
let isDragging = false; // 添加拖拽状态标记
let currentData = {
    model: null,
    confidences: null,
    summary: null
};

// 在文件开头定义颜色映射
const chainColors = {
    'A': 'rgb(31, 120, 180)',  // 蓝色
    'B': 'rgb(255, 127, 14)',  // 橙色
    'C': 'rgb(44, 160, 44)',   // 绿色
    'D': 'rgb(214, 39, 40)',   // 红色
    'E': 'rgb(148, 103, 189)', // 紫色
    'F': 'rgb(140, 86, 75)',   // 棕色
    'G': 'rgb(227, 119, 194)', // 粉色
    'H': 'rgb(127, 127, 127)', // 灰色
    'I': 'rgb(188, 189, 34)',  // 黄绿色
    'J': 'rgb(23, 190, 207)'   // 青色
};

// 初始化3D查看器
function initViewer() {
    try {
        // 确保元素存在
        const viewerElement = document.getElementById('structure-viewer');
        if (!viewerElement) {
            throw new Error('找不到查看器元素');
        }

        // 创建查看器
        viewer = $3Dmol.createViewer(viewerElement, {
            backgroundColor: "white",
            antialias: true
        });

        console.log('查看器初始化成功');
    } catch (error) {
        console.error('查看器初始化失败:', error);
        showError('3D查看器初始化失败');
    }
}

// 初始化页面
$(document).ready(function() {
    initViewer();
    setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
    // 文件上传事件 - 修正ID匹配
    $("#model-file").change(handleModelFile);
    $("#confidence-file").change(handleConfidenceFile);
    $("#summary-file").change(handleSummaryFile);
    
    // 控制按钮事件
    $("#display-mode").change(updateVisualization);
    $("#reset-view").click(resetView);
    $("#spin").click(toggleSpin);
    $("#export-png").click(exportImage);
    $("#export-pdf").click(generateReport);
    
    // 优化的防抖渲染函数
    function debouncedRender() {
        if (renderTimeout) clearTimeout(renderTimeout);
        renderTimeout = setTimeout(() => {
            viewer.render();
        }, isDragging ? 0 : 100); // 拖拽时立即渲染，其他情况延迟渲染
    }
    
    // 添加拖拽状态监听
    $("#viewer")
        .on('mousedown touchstart', () => {
            isDragging = true;
        })
        .on('mouseup touchend', () => {
            isDragging = false;
            debouncedRender();
        });
}

// 处理CIF文件
async function handleModelFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const content = await readFileAsText(file);
        currentData.model = content;
        
        // 清除现有模型
        viewer.clear();
        
        // 添加新模型
        viewer.addModel(content, "cif");
        
        // 设置默认样式
        updateVisualization();
        
        // 调整视图
        viewer.zoomTo();
        viewer.render();
        
        console.log('模型加载成功');
    } catch (error) {
        console.error('文件处理错误:', error);
        showError("加载结构文件失败: " + error.message);
    }
}

// 处理置信度文件
async function handleConfidenceFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const content = await readFileAsText(file);
        currentData.confidences = JSON.parse(content);
        
        // 更新相关显示
        updateConfidenceVisualization();
        updatePAEPlot();
        updateStructureInfo();
    } catch (error) {
        console.error("置信度文件处理错误:", error);
        showError("加载置信度文件失败: " + error.message);
    }
}

// 处理总结文件
async function handleSummaryFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const content = await readFileAsText(file);
        currentData.summary = JSON.parse(content);
        
        // 更新质量评估信息
        updateQualityMetrics();
    } catch (error) {
        console.error("总结文件处理错误:", error);
        showError("加载总结文件失败: " + error.message);
    }
}

// 读取文件内容
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error("文件读取失败"));
        reader.readAsText(file);
    });
}

// 更新可视化样式
function updateVisualization() {
    if (!viewer) return;

    try {
        const displayMode = $("#display-mode").val();
        
        // 设置基础样式
        let style = {
            cartoon: {
                opacity: 0.9,
                thickness: 0.4,
                style: 'oval'
            }
        };

        // 根据显示模式设置颜色
        switch (displayMode) {
            case "confidence":
                if (currentData.confidences) {
                    style.cartoon.colorfunc = function(atom) {
                        const plddt = currentData.confidences.atom_plddts[atom.serial - 1];
                        if (plddt >= 90) return "#0053D6";      // 很高
                        if (plddt >= 70) return "#65CBF3";      // 高
                        if (plddt >= 50) return "#FFD700";      // 中等
                        return "#FF0000";                        // 低
                    };
                } else {
                    style.cartoon.color = 'spectrum';
                }
                break;
            case "chain":
                style.cartoon.colorfunc = function(atom) {
                    const chain = atom.chain;
                    return chainColors[chain] || 'gray';  // 如果找不到对应颜色则使用灰色
                };
                break;
            case "rainbow":
                style.cartoon.color = 'spectrum';
                style.cartoon.colorscheme = {
                    gradient: 'rainbow',
                    min: 1,
                    max: viewer.selectedAtoms().length
                };
                break;
            default:
                style.cartoon.color = 'spectrum';
                break;
        }

        // 应用样式
        viewer.setStyle({}, style);
        viewer.render();
    } catch (error) {
        console.error('显示样式更新失败:', error);
        showError('更新显示样式失败: ' + error.message);
    }
}

// 更新置信度可视化
function updateConfidenceVisualization() {
    if (!currentData.confidences || !viewer) {
        console.warn('置信度数据或查看器不可用');
        return;
    }
    
    try {
        const model = viewer.getModel();
        if (!model) {
            console.warn('没有加载的模型');
            return;
        }

        // 如果当前显示模式是置信度模式，更新显示
        if ($("#display-mode").val() === "confidence") {
            model.setStyle({}, {
                cartoon: {
                    colorfunc: function(atom) {
                        const plddt = currentData.confidences.atom_plddts[atom.serial - 1];
                        if (plddt >= 90) return "#0053D6";
                        if (plddt >= 70) return "#65CBF3";
                        if (plddt >= 50) return "#FFD700";
                        return "#FF0000";
                    },
                    opacity: 0.9,
                    smoothSheet: true
                }
            });
            viewer.render();
        }
    } catch (error) {
        console.error('置信度可视化更新失败:', error);
        showError('更新置信度显示失败');
    }
}

// 更新PAE图表 - 优化错误处理
function updatePAEPlot() {
    if (!currentData.confidences || !currentData.confidences.pae) {
        console.warn("PAE数据不可用");
        return;
    }
    
    try {
        const pae = currentData.confidences.pae;
        const data = [{
            z: pae,
            type: 'heatmap',
            colorscale: [
                [0, '#0053D6'],
                [0.33, '#65CBF3'],
                [0.66, '#FFD700'],
                [1, '#FF0000']
            ],
            showscale: true,
            colorbar: {
                title: 'PAE (Å)',
                titleside: 'right'
            }
        }];
        
        const layout = {
            title: '预测对齐误差 (PAE)',
            xaxis: { 
                title: '残基位置',
                showgrid: false
            },
            yaxis: { 
                title: '残基位置',
                showgrid: false
            },
            margin: { t: 50, l: 50, r: 50, b: 50 },
            plot_bgcolor: 'white',
            paper_bgcolor: 'white'
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };
        
        Plotly.newPlot('pae-plot', data, layout, config);
    } catch (error) {
        console.error("PAE图表绘制错误:", error);
        showError("PAE图表生成失败");
    }
}

// 更新结构信息 - 添加更多错误检查
function updateStructureInfo() {
    if (!currentData.confidences) {
        console.warn("置信度数据不可用");
        return;
    }
    
    try {
        const chainIds = [...new Set(currentData.confidences.atom_chain_ids)];
        const residueCount = currentData.confidences.atom_chain_ids.length;
        
        const info = {
            "链数量": chainIds.length,
            "残基数量": residueCount,
            "平均pLDDT": calculateAveragePLDDT().toFixed(2),
            "链ID": chainIds.join(", ")
        };
        
        displayInfo("structure-info", info);
    } catch (error) {
        console.error("结构信息更新错误:", error);
        showError("结构信息更新失败");
    }
}

// 更新质量评估信息 - 添加更多错误检查
function updateQualityMetrics() {
    if (!currentData.summary) {
        console.warn("总结数据不可用");
        return;
    }
    
    try {
        const metrics = {
            "iPTM得分": currentData.summary.iptm.toFixed(3),
            "pTM得分": currentData.summary.ptm.toFixed(3),
            "无序区比例": (currentData.summary.fraction_disordered * 100).toFixed(1) + "%",
            "排名得分": currentData.summary.ranking_score.toFixed(3),
            "结构冲突": currentData.summary.has_clash ? "是" : "否"
        };
        
        displayInfo("quality-metrics", metrics);
    } catch (error) {
        console.error("质量评估更新错误:", error);
        showError("质量评估更新失败");
    }
}

// 显示信息
function displayInfo(elementId, data) {
    const container = document.getElementById(elementId);
    container.innerHTML = Object.entries(data)
        .map(([key, value]) => `
            <div class="info-row">
                <span class="info-label">${key}:</span>
                <span class="info-value">${value}</span>
            </div>
        `).join('');
}

// 计算平均pLDDT
function calculateAveragePLDDT() {
    if (!currentData.confidences) return 0;
    const plddts = currentData.confidences.atom_plddts;
    return plddts.reduce((a, b) => a + b, 0) / plddts.length;
}

// 切换旋转
function toggleSpin() {
    if (isSpinning) {
        viewer.spin(false);
        isSpinning = false;
    } else {
        viewer.spin(true);
        isSpinning = true;
    }
}

// 重置视图
function resetView() {
    viewer.zoomTo();
}

// 导出PNG图片
function exportImage() {
    try {
        let link = document.createElement('a');
        link.download = 'structure.png';
        link.href = viewer.pngURI();
        link.click();
    } catch (error) {
        showError("导出图像失败");
    }
}

// Generate PDF report
async function generateReport() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // First page - Structure and PAE plot
        doc.setFont('helvetica');
        doc.setFontSize(24);
        doc.text('AlphaFold3 Structure Report', 20, 20);

        doc.setFontSize(10);
        const date = new Date().toLocaleString('en-US');
        doc.text(`Generated: ${date}`, 20, 30);

        const structureImage = viewer.pngURI();
        doc.addImage(structureImage, 'PNG', 20, 40, 170, 80);
        doc.text('Structure Preview', 20, 35);

        const paeImage = await Plotly.toImage('pae-plot', {
            format: 'png',
            width: 800,
            height: 400
        });
        doc.addImage(paeImage, 'PNG', 20, 130, 170, 80);
        doc.text('Predicted Alignment Error (PAE) Plot', 20, 125);

        // Second page - Quality metrics
        doc.addPage();
        doc.setFontSize(18);
        doc.text('Structure Quality Assessment', 20, 20);

        const metrics = [
            ['Metric', 'Value'],
            ['Average pLDDT', calculateAveragePLDDT().toFixed(2)],
            ['iPTM Score', currentData.summary.iptm.toFixed(3)],
            ['pTM Score', currentData.summary.ptm.toFixed(3)],
            ['Disordered Ratio', (currentData.summary.fraction_disordered * 100).toFixed(1) + '%'],
            ['Ranking Score', currentData.summary.ranking_score.toFixed(3)],
            ['Structure Clash', currentData.summary.has_clash ? 'Yes' : 'No']
        ];

        doc.autoTable({
            startY: 30,
            head: [metrics[0]],
            body: metrics.slice(1),
            theme: 'grid',
            styles: {
                fontSize: 12,
                cellPadding: 5,
                halign: 'center'
            },
            headStyles: {
                fillColor: [33, 150, 243],
                textColor: 255
            },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 60 }
            },
            margin: { left: 20 }
        });

        // Confidence level table - with more space
        doc.setFontSize(18);
        doc.text('Confidence Level Description', 20, 140);
        
        const confidenceLevels = [
            ['Very High (90-100)', 'Blue', 'Very reliable prediction'],
            ['High (70-90)', 'Cyan', 'Reliable prediction'],
            ['Medium (50-70)', 'Yellow', 'Average reliability'],
            ['Low (0-50)', 'Red', 'Low reliability']
        ];

        doc.autoTable({
            startY: 150,
            head: [['Confidence Range', 'Color', 'Reliability']],
            body: confidenceLevels,
            theme: 'grid',
            styles: {
                fontSize: 12,
                cellPadding: 5,
                halign: 'left'
            },
            headStyles: {
                fillColor: [33, 150, 243],
                textColor: 255
            },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 30 },
                2: { cellWidth: 80 }
            },
            margin: { left: 20 }
        });

        // Save PDF
        const fileName = `alphafold3_report_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
    } catch (error) {
        console.error("Failed to generate report:", error);
        showError("Failed to generate report: " + error.message);
    }
}

// 显示错误信息
function showError(message) {
    alert(message);
} 