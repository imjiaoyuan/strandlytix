// 示例数据
const exampleData = `Gene\tlog2FC\tPvalue
BRCA1\t2.5\t0.001
TP53\t-1.8\t0.005
EGFR\t0.5\t0.1
PTEN\t-2.1\t0.0001
MYC\t1.9\t0.003
KRAS\t-0.3\t0.8
VEGFA\t1.2\t0.02
CDH1\t-1.5\t0.008
IL6\t2.8\t0.0005
TNF\t1.7\t0.015
TGFB1\t-0.8\t0.3
AKT1\t0.9\t0.07
PIK3CA\t1.6\t0.004
MAPK1\t-1.2\t0.025
STAT3\t2.2\t0.002`;

$(document).ready(function() {
    setupEventListeners();
});

function setupEventListeners() {
    $("#draw-volcano").click(drawVolcanoPlot);
    $("#fc-cutoff, #p-cutoff, #point-size, #show-labels").change(updatePlot);
    $("#export-svg").click(exportSVG);
    $("#export-png").click(exportPNG);
    $("#load-example").click(loadExampleData);
}

function parseInput(input) {
    try {
        const lines = input.trim().split('\n');
        if (lines.length < 2) {
            throw new Error("数据至少需要包含表头和一行数据");
        }

        const headers = lines[0].trim().split('\t');
        if (headers.length !== 3) {
            throw new Error("需要三列数据：基因名、log2FC和P值");
        }

        const data = {
            genes: [],
            log2fc: [],
            pvalues: []
        };

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].trim().split('\t');
            if (values.length !== 3) {
                throw new Error(`第${i + 1}行的列数不正确`);
            }

            const fc = parseFloat(values[1]);
            const pval = parseFloat(values[2]);

            if (isNaN(fc) || isNaN(pval)) {
                throw new Error(`第${i + 1}行包含无效的数值`);
            }

            data.genes.push(values[0]);
            data.log2fc.push(fc);
            data.pvalues.push(pval);
        }

        return data;
    } catch (error) {
        throw new Error("数据解析失败: " + error.message);
    }
}

function drawVolcanoPlot() {
    try {
        const input = $("#data-input").val();
        if (!input.trim()) {
            throw new Error("请输入数据");
        }

        const data = parseInput(input);
        const fcCutoff = parseFloat($("#fc-cutoff").val());
        const pCutoff = parseFloat($("#p-cutoff").val());
        const pointSize = parseInt($("#point-size").val());
        const showLabels = $("#show-labels").val();

        // 计算-log10(p-value)
        const negLogPvals = data.pvalues.map(p => -Math.log10(p));

        // 确定点的颜色
        const colors = data.log2fc.map((fc, i) => {
            if (Math.abs(fc) >= fcCutoff && negLogPvals[i] >= pCutoff) {
                return fc > 0 ? '#FF4B4B' : '#4B4BFF';
            }
            return '#808080';
        });

        // 准备标签
        let text = data.genes;
        let textposition = 'top center';
        let showtext = true;

        if (showLabels === 'significant') {
            text = data.genes.map((gene, i) => {
                if (Math.abs(data.log2fc[i]) >= fcCutoff && negLogPvals[i] >= pCutoff) {
                    return gene;
                }
                return '';
            });
        } else if (showLabels === 'none') {
            showtext = false;
        }

        // 创建散点图
        const trace = {
            x: data.log2fc,
            y: negLogPvals,
            mode: 'markers+text',
            type: 'scatter',
            text: text,
            textposition: textposition,
            textfont: {
                family: 'Arial',
                size: 10,
                color: '#666'
            },
            showlegend: false,
            marker: {
                size: pointSize,
                color: colors,
                opacity: 0.8
            },
            hovertemplate: 
                '<b>%{text}</b><br>' +
                'log2FC: %{x:.2f}<br>' +
                '-log10(P): %{y:.2f}<br>' +
                '<extra></extra>'
        };

        // 添加阈值线
        const shapes = [
            // 垂直线 (FC)
            {
                type: 'line',
                x0: fcCutoff,
                x1: fcCutoff,
                y0: 0,
                y1: Math.max(...negLogPvals),
                line: {
                    color: '#666',
                    width: 1,
                    dash: 'dash'
                }
            },
            {
                type: 'line',
                x0: -fcCutoff,
                x1: -fcCutoff,
                y0: 0,
                y1: Math.max(...negLogPvals),
                line: {
                    color: '#666',
                    width: 1,
                    dash: 'dash'
                }
            },
            // 水平线 (P-value)
            {
                type: 'line',
                x0: Math.min(...data.log2fc),
                x1: Math.max(...data.log2fc),
                y0: pCutoff,
                y1: pCutoff,
                line: {
                    color: '#666',
                    width: 1,
                    dash: 'dash'
                }
            }
        ];

        const layout = {
            title: {
                text: '火山图',
                font: {
                    size: 24,
                    color: '#333'
                }
            },
            xaxis: {
                title: {
                    text: 'log2(Fold Change)',
                    font: {
                        size: 14,
                        color: '#333'
                    }
                },
                zeroline: true,
                zerolinecolor: '#666',
                gridcolor: '#ddd'
            },
            yaxis: {
                title: {
                    text: '-log10(P-value)',
                    font: {
                        size: 14,
                        color: '#333'
                    }
                },
                zeroline: true,
                zerolinecolor: '#666',
                gridcolor: '#ddd'
            },
            shapes: shapes,
            showlegend: false,
            plot_bgcolor: '#fff',
            paper_bgcolor: '#fff',
            hovermode: 'closest',
            margin: {
                l: 60,
                r: 30,
                t: 50,
                b: 50
            }
        };

        Plotly.newPlot('volcano-plot', [trace], layout, {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        });

    } catch (error) {
        console.error("绘制火山图时出错:", error);
        alert(error.message || "绘制失败");
    }
}

function updatePlot() {
    if ($("#data-input").val().trim()) {
        drawVolcanoPlot();
    }
}

function exportSVG() {
    try {
        Plotly.downloadImage('volcano-plot', {
            format: 'svg',
            filename: 'volcano_plot',
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
        Plotly.downloadImage('volcano-plot', {
            format: 'png',
            filename: 'volcano_plot',
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
    drawVolcanoPlot();
} 