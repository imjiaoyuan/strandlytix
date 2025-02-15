// 配色方案
const colorSchemes = {
    default: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
    viridis: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151'],
    plasma: ['#0d0887', '#7e03a8', '#cc4778', '#f89540', '#f0f921']
};

// 示例数据
const exampleData = `Chr1    1000
Chr1    2000
Chr1    3000
Chr1    4000
Chr2    1500
Chr2    2500
Chr2    3500
Chr3    1000
Chr3    2000
Chr3    5000`;

$(document).ready(function() {
    setupEventListeners();
});

function setupEventListeners() {
    $("#draw-density").click(drawDensityPlot);
    $("#window-size, #color-scheme, #show-grid").change(drawDensityPlot);
    $("#export-svg").click(exportSVG);
    $("#export-png").click(exportPNG);
    $("#load-example").click(loadExampleData);
}

function parseInput(input) {
    const data = new Map();
    const lines = input.trim().split('\n');
    
    for (const line of lines) {
        const [chr, pos] = line.trim().split(/\s+/);
        const position = parseInt(pos);
        
        if (!data.has(chr)) {
            data.set(chr, []);
        }
        data.get(chr).push(position);
    }
    
    // 对每个染色体的位置进行排序
    for (const positions of data.values()) {
        positions.sort((a, b) => a - b);
    }
    
    return data;
}

function calculateDensity(positions, windowSize) {
    const maxPos = Math.max(...positions);
    const numBins = Math.ceil(maxPos / windowSize);
    const bins = new Array(numBins).fill(0);
    
    positions.forEach(pos => {
        const binIndex = Math.floor(pos / windowSize);
        if (binIndex < bins.length) {
            bins[binIndex]++;
        }
    });
    
    return bins;
}

function drawDensityPlot() {
    try {
        const input = $("#data-input").val();
        if (!input.trim()) {
            throw new Error("请输入数据");
        }
        
        // 清除现有图形
        $("#snpdensity-plot").empty();
        
        // 解析数据
        const data = parseInput(input);
        const windowSize = parseInt($("#window-size").val());
        const colorScheme = colorSchemes[$("#color-scheme").val()];
        const showGrid = $("#show-grid").val() === "true";
        
        // 计算图形尺寸
        const container = document.getElementById('snpdensity-plot');
        const width = container.clientWidth;
        const height = container.clientHeight;
        const margin = {top: 50, right: 100, bottom: 50, left: 60};
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;
        
        // 计算所有染色体的密度数据和最大值
        const densityData = [];
        let maxDensity = 0;
        let maxPosition = 0;
        
        for (const [chr, positions] of data) {
            const density = calculateDensity(positions, windowSize);
            maxDensity = Math.max(maxDensity, ...density);
            maxPosition = Math.max(maxPosition, Math.max(...positions));
            densityData.push({chr, density});
        }
        
        // 创建比例尺
        const xScale = d3.scaleLinear()
            .domain([0, maxPosition])
            .range([0, plotWidth]);
            
        const yScale = d3.scaleLinear()
            .domain([0, maxDensity])
            .range([plotHeight, 0]);
        
        // 创建SVG
        const svg = d3.select("#snpdensity-plot")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        // 添加网格
        if (showGrid) {
            svg.append("g")
                .attr("class", "grid")
                .attr("transform", `translate(0,${plotHeight})`)
                .call(d3.axisBottom(xScale)
                    .tickSize(-plotHeight)
                    .tickFormat(""));
                    
            svg.append("g")
                .attr("class", "grid")
                .call(d3.axisLeft(yScale)
                    .tickSize(-plotWidth)
                    .tickFormat(""));
        }
        
        // 创建线条生成器
        const line = d3.line()
            .x((d, i) => xScale(i * windowSize))
            .y(d => yScale(d))
            .curve(d3.curveMonotoneX);
        
        // 绘制密度曲线
        densityData.forEach((d, i) => {
            svg.append("path")
                .datum(d.density)
                .attr("class", "density-line")
                .attr("fill", "none")
                .attr("stroke", colorScheme[i % colorScheme.length])
                .attr("stroke-width", 2)
                .attr("d", line);
        });
        
        // 添加坐标轴
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${plotHeight})`)
            .call(d3.axisBottom(xScale)
                .ticks(5)
                .tickFormat(d => d3.format(".0f")(d)));
                
        svg.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(yScale));
        
        // 添加标题和标签
        svg.append("text")
            .attr("class", "title")
            .attr("x", plotWidth / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .text("SNP密度分布图");
            
        svg.append("text")
            .attr("class", "x-label")
            .attr("x", plotWidth / 2)
            .attr("y", plotHeight + margin.bottom - 10)
            .attr("text-anchor", "middle")
            .text("染色体位置 (bp)");
            
        svg.append("text")
            .attr("class", "y-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -plotHeight / 2)
            .attr("y", -margin.left + 15)
            .attr("text-anchor", "middle")
            .text(`SNP密度 (每${windowSize/1000}kb)`);
        
        // 添加图例
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${plotWidth + 10}, 0)`);
            
        densityData.forEach((d, i) => {
            const lg = legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);
                
            lg.append("line")
                .attr("x1", 0)
                .attr("x2", 20)
                .attr("stroke", colorScheme[i % colorScheme.length])
                .attr("stroke-width", 2);
                
            lg.append("text")
                .attr("x", 25)
                .attr("y", 5)
                .text(d.chr);
        });
        
        // 设置网格线样式
        svg.selectAll(".grid line")
            .style("stroke", "#ddd")
            .style("stroke-opacity", 0.5)
            .style("shape-rendering", "crispEdges");
        
        svg.selectAll(".grid path")
            .style("stroke-width", 0);
            
    } catch (error) {
        console.error("绘制密度图时出错:", error);
        alert(error.message || "绘制失败");
    }
}

function loadExampleData() {
    $("#data-input").val(exampleData);
    drawDensityPlot();
}

function exportSVG() {
    try {
        const svgData = new XMLSerializer().serializeToString(document.querySelector("#snpdensity-plot svg"));
        const blob = new Blob([svgData], {type: "image/svg+xml"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "snp_density.svg";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("导出SVG时出错:", error);
        alert("导出SVG失败");
    }
}

function exportPNG() {
    try {
        const svg = document.querySelector("#snpdensity-plot svg");
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        
        img.onload = function() {
            canvas.width = svg.clientWidth * 2;
            canvas.height = svg.clientHeight * 2;
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = "snp_density.png";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
        console.error("导出PNG时出错:", error);
        alert("导出PNG失败");
    }
} 