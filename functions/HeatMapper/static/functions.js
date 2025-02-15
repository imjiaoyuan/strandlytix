let currentPlot = null;

$(document).ready(function() {
    setupEventListeners();
});

function setupEventListeners() {
    $("#draw-heatmap").click(drawHeatmap);
    $("#color-scheme, #cluster-rows, #cluster-cols, #scale-data").change(updateHeatmap);
    $("#export-svg").click(exportSVG);
    $("#export-png").click(exportPNG);
    $("#load-example").click(loadExampleData);
    
    // 初始化配色方案
    initColorSchemes();
}

function initColorSchemes() {
    const colorSchemeSelect = $("#color-scheme");
    colorSchemeSelect.empty();
    
    const schemes = {
        'RdBu_r': '红蓝渐变',
        'RdYlBu': '红黄蓝',
        'YlOrRd': '黄橙红',
        'YlGnBu': '黄绿蓝',
        'Viridis': '翠绿渐变',
        'Plasma': '等离子',
        'Magma': '岩浆',
        'Inferno': '地狱火',
        'Greys': '灰度',
        'Blues': '蓝色'
    };
    
    Object.entries(schemes).forEach(([value, text]) => {
        colorSchemeSelect.append(`<option value="${value}">${text}</option>`);
    });
}

function parseInput(input) {
    try {
        const lines = input.trim().split('\n');
        if (lines.length < 2) {
            throw new Error("数据至少需要包含表头和一行数据");
        }

        const headers = lines[0].trim().split('\t');
        if (headers.length < 2) {
            throw new Error("表头至少需要包含ID列和一个样本列");
        }

        const data = [];
        const rowLabels = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].trim().split('\t');
            if (values.length !== headers.length) {
                throw new Error(`第${i + 1}行的列数与表头不匹配`);
            }
            
            const numericValues = values.slice(1).map(v => {
                const num = Number(v);
                if (isNaN(num)) {
                    throw new Error(`第${i + 1}行包含非数字值: ${v}`);
                }
                return num;
            });
            
            rowLabels.push(values[0]);
            data.push(numericValues);
        }
        
        if (data.length === 0) {
            throw new Error("没有有效的数据行");
        }
        
        return {
            data: data,
            rowLabels: rowLabels,
            colLabels: headers.slice(1)
        };
    } catch (error) {
        throw new Error("数据解析失败: " + error.message);
    }
}

function scaleData(data, method) {
    if (method === 'none') return data;
    
    const scaled = data.map(row => [...row]);
    
    if (method === 'row') {
        for (let i = 0; i < scaled.length; i++) {
            const mean = scaled[i].reduce((a, b) => a + b) / scaled[i].length;
            const std = Math.sqrt(scaled[i].reduce((a, b) => a + (b - mean) ** 2, 0) / scaled[i].length);
            for (let j = 0; j < scaled[i].length; j++) {
                scaled[i][j] = (scaled[i][j] - mean) / (std || 1);
            }
        }
    } else if (method === 'column') {
        for (let j = 0; j < scaled[0].length; j++) {
            const col = scaled.map(row => row[j]);
            const mean = col.reduce((a, b) => a + b) / col.length;
            const std = Math.sqrt(col.reduce((a, b) => a + (b - mean) ** 2, 0) / col.length);
            for (let i = 0; i < scaled.length; i++) {
                scaled[i][j] = (scaled[i][j] - mean) / (std || 1);
            }
        }
    }
    
    return scaled;
}

function clusterData(data, labels) {
    // 简单的层次聚类实现
    const distances = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = i + 1; j < data.length; j++) {
            const dist = euclideanDistance(data[i], data[j]);
            distances.push({i, j, dist});
        }
    }
    
    distances.sort((a, b) => a.dist - b.dist);
    
    const clusters = labels.map((_, i) => [i]);
    const order = [];
    
    while (clusters.length > 1) {
        const {i, j} = distances.shift();
        const cluster1 = clusters.findIndex(c => c.includes(i));
        const cluster2 = clusters.findIndex(c => c.includes(j));
        
        if (cluster1 !== -1 && cluster2 !== -1 && cluster1 !== cluster2) {
            clusters[cluster1] = [...clusters[cluster1], ...clusters[cluster2]];
            clusters.splice(cluster2, 1);
        }
    }
    
    return clusters[0];
}

function euclideanDistance(a, b) {
    return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
}

function drawHeatmap() {
    try {
        const input = $("#data-input").val();
        if (!input || !input.trim()) {
            throw new Error("请输入数据");
        }
        
        const {data, rowLabels, colLabels} = parseInput(input);
        
        // 验证数据维度
        if (!data || !data.length || !data[0] || !data[0].length) {
            throw new Error("数据格式不正确");
        }
        
        // 数据标准化
        const scaledData = scaleData(data, $("#scale-data").val());
        
        // 聚类
        let rowOrder = [...Array(rowLabels.length).keys()];
        let colOrder = [...Array(colLabels.length).keys()];
        
        if ($("#cluster-rows").val() === "true" && scaledData.length > 1) {
            rowOrder = clusterData(scaledData, rowLabels);
        }
        if ($("#cluster-cols").val() === "true" && scaledData[0].length > 1) {
            const transposedData = scaledData[0].map((_, j) => scaledData.map(row => row[j]));
            colOrder = clusterData(transposedData, colLabels);
        }
        
        // 重排数据
        const orderedData = rowOrder.map(i => colOrder.map(j => scaledData[i][j]));
        const orderedRowLabels = rowOrder.map(i => rowLabels[i]);
        const orderedColLabels = colOrder.map(j => colLabels[j]);
        
        // 获取容器尺寸
        const container = document.getElementById('heatmap-plot');
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        
        // 创建热图
        const colorScheme = $("#color-scheme").val();
        const layout = {
            title: {
                text: '热图',
                font: {
                    size: 24,
                    color: '#333'
                }
            },
            width: width,
            height: height,
            xaxis: {
                ticktext: orderedColLabels,
                tickvals: [...Array(orderedColLabels.length).keys()],
                tickangle: 45,
                tickfont: { 
                    size: 14,
                    color: '#333'
                },
                title: {
                    text: '样本',
                    font: {
                        size: 16,
                        color: '#333'
                    }
                },
                tickmode: 'array',
                side: 'bottom'
            },
            yaxis: {
                ticktext: orderedRowLabels,
                tickvals: [...Array(orderedRowLabels.length).keys()],
                tickfont: { 
                    size: 14,
                    color: '#333'
                },
                title: {
                    text: '基因',
                    font: {
                        size: 16,
                        color: '#333'
                    },
                    standoff: 40  // 增加标题与轴的距离
                },
                tickmode: 'array',
                side: 'left',
                automargin: true  // 自动调整边距以适应标签
            },
            margin: {
                l: 200,    // 增加左边距
                r: 100,    // 增加右边距以适应色标
                t: 100,    // 增加顶部边距
                b: 150,    // 保持底部边距以适应样本标签
                pad: 10    // 添加内边距
            },
            plot_bgcolor: '#fff',
            paper_bgcolor: '#fff',
            autosize: true,
            showlegend: false
        };
        
        const trace = {
            z: orderedData,
            type: 'heatmap',
            colorscale: colorScheme,
            hoverongaps: false,
            showscale: true,
            colorbar: {
                title: {
                    text: '表达量',
                    font: {
                        size: 14,
                        color: '#333'
                    },
                    side: 'right'
                },
                tickfont: {
                    size: 12,
                    color: '#333'
                },
                len: 0.9,
                x: 1.1,     // 调整色标位置
                thickness: 20  // 调整色标宽度
            },
            hovertemplate: 
                '<b>基因</b>: %{y}<br>' +
                '<b>样本</b>: %{x}<br>' +
                '<b>值</b>: %{z:.2f}<extra></extra>',
            xgap: 1,  // 添加单元格间距
            ygap: 1   // 添加单元格间距
        };
        
        Plotly.newPlot('heatmap-plot', [trace], layout, {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
            toImageButtonOptions: {
                format: 'png',
                filename: 'heatmap',
                height: 800,
                width: 1200,
                scale: 2
            }
        }).then(plot => {
            currentPlot = plot;
        }).catch(error => {
            throw new Error("绘图失败: " + error.message);
        });
        
    } catch (error) {
        console.error("绘制热图时出错:", error);
        alert(error.message || "绘制失败");
    }
}

function updateHeatmap() {
    if ($("#data-input").val().trim()) {
        drawHeatmap();
    }
}

function exportSVG() {
    try {
        Plotly.downloadImage('heatmap-plot', {
            format: 'svg',
            filename: 'heatmap',
            width: 1200,
            height: 800
        });
    } catch (error) {
        console.error("导出SVG时出错:", error);
        alert("导出SVG失败: " + error.message);
    }
}

function exportPNG() {
    try {
        Plotly.downloadImage('heatmap-plot', {
            format: 'png',
            filename: 'heatmap',
            width: 1200,
            height: 800,
            scale: 2
        });
    } catch (error) {
        console.error("导出PNG时出错:", error);
        alert("导出PNG失败: " + error.message);
    }
}

// 添加示例数据
const exampleData = `ID\tSample1\tSample2\tSample3\tSample4\tSample5
BRCA1\t2.5\t-1.2\t0.8\t1.5\t-0.6
TP53\t-0.9\t1.8\t-1.5\t0.4\t2.1
EGFR\t1.2\t0.5\t-2.0\t1.7\t-1.1
PTEN\t-1.8\t1.2\t0.6\t-0.8\t1.5
MYC\t2.1\t-0.7\t1.4\t-1.2\t0.9
KRAS\t0.4\t1.6\t-1.7\t2.0\t-0.5
VEGFA\t-1.5\t0.9\t1.8\t-0.3\t1.2
CDH1\t1.7\t-1.4\t0.3\t1.9\t-0.8`;

// 添加加载示例数据的函数
function loadExampleData() {
    $("#data-input").val(exampleData);
    drawHeatmap();
} 