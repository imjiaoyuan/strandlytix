let currentVenn = null;
const colorSchemes = {
    default: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD"],
    pastel: ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#FFB3FF"],
    bright: ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF"]
};

// 添加示例数据
const exampleData = `差异基因集A:
BRCA1
TP53
EGFR
PTEN
MYC
KRAS

差异基因集B:
TP53
PTEN
MYC
VEGFA
CDH1
IL6

差异基因集C:
MYC
KRAS
VEGFA
IL6
TNF
TGFB1`;

$(document).ready(function() {
    initVennDiagram();
    setupEventListeners();
});

function initVennDiagram() {
    // 初始化SVG容器
    const container = d3.select("#venn-diagram")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%");
}

function setupEventListeners() {
    $("#draw-venn").click(drawVennDiagram);
    $("#color-scheme").change(updateStyle);
    $("#opacity").change(updateStyle);
    $("#export-svg").click(exportSVG);
    $("#export-png").click(exportPNG);
    $("#load-example").click(loadExampleData);
}

function parseInput(input) {
    const sets = [];
    let currentSet = null;
    
    const lines = input.trim().split('\n');
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        if (trimmedLine.endsWith(':')) {
            if (currentSet) {
                sets.push(currentSet);
            }
            currentSet = {
                sets: [trimmedLine.slice(0, -1)],
                size: 0,
                elements: new Set()
            };
        } else if (currentSet) {
            currentSet.elements.add(trimmedLine);
            currentSet.size = currentSet.elements.size;
        }
    }
    
    if (currentSet) {
        sets.push(currentSet);
    }
    
    // 计算交集
    const intersections = [];
    for (let i = 0; i < sets.length; i++) {
        for (let j = i + 1; j < sets.length; j++) {
            const intersection = new Set(
                [...sets[i].elements].filter(x => sets[j].elements.has(x))
            );
            if (intersection.size > 0) {
                intersections.push({
                    sets: [sets[i].sets[0], sets[j].sets[0]],
                    size: intersection.size,
                    elements: intersection
                });
            }
        }
    }
    
    return [...sets, ...intersections];
}

function drawVennDiagram() {
    try {
        const input = $("#data-input").val();
        if (!input.trim()) {
            throw new Error("请输入数据");
        }
        
        const sets = parseInput(input);
        if (sets.length === 0) {
            throw new Error("未能解析到有效的数据集");
        }
        
        // 清除现有图形
        d3.select("#venn-diagram svg").selectAll("*").remove();
        
        // 获取容器尺寸
        const container = document.getElementById("venn-diagram");
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // 创建韦恩图
        const chart = venn.VennDiagram()
            .width(width)
            .height(height);
        
        const div = d3.select("#venn-diagram")
            .datum(sets)
            .call(chart);
        
        // 保存当前图形引用
        currentVenn = div;
        
        // 应用样式
        updateStyle();
        
        // 添加交互效果
        div.selectAll("g")
            .on("mouseover", function(d, i) {
                const selection = d3.select(this);
                selection.select("path")
                    .style("fill-opacity", 0.6);
                
                // 显示元素数量
                const text = selection.select("text");
                const setInfo = i.sets.join(" ∩ ") + "\n" + 
                              "数量: " + i.size;
                text.text(setInfo);
            })
            .on("mouseout", function() {
                const selection = d3.select(this);
                selection.select("path")
                    .style("fill-opacity", $("#opacity").val());
                
                // 恢复原始文本
                const text = selection.select("text");
                text.text(i => i.sets.join(" ∩ "));
            });
        
    } catch (error) {
        console.error("绘制韦恩图时出错:", error);
        alert(error.message || "绘制失败");
    }
}

function updateStyle() {
    if (!currentVenn) return;
    
    const colorScheme = colorSchemes[$("#color-scheme").val()];
    const opacity = $("#opacity").val();
    
    currentVenn.selectAll("path")
        .style("fill-opacity", opacity)
        .style("stroke-width", "2")
        .style("stroke", "#fff")
        .style("fill", function(d, i) {
            return colorScheme[i % colorScheme.length];
        });
}

function exportSVG() {
    try {
        const svg = document.querySelector("#venn-diagram svg");
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        
        const blob = new Blob([svgString], {
            type: "image/svg+xml;charset=utf-8"
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "venn_diagram.svg";
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
        const svg = document.querySelector("#venn-diagram svg");
        if (!svg) {
            throw new Error("未找到SVG元素");
        }

        // 获取SVG的尺寸和内容
        const width = svg.clientWidth * 2;  // 2倍大小以获得更好的质量
        const height = svg.clientHeight * 2;
        const svgData = new XMLSerializer().serializeToString(svg);
        
        // 创建Blob URL
        const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);
        
        // 创建Image对象
        const image = new Image();
        image.onload = function() {
            try {
                // 创建canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                // 获取context并设置背景色
                const context = canvas.getContext('2d');
                context.fillStyle = '#FFFFFF';
                context.fillRect(0, 0, width, height);
                
                // 绘制图像
                context.drawImage(image, 0, 0, width, height);
                
                // 转换为PNG并下载
                const pngURL = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.href = pngURL;
                downloadLink.download = 'venn_diagram.png';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                // 清理资源
                URL.revokeObjectURL(blobURL);
            } catch (error) {
                console.error('Canvas处理错误:', error);
                alert('导出PNG时出错: ' + error.message);
            }
        };
        
        // 处理图片加载错误
        image.onerror = function() {
            URL.revokeObjectURL(blobURL);
            alert('图片加载失败');
        };
        
        // 设置图片源
        image.src = blobURL;
        
    } catch (error) {
        console.error("导出PNG时出错:", error);
        alert("导出PNG失败: " + error.message);
    }
}

// 添加加载示例数据的函数
function loadExampleData() {
    $("#data-input").val(exampleData);
    drawVennDiagram();
} 