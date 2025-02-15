// 示例数据
const exampleData = `# circRNA data
circ_001\t1\t800

# miRNA binding sites
miR-124-3p\t50\t72
miR-145-5p\t150\t172
miR-221-3p\t300\t322
miR-222-3p\t450\t472
miR-23b-3p\t600\t622`;

let svg = null;
let currentPlot = null;

$(document).ready(function() {
    setupEventListeners();
    initSvg();
});

function setupEventListeners() {
    $("#draw-plot").click(drawCircMiRNAPlot);
    $("#load-example").click(loadExampleData);
    $("#export-svg").click(exportSVG);
    $("#export-png").click(exportPNG);
    $("input").change(updatePlot);
    $("#mirna-radius").on('input', function() {
        $(".range-value").text($(this).val());
        updatePlot();
    });
}

function initSvg() {
    // 创建SVG容器
    const container = d3.select("#circmirna-plot");
    svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "-250 -250 500 500")
        .attr("preserveAspectRatio", "xMidYMid meet");
}

function parseInput(input) {
    try {
        const lines = input.trim().split('\n');
        const data = {
            circRNA: null,
            miRNAs: []
        };

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#')) continue;

            const [name, start, end] = line.split('\t');
            if (!name || !start || !end) {
                throw new Error("每行数据需要包含名称、起始位置和终止位置");
            }

            const startPos = parseInt(start);
            const endPos = parseInt(end);

            if (isNaN(startPos) || isNaN(endPos)) {
                throw new Error("起始位置和终止位置必须是数字");
            }

            if (data.circRNA === null) {
                data.circRNA = { name, start: startPos, end: endPos };
            } else {
                data.miRNAs.push({ name, start: startPos, end: endPos });
            }
        }

        if (!data.circRNA) {
            throw new Error("缺少circRNA数据");
        }

        if (data.miRNAs.length === 0) {
            throw new Error("缺少miRNA结合位点数据");
        }

        return data;
    } catch (error) {
        throw new Error("数据解析失败: " + error.message);
    }
}

function drawCircMiRNAPlot() {
    try {
        const input = $("#data-input").val();
        if (!input.trim()) {
            throw new Error("请输入数据");
        }

        const data = parseInput(input);
        const circColor = $("#circ-color").val();
        const mirnaColor = $("#mirna-color").val();
        const circFontSize = $("#circ-font-size").val();
        const mirnaFontSize = $("#mirna-font-size").val();
        const mirnaRadius = $("#mirna-radius").val();

        // 清除现有图形
        svg.selectAll("*").remove();

        // 绘制circRNA环
        const radius = 150;
        const circumference = data.circRNA.end - data.circRNA.start;
        
        // 添加circRNA环
        svg.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", radius)
            .attr("fill", "none")
            .attr("stroke", circColor)
            .attr("stroke-width", 2);

        // 添加circRNA名称
        svg.append("text")
            .attr("x", 0)
            .attr("y", -radius - 20)
            .attr("text-anchor", "middle")
            .attr("font-size", circFontSize)
            .attr("fill", circColor)
            .text(data.circRNA.name);

        // 绘制miRNA结合位点
        data.miRNAs.forEach((mirna, i) => {
            const startAngle = (mirna.start / circumference) * 2 * Math.PI - Math.PI/2;
            const endAngle = (mirna.end / circumference) * 2 * Math.PI - Math.PI/2;
            
            // 计算标签位置
            const labelAngle = (startAngle + endAngle) / 2;
            const labelX = Math.cos(labelAngle) * mirnaRadius;
            const labelY = Math.sin(labelAngle) * mirnaRadius;

            // 绘制结合位点区域
            const arc = d3.arc()
                .innerRadius(radius - 10)
                .outerRadius(radius + 10)
                .startAngle(startAngle)
                .endAngle(endAngle);

            svg.append("path")
                .attr("d", arc)
                .attr("fill", mirnaColor);

            // 添加连接线
            svg.append("line")
                .attr("x1", Math.cos(labelAngle) * (radius + 10))
                .attr("y1", Math.sin(labelAngle) * (radius + 10))
                .attr("x2", labelX)
                .attr("y2", labelY)
                .attr("stroke", mirnaColor)
                .attr("stroke-width", 1);

            // 添加miRNA名称
            svg.append("text")
                .attr("x", labelX)
                .attr("y", labelY)
                .attr("text-anchor", labelX > 0 ? "start" : "end")
                .attr("dominant-baseline", "middle")
                .attr("font-size", mirnaFontSize)
                .attr("fill", mirnaColor)
                .text(mirna.name);
        });

    } catch (error) {
        console.error("绘制图形时出错:", error);
        alert(error.message || "绘制失败");
    }
}

function updatePlot() {
    if ($("#data-input").val().trim()) {
        drawCircMiRNAPlot();
    }
}

function exportSVG() {
    try {
        const svgData = new XMLSerializer().serializeToString(svg.node());
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'circRNA_miRNA_plot.svg';
        link.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("导出SVG时出错:", error);
        alert("导出SVG失败");
    }
}

function exportPNG() {
    try {
        const svgData = new XMLSerializer().serializeToString(svg.node());
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const image = new Image();

        image.onload = function() {
            canvas.width = 1200;
            canvas.height = 1200;
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'circRNA_miRNA_plot.png';
            link.click();
        };

        image.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    } catch (error) {
        console.error("导出PNG时出错:", error);
        alert("导出PNG失败");
    }
}

function loadExampleData() {
    $("#data-input").val(exampleData);
    drawCircMiRNAPlot();
} 