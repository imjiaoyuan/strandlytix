let currentTree = null;
let svg = null;
let zoom = null;

// 初始化页面
$(document).ready(function() {
    initViewer();
    setupEventListeners();
});

// 初始化查看器
function initViewer() {
    // 创建SVG容器
    svg = d3.select("#tree-viewer")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g");

    // 添加缩放功能
    zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", (event) => {
            svg.attr("transform", event.transform);
        });

    d3.select("#tree-viewer svg").call(zoom);
}

// 设置事件监听器
function setupEventListeners() {
    // 文件上传
    $("#tree-file").change(handleTreeFile);
    
    // 布局切换
    $("#layout-type").change(updateVisualization);
    $("#branch-scale").change(updateVisualization);
    
    // 控制按钮
    $("#reset-view").click(resetView);
    $("#export-svg").click(exportSVG);
    $("#export-png").click(exportPNG);
}

// 处理树文件
async function handleTreeFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    $("#file-name").text(file.name);
    
    try {
        const content = await readFileAsText(file);
        currentTree = parseNewick(content);
        updateVisualization();
    } catch (error) {
        console.error("Failed to load tree file:", error);
        showError("Failed to load tree file");
    }
}

// 读取文件内容
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsText(file);
    });
}

// 解析Newick格式
function parseNewick(newick) {
    const tokens = newick.split(/\s*(;|\(|\)|,|:)\s*/);
    let pos = 0;
    
    function parseNode() {
        let node = {};
        
        // 获取节点名称
        if (tokens[pos] !== '(' && tokens[pos] !== ')' && tokens[pos] !== ',') {
            node.name = tokens[pos];
            pos++;
        }
        
        // 获取分支长度
        if (tokens[pos] === ':') {
            pos++;
            node.length = parseFloat(tokens[pos]);
            pos++;
        }
        
        // 处理子节点
        if (tokens[pos] === '(') {
            pos++;
            node.children = [];
            while (tokens[pos] !== ')') {
                node.children.push(parseNode());
                if (tokens[pos] === ',') pos++;
            }
            pos++;
            
            // 处理内部节点的标签和长度
            if (tokens[pos] !== ':' && tokens[pos] !== ',' && tokens[pos] !== ')' && tokens[pos] !== ';') {
                node.name = tokens[pos];
                pos++;
            }
            if (tokens[pos] === ':') {
                pos++;
                node.length = parseFloat(tokens[pos]);
                pos++;
            }
        }
        
        return node;
    }
    
    const tree = parseNode();
    return tree;
}

// 更新可视化
function updateVisualization() {
    if (!currentTree) return;
    
    const container = document.getElementById('tree-viewer');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // 清除现有内容
    svg.selectAll("*").remove();
    
    const layout = $("#layout-type").val();
    const useRealBranchLengths = $("#branch-scale").val() === "true";
    
    let treeLayout;
    if (layout === "rectangular") {
        treeLayout = d3.cluster()
            .size([height - 80, width - 200]);
    } else if (layout === "circular") {
        treeLayout = d3.cluster()
            .size([2 * Math.PI, Math.min(width, height) / 2 - 100]);
    } else { // unrooted
        treeLayout = d3.cluster()
            .size([Math.min(width, height) - 100, Math.min(width, height) - 100]);
    }
    
    // 创建层次结构
    const root = d3.hierarchy(currentTree);
    
    // 设置节点间距
    if (useRealBranchLengths) {
        root.sum(d => d.length || 0);
    }
    
    treeLayout(root);
    
    // 绘制树
    if (layout === "rectangular") {
        drawRectangularTree(root, width, height);
    } else if (layout === "circular") {
        drawCircularTree(root, width, height);
    } else {
        drawUnrootedTree(root, width, height);
    }
    
    resetView();
}

// 绘制矩形布局
function drawRectangularTree(root, width, height) {
    // 绘制连接线
    svg.selectAll("path.link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d => {
            // 使用直角连接线
            return `M${d.source.y},${d.source.x}
                    L${d.target.y},${d.source.x}
                    L${d.target.y},${d.target.x}`;
        });
    
    // 添加节点组
    const nodes = svg.selectAll("g.node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", d => `node ${d.children ? "internal" : "leaf"}`)
        .attr("transform", d => `translate(${d.y},${d.x})`);
    
    // 添加节点圆圈
    nodes.append("circle")
        .attr("r", 3);
    
    // 添加标签，保持水平方向
    nodes.append("text")
        .attr("dy", ".31em")
        .attr("x", d => d.children ? -8 : 8)
        .style("text-anchor", d => d.children ? "end" : "start")
        .text(d => d.data.name);
}

// 绘制环状布局
function drawCircularTree(root, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    
    // 移动SVG中心点
    svg.attr("transform", `translate(${centerX},${centerY})`);
    
    // 绘制连接线
    svg.selectAll("path.link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d => {
            // 使用直角连接线
            const sourceAngle = d.source.x - Math.PI / 2;
            const targetAngle = d.target.x - Math.PI / 2;
            const sourceX = d.source.y * Math.cos(sourceAngle);
            const sourceY = d.source.y * Math.sin(sourceAngle);
            const targetX = d.target.y * Math.cos(targetAngle);
            const targetY = d.target.y * Math.sin(targetAngle);
            const midRadius = (d.source.y + d.target.y) / 2;
            const midX = midRadius * Math.cos(targetAngle);
            const midY = midRadius * Math.sin(targetAngle);
            
            return `M${sourceX},${sourceY}
                    L${midX},${midY}
                    L${targetX},${targetY}`;
        });
    
    // 添加节点组
    const nodes = svg.selectAll("g.node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", d => `node ${d.children ? "internal" : "leaf"}`);

    // 添加节点圆圈
    nodes.append("circle")
        .attr("r", 3)
        .attr("transform", d => {
            const angle = d.x - Math.PI / 2;
            return `translate(${d.y * Math.cos(angle)},${d.y * Math.sin(angle)})`;
        });
    
    // 添加标签容器，使文字保持水平
    const labels = nodes.append("g")
        .attr("class", "label-container")
        .attr("transform", d => {
            const angle = d.x - Math.PI / 2;
            const x = (d.y + 10) * Math.cos(angle); // 向外偏移10个单位
            const y = (d.y + 10) * Math.sin(angle);
            return `translate(${x},${y})`;
        });

    // 添加标签文字，所有文字都保持水平
    labels.append("text")
        .attr("dy", "0.31em")
        .attr("x", 0)
        .style("text-anchor", "start")
        .text(d => d.data.name);
}

// 绘制无根树布局
function drawUnrootedTree(root, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    
    // 移动SVG中心点
    svg.attr("transform", `translate(${centerX},${centerY})`);
    
    // 计算无根树的布局
    function projectUnrooted(d) {
        const angle = (d.x - 90) / 180 * Math.PI;
        return [d.y * Math.cos(angle), d.y * Math.sin(angle)];
    }
    
    // 绘制连接线
    svg.selectAll("path.link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d => {
            const source = projectUnrooted(d.source);
            const target = projectUnrooted(d.target);
            return `M${source[0]},${source[1]}L${target[0]},${target[1]}`;
        });
    
    // 添加节点组
    const nodes = svg.selectAll("g.node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", d => `node ${d.children ? "internal" : "leaf"}`)
        .attr("transform", d => {
            const [x, y] = projectUnrooted(d);
            return `translate(${x},${y})`;
        });
    
    // 添加节点圆圈
    nodes.append("circle")
        .attr("r", 3);
    
    // 添加标签，保持水平方向
    nodes.append("text")
        .attr("dy", ".31em")
        .attr("x", 6)
        .style("text-anchor", "start")
        .text(d => d.data.name);
}

// 重置视图
function resetView() {
    const container = document.getElementById('tree-viewer');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    d3.select("#tree-viewer svg")
        .transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity
            .translate(width / 4, height / 2)
            .scale(0.8));
}

// 导出SVG
function exportSVG() {
    try {
        const svgData = document.getElementById('tree-viewer')
            .querySelector('svg')
            .outerHTML;
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'phylogenetic_tree.svg';
        link.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        showError("Failed to export SVG");
    }
}

// 导出PNG
function exportPNG() {
    try {
        const svg = document.getElementById('tree-viewer')
            .querySelector('svg');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        
        img.onload = function() {
            canvas.width = svg.clientWidth * 2;
            canvas.height = svg.clientHeight * 2;
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'phylogenetic_tree.png';
            link.click();
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    } catch (error) {
        showError("Failed to export PNG");
    }
}

// 显示错误信息
function showError(message) {
    alert(message);
} 