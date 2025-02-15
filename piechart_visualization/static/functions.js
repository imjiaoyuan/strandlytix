// 配色方案
const colorSchemes = {
    default: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'],
    pastel: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFB3FF'],
    bright: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF']
};

// 示例数据
const exampleData = `基因A    25
基因B    30
基因C    15
基因D    20
基因E    10`;

$(document).ready(function() {
    setupEventListeners();
});

function setupEventListeners() {
    $("#draw-piechart").click(drawPieChart);
    $("#color-scheme, #show-percentage, #donut").change(updateChart);
    $("#export-svg").click(exportSVG);
    $("#export-png").click(exportPNG);
    $("#load-example").click(loadExampleData);
}

function parseInput(input) {
    try {
        const data = [];
        const lines = input.trim().split('\n');
        
        for (const line of lines) {
            const [label, value] = line.trim().split(/\s+/);
            const numValue = parseFloat(value);
            
            if (isNaN(numValue)) {
                throw new Error(`无效的数值: ${value}`);
            }
            
            data.push({
                label: label,
                value: numValue
            });
        }
        
        return data;
    } catch (error) {
        throw new Error("数据解析失败: " + error.message);
    }
}

function drawPieChart() {
    try {
        const input = $("#data-input").val();
        if (!input.trim()) {
            throw new Error("请输入数据");
        }
        
        const data = parseInput(input);
        const colorScheme = colorSchemes[$("#color-scheme").val()];
        const showPercentage = $("#show-percentage").val() === "true";
        const isDonut = $("#donut").val() === "true";
        
        const total = data.reduce((sum, item) => sum + item.value, 0);
        
        const plotData = [{
            values: data.map(item => item.value),
            labels: data.map(item => item.label),
            type: 'pie',
            textinfo: showPercentage ? 'label+percent' : 'label',
            textposition: 'inside',
            insidetextorientation: 'radial',
            hole: isDonut ? 0.4 : 0,
            marker: {
                colors: colorScheme
            }
        }];
        
        const layout = {
            showlegend: true,
            legend: {
                orientation: 'h',
                y: -0.2
            },
            margin: {
                l: 50,
                r: 50,
                t: 50,
                b: 50
            },
            paper_bgcolor: '#fff',
            plot_bgcolor: '#fff',
            font: {
                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }
        };
        
        Plotly.newPlot('piechart-plot', plotData, layout, {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        });
        
    } catch (error) {
        console.error("绘制饼图时出错:", error);
        alert(error.message || "绘制失败");
    }
}

function updateChart() {
    if ($("#data-input").val().trim()) {
        drawPieChart();
    }
}

function exportSVG() {
    try {
        Plotly.downloadImage('piechart-plot', {
            format: 'svg',
            filename: 'piechart',
            width: 1200,
            height: 800
        });
    } catch (error) {
        console.error("导出SVG时出错:", error);
        alert("导出SVG失败");
    }
}

function exportPNG() {
    try {
        Plotly.downloadImage('piechart-plot', {
            format: 'png',
            filename: 'piechart',
            width: 1200,
            height: 800,
            scale: 2
        });
    } catch (error) {
        console.error("导出PNG时出错:", error);
        alert("导出PNG失败");
    }
}

function loadExampleData() {
    $("#data-input").val(exampleData);
    drawPieChart();
} 